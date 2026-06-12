import test from "node:test";
import assert from "node:assert/strict";
import { ContactSourcingEngine } from "../src/lib/contact-sourcing-engine.mjs";

function buildStore() {
  const state = {
    prospectingRuns: [],
    sourcedContacts: [],
    campaigns: {
      "c1": {
        id: "c1",
        clientNeed: "Build a predictable outbound pipeline",
        objective: "Create cold outreach pipeline",
        audience: "VP Marketing, Revenue Operations Director",
        offer: "Book a strategy audit",
        channel: "email",
        constraints: "Avoid consumer data and unverified emails",
      },
    },
    researchRecords: [
      {
        id: "r1",
        campaignId: "c1",
        targetId: "acme",
        company: "Acme",
        title: "VP Marketing",
        segment: "Mid-market SaaS",
        region: "US",
        preferredChannel: "email",
        channels: ["email", "linkedin"],
        fitScore: 0.92,
        intentScore: 0.83,
        recencyScore: 0.8,
        metadata: {
          sourceUrl: "https://example.com/acme",
          verificationStatus: "source-verified",
          evidence: ["Recent expansion", "Hiring SDR leaders"],
        },
      },
      {
        id: "r2",
        campaignId: "c1",
        targetId: "northwind",
        company: "Northwind",
        title: "Head of Growth",
        segment: "PLG SaaS",
        region: "UK",
        preferredChannel: "linkedin",
        channels: ["linkedin"],
        fitScore: 0.78,
        intentScore: 0.74,
        recencyScore: 0.69,
        metadata: {
          sourceUrl: "https://example.com/northwind",
          verificationStatus: "source-verified",
          evidence: ["New pricing page", "Product launch"],
        },
      },
    ],
  };

  return {
    getCampaign(campaignId) {
      return state.campaigns[campaignId] || null;
    },
    listResearchRecords(campaignId) {
      return state.researchRecords.filter(record => record.campaignId === campaignId);
    },
    async addProspectingRun(run) {
      state.prospectingRuns.push(run);
      return run;
    },
    async addSourcedContacts(contacts) {
      state.sourcedContacts.push(...contacts);
      return contacts;
    },
    snapshot() {
      return structuredClone(state);
    },
  };
}

function buildEngine() {
  const store = buildStore();
  const engine = new ContactSourcingEngine({
    store,
    targetingEngine: {
      buildDecision() {
        return {
          totalTargets: 12,
          actionableTargets: 5,
        };
      },
    },
    memoryEngine: {
      buildDecisionContext() {
        return {
          playbooks: [
            {
              segment: "Mid-market SaaS",
              region: "US",
              recommendedChannel: "email",
              confidence: 0.84,
            },
          ],
        };
      },
    },
  });

  return { engine, store };
}

test("ContactSourcingEngine builds a structured sourcing plan", () => {
  const { engine } = buildEngine();
  const plan = engine.buildPlan("c1");

  assert.equal(plan.campaignId, "c1");
  assert.equal(plan.topAccounts.length, 2);
  assert.equal(plan.topAccounts[0].company, "Acme");
  assert.ok(plan.topAccounts[0].roleClusters.includes("VP Marketing"));
  assert.ok(plan.enrichmentChecklist.some(item => item.includes("suppression")));
  assert.deepEqual(plan.targetSummary, { totalTargets: 12, actionableTargets: 5 });
  assert.equal(plan.proceduralSignals[0].channel, "email");
});

test("ContactSourcingEngine generates prioritized candidate contacts", () => {
  const { engine } = buildEngine();
  const candidates = engine.generateCandidates("c1", { limit: 6 });

  assert.equal(candidates.length, 6);
  assert.equal(candidates[0].contactStatus, "needs-enrichment");
  assert.equal(candidates[0].complianceStatus, "pending-review");
  assert.match(candidates[0].searchQuery, /Acme/);
  assert.ok(candidates.every(candidate => candidate.score >= 0 && candidate.score <= 1));
});

test("ContactSourcingEngine persists prospecting runs and generated contacts", async () => {
  const { engine, store } = buildEngine();
  const result = await engine.generateAndPersist("c1", { reason: "test-run", limit: 5 });
  const snapshot = store.snapshot();

  assert.equal(result.run.reason, "test-run");
  assert.equal(result.candidates.length, 5);
  assert.equal(snapshot.prospectingRuns.length, 1);
  assert.equal(snapshot.sourcedContacts.length, 5);
});

test("ContactSourcingEngine normalizes imported contacts", async () => {
  const { engine } = buildEngine();
  const imported = await engine.importContacts("c1", [
    {
      company: "Acme",
      contactName: "Morgan Lee",
      role: "VP Marketing",
      email: "Morgan@Acme.com ",
      linkedinUrl: "https://linkedin.com/in/morgan",
    },
  ], { source: "apollo" });

  assert.equal(imported.length, 1);
  assert.equal(imported[0].fullName, "Morgan Lee");
  assert.equal(imported[0].title, "VP Marketing");
  assert.equal(imported[0].email, "morgan@acme.com");
  assert.equal(imported[0].source, "apollo");
});
