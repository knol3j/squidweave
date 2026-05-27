import { loadEnvFiles } from "./load-env.mjs";
import { pathToFileURL } from "node:url";

loadEnvFiles();

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
  databaseUrl: process.env.DATABASE_URL || "",
  stateBackend: process.env.STATE_BACKEND || "",
  postgresSchema: process.env.POSTGRES_SCHEMA || "public",
  postgresStateTable: process.env.POSTGRES_STATE_TABLE || "squidweave_state",
  postgresStateKey: process.env.POSTGRES_STATE_KEY || "primary",
  lmStudioModel: process.env.LMSTUDIO_MODEL || "google/gemma-3n-e4b",
  defaultConnector: process.env.DEFAULT_CONNECTOR || "openclaw",
  defaultLocale: process.env.DEFAULT_LOCALE || "en-US",
  localizationModel: process.env.LOCALIZATION_MODEL || process.env.LMSTUDIO_MODEL || "google/gemma-3n-e4b",
  llm: {
    baseUrl: process.env.LLM_BASE_URL || "",
    apiKey: process.env.LLM_API_KEY || "",
    model: process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
    timeoutMs: toNumber(process.env.LLM_TIMEOUT_MS, 60000),
  },
  schedulerIntervalSeconds: toNumber(process.env.SCHEDULER_INTERVAL_SECONDS, 120),
  maxDailyBudgetDelta: toNumber(process.env.MAX_DAILY_BUDGET_DELTA, 0.2),
  maxOutreachBatch: toNumber(process.env.MAX_OUTREACH_BATCH, 50),
  maxUnsubscribeRate: toNumber(process.env.MAX_UNSUBSCRIBE_RATE, 0.03),
  minRoasToScaleUp: toNumber(process.env.MIN_ROAS_TO_SCALE_UP, 2),
  decisionCooldownMinutes: toNumber(process.env.DECISION_COOLDOWN_MINUTES, 30),
  defaultBrandVoice: process.env.DEFAULT_BRAND_VOICE || "direct, credible, concise, and conversion-focused",
  defaultOffer: process.env.DEFAULT_OFFER || "",
  dataFile: process.env.DATA_FILE
    ? pathToFileURL(process.env.DATA_FILE)
    : new URL("../data/state.json", import.meta.url),
  seedDataFile: process.env.SEED_DATA_FILE
    ? pathToFileURL(process.env.SEED_DATA_FILE)
    : new URL("../data/state.json", import.meta.url),
  staticDir: process.env.STATIC_DIR
    ? pathToFileURL(process.env.STATIC_DIR)
    : null,
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
  hermes: {
    baseUrl: process.env.HERMES_BASE_URL || "",
    token: process.env.HERMES_TOKEN || "",
    healthPath: process.env.HERMES_HEALTH_PATH || "/health",
    upsertPath: process.env.HERMES_MEMORY_UPSERT_PATH || "/v1/memory/upsert",
    recallPath: process.env.HERMES_MEMORY_RECALL_PATH || "/v1/memory/recall",
  },
  ghl: {
    apiKey: process.env.GHL_API_KEY || "",
    locationId: process.env.GHL_LOCATION_ID || "",
    webhookSecret: process.env.GHL_WEBHOOK_SECRET || "",
    defaultCampaignId: process.env.GHL_DEFAULT_CAMPAIGN_ID || "",
  },
  safety: {
    requireLiveApproval: toBoolean(process.env.REQUIRE_LIVE_APPROVAL, true),
    executionDedupeWindowSeconds: toNumber(process.env.EXECUTION_DEDUPE_WINDOW_SECONDS, 900),
    maxConcurrentExecutions: toNumber(process.env.MAX_CONCURRENT_EXECUTIONS, 1),
    maxFundingBatch: toNumber(process.env.MAX_FUNDING_BATCH, 20),
  },
};
