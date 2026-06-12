import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOutreachEvent, normalizeResearchRecord, TargetingEngine } from "../src/lib/targeting-engine.mjs";

function createStore(records = [], outreachEvents = []) {
  return {
    getCampaign(campaignId) {
      return { id: campaignId, name: "Test Campaign" };
    },
    listResearchRecords(campaignId) {
      return records.filter(record => !campaignId || record.campaignId === campaignId);
    },
    listOutreachEvents(campaignId, targetId) {
      return outreachEvents.filter(event => {
        if (campaignId && event.campaignId !== campaignId) {
          return false;
        }
        if (targetId && event.targetId !== targetId) {
          return false;
        }
        return true;
      });
    },
    listPlaybooks(campaignId) {
      return [];
    },
  };
}

function actionableResearchRecord(input) {
  return normalizeResearchRecord({
    segment: "Mid-market SaaS",
    region: "US",
    preferredChannel: "email",
    ...input,
    metadata: {
      sourceUrl: `https://example.com/${input.targetId || "target"}`,
      evidence: ["Verified company signal"],
      verificationStatus: "source-verified",
      ...(input.metadata || {}),
    },
  });
}

test("TargetingEngine ranks fresh high-intent targets above suppressed ones", () => {
  const records = [
    actionableResearchRecord({
      campaignId: "c1",
      targetId: "t1",
      company: "Alpha",
      fitScore: 0.92,
      intentScore: 0.88,
      recencyScore: 0.81,
      capturedAt: "2026-05-07T12:00:00.000Z",
    }),
    actionableResearchRecord({
      campaignId: "c1",
      targetId: "t2",
      company: "Beta",
      fitScore: 0.9,
      intentScore: 0.85,
      recencyScore: 0.8,
      capturedAt: "2026-05-07T12:00:00.000Z",
    }),
  ];
  const outreachEvents = [
    normalizeOutreachEvent({
      campaignId: "c1",
      targetId: "t2",
      type: "unsubscribe",
      timestamp: "2026-05-07T13:00:00.000Z",
    }),
  ];

  const engine = new TargetingEngine({ store: createStore(records, outreachEvents) });
  const rankings = engine.rankTargets("c1");

  assert.equal(rankings[0].targetId, "t1");
  assert.equal(rankings[1].recommendation, "suppress");
  assert.equal(rankings[1].score, 0);
});

test("TargetingEngine builds a reengagement queue from real outreach timing", () => {
  const records = [
    actionableResearchRecord({
      campaignId: "c1",
      targetId: "t3",
      company: "Gamma",
      fitScore: 0.8,
      intentScore: 0.76,
      recencyScore: 0.72,
      capturedAt: "2026-05-01T12:00:00.000Z",
    }),
  ];
  const outreachEvents = [
    normalizeOutreachEvent({
      campaignId: "c1",
      targetId: "t3",
      type: "open",
      timestamp: "2026-05-03T12:00:00.000Z",
    }),
  ];

  const engine = new TargetingEngine({ store: createStore(records, outreachEvents) });
  const decision = engine.buildDecision("c1");

  assert.equal(decision.reengagementQueue.length, 1);
  assert.equal(decision.reengagementQueue[0].targetId, "t3");
  assert.equal(decision.reengagementQueue[0].recommendation, "reengage");
});

test("TargetingEngine uses learned cadence days for sent-only outreach", () => {
  const now = new Date();
  const capturedAt = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString();
  const sentAt = new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)).toISOString();
  const expectedNextEligibleAt = new Date(new Date(sentAt).getTime() + (5 * 24 * 60 * 60 * 1000)).toISOString();
  const records = [
    actionableResearchRecord({
      campaignId: "c1",
      targetId: "t4",
      company: "Delta",
      fitScore: 0.84,
      intentScore: 0.79,
      recencyScore: 0.74,
      preferredChannel: "linkedin",
      segment: "b2b-tech-saas",
      region: "global",
      capturedAt,
    }),
  ];
  const outreachEvents = [
    normalizeOutreachEvent({
      campaignId: "c1",
      targetId: "t4",
      type: "sent",
      channel: "linkedin",
      timestamp: sentAt,
    }),
  ];
  const store = createStore(records, outreachEvents);
  store.listPlaybooks = () => [{
    id: "pb-1",
    segment: "b2b-tech-saas",
    region: "global",
    recommendedChannel: "linkedin",
    cadenceDays: 5,
    confidence: 0.8,
  }];

  const engine = new TargetingEngine({ store });
  const rankings = engine.rankTargets("c1");

  assert.equal(rankings[0].nextEligibleAt, expectedNextEligibleAt);
  assert.equal(rankings[0].recommendation, "wait");
});

test("TargetingEngine boosts records with higher source reliability", () => {
  const base = {
    campaignId: "c1",
    fitScore: 0.7,
    intentScore: 0.7,
    recencyScore: 0.7,
    capturedAt: "2026-05-07T12:00:00.000Z",
  };
  const records = [
    actionableResearchRecord({
      ...base,
      targetId: "hi",
      company: "Reliable Co",
      source: "sec",
      metadata: { sourceReliability: 0.9 },
    }),
    actionableResearchRecord({
      ...base,
      targetId: "lo",
      company: "Noisy Co",
      source: "reddit",
      metadata: { sourceReliability: 0.45 },
    }),
  ];
  const engine = new TargetingEngine({ store: createStore(records, []) });
  const rankings = engine.rankTargets("c1");

  assert.equal(rankings[0].targetId, "hi");
  assert.ok(rankings[0].score > rankings[1].score);
  assert.equal(rankings[0].sourceReliability, 0.9);
});
