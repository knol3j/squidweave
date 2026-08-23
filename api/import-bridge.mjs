#!/usr/bin/env node
/**
 * SquidWeave v8 → v9 Import Bridge
 * Takes prospecting engine output and imports into Marketing OS CRM
 * 
 * Usage: node import-bridge.mjs <path-to-prospecting-results.json>
 */

import fs from 'fs/promises';
import path from 'path';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function importProspects(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw);

  // Handle both array and object-wrapped formats
  const results = Array.isArray(data) ? data : data.results || data.companies || [];

  if (results.length === 0) {
    console.error('No prospects found in file');
    process.exit(1);
  }

  console.log(`Found ${results.length} prospects. Importing...`);

  const response = await fetch(`${API_BASE}/api/prospecting/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results })
  });

  const result = await response.json();

  if (result.success) {
    console.log(`✅ Imported ${result.imported} prospects into CRM`);
    console.log(`📊 Total contacts in CRM: ${result.total || result.imported}`);
  } else {
    console.error('❌ Import failed:', result.message);
    process.exit(1);
  }
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node import-bridge.mjs <path-to-prospecting-results.json>');
  console.error('');
  console.error('Environment variables:');
  console.error('  API_URL - Backend API URL (default: http://localhost:3001)');
  process.exit(1);
}

importProspects(filePath).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
