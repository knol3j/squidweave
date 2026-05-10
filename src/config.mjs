const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

export const config = {
  port: toNumber(process.env.PORT, 4010),
  dryRun: toBoolean(process.env.DRY_RUN, true),
  lmStudioModel: process.env.LMSTUDIO_MODEL || "google/gemma-3n-e4b",
  defaultConnector: process.env.DEFAULT_CONNECTOR || "openclaw",
  defaultLocale: process.env.DEFAULT_LOCALE || "en-US",
  localizationModel: process.env.LOCALIZATION_MODEL || process.env.LMSTUDIO_MODEL || "google/gemma-3n-e4b",
  schedulerIntervalSeconds: toNumber(process.env.SCHEDULER_INTERVAL_SECONDS, 120),
  maxDailyBudgetDelta: toNumber(process.env.MAX_DAILY_BUDGET_DELTA, 0.2),
  maxOutreachBatch: toNumber(process.env.MAX_OUTREACH_BATCH, 50),
  maxUnsubscribeRate: toNumber(process.env.MAX_UNSUBSCRIBE_RATE, 0.03),
  minRoasToScaleUp: toNumber(process.env.MIN_ROAS_TO_SCALE_UP, 2),
  decisionCooldownMinutes: toNumber(process.env.DECISION_COOLDOWN_MINUTES, 30),
  defaultBrandVoice: process.env.DEFAULT_BRAND_VOICE || "direct, credible, concise, and conversion-focused",
  defaultOffer: process.env.DEFAULT_OFFER || "",
  dataFile: new URL("../data/state.json", import.meta.url),
  connectors: {
    openclaw: {
      baseUrl: process.env.OPENCLAW_BASE_URL || process.env.MOLTBOT_BASE_URL || "",
      token: process.env.OPENCLAW_TOKEN || process.env.MOLTBOT_TOKEN || "",
    },
    clawdbot: {
      baseUrl: process.env.CLAWDBOT_BASE_URL || "",
      token: process.env.CLAWDBOT_TOKEN || "",
    },
  },
};
