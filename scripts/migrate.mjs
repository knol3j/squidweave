#!/usr/bin/env node
// scripts/migrate.mjs — Run DB migrations against DATABASE_URL
// Uses dynamic import of 'pg' so the script works even if pg is not globally
// installed; it must be present in node_modules at runtime.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

// Dynamic import so the script fails gracefully if pg is absent
let pg;
try {
  pg = (await import('pg')).default;
} catch {
  console.error('ERROR: Cannot import the "pg" package. Run: npm install pg');
  process.exit(1);
}

const { Client } = pg;

const migrationPath = join(__dirname, '..', 'migrations', '001_initial_schema.sql');
let sql;
try {
  sql = await readFile(migrationPath, 'utf8');
} catch (err) {
  console.error(`ERROR: Could not read migration file at ${migrationPath}:`, err.message);
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  console.log('Connected to database. Running migration...');
  await client.query(sql);
  console.log('Migration completed successfully.');
} catch (err) {
  console.error('ERROR: Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
