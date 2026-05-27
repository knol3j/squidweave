#!/usr/bin/env node

/**
 * migrate-domains.mjs
 *
 * Reads data/state.json, finds all investor records with null domain but
 * non-null website, extracts the domain from the website URL, updates the
 * record, and writes back the updated state.
 *
 * Usage:
 *   node scripts/migrate-domains.mjs
 *
 * Reports:
 *   - Total investor records inspected
 *   - Count of records with null domain + non-null website
 *   - Count successfully updated
 *   - Count skipped (no website or already has domain)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(__dirname, '..', 'data', 'state.json');

/**
 * Extract domain from a URL using the URL constructor.
 * @param {string} website
 * @returns {string|null}
 */
function extractDomain(website) {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith('http') ? website : 'https://' + website);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

async function main() {
  console.log('=== Domain Migration Script ===\n');

  // Read state
  let raw;
  try {
    raw = await readFile(STATE_PATH, 'utf8');
  } catch (err) {
    console.error('FATAL: Could not read state.json at', STATE_PATH);
    console.error(err.message);
    process.exit(1);
  }

  const state = JSON.parse(raw);
  const records = state.investorRecords || [];

  console.log(`Total investor records: ${records.length}`);

  // Find candidates: null domain but non-null website
  const candidates = records.filter(
    (r) => (r.domain === null || r.domain === '' || r.domain === undefined) && r.website
  );

  console.log(`Records with null domain + non-null website: ${candidates.length}`);

  // Skip records that already have a domain
  const alreadyHaveDomain = records.filter((r) => r.domain && r.website);
  console.log(`Records with existing domain: ${alreadyHaveDomain.length}`);

  // Update candidates
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const record of candidates) {
    const domain = extractDomain(record.website);
    if (domain) {
      record.domain = domain;
      updated++;
    } else {
      skipped++;
      errors.push({ fundName: record.fundName, website: record.website, reason: 'Could not extract domain' });
    }
  }

  // Write back
  state.investorRecords = records;
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2));

  console.log(`\nResults:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const err of errors.slice(0, 10)) {
      console.log(`  - ${err.fundName}: ${err.website} — ${err.reason}`);
    }
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more`);
    }
  }

  // Verify
  const afterNullDomain = records.filter((r) => !r.domain).length;
  console.log(`\nAfter migration:`);
  console.log(`  Records with null domain: ${afterNullDomain}`);
  console.log(`  Records with domain set: ${records.filter((r) => r.domain).length}`);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
