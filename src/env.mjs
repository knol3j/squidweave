import { z } from "zod";
import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();

const bool = z.enum(["true", "false", "1", "0", "yes", "no", "on", "off"])
  .transform((v) => ["true", "1", "yes", "on"].includes(v.toLowerCase()))
  .or(z.boolean());

const num = (fallback) => z.coerce.number().finite().optional().default(fallback);
const str = (fallback) => z.string().optional().default(fallback);
const url = (fallback) => z.string().url().optional().default(fallback).or(z.literal(""));

const envSchema = z.object({
  // Server
  PORT: num(4010),
  HOST: str("127.0.0.1"),
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
  STATIC_DIR: z.string().optional(),
  DATA_FILE: z.string().optional(),
  SEED_DATA_FILE: z.string().optional(),
  LOCALEWEAVE_ENV_DIR: z.string().optional(),

  // Safety
  DRY_RUN: bool.default(true),
  REQUIRE_LIVE_APPROVAL: bool.default(true),
  SCHEDULER_AUTOSTART: bool.default(true),

  // Security
  SQUIDWEAVE_API_KEY: z.string().min(1).optional(),
  UI_USER: z.string().optional(),
  UI_PASS: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  TRACKING_SECRET: z.string().min(8).optional().default("squidweave-tracking"),
  TRACKING_ALLOWED_DOMAINS: z.string().optional(),
  TRACKING_BASE_URL: z.string().optional().default("http://localhost:4010"),

  // State backend
  DATABASE_URL: z.string().optional(),
  STATE_BACKEND: z.enum(["file", "postgres"]).optional().default("file"),
  POSTGRES_RELATIONAL_EVENTS: bool.default(false),
  POSTGRES_SCHEMA: str("public"),
  POSTGRES_STATE_TABLE: str("squidweave_state"),
  POSTGRES_STATE_KEY: str("primary"),

  DEFAULT_LOCALE: str("en-US"),

  // LLM
  LMSTUDIO_MODEL: str("google/gemma-3n-e4b"),
  LMSTUDIO_BASE_URL: z.string().optional(),
  LOCALIZATION_MODEL: z.string().optional(),
  LLM_BASE_URL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: str("gpt-4o-mini"),
  LLM_TIMEOUT_MS: num(60000),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: str("gemini-2.0-flash"),
  GEMINI_TIMEOUT_MS: num(60000),
  OLLAMA_BASE_URL: str("http://127.0.0.1:11434"),
  OLLAMA_MODEL: str("gemma3n"),

  // Connectors
  DEFAULT_CONNECTOR: str("openclaw"),
  OPENCLAW_BASE_URL: z.string().optional(),
  OPENCLAW_TOKEN: z.string().optional(),
  CLAWDBOT_BASE_URL: z.string().optional(),
  CLAWDBOT_TOKEN: z.string().optional(),
  MOLTBOT_BASE_URL: z.string().optional(),
  MOLTBOT_TOKEN: z.string().optional(),
  AUTH_TOKEN: z.string().optional(),

  // Hermes memory
  HERMES_BASE_URL: z.string().optional(),
  HERMES_TOKEN: z.string().optional(),
  HERMES_HEALTH_PATH: str("/health"),
  HERMES_MEMORY_UPSERT_PATH: str("/v1/memory/upsert"),
  HERMES_MEMORY_RECALL_PATH: str("/v1/memory/recall"),

  // GHL
  GHL_API_KEY: z.string().optional(),
  GHL_LOCATION_ID: z.string().optional(),
  GHL_WEBHOOK_SECRET: z.string().optional(),
  GHL_DEFAULT_CAMPAIGN_ID: z.string().optional(),

  // Email / webhooks
  BREVO_WEBHOOK_SECRET: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: num(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_NAME: str("SquidWeave"),
  SMTP_FROM_EMAIL: z.string().email().optional().or(z.literal("")),

  // Social / Ads
  LINKEDIN_ACCESS_TOKEN: z.string().optional(),
  LINKEDIN_PERSON_URN: z.string().optional(),
  LINKEDIN_ORGANIZATION_URN: z.string().optional(),
  TWITTER_BEARER_TOKEN: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHANNEL_ID: z.string().optional(),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().optional(),
  GOOGLE_ADS_CUSTOMER_ID: z.string().optional(),
  GOOGLE_ADS_CLIENT_ID: z.string().optional(),
  GOOGLE_ADS_CLIENT_SECRET: z.string().optional(),
  GOOGLE_ADS_REFRESH_TOKEN: z.string().optional(),
  META_ADS_ACCESS_TOKEN: z.string().optional(),
  META_ADS_AD_ACCOUNT_ID: z.string().optional(),

  // Enrichment
  HUNTER_API_KEY: z.string().optional(),
  APOLLO_API_KEY: z.string().optional(),
  SERPER_API_KEY: z.string().optional(),
  CRUNCHBASE_API_KEY: z.string().optional(),
  CRUNCHBASE_BASIC_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),

  // Calendaring
  CALENDLY_API_KEY: z.string().optional(),
  CALENDLY_USER_URI: z.string().optional(),
  CALCOM_API_KEY: z.string().optional(),
  CALCOM_USERNAME: z.string().optional(),
  CALCOM_EVENT_TYPE_SLUG: str("30-min"),

  // Limits / tuning
  RATE_LIMIT_MAX: num(120),
  SCHEDULER_INTERVAL_SECONDS: num(120),
  MAX_DAILY_BUDGET_DELTA: num(0.2),
  MAX_OUTREACH_BATCH: num(50),
  MAX_UNSUBSCRIBE_RATE: num(0.03),
  MIN_ROAS_TO_SCALE_UP: num(2),
  DECISION_COOLDOWN_MINUTES: num(30),
  EXECUTION_DEDUPE_WINDOW_SECONDS: num(900),
  MAX_CONCURRENT_EXECUTIONS: num(1),
  MAX_FUNDING_BATCH: num(20),
  MAX_INGEST_LIMIT: num(20),
  MAX_INGEST_TOTAL: num(120),
  MAX_INGEST_CONNECTORS: num(6),
  MAX_BODY_SIZE_BYTES: num(1024 * 1024),

  // Job queue
  JOB_QUEUE_ENABLED: bool.default(false),
  SYNC_JOBS: bool.default(false),

  // Tier / entitlement
  TIER_MODE: z.enum(["free", "paid", "unlimited"]).optional().default("free"),
  FREE_LLM_CALLS_PER_HOUR: num(10),
  FREE_OUTREACH_BATCH_MAX: num(10),
  FREE_ADS_CONNECTORS_ENABLED: bool.default(false),

  // Agent scripting
  SQUIDWEAVE_API_BASE: z.string().optional(),
  SQUIDWEAVE_API_BASE_URL: z.string().optional(),
  SQUIDWEAVE_BASE_URL: z.string().optional(),
  SQUIDWEAVE_FUNDING_LIMIT: num(50),
  SQUIDWEAVE_FUNDING_RETRY_ATTEMPTS: num(3),
  SQUIDWEAVE_FUNDING_RETRY_BASE_MS: num(1000),
  SQUIDWEAVE_API_TIMEOUT_MS: num(60000),
  CLAWDBOT_ROLE: z.string().optional(),
  CLAWDBOT_NAME: z.string().optional(),
  CLAWDBOT_ONCE: bool.default(false),
  CLAWDBOT_INTERVAL_SECONDS: num(120),
  CLAWDBOT_DISPATCH: bool.default(false),
  CLAWDBOT_LOCAL_SCRAPE: bool.default(false),
  CLAWDBOT_AUTOMATION_ARGS: z.string().optional(),
  CLAWDBOT_BACKEND_TEST_ARGS: z.string().optional(),
  CLAWDBOT_COMMAND_TIMEOUT_MS: num(15 * 60 * 1000),
  CLAWDBOT_REQUEST_TIMEOUT_MS: num(60000),
  CLAWDBOT_CAMPAIGN_LIMIT: num(8),
  CLAWDBOT_SOURCE_LIMIT: num(8),
  CLAWDBOT_PROSPECT_LIMIT: num(24),
  CLAWDBOT_ENRICH_LIMIT: num(24),
  CLAWDBOT_SEQUENCE_LIMIT: num(24),
  CLAWDBOT_RERUN_FAILED: bool.default(false),

  // Platform / misc
  RAILWAY_DEPLOYMENT_ID: z.string().optional(),
  RAILWAY_SERVICE_NAME: z.string().optional(),
  RAILWAY_PROCESS: z.string().optional(),
  SQUIDWEAVE_PROCESS: z.string().optional(),
  SQUIDWEAVE_SITE_URL: z.string().optional(),
  GITHUB_REPOSITORY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  TELEGRAM_ALERT_LEVELS: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional().default("info"),
  DEFAULT_BRAND_VOICE: str("direct, credible, concise, and conversion-focused"),
  DEFAULT_OFFER: str(""),
});

let _env = null;

export function getEnv() {
  if (_env) return _env;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    console.error("Invalid environment variables:\n  - " + issues.join("\n  - "));
    process.exit(1);
  }
  _env = parsed.data;
  return _env;
}

export const env = getEnv();
