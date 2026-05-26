import { withRetryPolicy } from "./retry-policy.mjs";

const defaultAdapters = {
  google_ads: async ({ campaignId, dryRun }) => ({
    channel: "google_ads",
    status: dryRun ? "simulated" : "launched",
    externalId: `google-${campaignId}-${Date.now()}`,
  }),
  meta_ads: async ({ campaignId, dryRun }) => ({
    channel: "meta_ads",
    status: dryRun ? "simulated" : "launched",
    externalId: `meta-${campaignId}-${Date.now()}`,
  }),
  linkedin_ads: async ({ campaignId, dryRun }) => ({
    channel: "linkedin_ads",
    status: dryRun ? "simulated" : "launched",
    externalId: `liads-${campaignId}-${Date.now()}`,
  }),
};

export class PaidExecutionEngine {
  constructor({ dryRun = true, adapters = {}, retryPolicy = {} } = {}) {
    this.dryRun = dryRun;
    this.adapters = { ...defaultAdapters, ...adapters };
    this.retryPolicy = { maxAttempts: 3, initialDelayMs: 200, ...retryPolicy };
  }

  async launchCampaigns({ campaignId, channels = [], creativeSummary = "", budgetAmount = null }) {
    const requestedChannels = [...new Set((channels || []).map(item => String(item).trim()).filter(Boolean))];
    const runs = [];

    for (const channel of requestedChannels) {
      const adapter = this.adapters[channel];
      if (!adapter) {
        runs.push({ channel, status: "skipped", reason: "adapter-not-configured" });
        continue;
      }

      const execution = await withRetryPolicy(
        () => adapter({ campaignId, channel, creativeSummary, budgetAmount, dryRun: this.dryRun }),
        { ...this.retryPolicy, operationName: `paid_launch:${channel}` },
      );

      runs.push({
        channel,
        status: execution.status === "success" ? "launched" : "failed",
        attempts: execution.attempts,
        externalId: execution.result?.externalId || null,
        adapterStatus: execution.result?.status || null,
        error: execution.error || null,
      });
    }

    return {
      campaignId,
      createdAt: new Date().toISOString(),
      runs,
      summary: {
        launched: runs.filter(item => item.status === "launched").length,
        failed: runs.filter(item => item.status === "failed").length,
        skipped: runs.filter(item => item.status === "skipped").length,
      },
    };
  }
}
