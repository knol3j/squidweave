import test from "node:test";
import assert from "node:assert/strict";
import { withRetryPolicy } from "../src/lib/retry-policy.mjs";
import { PaidExecutionEngine } from "../src/lib/paid-execution-engine.mjs";
import { SocialPublishingEngine } from "../src/lib/social-publishing-engine.mjs";
import { FundingDeckEngine } from "../src/lib/funding-deck-engine.mjs";

test("withRetryPolicy retries transient failures until success", async () => {
  let attempts = 0;
  const result = await withRetryPolicy(async () => {
    attempts += 1;
    if (attempts < 3) {
      throw new Error("temporary outage");
    }
    return "ok";
  }, {
    maxAttempts: 3,
    initialDelayMs: 1,
    jitterMs: 0,
  });

  assert.equal(result.attempts, 3);
  assert.equal(result.result, "ok");
});

test("PaidExecutionEngine launches campaigns for each channel", async () => {
  const engine = new PaidExecutionEngine({
    dryRun: true,
    adapters: {
      google_ads: async ({ campaignId, creativeSummary }) => ({
        channel: "google_ads",
        status: "launched",
        externalId: `g-${campaignId}`,
        creativeSummary,
      }),
      meta_ads: async ({ campaignId }) => ({
        channel: "meta_ads",
        status: "launched",
        externalId: `m-${campaignId}`,
      }),
    },
  });

  const result = await engine.launchCampaigns({
    campaignId: "cmp-1",
    channels: ["google_ads", "meta_ads"],
    creativeSummary: "2 variants",
  });

  assert.equal(result.runs.length, 2);
  assert.equal(result.summary.launched, 2);
  assert.equal(result.summary.failed, 0);
});

test("SocialPublishingEngine schedules and publishes posts", async () => {
  const engine = new SocialPublishingEngine({
    dryRun: true,
    adapters: {
      linkedin: async ({ locale }) => ({ channel: "linkedin", locale, status: "published", externalId: `li-${locale}` }),
      twitter: async ({ locale }) => ({ channel: "twitter", locale, status: "published", externalId: `x-${locale}` }),
    },
  });

  const result = await engine.publishVariants({
    campaignId: "cmp-2",
    variants: [
      { locale: "en-US", body: "hello" },
      { locale: "es-ES", body: "hola" },
    ],
    channels: ["linkedin", "twitter"],
  });

  assert.equal(result.runs.length, 4);
  assert.equal(result.summary.published, 4);
});

test("FundingDeckEngine builds deck + investor outreach payload", async () => {
  const engine = new FundingDeckEngine({ dryRun: true });
  const result = await engine.prepareAndSend({
    campaign: {
      id: "cmp-3",
      name: "ACME AI",
      objective: "Raise seed",
      audience: "SaaS founders",
      offer: "$1.2M seed",
      differentiators: "faster GTM",
    },
    investors: [
      { id: "i1", fundName: "North Fund", email: "partner@north.vc", score: 0.91 },
      { id: "i2", fundName: "East Capital", email: "team@east.vc", score: 0.88 },
    ],
  });

  assert.ok(result.deck.markdown.includes("ACME AI"));
  assert.equal(result.outreach.sent, 2);
});
