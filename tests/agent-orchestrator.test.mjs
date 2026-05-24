import test from "node:test";
import assert from "node:assert/strict";
import { AgentOrchestrator } from "../src/lib/agent-orchestrator.mjs";

function createStore() {
  const agentRuns = [];
  return {
    getCampaign(campaignId) {
      return campaignId === "c1"
        ? {
            id: "c1",
            clientName: "Acme",
            clientNeed: "Generate qualified demos",
            objective: "Generate qualified demos",
            audience: "RevOps leaders",
            offer: "Pipeline audit",
            successDefinition: "20 SQLs",
            differentiators: "Deep GTM diagnostics",
            markets: ["en-US", "de-DE"],
            locales: ["en-US", "de-DE"],
            channel: "linkedin",
            brandVoice: "direct",
            enabledModules: ["ClientIntake", "IntentMiner", "OutboundOrchestrator", "AnalyticsWatch", "ComplianceSentinel"],
          }
        : null;
    },
    getLatestContentPack() {
      return {
        id: "pack1",
        variants: [{ locale: "en-US", headline: "Book a pipeline audit", subject: "Audit", cta: "Book now", channel: "linkedin" }],
      };
    },
    listResearchRecords() {
      return [
        {
          targetId: "t1",
          company: "Northwind",
          segment: "SaaS",
          region: "US",
          title: "VP Revenue",
          preferredChannel: "linkedin",
          channels: ["linkedin", "email"],
          metadata: { evidence: ["Hiring SDRs", "Expanding revenue ops"] },
        },
      ];
    },
    listOutreachEvents() {
      return [{ targetId: "t1", type: "positive_reply" }];
    },
    listEvents() {
      return [{ campaignId: "c1", type: "click", value: 12 }];
    },
    listDecisions() {
      return [];
    },
    listAutomationRuns() {
      return [];
    },
    listAgentRuns() {
      return agentRuns;
    },
    async addAgentRuns(runs) {
      agentRuns.push(...runs);
    },
  };
}

test("AgentOrchestrator emits distinct runs for enabled lifecycle agents", async () => {
  const orchestrator = new AgentOrchestrator({ store: createStore() });
  const result = await orchestrator.runCampaign("c1", {
    decision: { id: "d1" },
    summary: { derived: { roas: 2.4 }, totals: { click: 12 } },
    targeting: {
      topTargets: [
        { targetId: "t1", company: "Northwind", score: 0.91, reasons: ["fit 90%", "intent 88%"], recommendation: "advance", recommendedChannel: "linkedin", channels: ["linkedin"], segment: "SaaS", region: "US" },
      ],
      initialTargets: [],
      reengagementQueue: [],
    },
    memoryContext: {},
  });

  assert.equal(result.agentRuns.length, 5);
  assert.deepEqual(result.agentRuns.map(run => run.agentId), ["ClientIntake", "IntentMiner", "OutboundOrchestrator", "AnalyticsWatch", "ComplianceSentinel"]);
  assert.equal(result.lifecycle.activeAgents, 5);
  assert.equal(result.agentRuns[1].output.topTargets[0].targetId, "t1");
});
