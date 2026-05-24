import test from "node:test";
import assert from "node:assert/strict";
import { ProspectActivationEngine } from "../src/lib/prospect-activation-engine.mjs";

function buildStore() {
  const state = {
    activationRuns: [],
    campaigns: {
      "c1": {
        id: "c1",
        objective: "Generate meetings",
        clientNeed: "Build a compliant outbound engine",
        offer: "strategy audit",
        channel: "linkedin",
        connector: "openclaw",
      },
    },
    sourcedContacts: [
      {
        id: "p1",
        campaignId: "c1",
        targetId: "t1",
        company: "Acme",
        role: "vp marketing",
        preferredChannel: "email",
        complianceStatus: "pending-review",
        contactStatus: "needs-enrichment",
        email: "morgan@acme.com",
        evidence: ["Recent hiring"],
        createdAt: new Date().toISOString(),
      },
      {
        id: "p2",
        campaignId: "c1",
        targetId: "t2",
        company: "Northwind",
        role: "head of growth",
        preferredChannel: "linkedin",
        complianceStatus: "reviewed",
        contactStatus: "ready-for-sequencing",
        linkedinUrl: "https://linkedin.com/in/jamie",
        createdAt: new Date().toISOString(),
      },
    ],
  };

  return {
    getCampaign(campaignId) {
      return state.campaigns[campaignId] || null;
    },
    listSourcedContacts(campaignId) {
      return state.sourcedContacts.filter(contact => contact.campaignId === campaignId);
    },
    async updateSourcedContacts(campaignId, updates) {
      const byId = new Map(updates.map(item => [item.id, item]));
      state.sourcedContacts = state.sourcedContacts.map(contact => (
        contact.campaignId === campaignId && byId.has(contact.id)
          ? { ...contact, ...byId.get(contact.id) }
          : contact
      ));
      return this.listSourcedContacts(campaignId);
    },
    async addActivationRun(run) {
      state.activationRuns.push(run);
      return run;
    },
    listActivationRuns(campaignId) {
      return state.activationRuns.filter(run => run.campaignId === campaignId);
    },
    snapshot() {
      return structuredClone(state);
    },
  };
}

test("ProspectActivationEngine summarizes pipeline counts", () => {
  const store = buildStore();
  const engine = new ProspectActivationEngine({ store, connectors: {}, config: { defaultConnector: "openclaw" } });
  const pipeline = engine.buildPipeline("c1");

  assert.equal(pipeline.counts.total, 2);
  assert.equal(pipeline.counts.readyForEnrichment, 1);
  assert.equal(pipeline.counts.readyForSequencing, 1);
});

test("ProspectActivationEngine enriches and advances contacts", async () => {
  const store = buildStore();
  const engine = new ProspectActivationEngine({ store, connectors: {}, config: { defaultConnector: "openclaw" } });
  const result = await engine.enrichContacts("c1", { provider: "apollo" });
  const snapshot = store.snapshot();

  assert.equal(result.run.action, "enrich");
  assert.equal(result.run.provider, "apollo");
  assert.equal(snapshot.activationRuns.length, 1);
  assert.equal(snapshot.sourcedContacts[0].contactStatus, "ready-for-sequencing");
  assert.equal(snapshot.sourcedContacts[0].verificationStatus, "verified");
  assert.equal(snapshot.sourcedContacts[0].complianceStatus, "reviewed");
});

test("ProspectActivationEngine builds reusable sequence plans", async () => {
  const store = buildStore();
  const engine = new ProspectActivationEngine({ store, connectors: {}, config: { defaultConnector: "openclaw" } });
  const result = await engine.sequenceContacts("c1");
  const snapshot = store.snapshot();

  assert.equal(result.run.action, "sequence");
  assert.equal(snapshot.sourcedContacts[1].contactStatus, "sequenced");
  assert.equal(snapshot.sourcedContacts[1].sequenceStatus, "planned");
  assert.equal(snapshot.sourcedContacts[1].sequencePlan.channel, "linkedin");
  assert.equal(snapshot.sourcedContacts[1].sequencePlan.steps.length, 3);
});
