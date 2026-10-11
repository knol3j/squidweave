import { config } from "../config.mjs";

export const FREE_FEATURES = [
  "marketing-automation",
  "investment-outreach",
  "basic-analytics",
  "basic-research",
  "basic-prospecting",
];

export const PAID_FEATURES = [
  "paid-ads",
  "bulk-outreach",
  "llm-generation",
];

export class TierGuard {
  constructor(tierConfig = config.tier) {
    this.mode = tierConfig?.mode || "free";
    this.freeLlmCallsPerHour = tierConfig?.freeLlmCallsPerHour ?? 10;
    this.freeOutreachBatchMax = tierConfig?.freeOutreachBatchMax ?? 10;
    this.freeAdsConnectorsEnabled = tierConfig?.freeAdsConnectorsEnabled ?? false;
    this._llmCalls = new Map();
  }

  isPaid() {
    return this.mode === "paid" || this.mode === "unlimited";
  }

  isUnlimited() {
    return this.mode === "unlimited";
  }

  canUsePaidAds() {
    return this.isPaid() || this.freeAdsConnectorsEnabled;
  }

  canUseBulkOutreach(batchSize) {
    if (this.isPaid()) return true;
    return Number(batchSize) <= this.freeOutreachBatchMax;
  }

  recordLlmCall(key = "default") {
    const now = Date.now();
    const windowStart = now - 60 * 60 * 1000;
    const calls = this._llmCalls.get(key) || [];
    const recent = calls.filter((t) => t > windowStart);
    recent.push(now);
    this._llmCalls.set(key, recent);
    return recent.length <= this.freeLlmCallsPerHour;
  }

  canUseLlm(key = "default") {
    if (this.isPaid()) return true;
    const now = Date.now();
    const windowStart = now - 60 * 60 * 1000;
    const calls = (this._llmCalls.get(key) || []).filter((t) => t > windowStart);
    return calls.length < this.freeLlmCallsPerHour;
  }

  assertFeature(feature, details = {}) {
    let allowed = false;
    let reason = "";

    switch (feature) {
      case "paid-ads":
        allowed = this.canUsePaidAds();
        reason = "Paid ad connectors require a paid tier.";
        break;
      case "bulk-outreach":
        allowed = this.canUseBulkOutreach(details.batchSize);
        reason = `Free tier outreach is limited to ${this.freeOutreachBatchMax} recipients per batch.`;
        break;
      case "llm-generation":
        allowed = this.canUseLlm(details.key);
        reason = `Free tier LLM generation is limited to ${this.freeLlmCallsPerHour} calls per hour.`;
        break;
      default:
        allowed = true;
    }

    if (!allowed) {
      const error = new Error(reason);
      error.statusCode = 402;
      error.code = "UPGRADE_REQUIRED";
      error.feature = feature;
      throw error;
    }
  }
}

export function createTierGuard() {
  return new TierGuard(config.tier);
}
