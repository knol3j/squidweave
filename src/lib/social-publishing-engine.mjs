import { withRetryPolicy } from "./retry-policy.mjs";

const defaultAdapters = {
  linkedin: async ({ variant, dryRun }) => ({
    channel: "linkedin",
    locale: variant.locale,
    status: dryRun ? "simulated" : "published",
    externalId: `li-${variant.locale}-${Date.now()}`,
  }),
  twitter: async ({ variant, dryRun }) => ({
    channel: "twitter",
    locale: variant.locale,
    status: dryRun ? "simulated" : "published",
    externalId: `x-${variant.locale}-${Date.now()}`,
  }),
  telegram: async ({ variant, dryRun }) => ({
    channel: "telegram",
    locale: variant.locale,
    status: dryRun ? "simulated" : "published",
    externalId: `tg-${variant.locale}-${Date.now()}`,
  }),
};

export class SocialPublishingEngine {
  constructor({ dryRun = true, adapters = {}, retryPolicy = {} } = {}) {
    this.dryRun = dryRun;
    this.adapters = { ...defaultAdapters, ...adapters };
    this.retryPolicy = { maxAttempts: 3, initialDelayMs: 150, ...retryPolicy };
  }

  async publishVariants({ campaignId, variants = [], channels = ["linkedin", "twitter", "telegram"] }) {
    const channelList = [...new Set((channels || []).map(item => String(item).trim()).filter(Boolean))];
    const runs = [];

    for (const variant of variants || []) {
      for (const channel of channelList) {
        const adapter = this.adapters[channel];
        if (!adapter) {
          runs.push({ channel, locale: variant.locale || null, status: "skipped", reason: "adapter-not-configured" });
          continue;
        }

        const execution = await withRetryPolicy(
          () => adapter({ campaignId, channel, variant, dryRun: this.dryRun }),
          { ...this.retryPolicy, operationName: `social_publish:${channel}:${variant.locale || "default"}` },
        );

        runs.push({
          channel,
          locale: variant.locale || null,
          status: execution.status === "success" ? "published" : "failed",
          attempts: execution.attempts,
          externalId: execution.result?.externalId || null,
          error: execution.error || null,
        });
      }
    }

    return {
      campaignId,
      createdAt: new Date().toISOString(),
      runs,
      summary: {
        published: runs.filter(item => item.status === "published").length,
        failed: runs.filter(item => item.status === "failed").length,
        skipped: runs.filter(item => item.status === "skipped").length,
      },
    };
  }
}
