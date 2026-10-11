import { pathToFileURL } from "node:url";
import { env } from "./env.mjs";

export const config = {
  port: env.PORT,
  host: env.HOST,
  nodeEnv: env.NODE_ENV,
  dryRun: env.DRY_RUN,
  databaseUrl: env.DATABASE_URL || "",
  stateBackend: env.STATE_BACKEND,
  postgresRelationalEvents: env.POSTGRES_RELATIONAL_EVENTS,
  postgresSchema: env.POSTGRES_SCHEMA,
  postgresStateTable: env.POSTGRES_STATE_TABLE,
  postgresStateKey: env.POSTGRES_STATE_KEY,
  lmStudioModel: env.LMSTUDIO_MODEL,
  lmStudioBaseUrl: env.LMSTUDIO_BASE_URL || "",
  defaultConnector: env.DEFAULT_CONNECTOR,
  defaultLocale: env.DEFAULT_LOCALE,
  localizationModel: env.LOCALIZATION_MODEL || env.LMSTUDIO_MODEL,
  llm: {
    baseUrl: env.LLM_BASE_URL || "",
    apiKey: env.LLM_API_KEY || "",
    model: env.LLM_MODEL,
    timeoutMs: env.LLM_TIMEOUT_MS,
  },
  gemini: {
    apiKey: env.GEMINI_API_KEY || "",
    model: env.GEMINI_MODEL,
    timeoutMs: env.GEMINI_TIMEOUT_MS,
  },
  ollama: {
    baseUrl: env.OLLAMA_BASE_URL,
    model: env.OLLAMA_MODEL,
  },
  schedulerIntervalSeconds: env.SCHEDULER_INTERVAL_SECONDS,
  maxDailyBudgetDelta: env.MAX_DAILY_BUDGET_DELTA,
  maxOutreachBatch: env.MAX_OUTREACH_BATCH,
  maxUnsubscribeRate: env.MAX_UNSUBSCRIBE_RATE,
  minRoasToScaleUp: env.MIN_ROAS_TO_SCALE_UP,
  decisionCooldownMinutes: env.DECISION_COOLDOWN_MINUTES,
  defaultBrandVoice: env.DEFAULT_BRAND_VOICE,
  defaultOffer: env.DEFAULT_OFFER,
  dataFile: env.DATA_FILE
    ? pathToFileURL(env.DATA_FILE)
    : new URL("../data/state.json", import.meta.url),
  seedDataFile: env.SEED_DATA_FILE
    ? pathToFileURL(env.SEED_DATA_FILE)
    : new URL("../data/state.json", import.meta.url),
  staticDir: env.STATIC_DIR
    ? pathToFileURL(env.STATIC_DIR)
    : null,
  connectors: {
    openclaw: {
      baseUrl: env.OPENCLAW_BASE_URL || env.MOLTBOT_BASE_URL || "",
      token: env.OPENCLAW_TOKEN || env.MOLTBOT_TOKEN || "",
    },
    clawdbot: {
      baseUrl: env.CLAWDBOT_BASE_URL || "",
      token: env.CLAWDBOT_TOKEN || "",
    },
  },
  hermes: {
    baseUrl: env.HERMES_BASE_URL || "",
    token: env.HERMES_TOKEN || "",
    healthPath: env.HERMES_HEALTH_PATH,
    upsertPath: env.HERMES_MEMORY_UPSERT_PATH,
    recallPath: env.HERMES_MEMORY_RECALL_PATH,
  },
  ghl: {
    apiKey: env.GHL_API_KEY || "",
    locationId: env.GHL_LOCATION_ID || "",
    webhookSecret: env.GHL_WEBHOOK_SECRET || "",
    defaultCampaignId: env.GHL_DEFAULT_CAMPAIGN_ID || "",
  },
  smtp: {
    host: env.SMTP_HOST || "",
    port: env.SMTP_PORT,
    user: env.SMTP_USER || "",
    pass: env.SMTP_PASS || "",
    fromName: env.SMTP_FROM_NAME,
    fromEmail: env.SMTP_FROM_EMAIL || "",
  },
  safety: {
    requireLiveApproval: env.REQUIRE_LIVE_APPROVAL,
    executionDedupeWindowSeconds: env.EXECUTION_DEDUPE_WINDOW_SECONDS,
    maxConcurrentExecutions: env.MAX_CONCURRENT_EXECUTIONS,
    maxFundingBatch: env.MAX_FUNDING_BATCH,
  },
  tracking: {
    baseUrl: env.TRACKING_BASE_URL,
    secret: env.TRACKING_SECRET,
    allowedDomains: env.TRACKING_ALLOWED_DOMAINS
      ? env.TRACKING_ALLOWED_DOMAINS.split(",").map((d) => d.trim()).filter(Boolean)
      : [],
  },
  rateLimit: {
    maxRequests: env.RATE_LIMIT_MAX,
  },
  limits: {
    maxBodySizeBytes: env.MAX_BODY_SIZE_BYTES,
    maxIngestLimit: env.MAX_INGEST_LIMIT,
    maxIngestTotal: env.MAX_INGEST_TOTAL,
    maxIngestConnectors: env.MAX_INGEST_CONNECTORS,
  },
  apiKey: env.SQUIDWEAVE_API_KEY || null,
  uiAuth: env.UI_USER && env.UI_PASS ? { user: env.UI_USER, pass: env.UI_PASS } : null,
  allowedOrigins: env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : [],
  schedulerAutostart: env.SCHEDULER_AUTOSTART,
  jobQueue: {
    enabled: env.JOB_QUEUE_ENABLED && env.STATE_BACKEND === "postgres" && !!env.DATABASE_URL,
    syncJobs: env.SYNC_JOBS,
  },
  tier: {
    mode: env.TIER_MODE,
    freeLlmCallsPerHour: env.FREE_LLM_CALLS_PER_HOUR,
    freeOutreachBatchMax: env.FREE_OUTREACH_BATCH_MAX,
    freeAdsConnectorsEnabled: env.FREE_ADS_CONNECTORS_ENABLED,
  },
};
