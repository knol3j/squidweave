import { copyFile, mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

async function loadSeedState(seedFileUrl) {
  if (!seedFileUrl) {
    return null;
  }
  try {
    const raw = await readFile(seedFileUrl, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

class FileStateBackend {
  constructor({ fileUrl, seedFileUrl }) {
    this.fileUrl = fileUrl;
    this.seedFileUrl = seedFileUrl || null;
  }

  async init() {
    await mkdir(dirname(fileURLToPath(this.fileUrl)), { recursive: true });
  }

  async load(defaultFactory) {
    await this.init();
    try {
      const raw = await readFile(this.fileUrl, "utf8");
      return { ...defaultFactory(), ...JSON.parse(raw) };
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      if (this.seedFileUrl && this.seedFileUrl.href !== this.fileUrl.href) {
        try {
          await copyFile(this.seedFileUrl, this.fileUrl);
          const raw = await readFile(this.fileUrl, "utf8");
          return { ...defaultFactory(), ...JSON.parse(raw) };
        } catch {
          return defaultFactory();
        }
      }
      return defaultFactory();
    }
  }

  async save(state) {
    // Atomic write: write to temp file then rename to avoid truncation on crash
    const filePath = fileURLToPath(this.fileUrl);
    const tmpPath = filePath + ".tmp";
    const data = JSON.stringify(state, null, 2);
    await writeFile(tmpPath, data);
    await rename(tmpPath, filePath);
  }

  async flush(state) {
    await this.save(state);
  }

  getDescriptor() {
    return {
      type: "file",
      target: fileURLToPath(this.fileUrl),
    };
  }
}

class PostgresStateBackend {
  constructor({ databaseUrl, schema = "public", tableName = "squidweave_state", stateKey = "primary", seedFileUrl = null }) {
    this.databaseUrl = databaseUrl;
    this.schema = schema;
    this.tableName = tableName;
    this.stateKey = stateKey;
    this.seedFileUrl = seedFileUrl;
    this.pool = null;
    this.tableIdent = `${this.schema}.${this.tableName}`;
  }

  async _getPool() {
    if (this.pool) {
      return this.pool;
    }
    let pg;
    try {
      pg = await import("pg");
    } catch (error) {
      throw new Error(`Postgres backend requested but the "pg" package is unavailable. ${error.message}`);
    }
    this.pool = new pg.Pool({
      connectionString: this.databaseUrl,
      max: 5,
    });
    return this.pool;
  }

  async init() {
    const pool = await this._getPool();
    await pool.query(`create schema if not exists ${this.schema}`);
    await pool.query(`
      create table if not exists ${this.tableIdent} (
        state_key text primary key,
        state jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);
  }

  async load(defaultFactory) {
    await this.init();
    const pool = await this._getPool();
    const result = await pool.query(
      `select state from ${this.tableIdent} where state_key = $1 limit 1`,
      [this.stateKey],
    );
    if (result.rows.length) {
      return { ...defaultFactory(), ...result.rows[0].state };
    }

    const seedState = await loadSeedState(this.seedFileUrl);
    const initialState = seedState ? { ...defaultFactory(), ...seedState } : defaultFactory();
    await this.save(initialState);
    return initialState;
  }

  async save(state) {
    const pool = await this._getPool();
    await pool.query(
      `
        insert into ${this.tableIdent} (state_key, state, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (state_key)
        do update set state = excluded.state, updated_at = now()
      `,
      [this.stateKey, JSON.stringify(state)],
    );
  }

  async flush(state) {
    await this.save(state);
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  getDescriptor() {
    return {
      type: "postgres",
      target: `${this.tableIdent}:${this.stateKey}`,
    };
  }
}

export function createStateBackend({
  databaseUrl = "",
  fileUrl,
  seedFileUrl,
  stateBackend = "",
  postgresSchema,
  postgresTable,
  postgresStateKey,
} = {}) {
  const mode = String(stateBackend || (databaseUrl ? "postgres" : "file")).toLowerCase();
  if (mode === "postgres") {
    if (!databaseUrl) {
      throw new Error("STATE_BACKEND=postgres requires DATABASE_URL.");
    }
    return new PostgresStateBackend({
      databaseUrl,
      schema: postgresSchema || "public",
      tableName: postgresTable || "squidweave_state",
      stateKey: postgresStateKey || "primary",
      seedFileUrl,
    });
  }
  return new FileStateBackend({ fileUrl, seedFileUrl });
}
