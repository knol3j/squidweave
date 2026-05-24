#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const API_BASE = process.env.SQUIDWEAVE_API_BASE || 'http://127.0.0.1:4010';
const blueprintPath = process.argv[2] || 'automation/blueprints/global-b2b-launch.json';

async function api(path, init = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

function withCampaignId(items, campaignId) {
  return (items || []).map(item => ({ ...item, campaignId }));
}

async function main() {
  const raw = await readFile(blueprintPath, 'utf8');
  const blueprint = JSON.parse(raw);
  const campaign = blueprint.campaign || {};
  const campaignId = campaign.id || 'main-campaign';

  await api('/campaigns', {
    method: 'POST',
    body: JSON.stringify({ ...campaign, id: campaignId }),
  });

  const researchRecords = withCampaignId(blueprint.researchRecords, campaignId);
  if (researchRecords.length) {
    await api('/research/records', {
      method: 'POST',
      body: JSON.stringify({ records: researchRecords }),
    });
  }

  const prospects = blueprint.prospects || [];
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

  const [plan, pipeline] = await Promise.all([
    api(`/prospecting/plan?campaignId=${encodeURIComponent(campaignId)}`),
    api(`/prospects/pipeline?campaignId=${encodeURIComponent(campaignId)}`),
  ]);

  console.log(JSON.stringify({
    ok: true,
    apiBase: API_BASE,
    blueprintPath,
    campaignId,
    researchRecordsLoaded: researchRecords.length,
    prospectsLoaded: prospects.length,
    designTheme: campaign.designTheme || null,
    paletteSize: Array.isArray(campaign.designPalette) ? campaign.designPalette.length : 0,
    sourcingTargets: plan?.targetSummary?.actionableTargets ?? null,
    pipelineCounts: pipeline?.counts ?? null,
  }, null, 2));
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
