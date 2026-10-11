import { config } from "../../config.mjs";

let sharedPool = null;

export async function getPostgresPool() {
  if (sharedPool) return sharedPool;
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required for Postgres repositories");
  }
  const { Pool } = await import("pg");
  sharedPool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
  });
  sharedPool.on("error", (err) => {
    console.error("[postgres] unexpected pool error:", err.message);
  });
  return sharedPool;
}

export async function closePostgresPool() {
  if (sharedPool) {
    await sharedPool.end();
    sharedPool = null;
  }
}

export class BaseRepository {
  constructor({ table, schema = "public" } = {}) {
    if (!table) throw new Error("table is required");
    this.table = `${schema}.${table}`;
  }

  async query(text, params) {
    const pool = await getPostgresPool();
    return pool.query(text, params);
  }
}
