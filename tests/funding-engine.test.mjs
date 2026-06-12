import test from "node:test";
import assert from "node:assert/strict";
import { FundingEngine } from "../src/lib/funding-engine.mjs";

function createStore() {
  const state = {
    campaigns: {
      c1: { id: "c1", name: "Seed Raise", fundingStage: "seed" },
    },
    investorRecords: [],
    fundingOutreachEvents: [],
    fundingRuns: [],
  };

  return {
    getCampaign(campaignId) {
      return state.campaigns[campaignId] || null;
    },
    listInvestorRecords(campaignId) {
      return state.investorRecords.filter(item => item.campaignId === campaignId);
    },
    async addInvestorRecords(records) {
      state.investorRecords.push(...records);
      return records;
    },
    async addFundingOutreachEvents(events) {
      state.fundingOutreachEvents.push(...events);
      return events;
    },
    async addFundingRun(run) {
      state.fundingRuns.push(run);
      return run;
    },
    snapshot() {
      return structuredClone(state);
    },
  };
}

test("FundingEngine scores investors and builds prioritized pipeline", async () => {
  const store = createStore();
  const engine = new FundingEngine({ store });

  const imported = engine.importInvestors("c1", [
    { fundName: "Top Fund", thesisMatch: 0.95, stageMatch: 0.9, checkSizeMatch: 0.8, warmPath: 0.7 },
    { fundName: "Lower Fund", thesisMatch: 0.5, stageMatch: 0.4, checkSizeMatch: 0.3, warmPath: 0.2 },
  ]);
  await store.addInvestorRecords(imported);

  const pipeline = engine.buildPipeline("c1");
  assert.equal(pipeline.counts.total, 2);
  assert.equal(pipeline.prioritized[0].fundName, "Top Fund");
  assert.ok(pipeline.prioritized[0].score > pipeline.prioritized[1].score);
});

test("FundingEngine runCampaign sequences outreach and records run", async () => {
  const store = createStore();
  const engine = new FundingEngine({ store });

  const imported = engine.importInvestors("c1", [
    { fundName: "A", partnerName: "A Partner", email: "a@example.com", thesisMatch: 0.9, stageMatch: 0.9, checkSizeMatch: 0.9, warmPath: 0.9 },
    { fundName: "B", partnerName: "B Partner", email: "b@example.com", thesisMatch: 0.8, stageMatch: 0.8, checkSizeMatch: 0.8, warmPath: 0.8 },
  ]);
  await store.addInvestorRecords(imported);

  const result = await engine.runCampaign("c1", { limit: 5 });
  assert.equal(result.sequence.run.processedInvestors, 2);
  const snapshot = store.snapshot();
  assert.equal(snapshot.fundingOutreachEvents.length, 2);
  assert.equal(snapshot.fundingRuns.length, 1);
});
