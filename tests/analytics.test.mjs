import test from "node:test";
import assert from "node:assert/strict";
import { summarizeCampaign } from "../src/lib/analytics.mjs";
import { evaluatePolicy } from "../src/lib/policy.mjs";

test("summarizeCampaign calculates derived metrics", () => {
  const summary = summarizeCampaign(
    { id: "c1", dailyBudget: 100 },
    [
      { campaignId: "c1", type: "impression", value: 1000 },
      { campaignId: "c1", type: "click", value: 20 },
      { campaignId: "c1", type: "conversion", value: 4 },
      { campaignId: "c1", type: "spend", value: 50 },
      { campaignId: "c1", type: "revenue", value: 175 },
    ],
  );

  assert.equal(summary.derived.ctr, 0.02);
  assert.equal(summary.derived.cvr, 0.2);
  assert.equal(summary.derived.roas, 3.5);
});

test("evaluatePolicy pauses unsafe outreach", () => {
  const result = evaluatePolicy(
    { id: "c1", channel: "email", dailyBudget: 100 },
    {
      totals: { impression: 100, click: 0, conversion: 0, reply: 0, positive_reply: 0, unsubscribe: 5, spend: 0, revenue: 0 },
      derived: { unsubscribeRate: 0.05, roas: 0, ctr: 0, positiveReplyRate: 0 },
    },
    {
      maxUnsubscribeRate: 0.03,
      minRoasToScaleUp: 2,
      maxDailyBudgetDelta: 0.2,
      maxOutreachBatch: 50,
      decisionCooldownMinutes: 30,
    },
    [],
  );

  assert.equal(result.status, "ready");
  assert.equal(result.allowedActions[0].type, "pause_outreach");
});
