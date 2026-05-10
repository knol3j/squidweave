import test from "node:test";
import assert from "node:assert/strict";
import { DecisionEngine } from "../src/lib/decision-engine.mjs";

function createPlanner(action = { type: "launch_test_batch", delta: 10, reason: "Seed live signal." }) {
  return {
    async buildActionPlan() {
      return {
        source: "test",
        confidence: 0.9,
        rationale: "Test plan",
        recommendedAction: action,
      };
    },
  };
}

function createStore(campaign = {}) {
  const decisions = [];
  return {
    getCampaign(campaignId) {
      return campaign.id === campaignId ? campaign : null;
    },
    listEvents() {
      return [];
    },
    listDecisions() {
      return decisions;
    },
    async addDecision(decision) {
      decisions.push(decision);
    },
    getLatestContentPack() {
      return null;
    },
  };
}

function createConnector(name) {
  return {
    async execute(action) {
      return {
        connector: name,
        accepted: true,
        action,
      };
    },
  };
}

test("DecisionEngine executes across all configured campaign connectors", async () => {
  const store = createStore({
    id: "c1",
    channel: "email",
    connector: "openclaw",
    connectors: ["openclaw", "clawdbot"],
  });
  const engine = new DecisionEngine({
    store,
    planner: createPlanner(),
    connectors: {
      openclaw: createConnector("openclaw"),
      clawdbot: createConnector("clawdbot"),
    },
    config: {
      maxUnsubscribeRate: 0.03,
      minRoasToScaleUp: 2,
      maxDailyBudgetDelta: 0.2,
      maxOutreachBatch: 50,
      decisionCooldownMinutes: 30,
      defaultConnector: "openclaw",
    },
    targetingEngine: {
      buildDecision() {
        return { topTargets: [], reengagementQueue: [] };
      },
    },
    memoryEngine: {
      buildDecisionContext() {
        return { recalled: true };
      },
    },
  });

  const decision = await engine.run("c1");

  assert.equal(decision.executions.length, 2);
  assert.deepEqual(decision.executions.map(item => item.connector), ["openclaw", "clawdbot"]);
  assert.equal(decision.execution.connector, "openclaw");
});
