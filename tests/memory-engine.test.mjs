import test from "node:test";
import assert from "node:assert/strict";
import { MemoryEngine } from "../src/lib/memory-engine.mjs";
import { normalizeOutreachEvent, normalizeResearchRecord } from "../src/lib/targeting-engine.mjs";

function createMemoryStore({ campaigns = [], researchRecords = [], outreachEvents = [], decisions = [] } = {}) {
  const state = {
    campaigns,
    researchRecords,
    outreachEvents,
    decisions,
    targetProfiles: [],
    tacticObservations: [],
    playbooks: [],
    memoryConsolidations: [],
  };

  return {
    listCampaigns() {
      return state.campaigns;
    },
    listResearchRecords(campaignId) {
      return state.researchRecords.filter(record => !campaignId || record.campaignId === campaignId);
    },
    listOutreachEvents(campaignId, targetId) {
      return state.outreachEvents.filter(event => {
        if (campaignId && event.campaignId !== campaignId) {
          return false;
        }
        if (targetId && event.targetId !== targetId) {
          return false;
        }
        return true;
      });
    },
    listDecisions(campaignId) {
      return state.decisions.filter(decision => !campaignId || decision.campaignId === campaignId);
    },
    listTargetProfiles(campaignId) {
      return state.targetProfiles.filter(profile => !campaignId || profile.campaignId === campaignId);
    },
    listTacticObservations(campaignId) {
      return state.tacticObservations.filter(observation => !campaignId || observation.campaignId === campaignId);
    },
    listPlaybooks(campaignId) {
      return state.playbooks.filter(playbook => !campaignId || playbook.campaignId === campaignId);
    },
    listMemoryConsolidations(campaignId) {
      return state.memoryConsolidations.filter(snapshot => !campaignId || snapshot.campaignId === campaignId);
    },
    async replaceTargetProfiles(campaignId, profiles) {
      state.targetProfiles = state.targetProfiles.filter(profile => profile.campaignId !== campaignId);
      state.targetProfiles.push(...profiles);
    },
    async replaceTacticObservations(campaignId, observations) {
      state.tacticObservations = state.tacticObservations.filter(observation => observation.campaignId !== campaignId);
      state.tacticObservations.push(...observations);
    },
    async replacePlaybooks(campaignId, playbooks) {
      state.playbooks = state.playbooks.filter(playbook => playbook.campaignId !== campaignId);
      state.playbooks.push(...playbooks);
    },
    async addMemoryConsolidation(snapshot) {
      state.memoryConsolidations.push(snapshot);
    },
  };
}

test("MemoryEngine consolidates target profiles and promotes repeat wins into playbooks", async () => {
  const store = createMemoryStore({
    campaigns: [{ id: "c1", channel: "email" }],
    researchRecords: [
      normalizeResearchRecord({
        campaignId: "c1",
        targetId: "t1",
        company: "Alpha",
        segment: "finance",
        region: "dach",
        preferredChannel: "email",
        channels: ["email", "linkedin"],
        fitScore: 0.91,
        intentScore: 0.82,
        recencyScore: 0.79,
        sourceUrl: "https://alpha.example",
        evidence: ["Quarterly update"],
        capturedAt: "2026-05-01T12:00:00.000Z",
      }),
      normalizeResearchRecord({
        campaignId: "c1",
        targetId: "t2",
        company: "Beta",
        segment: "finance",
        region: "dach",
        preferredChannel: "email",
        channels: ["email"],
        fitScore: 0.88,
        intentScore: 0.8,
        recencyScore: 0.76,
        sourceUrl: "https://beta.example",
        evidence: ["Funding announcement"],
        capturedAt: "2026-05-01T12:00:00.000Z",
      }),
    ],
    outreachEvents: [
      normalizeOutreachEvent({ campaignId: "c1", targetId: "t1", type: "sent", channel: "email", timestamp: "2026-05-02T12:00:00.000Z" }),
      normalizeOutreachEvent({ campaignId: "c1", targetId: "t1", type: "positive_reply", channel: "email", timestamp: "2026-05-03T12:00:00.000Z" }),
      normalizeOutreachEvent({ campaignId: "c1", targetId: "t2", type: "sent", channel: "email", timestamp: "2026-05-02T12:00:00.000Z" }),
      normalizeOutreachEvent({ campaignId: "c1", targetId: "t2", type: "meeting_booked", channel: "email", timestamp: "2026-05-04T12:00:00.000Z" }),
    ],
  });

  const engine = new MemoryEngine({ store });
  const result = await engine.consolidateCampaign("c1");

  assert.equal(result.targetProfiles.length, 2);
  assert.equal(result.playbooks.length, 1);
  assert.equal(result.playbooks[0].recommendedChannel, "email");
  assert.equal(result.playbooks[0].status, "trusted");
});

