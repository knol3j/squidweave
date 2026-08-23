#!/usr/bin/env node
/**
 * SquidWeave Outreach Pipeline
 * Runs prospecting query and imports results into Marketing OS
 * 
 * Usage: node outreach-pipeline.mjs "crypto startups" --limit 20
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

const API_BASE = process.env.API_URL || 'http://localhost:3001';
const PROSPECT_SCRIPT = path.resolve('../scripts/prospect.mjs');

async function runPipeline(query, options = {}) {
  const { limit = 10, language = 'en', output = './pipeline-results.json' } = options;

  console.log(`🔍 Running prospecting query: "${query}"`);
  console.log(`   Limit: ${limit}, Language: ${language}`);

  // Run v8 prospecting engine
  const prospectArgs = [
    PROSPECT_SCRIPT,
    query,
    '--limit', String(limit),
    '--language', language,
    '--output', output
  ];

  return new Promise((resolve, reject) => {
    const child = spawn('node', prospectArgs, {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Prospecting failed with code ${code}`));
        return;
      }

      try {
        // Import results into v9
        const raw = await fs.readFile(output, 'utf8');
        const data = JSON.parse(raw);
        const results = Array.isArray(data) ? data : data.results || [];

        console.log(`\n📥 Importing ${results.length} prospects into CRM...`);

        const response = await fetch(`${API_BASE}/api/prospecting/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results })
        });

        const result = await response.json();

        if (result.success) {
          console.log(`✅ Pipeline complete!`);
          console.log(`   Imported: ${result.imported} contacts`);
          console.log(`   Open Marketing OS to view and nurture them`);
        } else {
          reject(new Error(result.message));
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Parse CLI args
const args = process.argv.slice(2);
const query = args[0];
if (!query) {
  console.error('Usage: node outreach-pipeline.mjs <query> [options]');
  console.error('');
  console.error('Options:');
  console.error('  --limit <n>      Max results (default: 10)');
  console.error('  --language <code> Language code (default: en)');
  console.error('  --output <file>  Output file (default: ./pipeline-results.json)');
  process.exit(1);
}

const options = {};
for (let i = 1; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  if (value) options[key] = value;
}

runPipeline(query, options).catch(err => {
  console.error('Pipeline error:', err.message);
  process.exit(1);
});
