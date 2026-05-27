#!/usr/bin/env node
/**
 * SquidWeave Multi-Blueprint Orchestrator
 *
 * Usage:
 *   node scripts/orchestrate-blueprints.mjs                          # local
 *   SQUIDWEAVE_API_BASE=https://... node scripts/orchestrate-blueprints.mjs
 *   node scripts/orchestrate-blueprints.mjs --enrich-only             # skip bootstrap, run enrichment/sequencing for all existing campaigns
 *   node scripts/orchestrate-blueprints.mjs --bootstrap-only          # only bootstrap, no enrichment/sequencing
 *   node scripts/orchestrate-blueprints.mjs --campaign=<id>           # single campaign enrichment/sequencing only
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const API_BASE = process.env.SQUIDWEAVE_API_BASE || 'http://127.0.0.1:4010';
const API_KEY = process.env.SQUIDWEAVE_API_KEY || '';
const BLUEPRINTS_DIR = join(__dirname, '..', 'automation', 'blueprints');

const args = process.argv.slice(2);
const ENRICH_ONLY = args.includes('--enrich-only');
const BOOTSTRAP_ONLY = args.includes('--bootstrap-only');
const FUNDING_ONLY = args.includes('--funding-only');
const SINGLE_CAMPAIGN = args.find(a => a.startsWith('--campaign='))?.split('=')[1] || null;

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function api(path, init = {}) {
  const headers = {
    'content-type': 'application/json',
    ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    ...(init.headers || {}),
  };
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

// ---------------------------------------------------------------------------
// Blueprint loader
// ---------------------------------------------------------------------------
async function loadBlueprints() {
  const dir = await readdir(BLUEPRINTS_DIR);
  const files = dir.filter(f => f.endsWith('.json'));
  const blueprints = [];
  for (const file of files) {
    const raw = await readFile(join(BLUEPRINTS_DIR, file), 'utf8');
    try {
      const bp = JSON.parse(raw);
      const campaign = bp.campaign || {};
      blueprints.push({
        file,
        campaignId: campaign.id || basename(file, '.json'),
        campaignName: campaign.name || campaign.id || basename(file, '.json'),
        designTheme: campaign.designTheme || null,
        recordCount: (bp.researchRecords || []).length,
        prospectCount: (bp.prospects || []).length,
        data: bp,
      });
    } catch (err) {
      console.error(`  [SKIP] ${file}: parse error - ${err.message}`);
    }
  }
  return blueprints;
}

// ---------------------------------------------------------------------------
// Bootstrap a single blueprint
// ---------------------------------------------------------------------------
async function bootstrapBlueprint(bp) {
  const { campaignId, data } = bp;
  const campaign = data.campaign || {};
  const researchRecords = (data.researchRecords || []).map(r => ({ ...r, campaignId }));
  const prospects = data.prospects || [];

  // Upsert campaign
  await api('/campaigns', {
    method: 'POST',
    body: JSON.stringify({ ...campaign, id: campaignId }),
  });

  // Import research records
  if (researchRecords.length) {
    await api('/research/records', {
      method: 'POST',
      body: JSON.stringify({ records: researchRecords }),
    });
  }

  // Import prospects
  if (prospects.length) {
    await api('/prospects/import', {
      method: 'POST',
      body: JSON.stringify({
        campaignId,
        source: 'blueprint-bootstrap',
        contacts: prospects,
      }),
    });
  }
}

// ---------------------------------------------------------------------------
// Enrichment + Sequencing for a campaign
// ---------------------------------------------------------------------------
async function runEnrichment(campaignId) {
  let enrichResult = null;
  try {
    enrichResult = await api('/prospects/enrich', {
      method: 'POST',
      body: JSON.stringify({
        campaignId,
        provider: 'internal-waterfall',
        limit: 24,
      }),
    });
  } catch (err) {
    return { enrichError: err.message, sequenceResult: null };
  }

  // Only sequence if enrichment succeeded and we got contacts
  const processedCount = enrichResult?.run?.processedContacts || 0;
  if (processedCount === 0) {
    return { enrichResult: enrichResult?.run || null, processedCount: 0, sequenceResult: null, sequenceSkipped: 'no contacts advanced' };
  }

  let sequenceResult = null;
  try {
    sequenceResult = await api('/prospects/sequence', {
      method: 'POST',
      body: JSON.stringify({
        campaignId,
        limit: 24,
      }),
    });
  } catch (err) {
    return { enrichResult: enrichResult?.run || null, processedCount, sequenceError: err.message, sequenceResult: null };
  }

  return {
    enrichResult: enrichResult?.run || null,
    processedCount,
    sequenceResult: sequenceResult?.run || null,
    sequencedCount: sequenceResult?.run?.processedContacts || 0,
  };
}

async function runFunding(campaignId) {
  try {
    const result = await api('/funding/run', {
      method: 'POST',
      body: JSON.stringify({ campaignId, limit: 20 }),
    });
    return {
      fundingProcessed: result?.sequence?.run?.processedInvestors || 0,
      fundingError: null,
    };
  } catch (err) {
    return {
      fundingProcessed: 0,
      fundingError: err.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Get pipeline summary
// ---------------------------------------------------------------------------
async function pipelineSummary(campaignId) {
  try {
    const pipeline = await api(`/prospects/pipeline?campaignId=${encodeURIComponent(campaignId)}`);
    return pipeline?.counts || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Summary Report
// ---------------------------------------------------------------------------
function printSummary(results, elapsed) {
  console.log('\n' + '═'.repeat(80));
  console.log('  ORCHESTRATION SUMMARY');
  console.log('═'.repeat(80));

  const header = `  ${'Campaign'.padEnd(30)} ${'Design Theme'.padEnd(22)} ${'Enriched'.padEnd(10)} ${'Sequenced'.padEnd(10)} ${'Funding'.padEnd(9)}  Notes`;
  console.log(`\n${header}`);
  console.log(`  ${'─'.repeat(28)}  ${'─'.repeat(20)}  ${'─'.repeat(8)}  ${'─'.repeat(8)}  ${'─'.repeat(7)}  ──────────────────`);

  let totalEnriched = 0;
  let totalSequenced = 0;
  let totalFunding = 0;
  for (const r of results) {
    const note = r.error ? `⚠ ${r.error}` : (r.pipelineCounts ? `${r.pipelineCounts.total || 0} total contacts` : '');
    console.log(`  ${r.campaignId.padEnd(30)} ${(r.designTheme || '—').padEnd(22)} ${String(r.enriched || '—').padEnd(10)} ${String(r.sequenced || '—').padEnd(10)} ${String(r.fundingProcessed || '—').padEnd(9)} ${note}`);
    totalEnriched += r.enriched || 0;
    totalSequenced += r.sequenced || 0;
    totalFunding += r.fundingProcessed || 0;
  }

  console.log(`\n  ${'─'.repeat(28)}  ${'─'.repeat(20)}  ${'─'.repeat(8)}  ${'─'.repeat(8)}  ${'─'.repeat(7)}`);
  console.log(`  ${'TOTAL'.padEnd(30)} ${''.padEnd(22)} ${String(totalEnriched).padEnd(10)} ${String(totalSequenced).padEnd(10)} ${String(totalFunding).padEnd(9)}`);
  console.log(`\n  Completed in ${elapsed}s`);
  console.log('═'.repeat(80));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const startedAt = Date.now();

  if (SINGLE_CAMPAIGN && ENRICH_ONLY) {
    // Single-campaign enrichment mode
    console.log(`\n━━━ Running enrichment + sequencing for single campaign: ${SINGLE_CAMPAIGN} ━━━\n`);
    const result = await runEnrichment(SINGLE_CAMPAIGN);
    const p = await pipelineSummary(SINGLE_CAMPAIGN);

    console.log(JSON.stringify({
      campaignId: SINGLE_CAMPAIGN,
      enriched: result.enrichResult?.processedContacts || 0,
      sequenced: result.sequencedCount || 0,
      error: result.enrichError || result.sequenceError || null,
      pipeline: p,
    }, null, 2));

    console.log(`\nCompleted in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
    return;
  }

  // ── Load blueprints ──
  console.log('\n━━━ Loading blueprints ━━━\n');
  const blueprints = await loadBlueprints();
  console.log(`Found ${blueprints.length} blueprints:\n`);
  for (const bp of blueprints) {
    console.log(`  ${bp.file.padEnd(30)} → ${bp.campaignName} (${bp.recordCount} research, ${bp.prospectCount} prospects)`);
  }

  if (blueprints.length === 0) {
    console.log('\nNo blueprints to process. Exiting.');
    return;
  }

  // ── Bootstrap phase ──
  if (!ENRICH_ONLY) {
    console.log('\n━━━ Bootstrapping campaigns ━━━\n');
    for (const bp of blueprints) {
      try {
        await bootstrapBlueprint(bp);
        console.log(`  ✓ ${bp.campaignId.padEnd(30)} ${bp.campaignName}`);
      } catch (err) {
        console.error(`  ✗ ${bp.campaignId.padEnd(30)} ${err.message}`);
      }
    }
  }

  if (BOOTSTRAP_ONLY) {
    console.log('\n━━━ Bootstrap complete (--bootstrap-only, skipping enrichment/sequencing) ━━━');
    return;
  }

  if (FUNDING_ONLY) {
    console.log('\n━━━ Funding-only mode — skipping bootstrap and enrichment ━━━\n');
    const results = [];
    for (const bp of blueprints) {
      process.stdout.write(`  → ${bp.campaignId}... `);
      try {
        const funding = await runFunding(bp.campaignId);
        results.push({
          campaignId: bp.campaignId,
          campaignName: bp.campaignName,
          designTheme: bp.designTheme,
          enriched: 0,
          sequenced: 0,
          fundingProcessed: funding.fundingProcessed || 0,
          error: funding.fundingError || null,
          pipelineCounts: null,
        });
        const fundingStr = `${funding.fundingProcessed || 0} investor steps`;
        const errStr = funding.fundingError ? `, ERROR: ${funding.fundingError}` : '';
        console.log(`✓ (${fundingStr})${errStr}`);
      } catch (err) {
        results.push({ campaignId: bp.campaignId, error: err.message });
        console.log(`✗ ${err.message}`);
      }
    }
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    printSummary(results, elapsed);
    return;
  }

  // ── Enrichment + Sequencing phase ──
  console.log('\n━━━ Running enrichment + sequencing across all campaigns ━━━\n');

  const results = [];
  for (const bp of blueprints) {
    process.stdout.write(`  → ${bp.campaignId}... `);
    try {
      const result = await runEnrichment(bp.campaignId);
      const funding = await runFunding(bp.campaignId);
      const p = await pipelineSummary(bp.campaignId);
      results.push({
        campaignId: bp.campaignId,
        campaignName: bp.campaignName,
        designTheme: bp.designTheme,
        enriched: result.processedCount || 0,
        sequenced: result.sequencedCount || 0,
        fundingProcessed: funding.fundingProcessed || 0,
        error: result.enrichError || result.sequenceError || funding.fundingError || null,
        pipelineCounts: p,
      });
      const enrichedStr = `${result.processedCount || 0} enriched`;
      const seqStr = result.sequencedCount ? `, ${result.sequencedCount} sequenced` : '';
      const fundingStr = `, ${funding.fundingProcessed || 0} investor steps`;
      const errStr = result.enrichError || result.sequenceError || funding.fundingError ? `, ERROR: ${result.enrichError || result.sequenceError || funding.fundingError}` : '';
      console.log(`✓ (${enrichedStr}${seqStr}${fundingStr})${errStr}`);
    } catch (err) {
      results.push({ campaignId: bp.campaignId, error: err.message });
      console.log(`✗ ${err.message}`);
    }
  }

  // ── Summary Report ──
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  printSummary(results, elapsed);
}

main().catch(err => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