test("MemoryEngine recall returns procedural and episodic memory for a target", async () => {
  const store = createMemoryStore({
    campaigns: [{ id: "c1", channel: "email" }],
    researchRecords: [
      normalizeResearchRecord({
        campaignId: "c1",
        targetId: "t9",
        company: "Gamma",
        segment: "saas",
        region: "us",
        preferredChannel: "linkedin",
        channels: ["linkedin"],
        fitScore: 0.84,
        intentScore: 0.8,
        recencyScore: 0.78,
        sourceUrl: "https://gamma.example",
        evidence: ["Leadership post"],
      }),
      normalizeResearchRecord({
        campaignId: "c1",
        targetId: "t8",
        company: "Delta",
        segment: "saas",
        region: "us",
        preferredChannel: "linkedin",
        channels: ["linkedin"],
        fitScore: 0.82,
        intentScore: 0.79,
        recencyScore: 0.75,
        sourceUrl: "https://delta.example",
        evidence: ["Website update"],
      }),
    ],
    outreachEvents: [
      normalizeOutreachEvent({ campaignId: "c1", targetId: "t9", type: "click", channel: "linkedin" }),
      normalizeOutreachEvent({ campaignId: "c1", targetId: "t8", type: "positive_reply", channel: "linkedin" }),
    ],
    decisions: [{ id: "d1", campaignId: "c1", createdAt: "2026-05-05T12:00:00.000Z" }],
  });

  const engine = new MemoryEngine({ store });
  await engine.consolidateCampaign("c1");
  const recall = await engine.recall("c1", { targetId: "t9" });

  assert.equal(recall.targetProfile.targetId, "t9");
  assert.ok(recall.episodicMemories.outreachEvents.length >= 1);
  assert.ok(recall.proceduralMemories.length >= 1);
});

test("MemoryEngine merges Hermes recall and syncs persistent memory when configured", async () => {
  const store = createMemoryStore({
    campaigns: [{ id: "c2", channel: "email", objective: "Grow pipeline" }],
    researchRecords: [
      normalizeResearchRecord({
        campaignId: "c2",
        targetId: "t1",
        company: "Omega",
        segment: "security",
        region: "us",
        preferredChannel: "email",
        fitScore: 0.9,
        intentScore: 0.84,
        recencyScore: 0.8,
        sourceUrl: "https://omega.example",
        evidence: ["Product launch"],
      }),
    ],
    outreachEvents: [
      normalizeOutreachEvent({ campaignId: "c2", targetId: "t1", type: "open", channel: "email" }),
    ],
  });
  const hermesClient = {
    isConfigured() {
      return true;
    },
    async syncCampaignMemory(payload) {
      return { synced: true, mode: "live", entries: payload.playbooks.length + 2 };
    },
    async recallCampaignMemory() {
      return {
        mode: "live",
        items: [{ text: "Past winning cadence: email plus proof-led CTA." }],
      };
    },
  };

  const engine = new MemoryEngine({ store, hermesClient });
  const consolidated = await engine.consolidateCampaign("c2");
  const recall = await engine.recall("c2", { targetId: "t1" });
  const decisionContext = await engine.buildDecisionContext("c2");

  assert.equal(consolidated.hermesSync.synced, true);
  assert.equal(recall.externalMemories.length, 1);
  assert.equal(decisionContext.externalMemory.items.length, 1);
});
