import { normalizeResearchRecord } from "./targeting-engine.mjs";

function dedupeByTarget(records = []) {
  const map = new Map();
  for (const record of records) {
    if (!record?.targetId) continue;
    if (!map.has(record.targetId)) map.set(record.targetId, record);
  }
  return [...map.values()];
}

export class SourceIngestionEngine {
  constructor({ store, connectors = [] }) {
    this.store = store;
    this.connectors = connectors;
  }

  async health() {
    const checks = [];
    for (const connector of this.connectors) {
      const startedAt = Date.now();
      try {
        const result = await connector.health();
        checks.push({
          source: connector.name,
          ok: true,
          latencyMs: Date.now() - startedAt,
          ...result,
        });
      } catch (error) {
        checks.push({
          source: connector.name,
          ok: false,
          latencyMs: Date.now() - startedAt,
          error: error.message,
        });
      }
    }
    return {
      checkedAt: new Date().toISOString(),
      total: checks.length,
      healthy: checks.filter(item => item.ok).length,
      checks,
    };
  }

  async ingestCampaign(campaignId, { query, limit = 5 } = {}) {
    const campaign = this.store.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Unknown campaign: ${campaignId}`);
    }

    const records = [];
    const investorRecords = [];
    const sourceRuns = [];

    for (const connector of this.connectors) {
      const startedAt = Date.now();
      try {
        const raw = await connector.ingest({ query, campaign, limit });
        const normalized = (raw || []).map(item => normalizeResearchRecord({
          ...item,
          campaignId,
          metadata: {
            ...(item.metadata || {}),
            sourceReliability: item.metadata?.sourceReliability ?? connector.reliability ?? 0.5,
          },
        }));

        records.push(...normalized);
        if (typeof connector.toInvestorRecords === "function") {
          investorRecords.push(...(connector.toInvestorRecords(normalized, campaignId) || []));
        }

        sourceRuns.push({
          source: connector.name,
          ok: true,
          records: normalized.length,
          investors: typeof connector.toInvestorRecords === "function" ? investorRecords.length : 0,
          latencyMs: Date.now() - startedAt,
        });
      } catch (error) {
        sourceRuns.push({
          source: connector.name,
          ok: false,
          records: 0,
          error: error.message,
          latencyMs: Date.now() - startedAt,
        });
      }
    }

    const uniqueRecords = dedupeByTarget(records);
    const persisted = [];
    for (const record of uniqueRecords) {
      // keep writes explicit for existing store API
      persisted.push(await this.store.addResearchRecord(record));
    }

    let importedInvestors = [];
    if (investorRecords.length && this.store.addInvestorRecords) {
      importedInvestors = await this.store.addInvestorRecords(investorRecords);
    }

    return {
      campaignId,
      query,
      ingestedAt: new Date().toISOString(),
      sourceRuns,
      researchRecords: persisted,
      investorRecords: importedInvestors,
    };
  }
}
