#!/usr/bin/env node

const baseUrl = process.env.SQUIDWEAVE_BASE_URL || "http://127.0.0.1:4010";
const apiKey = process.env.SQUIDWEAVE_API_KEY || "";

const headers = {
  "content-type": "application/json",
  ...(apiKey ? { "x-api-key": apiKey } : {}),
};

async function request(path, init = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${path} failed (${res.status}): ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
}

function compactPolicy(policy = {}) {
  const cls = policy.classification || {};
  return `${cls.objectiveMode || "unknown"}/${cls.budgetMode || "unknown"}`;
}

async function run() {
  const campaignId = `smoke-${Date.now()}`;
  const objective = "Grow B2B SaaS pipeline and prepare seed fundraising";

  const health = await request("/health");
  if (!health?.ok) throw new Error("/health did not return ok=true");

  await request("/campaigns", {
    method: "POST",
    body: JSON.stringify({
      id: campaignId,
      name: "Automation Smoke Campaign",
      objective,
    }),
  });

  const sourceHealth = await request("/sources/health");
  const ingestion = await request("/sources/ingest", {
    method: "POST",
    body: JSON.stringify({ campaignId, query: objective, limit: 2 }),
  });

  const autopilot = await request("/automation/prompt-run", {
    method: "POST",
    body: JSON.stringify({
      campaignId,
      prompt: objective,
      sourceLimit: 2,
      prospectLimit: 20,
      enrichLimit: 20,
      sequenceLimit: 20,
      fundingLimit: 10,
    }),
  });

  const prospects = await request(`/prospects?campaignId=${encodeURIComponent(campaignId)}`);
  const investors = await request(`/funding/investors?campaignId=${encodeURIComponent(campaignId)}`);
  const fundingRuns = await request(`/funding/runs?campaignId=${encodeURIComponent(campaignId)}`);

  const summary = {
    ok: true,
    baseUrl,
    campaignId,
    dryRun: Boolean(health?.dryRun),
    sourceHealth: {
      total: sourceHealth?.total || 0,
      healthy: sourceHealth?.healthy || 0,
    },
    ingestion: {
      researchRecords: ingestion?.researchRecords?.length || 0,
      investorRecords: ingestion?.investorRecords?.length || 0,
      failedSources: (ingestion?.sourceRuns || []).filter(x => !x.ok).length,
    },
    autopilot: {
      status: autopilot?.job?.status || "unknown",
      policy: compactPolicy(autopilot?.policy),
      stages: (autopilot?.executionLog || []).map(s => `${s.stage}:${s.status}`),
      generatedProspects: autopilot?.prospecting?.run?.generatedCandidates
        || autopilot?.prospecting?.candidates?.length
        || 0,
      enrichedProspects: autopilot?.enrichment?.run?.processedContacts || 0,
      sequencedProspects: autopilot?.sequencing?.run?.processedContacts || 0,
      processedInvestors: autopilot?.funding?.sequence?.run?.processedInvestors || 0,
    },
    datastore: {
      prospects: Array.isArray(prospects) ? prospects.length : 0,
      investors: Array.isArray(investors) ? investors.length : 0,
      fundingRuns: Array.isArray(fundingRuns) ? fundingRuns.length : 0,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error("automation smoke failed:", error.message);
  process.exit(1);
});
