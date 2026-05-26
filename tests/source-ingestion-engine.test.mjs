import test from "node:test";
import assert from "node:assert/strict";
import { SourceIngestionEngine } from "../src/lib/source-ingestion-engine.mjs";

function createStore() {
  const state = {
    campaigns: { c1: { id: "c1", objective: "Grow revenue" } },
    researchRecords: [],
    investorRecords: [],
  };
  return {
    getCampaign(id) {
      return state.campaigns[id] || null;
    },
    async addResearchRecord(record) {
      state.researchRecords.push(record);
      return record;
    },
    async addInvestorRecords(records) {
      state.investorRecords.push(...records);
      return records;
    },
    snapshot() {
      return structuredClone(state);
    },
  };
}

test("SourceIngestionEngine ingests records and investor records", async () => {
  const store = createStore();
  const engine = new SourceIngestionEngine({
    store,
    connectors: [
      {
        name: "mock-source",
        reliability: 0.7,
        async health() { return { name: "mock-source", ok: true }; },
        async ingest() {
          return [{
            source: "mock-source",
            targetId: "t1",
            company: "Acme",
            fitScore: 0.7,
            intentScore: 0.6,
            recencyScore: 0.8,
            metadata: { sourceUrl: "https://example.com", evidence: ["signal"] },
          }];
        },
        toInvestorRecords(records, campaignId) {
          return [{ campaignId, fundName: `${records[0].company} Ventures`, thesisMatch: 0.7, stageMatch: 0.6, checkSizeMatch: 0.5, warmPath: 0.5 }];
        },
      },
    ],
  });

  const result = await engine.ingestCampaign("c1", { query: "acme", limit: 3 });
  assert.equal(result.researchRecords.length, 1);
  assert.equal(result.investorRecords.length, 1);
  const snapshot = store.snapshot();
  assert.equal(snapshot.researchRecords.length, 1);
  assert.equal(snapshot.investorRecords.length, 1);
  assert.equal(snapshot.researchRecords[0].metadata.sourceReliability, 0.7);
});
