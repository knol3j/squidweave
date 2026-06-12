import test from "node:test";
import assert from "node:assert/strict";
import { AutomationEngine } from "../src/lib/automation-engine.mjs";

test("AutomationEngine includes agent runs in campaign execution", async () => {
  const storedRuns = [];
  const store = {
    getCampaign(campaignId) {
      return campaignId === "c1" ? { id: "c1", enabledModules: ["ClientIntake", "AnalyticsWatch"], locales: ["en-US"] } : null;
    },
    listResearchRecords() {
      return [{
        id: "r1",
        campaignId: "c1",
        targetId: "t1",
        company: "Acme",
        segment: "Mid-market SaaS",
        region: "US",
        preferredChannel: "email",
        fitScore: 0.8,
        metadata: {
          sourceUrl: "https://acme.example",
          verificationStatus: "user-confirmed",
          evidence: ["Confirmed ICP"],
        },
      }];
    },
    async addContentPack(pack) {
      return pack;
    },
    async addAutomationRun(run) {
      storedRuns.push(run);
      return run;
    },
  };

  const engine = new AutomationEngine({
    store,
    decisionEngine: {
      async run() {
        return {
          id: "d1",
          summary: { derived: {}, totals: {}, eventCount: 0 },
          memoryContext: {},
          targeting: { topTargets: [], initialTargets: [], reengagementQueue: [] },
          plan: { recommendedAction: { type: "launch_test_batch", reason: "test" } },
        };
      },
    },
    planner: {
      async buildLocalizedContentPack() {
        return { variants: [{ locale: "en-US", headline: "H", subject: "S", cta: "C", channel: "email" }] };
      },
    },
    memoryEngine: {
      async consolidateCampaign() {},
    },
    agentOrchestrator: {
      async runCampaign() {
        return {
          agentRuns: [{ id: "a1", agentId: "ClientIntake", status: "completed" }, { id: "a2", agentId: "AnalyticsWatch", status: "completed" }],
          lifecycle: { coverage: [{ stage: "Intake", completed: 1, total: 1 }], activeAgents: 2 },
        };
      },
    },
  });

  const result = await engine.runCampaign("c1", { reason: "test" });

  assert.equal(result.agentRuns.length, 2);
  assert.equal(result.run.agentRunCount, 2);
  assert.deepEqual(result.run.agentRunIds, ["a1", "a2"]);
  assert.equal(storedRuns[0].lifecycle.activeAgents, 2);
});

test("AutomationEngine blocks before downstream work when research needs verification", async () => {
  const storedRuns = [];
  let decisionRan = false;
  const engine = new AutomationEngine({
    store: {
      getCampaign(campaignId) {
        return campaignId === "c1" ? { id: "c1", name: "Acme" } : null;
      },
      listResearchRecords() {
        return [{ id: "r1", campaignId: "c1", targetId: "t1", company: "Acme", source: "rss", metadata: {} }];
      },
      async addAutomationRun(run) {
        storedRuns.push(run);
        return run;
      },
    },
    decisionEngine: {
      async run() {
        decisionRan = true;
        throw new Error("decision should not run");
      },
    },
    planner: {},
    memoryEngine: {
      async consolidateCampaign() {
        throw new Error("memory should not run");
      },
    },
    agentOrchestrator: null,
  });

  const result = await engine.runCampaign("c1", { reason: "test" });

  assert.equal(result.blocked, true);
  assert.equal(decisionRan, false);
  assert.equal(storedRuns[0].status, "blocked");
  assert.equal(storedRuns[0].blockedStage, "research-verification");
  assert.ok(result.questions.length > 0);
});
