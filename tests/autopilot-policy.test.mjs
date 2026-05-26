import test from "node:test";
import assert from "node:assert/strict";
import { buildAutopilotPolicy } from "../src/lib/autopilot-policy.mjs";

test("buildAutopilotPolicy routes zero-budget prompts to organic workflow", () => {
  const policy = buildAutopilotPolicy({
    prompt: "We have $0 ad budget. Focus on organic growth, social posts, Telegram bots, and email outreach.",
    campaign: { id: "c1", dailyBudget: 0 },
  });

  assert.equal(policy.classification.budgetMode, "zero");
  assert.equal(policy.stages.paidAds.enabled, false);
  assert.equal(policy.stages.organicOutreach.enabled, true);
  assert.equal(policy.stages.funding.enabled, false);
  assert.ok(policy.toolRecommendations.creativeProviders.includes("sora"));
  assert.ok(policy.toolRecommendations.creativeProviders.includes("nano-banana"));
});

test("buildAutopilotPolicy routes funded campaigns to paid distribution", () => {
  const policy = buildAutopilotPolicy({
    prompt: "We can spend 15000/month. Run Meta and Google paid campaigns.",
    campaign: { id: "c2", dailyBudget: 500, channel: "paid-social" },
  });

  assert.equal(policy.classification.budgetMode, "paid");
  assert.equal(policy.stages.paidAds.enabled, true);
  assert.ok(policy.stages.paidAds.channels.includes("google_ads"));
  assert.ok(policy.stages.paidAds.channels.includes("meta_ads"));
  assert.equal(policy.stages.organicOutreach.enabled, true);
});

test("buildAutopilotPolicy enables full VC workflow when fundraising is requested", () => {
  const policy = buildAutopilotPolicy({
    prompt: "We are raising a seed round. Do deep market research, investor deck prep, and investor outreach.",
    campaign: { id: "c3", fundingStage: "seed" },
  });

  assert.equal(policy.classification.objectiveMode, "vc_funding");
  assert.equal(policy.stages.funding.enabled, true);
  assert.ok(policy.stages.funding.actions.includes("investor_pipeline_scoring"));
  assert.ok(policy.stages.funding.actions.includes("deck_generation"));
  assert.ok(policy.stages.funding.actions.includes("investor_outreach_sequence"));
  assert.equal(policy.stages.businessAnalysis.enabled, true);
});
