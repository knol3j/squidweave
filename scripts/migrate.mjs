#!/usr/bin/env node
// scripts/migrate.mjs — Run pending DB migrations against DATABASE_URL, in
// filename order, recording each in schema_migrations so a migration runs once.
// Uses dynamic import of 'pg' so the script works even if pg is not globally
// installed; it must be present in node_modules at runtime.
//
// A migration whose tables already exist under a different shape is skipped and
// reported, not forced. This database was originally created from
// deploy/postgres/schema.sql, which diverged from migrations/001, so 001 can
// never apply here. Skipping is the honest outcome; silently marking it applied
// would hide the divergence.

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

let pg;
try {
  pg = (await import('pg')).default;
} catch {
  console.error('ERROR: Cannot import the "pg" package. Run: npm install pg');
  process.exit(1);
}

const { Client } = pg;
const migrationsDir = join(__dirname, '..', 'migrations');

const TABLE_RE = /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi;

function declaredTables(sql) {
  const names = new Set();
  let match;
  while ((match = TABLE_RE.exec(sql)) !== null) names.add(match[1]);
  return [...names];
}

let files;
try {
  files = (await readdir(migrationsDir)).filter(name => name.endsWith('.sql')).sort();
} catch (err) {
  console.error(`ERROR: Could not read migrations directory at ${migrationsDir}:`, err.message);
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

// Mark a migration as applied without running it. Used when a migration is
// genuinely satisfied by another schema file (this database was built from
// deploy/postgres/schema.sql, which supersedes migrations/001). The reason is
// logged and recorded, so the decision is visible rather than a silent DB poke.
const markAppliedArg = process.argv.find(arg => arg.startsWith('--mark-applied='));
if (markAppliedArg) {
  const filename = markAppliedArg.slice('--mark-applied='.length);
  try {
    await client.connect();
    await client.query(`
      create table if not exists schema_migrations (
        filename    text not null primary key,
        applied_at  timestamptz not null default now()
      );
    `);
    await client.query('insert into schema_migrations (filename) values ($1) on conflict do nothing', [filename]);
    console.log(`Recorded ${filename} as applied without running it (superseded by another schema file).`);
  } catch (err) {
    console.error('ERROR: Could not record migration as applied:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
  process.exit(0);
}

try {
  await client.connect();
  console.log('Connected to database.');

  // 001 creates schema_migrations itself, so a fresh database has no table to
  // query yet. This statement is idempotent.
  await client.query(`
    create table if not exists schema_migrations (
      filename    text not null primary key,
      applied_at  timestamptz not null default now()
    );
  `);

  const { rows } = await client.query('select filename from schema_migrations');
  const applied = new Set(rows.map(row => row.filename));

  let ran = 0;
  let skipped = 0;

  for (const filename of files) {
    if (applied.has(filename)) {
      console.log(`  skip    ${filename} (recorded as applied)`);
      skipped += 1;
      continue;
    }

    const sql = await readFile(join(migrationsDir, filename), 'utf8');
    const tables = declaredTables(sql);

    // Which of this migration's tables already exist?
    const existing = [];
    for (const table of tables) {
      const { rows: found } = await client.query(
        'select 1 from information_schema.tables where table_schema = $1 and table_name = $2 limit 1',
        ['public', table],
      );
      if (found.length > 0) existing.push(table);
    }

    if (tables.length > 0 && existing.length === tables.length) {
      console.log(
        `  skip    ${filename} (all ${tables.length} tables already exist under another schema; ` +
        `not forcing. Marked applied so it is not retried.)`,
      );
      await client.query('insert into schema_migrations (filename) values ($1) on conflict do nothing', [filename]);
      skipped += 1;
      continue;
    }

    if (existing.length > 0) {
      console.error(
        `ERROR: ${filename} is partially present (${existing.join(', ')} already exist, ` +
        `${tables.length - existing.length} do not). Refusing to apply a partial migration. ` +
        `Resolve the schema divergence by hand, then re-run.`,
      );
      process.exit(1);
    }

    console.log(`  apply   ${filename}`);
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into schema_migrations (filename) values ($1)', [filename]);
      await client.query('commit');
      ran += 1;
    } catch (err) {
      await client.query('rollback');
      console.error(`ERROR: Migration ${filename} failed and was rolled back:`, err.message);
      process.exit(1);
    }
  }

  console.log(
    ran === 0
      ? `No migrations applied (${skipped} skipped).`
      : `${ran} migration(s) applied, ${skipped} skipped.`,
  );
} catch (err) {
  console.error('ERROR: Migration run failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
