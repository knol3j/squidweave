import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.mjs";

// ── Auth middleware ───────────────────────────────────────────────
const API_KEY = process.env.SQUIDWEAVE_API_KEY || null;

function requireApiKey(request, response) {
  if (!API_KEY) return true;
  const provided = request.headers["x-api-key"];
  if (provided === API_KEY) return true;
  sendJson(request, response, 401, { error: "Unauthorized. Provide x-api-key header matching SQUIDWEAVE_API_KEY." });
  return false;
}

// ── Basic Auth for UI (sofish.io testing) ──────────────────────
const UI_USER = process.env.UI_USER || "";
const UI_PASS = process.env.UI_PASS || "";

function requireUiAuth(request, response) {
  if (!UI_USER || !UI_PASS) return true;
  const header = request.headers["authorization"];
  if (!header || !header.startsWith("Basic ")) {
    response.writeHead(401, {
      "content-type": "application/json; charset=utf-8",
      "www-authenticate": 'Basic realm="SquidWeave Console"',
    });
    response.end(JSON.stringify({ error: "Authentication required" }));
    return false;
  }
  const encoded = header.slice(6);
  let decoded;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    response.writeHead(401, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Invalid authorization header" }));
    return false;
  }
  const colon = decoded.indexOf(":");
  if (colon === -1) {
    response.writeHead(401, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Invalid authorization format" }));
    return false;
  }
  const user = decoded.slice(0, colon);
  const pass = decoded.slice(colon + 1);
  if (user !== UI_USER || pass !== UI_PASS) {
    response.writeHead(401, {
      "content-type": "application/json; charset=utf-8",
      "www-authenticate": 'Basic realm="SquidWeave Console"',
    });
    response.end(JSON.stringify({ error: "Invalid credentials" }));
    return false;
  }
  return true;
}
// ──────────────────────────────────────────────────────────────────
import { normalizeEvent } from "./lib/analytics.mjs";
import { AutomationEngine } from "./lib/automation-engine.mjs";
import { OpenclawConnector } from "./connectors/openclaw.mjs";
import { ClawdbotConnector } from "./connectors/clawdbot.mjs";
import { DecisionEngine } from "./lib/decision-engine.mjs";
import { LocalPlanner } from "./lib/lmstudio-client.mjs";
import { createLlmProvider } from "./lib/llm-provider.mjs";
import { MemoryEngine } from "./lib/memory-engine.mjs";
import { AutomationScheduler } from "./lib/scheduler.mjs";
import { SocialDispatchEngine } from "./lib/social-dispatch-engine.mjs";
import { CampaignAnalyticsEngine } from "./lib/campaign-analytics-engine.mjs";
import { Store } from "./lib/store.mjs";
import { normalizeOutreachEvent, normalizeResearchRecord, TargetingEngine } from "./lib/targeting-engine.mjs";
import { QueryEngine } from "./lib/query-engine.mjs";
import { JobManager } from "./lib/job-manager.mjs";
import { SchemaRegistry } from "./lib/schema-registry.mjs";
import { AgentOrchestrator } from "./lib/agent-orchestrator.mjs";
import { HermesMemoryClient } from "./lib/hermes-memory.mjs";
import { ContactSourcingEngine } from "./lib/contact-sourcing-engine.mjs";
import { PipelineEngine } from "./lib/pipeline-engine.mjs";
import { WorkflowEngine } from "./lib/workflow-engine.mjs";
import { ProspectActivationEngine } from "./lib/prospect-activation-engine.mjs";
import { FundingEngine } from "./lib/funding-engine.mjs";
import { buildAutopilotPolicy } from "./lib/autopilot-policy.mjs";
import { PaidExecutionEngine } from "./lib/paid-execution-engine.mjs";
import { SocialPublishingEngine } from "./lib/social-publishing-engine.mjs";
import { FundingDeckEngine } from "./lib/funding-deck-engine.mjs";
import { SourceIngestionEngine } from "./lib/source-ingestion-engine.mjs";
import { ExecutionGuard, UnsafeExecutionError } from "./lib/execution-guard.mjs";
import { enrichInvestorEmail, batchEnrichInvestors, getEnrichmentProvidersStatus } from "./lib/email-enrichment-engine.mjs";
import { createFreeSourceConnectors } from "./connectors/free-sources.mjs";
import { VcSourcingConnector } from "./connectors/vc-sourcing-connector.mjs";
import { GhlBridge } from "./integrations/ghl-bridge.mjs";
import { registerFunnelRoutes, getFunnelCollections } from "./modules/funnel/funnel-routes.mjs";
import { registerMessagingRoutes, getMessagingCollections } from "./modules/messaging/messaging-routes.mjs";
import * as adapters from "./adapters/index.mjs";
import * as calendly from "./adapters/calendly.mjs";
import { TrackingEngine } from "./lib/tracking-engine.mjs";
import { RateLimiter } from "./lib/rate-limiter.mjs";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function buildCorsHeaders(request) {
  const origin = request.headers.origin;
  const allowedOrigins = new Set([
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
  ]);

  return {
    "access-control-allow-origin": allowedOrigins.has(origin) ? origin : "http://127.0.0.1:3000",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-api-key",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function sendJson(request, response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    ...buildCorsHeaders(request),
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendEventStreamHeaders(request, response) {
  response.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    ...buildCorsHeaders(request),
  });
}

function writeSse(response, event, data) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function splitPath(pathname) {
  return pathname.split("/").filter(Boolean);
}

function parseJsonParam(value, fallback = null) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeLocales(input, fallbackLocale) {
  if (Array.isArray(input) && input.length > 0) {
    return [...new Set(input.map(value => String(value).trim()).filter(Boolean))];
  }
  return [fallbackLocale];
}

function normalizeConnectorList(input, fallbackConnector) {
  const list = Array.isArray(input) ? input : [input || fallbackConnector, "clawdbot"];
  const normalized = [...new Set(
    list
      .map(value => String(value || "").trim().toLowerCase())
      .filter(Boolean),
  )];
  return normalized.length ? normalized : [String(fallbackConnector || "openclaw").trim().toLowerCase(), "clawdbot"];
}

function pickConnectors(connectorsMap) {
  return Promise.all(Object.values(connectorsMap).map(connector => connector.getStatus()));
}

function buildSetupRequirements() {
  return {
    generatedAt: new Date().toISOString(),
    environment: {
      requiredForLiveConnectors: [
        "OPENCLAW_BASE_URL",
        "OPENCLAW_TOKEN",
        "CLAWDBOT_BASE_URL",
        "CLAWDBOT_TOKEN",
      ],
      operational: [
        "PORT",
        "DRY_RUN",
        "LMSTUDIO_MODEL",
        "LOCALIZATION_MODEL",
        "DEFAULT_CONNECTOR",
        "DEFAULT_LOCALE",
        "DEFAULT_BRAND_VOICE",
        "DEFAULT_OFFER",
        "SCHEDULER_INTERVAL_SECONDS",
        "MAX_DAILY_BUDGET_DELTA",
        "MAX_OUTREACH_BATCH",
        "MAX_UNSUBSCRIBE_RATE",
        "MIN_ROAS_TO_SCALE_UP",
        "DECISION_COOLDOWN_MINUTES",
      ],
    },
    outreachEventTypes: [
      "sent",
      "open",
      "click",
      "reply",
      "positive_reply",
      "meeting_booked",
      "unsubscribe",
      "bounce",
    ],
    analyticsEventTypes: [
      "impression",
      "click",
      "conversion",
      "reply",
      "positive_reply",
      "unsubscribe",
      "bounce",
      "spend",
      "revenue",
    ],
    fundingOutreachEventTypes: [
      "intro_queued",
      "follow_up_queued",
      "sent",
      "replied",
      "meeting_booked",
      "term_sheet",
      "passed",
    ],
    requiredResearchFields: ["campaignId", "targetId"],
    recommendedResearchFields: [
      "company",
      "contactName",
      "title",
      "segment",
      "region",
      "preferredChannel",
      "channels",
      "fitScore",
      "intentScore",
      "recencyScore",
      "metadata.sourceUrl",
      "metadata.evidence",
    ],
    sourceSystems: {
      research: ["LinkedIn", "TrustRadius", "G2", "CSA Research", "internal enrichment"],
      outreach: ["HubSpot", "Apollo", "Instantly", "Smartlead", "Mailgun", "SendGrid", "LinkedIn outbound exports"],
      analytics: ["LinkedIn Ads", "Meta Ads", "Google Ads", "HubSpot analytics", "CRM revenue events", "server-side product events"],
    },
  };
}

async function serveStaticAsset(request, response, pathname, staticDir) {
  if (!staticDir) {
    return false;
  }

  const rootHref = staticDir.href.endsWith("/") ? staticDir.href : `${staticDir.href}/`;
  const requestedPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const rootPath = fileURLToPath(staticDir);

  try {
    const assetUrl = new URL(requestedPath, rootHref);
    const assetPath = fileURLToPath(assetUrl);
    if (!assetPath.startsWith(rootPath)) {
      return false;
    }

    const contents = await readFile(assetPath);
    response.writeHead(200, {
      "content-type": mimeTypes[extname(assetPath)] || "application/octet-stream",
      ...buildCorsHeaders(request),
    });
    response.end(contents);
    return true;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  try {
    const contents = await readFile(new URL("index.html", rootHref));
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      ...buildCorsHeaders(request),
    });
    response.end(contents);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function buildOpenClawDiagnostics(connectorsMap, timeoutMs = 4000) {
  const diagnostics = [];
  for (const connector of Object.values(connectorsMap)) {
    if (typeof connector.diagnose === "function") {
      diagnostics.push(await connector.diagnose(timeoutMs));
    } else {
      diagnostics.push({
        connector: connector.name,
        configured: connector.isConfigured?.() || false,
        ready: false,
        summary: "Connector does not expose a diagnostic contract.",
        recommendations: [],
      });
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    diagnostics,
  };
}

function sanitizeConnectorConfig(configRecord) {
  if (!configRecord) {
    return null;
  }
  return {
    connector: configRecord.connector,
    baseUrl: configRecord.baseUrl || null,
    dryRun: Boolean(configRecord.dryRun),
    tokenConfigured: Boolean(configRecord.token),
    updatedAt: configRecord.updatedAt || null,
  };
}

function buildCampaignInput(body) {
  const sourceLocale = body.sourceLocale || config.defaultLocale;
  return {
    id: body.id,
    name: body.name,
    channel: body.channel || "",
    connector: body.connector || config.defaultConnector,
    connectors: normalizeConnectorList(body.connectors || body.connector, config.defaultConnector),
    objective: body.objective || "",
    dailyBudget: Number.isFinite(Number(body.dailyBudget)) ? Number(body.dailyBudget) : null,
    targeting: body.targeting || {},
    locales: normalizeLocales(body.locales, sourceLocale),
    sourceLocale,
    automationEnabled: Boolean(body.automationEnabled),
    audience: body.audience || "",
    offer: body.offer || "",
    brandVoice: body.brandVoice || "",
    landingUrl: body.landingUrl || "",
    baseSubject: body.baseSubject || "",
    basePreheader: body.basePreheader || "",
    baseHeadline: body.baseHeadline || "",
    baseBody: body.baseBody || "",
    baseCta: body.baseCta || "",
    activePrompt: body.activePrompt || "",
    activeTab: body.activeTab || "engine",
    enabledModules: Array.isArray(body.enabledModules) ? body.enabledModules : [],
    clientName: body.clientName || "",
    clientNeed: body.clientNeed || "",
    intakeStatus: body.intakeStatus || "draft",
    successDefinition: body.successDefinition || "",
    constraints: body.constraints || "",
    differentiators: body.differentiators || "",
    researchNotes: body.researchNotes || "",
    markets: Array.isArray(body.markets) ? body.markets.map(value => String(value).trim()).filter(Boolean) : [],
    researchObjectives: Array.isArray(body.researchObjectives) ? body.researchObjectives.map(value => String(value).trim()).filter(Boolean) : [],
    successMetrics: Array.isArray(body.successMetrics) ? body.successMetrics.map(value => String(value).trim()).filter(Boolean) : [],
    designTheme: body.designTheme || "",
    designPalette: Array.isArray(body.designPalette) ? body.designPalette.map(value => String(value).trim()).filter(Boolean) : [],
    designGuidelines: Array.isArray(body.designGuidelines) ? body.designGuidelines.map(value => String(value).trim()).filter(Boolean) : [],
    contentAngles: Array.isArray(body.contentAngles) ? body.contentAngles.map(value => String(value).trim()).filter(Boolean) : [],
  };
}

function resolveCampaignId(store, requestedId) {
  if (requestedId && store.getCampaign(requestedId)) {
    return requestedId;
  }
  if (store.getCampaign("main-campaign")) {
    return "main-campaign";
  }
  const first = store.listCampaigns()[0];
  return first?.id || "main-campaign";
}

async function ensurePromptCampaign({ store, memoryEngine, prompt, campaignId, reason }) {
  const resolvedId = resolveCampaignId(store, campaignId);
  const existing = store.getCampaign(resolvedId);
  const normalizedPrompt = String(prompt || "").trim();
  const draft = buildCampaignInput({
    ...(existing || {}),
    id: resolvedId,
    name: existing?.name || "Autopilot Campaign",
    automationEnabled: true,
    objective: normalizedPrompt || existing?.objective || "Autonomous growth campaign",
    audience: existing?.audience || "Decision-makers with active purchase intent",
    offer: existing?.offer || config.defaultOffer,
    channel: existing?.channel || "omnichannel",
    brandVoice: existing?.brandVoice || config.defaultBrandVoice,
    activePrompt: normalizedPrompt || existing?.activePrompt || "",
    baseBody: normalizedPrompt || existing?.baseBody || "",
    baseHeadline: existing?.baseHeadline || "Outcome-focused value proposition",
    baseSubject: existing?.baseSubject || "Priority growth opportunity",
    basePreheader: existing?.basePreheader || "Autonomous campaign run in progress",
    baseCta: existing?.baseCta || "Book strategy review",
    intakeStatus: "active",
    // Preserve the operator's current workspace instead of forcing a tab switch.
    activeTab: existing?.activeTab || "engine",
  });
  const campaign = await store.upsertCampaign(draft);
  await memoryEngine.consolidateCampaign(campaign.id);
  return {
    campaign,
    reason: reason || "prompt-autopilot",
  };
}

async function createApp() {
  const store = await new Store(config.dataFile, {
    seedFileUrl: config.seedDataFile,
    databaseUrl: config.databaseUrl,
    stateBackend: config.stateBackend,
    postgresSchema: config.postgresSchema,
    postgresTable: config.postgresStateTable,
    postgresStateKey: config.postgresStateKey,
  }).init();
  const llmProvider = createLlmProvider(config);
  const planner = new LocalPlanner(config.localizationModel, {
    defaultLocale: config.defaultLocale,
    defaultBrandVoice: config.defaultBrandVoice,
    defaultOffer: config.defaultOffer,
    llmProvider,
  });
  const connectorAliases = {
    moltbot: "openclaw",
  };
  const resolveConnectorName = value => connectorAliases[value] || value;
  const connectors = {
    openclaw: new OpenclawConnector({ ...config.connectors.openclaw, dryRun: config.dryRun }),
    clawdbot: new ClawdbotConnector({ ...config.connectors.clawdbot, dryRun: config.dryRun }),
  };

  for (const [name, runtimeConfig] of Object.entries(store.listConnectorConfigs())) {
    const resolvedName = resolveConnectorName(name);
    if (connectors[resolvedName]) {
      connectors[resolvedName].setCredentials({
        baseUrl: runtimeConfig.baseUrl,
        token: runtimeConfig.token,
        dryRun: runtimeConfig.dryRun,
      });
    }
  }
  const hermesClient = new HermesMemoryClient(config.hermes);
  const memoryEngine = new MemoryEngine({ store, hermesClient });
  const targetingEngine = new TargetingEngine({ store });
  const schemaRegistry = new SchemaRegistry();
  const queryEngine = new QueryEngine({ store, schemaRegistry, connectors });
  const jobManager = new JobManager();
  const agentOrchestrator = new AgentOrchestrator({ store });
  const contactSourcingEngine = new ContactSourcingEngine({ store, targetingEngine, memoryEngine });
  const pipelineEngine = new PipelineEngine({ store });
  const workflowEngine = new WorkflowEngine({ store });
  const prospectActivationEngine = new ProspectActivationEngine({ store, connectors, config });
  const paidExecutionEngine = new PaidExecutionEngine({
    dryRun: config.dryRun,
    adapters: {
      google_ads: adapters.google_ads,
      meta_ads: adapters.meta_ads,
    },
  });
  const socialPublishingEngine = new SocialPublishingEngine({
    dryRun: config.dryRun,
    adapters: {
      telegram: adapters.telegram,
      linkedin: adapters.linkedin,
      twitter: adapters.twitter,
    },
  });
  const fundingDeckEngine = new FundingDeckEngine({
    dryRun: config.dryRun,
    sendEmailFn: adapters.sendEmail,
  });
  const sourceIngestionEngine = new SourceIngestionEngine({
    store,
    connectors: [...createFreeSourceConnectors(), VcSourcingConnector],
  });
  // fundingEngine must come after fundingDeckEngine
  const fundingEngine = new FundingEngine({ store, fundingDeckEngine, sourceIngestionEngine });
  const decisionEngine = new DecisionEngine({ store, planner, connectors, config, targetingEngine, memoryEngine });
  const automationEngine = new AutomationEngine({ store, decisionEngine, planner, memoryEngine, agentOrchestrator });
  const socialDispatchEngine = new SocialDispatchEngine({ store, socialPublishingEngine });
  const analyticsEngine = new CampaignAnalyticsEngine({ store });
  const ghlBridge = new GhlBridge({
    store,
    contactSourcingEngine,
    memoryEngine,
    config: config.ghl,
  });
  const funnelHandlers = registerFunnelRoutes({ store, workflowEngine, pipelineEngine });
  const messagingHandlers = registerMessagingRoutes({ store, workflowEngine });
  const executionGuard = new ExecutionGuard({ store, config });
  const trackingEngine = new TrackingEngine({ store });
  const rateLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: Number(process.env.RATE_LIMIT_MAX || 120),
  });
  const scheduler = new AutomationScheduler({
    store,
    automationEngine,
    socialDispatchEngine,
    fundingEngine,
    analyticsEngine,
    executionGuard,
    intervalSeconds: config.schedulerIntervalSeconds,
  });

  const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      response.writeHead(204, buildCorsHeaders(request));
      response.end();
      return;
    }

    if (!requireApiKey(request, response)) return;

    const url = new URL(request.url, `http://${request.headers.host}`);
    const parts = splitPath(url.pathname);

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(request, response, 200, {
        ok: true,
        date: new Date().toISOString(),
        dryRun: config.dryRun,
        model: config.lmStudioModel,
        localizationModel: config.localizationModel,
        llmProvider: {
          configured: Boolean(config.llm.baseUrl && config.llm.apiKey),
          model: config.llm.model,
          baseUrl: config.llm.baseUrl ? config.llm.baseUrl.replace(/\/\/[^@]*@/, "//***@") : null,
        },
        scheduler: scheduler.getStatus(),
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/collections") {
      sendJson(request, response, 200, queryEngine.listCollections());
      return;
    }

    if (request.method === "GET" && url.pathname === "/schema") {
      sendJson(request, response, 200, schemaRegistry.list());
      return;
    }

    if (request.method === "GET" && parts[0] === "schema" && parts[1]) {
      sendJson(request, response, 200, schemaRegistry.get(parts[1]) || null);
      return;
    }

    if (request.method === "POST" && url.pathname === "/query") {
      const body = await readBody(request);
      sendJson(request, response, 200, await queryEngine.execute(body));
      return;
    }

    if (request.method === "GET" && url.pathname === "/stream") {
      const query = parseJsonParam(url.searchParams.get("query"), {});
      const initial = await queryEngine.execute(query);

      sendEventStreamHeaders(request, response);
      writeSse(response, "ready", {
        query,
        connectedAt: new Date().toISOString(),
      });
      writeSse(response, "snapshot", initial);

      const unsubscribe = store.subscribe(change => {
        if (!queryEngine.matchesChange(query, change)) {
          return;
        }
        writeSse(response, "change", change);
        queryEngine.execute(query)
          .then(nextSnapshot => writeSse(response, "snapshot", nextSnapshot))
          .catch(error => writeSse(response, "error", { message: error.message }));
      });

      const heartbeat = setInterval(() => {
        response.write(": heartbeat\n\n");
      }, 15000);

      request.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
        response.end();
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/campaigns") {
      sendJson(request, response, 200, store.listCampaigns());
      return;
    }

    if (request.method === "GET" && parts[0] === "campaigns" && parts[1]) {
      const campaign = store.getCampaign(parts[1]);
      if (!campaign) {
        sendJson(request, response, 404, { error: "Campaign not found." });
        return;
      }
      sendJson(request, response, 200, {
        ...campaign,
        latestContentPack: store.getLatestContentPack(campaign.id),
        recentRuns: store.listAutomationRuns(campaign.id).slice(-10),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/campaigns") {
      const body = await readBody(request);
      const existing = body.id ? store.getCampaign(body.id) : null;
      if (!body.id || (!body.name && !existing?.name)) {
        sendJson(request, response, 400, { error: "Campaign requires id and name." });
        return;
      }
      const campaign = await store.upsertCampaign(buildCampaignInput({
        ...existing,
        ...body,
        name: body.name || existing?.name,
      }));
      await memoryEngine.consolidateCampaign(campaign.id);
      sendJson(request, response, 201, campaign);
      return;
    }

    if (request.method === "POST" && url.pathname === "/analytics/events") {
      const body = await readBody(request);
      const events = Array.isArray(body.events) ? body.events : [body];
      const normalized = events.map(normalizeEvent);
      for (const event of normalized) {
        await store.addEvent(event);
      }
      await memoryEngine.consolidateCampaign(normalized[0].campaignId);
      sendJson(request, response, 201, normalized);
      return;
    }

    if (request.method === "GET" && url.pathname === "/analytics/events") {
      sendJson(request, response, 200, store.listEvents(url.searchParams.get("campaignId")));
      return;
    }

    if (request.method === "POST" && url.pathname === "/research/records") {
      const body = await readBody(request);
      const records = Array.isArray(body.records) ? body.records : [body];
      const normalized = records.map(normalizeResearchRecord);
      for (const record of normalized) {
        await store.addResearchRecord(record);
      }
      await memoryEngine.consolidateCampaign(normalized[0].campaignId);
      sendJson(request, response, 201, normalized);
      return;
    }

    if (request.method === "GET" && url.pathname === "/research/records") {
      sendJson(request, response, 200, store.listResearchRecords(url.searchParams.get("campaignId")));
      return;
    }

    if (request.method === "POST" && url.pathname === "/outreach/events") {
      const body = await readBody(request);
      const events = Array.isArray(body.events) ? body.events : [body];
      const normalized = events.map(normalizeOutreachEvent);
      for (const event of normalized) {
        await store.addOutreachEvent(event);
      }
      await memoryEngine.consolidateCampaign(normalized[0].campaignId);
      sendJson(request, response, 201, normalized);
      return;
    }

    if (request.method === "GET" && url.pathname === "/outreach/events") {
      sendJson(request, response, 200, store.listOutreachEvents(url.searchParams.get("campaignId"), url.searchParams.get("targetId")));
      return;
    }

    if (request.method === "POST" && url.pathname === "/ingest/outcomes") {
      const body = await readBody(request);
      const researchRecords = Array.isArray(body.researchRecords) ? body.researchRecords : [];
      const outreachEvents = Array.isArray(body.outreachEvents) ? body.outreachEvents : [];
      const analyticsEvents = Array.isArray(body.analyticsEvents) ? body.analyticsEvents : [];
      const campaignId = body.campaignId
        || researchRecords[0]?.campaignId
        || outreachEvents[0]?.campaignId
        || analyticsEvents[0]?.campaignId;

      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required when no records include it." });
        return;
      }

      const normalizedResearch = researchRecords.map(record => normalizeResearchRecord({ campaignId, ...record }));
      const normalizedOutreach = outreachEvents.map(event => normalizeOutreachEvent({ campaignId, ...event }));
      const normalizedAnalytics = analyticsEvents.map(event => normalizeEvent({ campaignId, ...event }));

      for (const record of normalizedResearch) {
        await store.addResearchRecord(record);
      }
      for (const event of normalizedOutreach) {
        await store.addOutreachEvent(event);
      }
      for (const event of normalizedAnalytics) {
        await store.addEvent(event);
      }

      const memory = await memoryEngine.consolidateCampaign(campaignId);
      sendJson(request, response, 201, {
        campaignId,
        counts: {
          researchRecords: normalizedResearch.length,
          outreachEvents: normalizedOutreach.length,
          analyticsEvents: normalizedAnalytics.length,
        },
        memory: memory.snapshot,
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/targets") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, targetingEngine.rankTargets(campaignId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/memory/consolidate") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const result = await memoryEngine.consolidateCampaign(body.campaignId);
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "GET" && url.pathname === "/memory/recall") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, await memoryEngine.recall(campaignId, {
        targetId: url.searchParams.get("targetId"),
      }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/memory/hermes/status") {
      sendJson(request, response, 200, await hermesClient.getStatus());
      return;
    }

    if (request.method === "GET" && url.pathname === "/memory/playbooks") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, store.listPlaybooks(campaignId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/memory/targets") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, store.listTargetProfiles(campaignId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/prospecting/plan") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, contactSourcingEngine.buildPlan(campaignId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/prospecting/generate") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const result = await contactSourcingEngine.generateAndPersist(body.campaignId, {
        reason: body.reason || "manual",
        limit: body.limit,
      });
      sendJson(request, response, 201, result);
      return;
    }

    if (request.method === "GET" && url.pathname === "/prospects") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, store.listSourcedContacts(campaignId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/prospects/import") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const contacts = Array.isArray(body.contacts) ? body.contacts : [body];
      const imported = await contactSourcingEngine.importContacts(body.campaignId, contacts, {
        source: body.source || "manual-import",
      });
      sendJson(request, response, 201, imported);
      return;
    }

    if (request.method === "GET" && url.pathname === "/prospecting/runs") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, store.listProspectingRuns(campaignId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/prospects/pipeline") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, prospectActivationEngine.buildPipeline(campaignId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/prospects/enrich") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const result = await prospectActivationEngine.enrichContacts(body.campaignId, {
        provider: body.provider,
        limit: body.limit,
        dispatch: body.dispatch,
        connectors: Array.isArray(body.connectors) ? body.connectors.map(resolveConnectorName) : undefined,
      });
      sendJson(request, response, 201, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/prospects/sequence") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const result = await prospectActivationEngine.sequenceContacts(body.campaignId, {
        limit: body.limit,
        dispatch: body.dispatch,
        connectors: Array.isArray(body.connectors) ? body.connectors.map(resolveConnectorName) : undefined,
      });
      sendJson(request, response, 201, result);
      return;
    }

    if (request.method === "GET" && url.pathname === "/prospects/activation-runs") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, store.listActivationRuns(campaignId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/funding/investors") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const records = Array.isArray(body.records) ? body.records : [body];
      const imported = fundingEngine.importInvestors(body.campaignId, records);
      await store.addInvestorRecords(imported);
      sendJson(request, response, 201, imported);
      return;
    }

    if (request.method === "GET" && url.pathname === "/funding/investors") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, store.listInvestorRecords(campaignId));
      return;
    }

    // Serve generated fundraising decks as rendered HTML
    if (request.method === "GET" && parts[0] === "decks" && parts[1]) {
      const deckId = parts[1];
      const deck = FundingDeckEngine.getCachedDeck(deckId);
      if (!deck) {
        sendJson(request, response, 404, { error: "Deck not found." });
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", ...buildCorsHeaders(request) });
      response.end(`
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${deck.title || 'Fundraising Deck'}</title>
<style>
  body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; max-width: 720px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #1a1a2e; }
  h1 { font-size: 1.8rem; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.5rem; }
  h2 { font-size: 1.3rem; margin-top: 2rem; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 2rem; }
  hr { border: none; border-top: 1px solid #eee; margin: 2rem 0; }
</style>
</head><body>
<h1>${deck.title}</h1>
<div class="meta">Generated ${new Date(deck.createdAt).toLocaleDateString()} &bull; For ${deck.investor?.fundName || 'Investor'}${deck.investor?.partnerName ? ' / ' + deck.investor.partnerName : ''}</div>
${deck.htmlBody || '<pre>' + (deck.markdown || '') + '</pre>'}
</body></html>`);
      return;
    }

    if (request.method === "POST" && url.pathname === "/funding/source") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const results = { imported: 0, seedImported: 0, secImported: 0, errors: [] };

      // 1. Seed data import
      if (body.useSeedData !== false) {
        try {
          const { readFile } = await import("node:fs/promises");
          const seedText = await readFile(new URL("../data/seed-investors.json", import.meta.url), "utf-8");
          const seedRecords = JSON.parse(seedText);
          const imported = fundingEngine.importInvestors(body.campaignId, seedRecords);
          await store.addInvestorRecords(imported);
          results.seedImported = imported.length;
          results.imported += imported.length;
        } catch (err) {
          results.errors.push({ phase: "seed", error: err.message });
        }
      }

      // 2. SEC-based investor sourcing via source-ingestion-engine
      if (body.secSearchQuery) {
        try {
          const researchRecords = await sourceIngestionEngine.ingestResearch({
            sources: ["sec"],
            query: body.secSearchQuery,
            limit: body.secLimit || 10,
          });
          const investorRecords = [];
          for (const connector of (sourceIngestionEngine.connectors || [])) {
            if (typeof connector.toInvestorRecords === "function") {
              const records = connector.toInvestorRecords(researchRecords, body.campaignId);
              investorRecords.push(...records);
            }
          }
          if (investorRecords.length > 0) {
            await store.addInvestorRecords(investorRecords);
            results.secImported = investorRecords.length;
            results.imported += investorRecords.length;
          }
        } catch (err) {
          results.errors.push({ phase: "sec", error: err.message });
        }
      }

      sendJson(request, response, 201, results);
      return;
    }

    if (request.method === "GET" && url.pathname === "/funding/pipeline") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, fundingEngine.buildPipeline(campaignId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/funding/sequence") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const maxPerRun = Number.isFinite(Number(body.maxPerRun)) ? Number(body.maxPerRun) : config.safety.maxFundingBatch;
      executionGuard.assertBatchWithinLimit(maxPerRun, config.safety.maxFundingBatch, { executionType: "funding_sequence" });
      const result = await fundingEngine.sequenceOutreach(body.campaignId, {
        limit: body.limit,
        maxPerRun,
      });
      sendJson(request, response, 201, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/funding/run") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const maxPerRun = Number.isFinite(Number(body.maxPerRun)) ? Number(body.maxPerRun) : config.safety.maxFundingBatch;
      executionGuard.assertBatchWithinLimit(maxPerRun, config.safety.maxFundingBatch, { executionType: "funding_run" });
      const guarded = await executionGuard.run({
        campaignId: body.campaignId,
        executionType: "funding_run",
        reason: body.reason || "manual",
        liveSideEffect: true,
        approvalToken: String(body.approvalToken || ""),
        idempotencyKey: executionGuard.buildIdempotencyKey({
          campaignId: body.campaignId,
          executionType: "funding_run",
          reason: body.reason || "manual",
          keyParts: [body.limit || "", maxPerRun],
        }),
        metadata: { limit: body.limit || null, maxPerRun },
        operation: () => fundingEngine.runCampaign(body.campaignId, {
          prioritizedLimit: body.limit,
          maxPerRun,
          sourceQuery: body.sourceQuery,
          sourceLimit: body.sourceLimit,
        }),
      });
      sendJson(request, response, 200, { executionReceiptId: guarded.receiptId, ...guarded.result });
      return;
    }

    if (request.method === "GET" && url.pathname === "/sources/health") {
      const result = await sourceIngestionEngine.health();
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/sources/ingest") {
      const body = await readBody(request);
      const campaignId = resolveCampaignId(store, body.campaignId);
      const result = await sourceIngestionEngine.ingestCampaign(campaignId, {
        query: String(body.query || body.prompt || store.getCampaign(campaignId)?.objective || "market intelligence"),
        limit: Number.isFinite(Number(body.limit)) ? Number(body.limit) : 5,
      });
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "GET" && url.pathname === "/funding/runs") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, store.listFundingRuns(campaignId));
      return;
    }

    // ── Funding run detail ───────────────────────────────────────
    if (request.method === "GET" && parts[0] === "funding" && parts[1] === "runs" && parts[2]) {
      const runId = parts[2];
      const allRuns = store.listFundingRuns();
      const run = allRuns.find(r => r.id === runId);
      if (!run) {
        sendJson(request, response, 404, { error: "Funding run not found." });
        return;
      }
      sendJson(request, response, 200, run);
      return;
    }

    // ── Dead Letter Queue: list ───────────────────────────────────
    if (request.method === "GET" && url.pathname === "/dlq") {
      const campaignId = url.searchParams.get("campaignId");
      const runId = url.searchParams.get("runId");
      const since = url.searchParams.get("since");
      const limit = Number.isFinite(Number(url.searchParams.get("limit")))
        ? Number(url.searchParams.get("limit")) : 50;
      const entries = store.listDlqEntries({ campaignId, runId, since });
      sendJson(request, response, 200, {
        count: entries.length,
        entries: entries.slice(0, limit),
      });
      return;
    }

    // ── Dead Letter Queue: pop (retry) ──────────────────────────────
    if (request.method === "DELETE" && parts[0] === "dlq" && parts[1] && parts[2] === "retry") {
      const entryId = parts[2];
      const entry = await store.popDlqEntry(entryId);
      if (!entry) {
        sendJson(request, response, 404, { error: "DLQ entry not found." });
        return;
      }
      sendJson(request, response, 200, {
        retried: true,
        entry,
        note: "Re-submit via POST /funding/run with campaignId to retry the failed step.",
      });
      return;
    }

    // ── Safety: cancel / abort an execution receipt ─────────────────
    if (request.method === "DELETE" && parts[0] === "safety" && parts[1] === "executions" && parts[2]) {
      const receiptId = parts[2];
      const allReceipts = store.listExecutionReceipts();
      const receipt = allReceipts.find(r => r.id === receiptId);
      if (!receipt) {
        sendJson(request, response, 404, { error: "Execution receipt not found." });
        return;
      }
      if (receipt.status === "completed") {
        sendJson(request, response, 409, { error: "Cannot cancel a completed execution." });
        return;
      }
      await store.updateExecutionReceipt(receiptId, {
        status: "cancelled",
        endedAt: new Date().toISOString(),
        outcome: "cancelled_by_user",
      });
      sendJson(request, response, 200, { cancelled: true, receiptId });
      return;
    }

    // ── Dedupe: check idempotency key ─────────────────────────────
    if (request.method === "GET" && url.pathname === "/dedupe/check") {
      const idempotencyKey = url.searchParams.get("key");
      if (!idempotencyKey) {
        sendJson(request, response, 400, { error: "key query parameter is required." });
        return;
      }
      const receipts = store.listExecutionReceipts({ idempotencyKey });
      if (receipts.length === 0) {
        sendJson(request, response, 200, { exists: false, key: idempotencyKey });
        return;
      }
      const latest = receipts[receipts.length - 1];
      sendJson(request, response, 200, {
        exists: true,
        key: idempotencyKey,
        receiptId: latest.id,
        status: latest.status,
        createdAt: latest.createdAt,
        outcome: latest.outcome || null,
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/safety/executions") {
      const campaignId = url.searchParams.get("campaignId");
      const executionType = url.searchParams.get("executionType");
      const status = url.searchParams.get("status");
      sendJson(request, response, 200, store.listExecutionReceipts({
        campaignId,
        executionType,
        status,
      }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/funding/outreach-events") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, store.listFundingOutreachEvents(campaignId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/funding/enrichment-status") {
      sendJson(request, response, 200, getEnrichmentProvidersStatus());
      return;
    }

    if (request.method === "POST" && url.pathname === "/funding/enrich") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const investors = store.listInvestorRecords(body.campaignId);
      const results = { enriched: 0, skipped: 0, errors: 0 };
      const events = [];
      for (const inv of investors) {
        if (inv.email) {
          results.skipped++;
          continue;
        }
        try {
          const enriched = await enrichInvestorEmail({
            fundName: inv.fundName,
            partnerName: inv.partnerName,
            website: inv.website,
            domain: inv.domain,
          });
          if (enriched.email) {
            await store.updateInvestorRecord(body.campaignId, inv.id, {
              email: enriched.email,
              enrichmentSource: enriched.source,
              enrichmentConfidence: enriched.confidence,
              enrichedAt: new Date().toISOString(),
              status: "enriched",
            });
            results.enriched++;
            events.push({
              id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              campaignId: body.campaignId,
              investorId: inv.id,
              type: "email_enriched",
              channel: "api",
              timestamp: new Date().toISOString(),
              metadata: { source: enriched.source, confidence: enriched.confidence },
            });
          } else {
            results.skipped++;
          }
        } catch (err) {
          console.error(`[funding/enrich] Error enriching ${inv.fundName}:`, err.message);
          results.errors++;
        }
      }
      if (events.length > 0) {
        await store.addFundingOutreachEvents(events);
      }
      sendJson(request, response, 200, results);
      return;
    }

    if (request.method === "POST" && url.pathname === "/funding/send-deck") {
      const body = await readBody(request);
      if (!body.campaignId || !body.investorId) {
        sendJson(request, response, 400, { error: "campaignId and investorId are required." });
        return;
      }
      const investor = store.listInvestorRecords(body.campaignId).find(inv => inv.id === body.investorId);
      if (!investor) {
        sendJson(request, response, 404, { error: "Investor not found." });
        return;
      }
      const guarded = await executionGuard.run({
        campaignId: body.campaignId,
        executionType: "funding_send_deck",
        reason: body.reason || "manual",
        liveSideEffect: true,
        approvalToken: String(body.approvalToken || ""),
        idempotencyKey: executionGuard.buildIdempotencyKey({
          campaignId: body.campaignId,
          executionType: "funding_send_deck",
          reason: body.reason || "manual",
          keyParts: [body.investorId],
        }),
        metadata: { investorId: body.investorId },
        operation: async () => {
          let deckUrl = null;
          let sendResult = null;
          try {
            const deckResult = await fundingDeckEngine.generateDeckUrl({
              fundName: investor.fundName,
              partnerName: investor.partnerName,
              campaignId: body.campaignId,
            });
            deckUrl = deckResult?.url || null;

            if (investor.email && adapters.sendEmail) {
              const subject = `Investment Opportunity: ${store.getCampaign(body.campaignId)?.name || 'SquidWeave Proposal'}`;
              const deck = deckResult?.deck;
              const emailBody = deck?.htmlBody || "";
              const textBody = `Dear ${investor.partnerName || investor.fundName},\n\nI'm reaching out regarding a company that aligns with ${investor.fundName}'s investment thesis.\n\nView the full deck here: ${config.dryRun ? "(dry-run) " : ""}${deckUrl || "(no url)"}\n\nWarmly,\n${process.env.SMTP_FROM_NAME || "SquidWeave Team"}`;
              sendResult = await adapters.sendEmail({
                to: investor.email,
                subject,
                html: emailBody || undefined,
                text: textBody,
              });
            }
          } catch (err) {
            console.error(`[funding/send-deck] Deck generation/send error:`, err.message);
          }
          const event = {
            id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            campaignId: body.campaignId,
            investorId: body.investorId,
            type: "deck_sent",
            channel: investor.email ? "email" : "api",
            timestamp: new Date().toISOString(),
            metadata: { deckUrl, email: investor.email || null, sent: sendResult?.ok || false },
          };
          await store.addFundingOutreachEvents([event]);
          await store.updateInvestorRecord(body.campaignId, body.investorId, {
            status: "contacted",
            lastContactAt: new Date().toISOString(),
            deckUrl,
          });
          return event;
        },
      });
      sendJson(request, response, 201, { executionReceiptId: guarded.receiptId, ...guarded.result });
      return;
    }

    if (request.method === "POST" && url.pathname === "/funding/log-event") {
      const body = await readBody(request);
      if (!body.campaignId || !body.investorId || !body.type) {
        sendJson(request, response, 400, { error: "campaignId, investorId, and type are required." });
        return;
      }
      const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        campaignId: body.campaignId,
        investorId: body.investorId,
        type: body.type,
        channel: body.channel || "manual",
        timestamp: new Date().toISOString(),
        notes: body.notes || null,
      };
      await store.addFundingOutreachEvents([event]);
      // Auto-advance pipeline status based on event type
      const statusMap = {
        meeting_scheduled: "meeting",
        meeting_completed: "dd",
        intro_call: "meeting",
        termsheet: "termsheet",
        closed: "closed",
        follow_up: undefined, // no status change
      };
      const newStatus = statusMap[body.type];
      if (newStatus) {
        await store.updateInvestorRecord(body.campaignId, body.investorId, {
          status: newStatus,
          lastContactAt: new Date().toISOString(),
        });
      }
      sendJson(request, response, 201, event);
      return;
    }

    // ── Calendly Meeting Booking ────────────────────────────────
    if (request.method === "POST" && url.pathname === "/funding/book-meeting") {
      const body = await readBody(request);
      if (!body.investorEmail || !body.startTime) {
        sendJson(request, response, 400, { error: "investorEmail and startTime are required." });
        return;
      }

      // Get first available event type, or use specific one if provided
      let eventTypeUri = body.eventTypeUri;
      if (!eventTypeUri) {
        const defaultUri = await calendly.getFirstEventTypeUri();
        if (!defaultUri) {
          sendJson(request, response, 400, {
            error: "No active Calendly event type found. Create one in Calendly or provide an eventTypeUri.",
          });
          return;
        }
        eventTypeUri = defaultUri;
      }

      const result = await calendly.scheduleEvent({
        eventTypeUri,
        inviteeEmail: body.investorEmail,
        inviteeName: body.investorName || "Investor",
        startTime: body.startTime,
        timezone: body.timezone || "America/New_York",
        notes: body.notes || `SquidWeave funding meeting — ${body.campaignId || ""}`,
      });

      if (result.ok) {
        // Log the meeting event
        const event = {
          id: `cal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          campaignId: body.campaignId || null,
          investorId: body.investorId || null,
          type: "meeting_scheduled",
          channel: "calendly",
          timestamp: new Date().toISOString(),
          notes: `Meeting booked via Calendly for ${body.startTime} with ${body.investorEmail}`,
          metadata: {
            calendlyEventUri: result.data?.uri || null,
            eventType: eventTypeUri,
            startTime: body.startTime,
          },
        };
        if (body.campaignId && store.addFundingOutreachEvents) {
          await store.addFundingOutreachEvents([event]);
          if (body.investorId) {
            await store.updateInvestorRecord(body.campaignId, body.investorId, {
              status: "meeting",
              lastContactAt: new Date().toISOString(),
            });
          }
        }
        sendJson(request, response, 201, { success: true, event, calendlyResult: result.data });
      } else {
        sendJson(request, response, 502, { error: `Calendly booking failed: ${result.error}` });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/funding/calendly-status") {
      sendJson(request, response, 200, calendly.getCalendlyStatus());
      return;
    }

    if (request.method === "GET" && url.pathname === "/funding/calendly-events") {
      const result = await calendly.listScheduledEvents({
        minStartTime: url.searchParams.get("minStartTime") || undefined,
        maxStartTime: url.searchParams.get("maxStartTime") || undefined,
        status: url.searchParams.get("status") || "active",
      });
      if (result.ok) {
        sendJson(request, response, 200, result.events);
      } else {
        sendJson(request, response, 502, { error: result.error });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/funding/calendly-event-types") {
      const result = await calendly.listEventTypes();
      if (result.ok) {
        sendJson(request, response, 200, result.eventTypes);
      } else {
        sendJson(request, response, 502, { error: result.error });
      }
      return;
    }

    // ── Cal.com (free Calendly alternative) ────────────────────
    if (request.method === "GET" && url.pathname === "/funding/calcom-status") {
      const { listCalComEvents, getCalComStatus } = await import("./adapters/index.mjs");
      sendJson(request, response, 200, getCalComStatus());
      return;
    }

    if (request.method === "GET" && url.pathname === "/funding/calcom-event-types") {
      const { listCalComEvents } = await import("./adapters/index.mjs");
      const result = await listCalComEvents();
      if (result.ok) {
        sendJson(request, response, 200, result.eventTypes);
      } else {
        sendJson(request, response, 502, { error: result.error });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/funding/calcom-schedule") {
      const body = await readBody(request);
      const { scheduleCalComEvent, getFirstCalComEventTypeUri } = await import("./adapters/index.mjs");
      const eventTypeUri = body.eventTypeUri || (await getFirstCalComEventTypeUri()).uri;
      const result = await scheduleCalComEvent({
        eventTypeUri,
        inviteeEmail: body.inviteeEmail || "",
        inviteeName: body.inviteeName || "Investor",
        startTime: body.startTime || new Date(Date.now() + 86400000).toISOString(),
        timezone: body.timezone || "America/New_York",
        location: body.location || "",
        notes: body.notes || "",
      });
      if (result.ok) {
        sendJson(request, response, 201, { success: true, event: result.event, calcomResult: result });
      } else {
        sendJson(request, response, 502, { error: `Cal.com booking failed: ${result.error}` });
      }
      return;
    }

    // ── Enrich investor emails (pattern fallback) ─────────────
    if (request.method === "POST" && url.pathname === "/funding/enrich-investor-emails") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }

      const investors = store.listInvestorRecords(body.campaignId) || [];
      if (investors.length === 0) {
        sendJson(request, response, 200, { enriched: 0, message: "No investors in pipeline", investors: [] });
        return;
      }

      const enriched = [];
      for (const inv of investors) {
        if (inv.email) {
          enriched.push(inv);
          continue;
        }
        // Pattern-based email guess: partnerName@domain
        if (inv.partnerName && inv.domain) {
          const firstName = inv.partnerName.split(" ")[0]?.toLowerCase() || "";
          const lastName = inv.partnerName.split(" ").slice(1).join("").toLowerCase() || "";
          const guessed = `${firstName}.${lastName}@${inv.domain}`;
          await store.updateInvestorRecord(body.campaignId, inv.id, {
            email: guessed,
            enrichmentSource: "pattern-guess",
            enrichmentConfidence: 0.4,
            enrichedAt: new Date().toISOString(),
          });
          enriched.push({ ...inv, email: guessed, enrichmentSource: "pattern-guess" });
        } else if (inv.fundName && inv.website) {
          // Fallback: fund info@domain
          const domain = inv.domain || (inv.website ? inv.website.replace(/^https?:\/\//, "").split("/")[0] : null);
          if (domain) {
            const guessed = `info@${domain}`;
            await store.updateInvestorRecord(body.campaignId, inv.id, {
              email: guessed,
              enrichmentSource: "pattern-fallback",
              enrichmentConfidence: 0.2,
              enrichedAt: new Date().toISOString(),
            });
            enriched.push({ ...inv, email: guessed, enrichmentSource: "pattern-fallback" });
          }
        }
      }

      sendJson(request, response, 200, {
        enriched: enriched.length,
        total: investors.length,
        stillMissing: investors.filter(i => !i.email && !enriched.find(e => e.id === i.id)).length,
        investors: enriched,
      });
      return;
    }

    // ── Full Funding Pipeline Execution ────────────────────────
    if (request.method === "POST" && url.pathname === "/funding/run-full-pipeline") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }

      // Step 1: Source investors (if sourceIngestionEngine configured)
      let sourcingResult = null;
      if (sourceIngestionEngine) {
        sourcingResult = await fundingEngine.sourceVcInvestors(body.campaignId, {
          query: body.query || "venture capital investors",
          limit: body.sourceLimit || 50,
        });
      }

      // Step 2: Build pipeline + scores
      const pipeline = fundingEngine.buildPipeline(body.campaignId, {
        prioritizedLimit: body.prioritizedLimit || 200,
      });

      // Step 3: Enrich emails (pattern fallback)
      const enrichmentResult = await store.listInvestorRecords(body.campaignId) || [];
      const enrichments = [];
      for (const inv of enrichmentResult) {
        if (inv.email) continue;
        if (inv.partnerName && inv.domain) {
          const first = inv.partnerName.split(" ")[0]?.toLowerCase() || "";
          const last = inv.partnerName.split(" ").slice(1).join("").toLowerCase() || "";
          const guess = `${first}.${last}@${inv.domain}`;
          await store.updateInvestorRecord(body.campaignId, inv.id, {
            email: guess,
            enrichmentSource: "pattern-guess",
            enrichmentConfidence: 0.4,
            enrichedAt: new Date().toISOString(),
          });
          enrichments.push({ id: inv.id, email: guess });
        }
      }

      // Step 4: Generate and send deck
      const campaign = store.getCampaign(body.campaignId);
      const deckInvestors = (store.listInvestorRecords(body.campaignId) || [])
        .filter(i => i.email && ["sourced", "enriched", "ready"].includes(i.status))
        .slice(0, body.deckLimit || 20);

      let deckResult = null;
      if (fundingDeckEngine && deckInvestors.length > 0) {
        deckResult = await fundingDeckEngine.prepareAndSend({
          campaign,
          investors: deckInvestors,
        });
      }

      // Step 5: Sequence outreach
      const sequenceResult = await fundingEngine.sequenceOutreach(body.campaignId, {
        limit: body.prioritizedLimit || 200,
        maxPerRun: body.maxPerRun || 20,
      });

      sendJson(request, response, 200, {
        campaignId: body.campaignId,
        sourcing: sourcingResult ? {
          imported: sourcingResult.imported,
          records: sourcingResult.records?.length || 0,
        } : null,
        pipeline: {
          total: pipeline.counts.total,
          byStatus: pipeline.counts.byStatus,
        },
        enrichments: {
          applied: enrichments.length,
          stillMissing: enrichmentResult.filter(i => !i.email).length,
        },
        deck: deckResult ? {
          deckId: deckResult.deck?.id || null,
          sent: deckResult.outreach?.length || 0,
          errors: deckResult.errors?.length || 0,
        } : null,
        sequence: {
          processedInvestors: sequenceResult.run?.processedInvestors || 0,
          runId: sequenceResult.run?.id || null,
        },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/targets/decide") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, targetingEngine.buildDecision(body.campaignId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/reengagement") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const decision = targetingEngine.buildDecision(campaignId);
      sendJson(request, response, 200, {
        campaignId,
        updatedAt: decision.updatedAt,
        queue: decision.reengagementQueue,
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/connectors/status") {
      const probe = ["1", "true", "yes"].includes(String(url.searchParams.get("probe") || "").toLowerCase());
      const timeoutMs = Number(url.searchParams.get("timeoutMs")) || 4000;
      const statuses = await Promise.all(Object.values(connectors).map(connector => connector.getStatus({ probe, timeoutMs })));
      sendJson(request, response, 200, statuses);
      return;
    }

    if (request.method === "GET" && url.pathname === "/setup/requirements") {
      sendJson(request, response, 200, buildSetupRequirements());
      return;
    }

    if (request.method === "GET" && url.pathname === "/diagnostics/openclaw") {
      const timeoutMs = Number(url.searchParams.get("timeoutMs")) || 4000;
      sendJson(request, response, 200, await buildOpenClawDiagnostics(connectors, timeoutMs));
      return;
    }

    if (request.method === "GET" && parts[0] === "connectors" && parts[1] && parts[2] === "config") {
      const connectorName = resolveConnectorName(parts[1]);
      const connector = connectors[connectorName];
      if (!connector) {
        sendJson(request, response, 404, { error: "Connector not found." });
        return;
      }
      const stored = store.getConnectorConfig(connectorName) || store.getConnectorConfig(parts[1]);
      sendJson(request, response, 200, sanitizeConnectorConfig(stored || {
        connector: connectorName,
        baseUrl: connector.baseUrl,
        dryRun: connector.dryRun,
        token: connector.token,
        updatedAt: null,
      }));
      return;
    }

    if (request.method === "POST" && parts[0] === "connectors" && parts[1] && parts[2] === "config") {
      const connectorName = resolveConnectorName(parts[1]);
      const connector = connectors[connectorName];
      if (!connector) {
        sendJson(request, response, 404, { error: "Connector not found." });
        return;
      }

      const body = await readBody(request);
      const current = store.getConnectorConfig(connectorName) || {
        connector: connectorName,
        baseUrl: connector.baseUrl,
        token: connector.token,
        dryRun: connector.dryRun,
      };

      const nextConfig = {
        baseUrl: body.baseUrl !== undefined ? String(body.baseUrl || "").trim() : current.baseUrl,
        token: body.token !== undefined ? String(body.token || "").trim() : current.token,
        dryRun: body.dryRun !== undefined ? Boolean(body.dryRun) : current.dryRun,
      };

      if (!nextConfig.baseUrl) {
        sendJson(request, response, 400, { error: "baseUrl is required." });
        return;
      }

      if (!nextConfig.token) {
        sendJson(request, response, 400, { error: "token is required." });
        return;
      }

      const saved = await store.upsertConnectorConfig(connectorName, nextConfig);
      connector.setCredentials(nextConfig);
      const status = await connector.getStatus({
        probe: ["1", "true", "yes"].includes(String(body.probe || "").toLowerCase()),
        timeoutMs: Number(body.timeoutMs) || 4000,
      });
      sendJson(request, response, 200, {
        config: sanitizeConnectorConfig(saved),
        status,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/decision/run") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const job = jobManager.createJob("decision", { campaignId: body.campaignId });
      try {
        jobManager.push(job.id, "running", "Decision engine started.");
        const decision = await decisionEngine.run(body.campaignId);
        jobManager.complete(job.id, decision);
        sendJson(request, response, 200, {
          job: jobManager.getJob(job.id),
          decision,
        });
      } catch (error) {
        jobManager.fail(job.id, error);
        throw error;
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/decisions") {
      sendJson(request, response, 200, store.listDecisions(url.searchParams.get("campaignId")));
      return;
    }

    if (request.method === "POST" && url.pathname === "/content/generate") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const job = jobManager.createJob("content", { campaignId: body.campaignId });
      try {
        jobManager.push(job.id, "running", "Content generation started.");
        const pack = await automationEngine.generateContentPack(body.campaignId, {
          locales: normalizeLocales(body.locales, config.defaultLocale),
          reason: body.reason || "manual",
        });
        jobManager.complete(job.id, pack);
        sendJson(request, response, 201, {
          job: jobManager.getJob(job.id),
          contentPack: pack,
        });
      } catch (error) {
        jobManager.fail(job.id, error);
        throw error;
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/content") {
      sendJson(request, response, 200, store.listContentPacks(url.searchParams.get("campaignId")));
      return;
    }

    if (request.method === "POST" && url.pathname === "/automation/run") {
      const body = await readBody(request);
      const campaignId = resolveCampaignId(store, body.campaignId);
      const job = jobManager.createJob("automation", { campaignId, reason: body.reason || "manual" });
      try {
        jobManager.push(job.id, "running", "Automation run started.");
        const guarded = await executionGuard.run({
          campaignId,
          executionType: "automation_run",
          reason: body.reason || "manual",
          idempotencyKey: executionGuard.buildIdempotencyKey({
            campaignId,
            executionType: "automation_run",
            reason: body.reason || "manual",
            keyParts: [JSON.stringify(body.locales || [])],
          }),
          metadata: { locales: body.locales || [] },
          operation: () => automationEngine.runCampaign(campaignId, {
            locales: body.locales,
            reason: body.reason || "manual",
          }),
        });
        const result = guarded.result;
        jobManager.complete(job.id, result);
        sendJson(request, response, 200, {
          job: jobManager.getJob(job.id),
          executionReceiptId: guarded.receiptId,
          ...result,
        });
      } catch (error) {
        jobManager.fail(job.id, error);
        throw error;
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/automation/prompt-run") {
      const body = await readBody(request);
      if (!body.prompt || !String(body.prompt).trim()) {
        sendJson(request, response, 400, { error: "prompt is required." });
        return;
      }

      const { campaign, reason } = await ensurePromptCampaign({
        store,
        memoryEngine,
        prompt: body.prompt,
        campaignId: body.campaignId,
        reason: body.reason,
      });

      const policy = buildAutopilotPolicy({ prompt: body.prompt, campaign });
      const job = jobManager.createJob("autopilot", { campaignId: campaign.id, reason, policy: policy.classification });
      try {
        const executionLog = [];
        const mark = (stage, status, detail = {}) => {
          executionLog.push({ stage, status, timestamp: new Date().toISOString(), ...detail });
        };

        jobManager.push(job.id, "running", "Autopilot orchestration started from prompt.");
        mark("policy", "completed", { classification: policy.classification });

        const sourceIngestion = await sourceIngestionEngine.ingestCampaign(campaign.id, {
          query: String(body.prompt || campaign.objective || "market intelligence"),
          limit: Number.isFinite(Number(body.sourceLimit)) ? Number(body.sourceLimit) : 5,
        });
        mark("free_source_ingestion", "completed", {
          ingestedResearch: sourceIngestion?.researchRecords?.length || 0,
          ingestedInvestors: sourceIngestion?.investorRecords?.length || 0,
        });

        const automation = await automationEngine.runCampaign(campaign.id, {
          locales: body.locales,
          reason,
        });
        mark("automation", "completed", { reason, agentRuns: automation?.agentRuns?.length || 0 });

        let prospecting = null;
        let enrichment = null;
        let sequencing = null;
        if (policy.stages.organicOutreach.enabled) {
          prospecting = await contactSourcingEngine.generateAndPersist(campaign.id, {
            reason: "prompt-autopilot",
            limit: Number.isFinite(Number(body.prospectLimit)) ? Number(body.prospectLimit) : 30,
          });
          mark("organic_prospecting", "completed", {
            generatedContacts: Array.isArray(prospecting?.candidates) ? prospecting.candidates.length : 0,
          });

          enrichment = await prospectActivationEngine.enrichContacts(campaign.id, {
            provider: "internal-waterfall",
            limit: Number.isFinite(Number(body.enrichLimit)) ? Number(body.enrichLimit) : 24,
            dispatch: true,
          });
          const enrichmentProcessed = enrichment?.run?.processedContacts || 0;
          const enrichmentStatus = enrichment?.run?.status === "attention"
            ? "partial"
            : enrichmentProcessed === 0
              ? "skipped"
              : "completed";
          mark("organic_enrichment", enrichmentStatus, {
            processedContacts: enrichmentProcessed,
            connectorIssues: enrichment?.run?.connectorIssues || [],
          });

          sequencing = await prospectActivationEngine.sequenceContacts(campaign.id, {
            limit: Number.isFinite(Number(body.sequenceLimit)) ? Number(body.sequenceLimit) : 24,
            dispatch: true,
          });
          const sequencingProcessed = sequencing?.run?.processedContacts || 0;
          const sequencingStatus = sequencing?.run?.status === "attention"
            ? "partial"
            : sequencingProcessed === 0
              ? "skipped"
              : "completed";
          mark("organic_sequencing", sequencingStatus, {
            processedContacts: sequencingProcessed,
            connectorIssues: sequencing?.run?.connectorIssues || [],
          });
        } else {
          mark("organic_workflow", "skipped", { reason: "policy-disabled" });
        }

        let funding = null;
        let fundingDeck = null;
        if (policy.stages.funding.enabled) {
          funding = await fundingEngine.runCampaign(campaign.id, {
            limit: Number.isFinite(Number(body.fundingLimit)) ? Number(body.fundingLimit) : 20,
          });
          mark("funding", "completed", { processedInvestors: funding?.sequence?.run?.processedInvestors || 0 });

          fundingDeck = await fundingDeckEngine.prepareAndSend({
            campaign,
            investors: funding?.pipeline?.prioritized || [],
          });
          mark("funding_deck_outreach", "completed", {
            sent: fundingDeck?.outreach?.sent || 0,
            failed: fundingDeck?.outreach?.failed || 0,
          });
        } else {
          mark("funding", "skipped", { reason: "objective-not-funding" });
        }

        let paidExecution = null;
        if (policy.stages.paidAds.enabled) {
          paidExecution = await paidExecutionEngine.launchCampaigns({
            campaignId: campaign.id,
            channels: policy.stages.paidAds.channels,
            creativeSummary: `${automation?.contentPack?.variants?.length || 0} localized variants`,
            budgetAmount: policy.classification.budgetAmount,
          });
          mark("paid_distribution", paidExecution.summary.failed ? "partial" : "completed", {
            channels: policy.stages.paidAds.channels,
            launched: paidExecution.summary.launched,
            failed: paidExecution.summary.failed,
          });
        } else {
          mark("paid_distribution", "skipped", { reason: "budget-policy" });
        }

        let socialPublishing = null;
        if (policy.stages.organicOutreach.enabled) {
          socialPublishing = await socialPublishingEngine.publishVariants({
            campaignId: campaign.id,
            variants: automation?.contentPack?.variants || [],
            channels: ["linkedin", "twitter", "telegram"],
          });
          mark("social_publishing", socialPublishing.summary.failed ? "partial" : "completed", {
            published: socialPublishing.summary.published,
            failed: socialPublishing.summary.failed,
          });
        }

        const slaPolicy = {
          maxAttempts: 3,
          retryStrategy: "exponential_backoff",
          escalationThreshold: 1,
          status: [
            paidExecution?.summary?.failed,
            socialPublishing?.summary?.failed,
            fundingDeck?.outreach?.failed,
          ].some(value => Number(value || 0) > 0)
            ? "attention_required"
            : "within_sla",
        };

        const payload = {
          campaign,
          reason,
          policy,
          executionLog,
          sourceIngestion,
          automation,
          prospecting,
          enrichment,
          sequencing,
          funding,
          fundingDeck,
          paidExecution,
          socialPublishing,
          slaPolicy,
          pipeline: prospectActivationEngine.buildPipeline(campaign.id),
          fundingPipeline: fundingEngine.buildPipeline(campaign.id),
        };
        jobManager.complete(job.id, payload);
        sendJson(request, response, 200, {
          job: jobManager.getJob(job.id),
          ...payload,
        });
      } catch (error) {
        jobManager.fail(job.id, error);
        throw error;
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/automation/runs") {
      sendJson(request, response, 200, store.listAutomationRuns(url.searchParams.get("campaignId")));
      return;
    }

    if (request.method === "GET" && url.pathname === "/agents/system") {
      sendJson(request, response, 200, agentOrchestrator.listAgents());
      return;
    }

    if (request.method === "GET" && url.pathname === "/agents/runs") {
      sendJson(request, response, 200, store.listAgentRuns(url.searchParams.get("campaignId")));
      return;
    }

    if (request.method === "GET" && parts[0] === "jobs" && parts[1] && parts[2] === "status") {
      const job = jobManager.getJob(parts[1]);
      if (!job) {
        sendJson(request, response, 404, { error: "Job not found." });
        return;
      }
      sendJson(request, response, 200, job);
      return;
    }

    if (request.method === "GET" && parts[0] === "jobs" && parts[1] && parts[2] === "stream") {
      const job = jobManager.getJob(parts[1]);
      if (!job) {
        sendJson(request, response, 404, { error: "Job not found." });
        return;
      }

      sendEventStreamHeaders(request, response);
      writeSse(response, "ready", {
        jobId: job.id,
        connectedAt: new Date().toISOString(),
      });
      for (const event of job.events) {
        writeSse(response, "status", event);
      }

      const unsubscribe = jobManager.subscribe(job.id, event => {
        writeSse(response, "status", event);
      });
      const heartbeat = setInterval(() => {
        response.write(": heartbeat\n\n");
      }, 15000);

      request.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
        response.end();
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/automation/status") {
      sendJson(request, response, 200, scheduler.getStatus());
      return;
    }

    // ── Analytics feedback loop ─────────────────────────────────
    if (request.method === "GET" && url.pathname.startsWith("/analytics/")) {
      const campaignId = url.pathname.replace("/analytics/", "");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId required" });
        return;
      }
      const type = url.searchParams.get("type") || "report";
      if (type === "insights") {
        sendJson(request, response, 200, analyticsEngine.generateInsights(campaignId));
      } else if (type === "refinements") {
        sendJson(request, response, 200, analyticsEngine.recommendRefinements(campaignId));
      } else {
        sendJson(request, response, 200, analyticsEngine.generateReport(campaignId));
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/automation/start") {
      scheduler.start();
      await scheduler.tick();
      sendJson(request, response, 200, scheduler.getStatus());
      return;
    }

    if (request.method === "POST" && url.pathname === "/automation/stop") {
      sendJson(request, response, 200, scheduler.stop());
      return;
    }

    if (request.method === "GET" && url.pathname === "/state") {
      sendJson(request, response, 200, {
        ...store.snapshot(),
        memory: {
          targetProfiles: store.listTargetProfiles(),
          tacticObservations: store.listTacticObservations(),
          playbooks: store.listPlaybooks(),
          memoryConsolidations: store.listMemoryConsolidations(),
        },
        connectors: await pickConnectors(connectors),
        scheduler: scheduler.getStatus(),
        jobs: {
          note: "Use /jobs/:id/status or /jobs/:id/stream for runtime job state.",
        },
      });
      return;
    }

    // ── GHL Bridge ────────────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/integrations/ghl/webhook") {
      const rawChunks = [];
      for await (const chunk of request) rawChunks.push(chunk);
      const rawBody = Buffer.concat(rawChunks).toString("utf8");
      if (!ghlBridge.verifySignature(request.headers["x-hub-signature-256"] || request.headers["x-signature"], rawBody)) {
        sendJson(request, response, 401, { error: "Invalid webhook signature" });
        return;
      }
      const body = JSON.parse(rawBody);
      const campaignId = url.searchParams.get("campaignId") || "";
      const result = await ghlBridge.ingestWebhook(body, { campaignId });
      sendJson(request, response, 200, result);
      return;
    }

    // ── GHL Bridge Sync/Push (graceful fallback to built-in store) ──
    const GHL_NOT_CONFIGURED_RESPONSE = {
      ok: true,
      note: "GHL not configured — built-in store is active. Use the entity API at POST /{collection} instead.",
      alternative: "POST /contacts, /opportunities, /pipelines, /workflows, /notes, /tasks, /calendarEvents",
    };

    async function handleGhlRoute(body, methodName) {
      if (ghlBridge.isConfigured()) {
        return await ghlBridge[methodName](body.campaignId, body.options || {});
      }
      return GHL_NOT_CONFIGURED_RESPONSE;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/contacts") {
      const body = await readBody(request);
      const result = await handleGhlRoute(body, "pullContacts");
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/opportunities") {
      const body = await readBody(request);
      const result = await handleGhlRoute(body, "pullOpportunities");
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/pipelines") {
      const body = await readBody(request);
      const result = await handleGhlRoute(body, "pullPipelines");
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/workflows") {
      const body = await readBody(request);
      const result = await handleGhlRoute(body, "pullWorkflows");
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/forms") {
      const body = await readBody(request);
      const result = await handleGhlRoute(body, "pullForms");
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/calendars") {
      const body = await readBody(request);
      const result = await handleGhlRoute(body, "pullCalendars");
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/full") {
      const body = await readBody(request);
      const result = await handleGhlRoute(body, "fullSync");
      sendJson(request, response, 200, result);
      return;
    }

    async function handleGhlPush(body, methodName) {
      if (ghlBridge.isConfigured()) {
        return await ghlBridge[methodName](body.contact || body.opportunity || body.note || body.task, body.campaignId);
      }
      return GHL_NOT_CONFIGURED_RESPONSE;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/push/contact") {
      const body = await readBody(request);
      const result = await handleGhlPush(body, "pushContact");
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/push/opportunity") {
      const body = await readBody(request);
      const result = await handleGhlPush(body, "pushOpportunity");
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/push/note") {
      const body = await readBody(request);
      const result = await handleGhlPush(body, "pushNote");
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/push/task") {
      const body = await readBody(request);
      const result = await handleGhlPush(body, "pushTask");
      sendJson(request, response, 200, result);
      return;
    }

    // ── Entity CRUD API ────────────────────────────────────────────
    if (request.method === "GET" && parts.length === 2 && ["contacts","opportunities","pipelines","workflows","workflowVersions","workflowExecutions","triggers","triggerStatus","notes","tasks","calendarEvents","tags","funnels","funnelSteps","funnelSubmissions","messageTemplates","messageSequences"].includes(parts[0])) {
      const [collection, id] = parts;
      const doc = store.getDocument(collection, id);
      if (!doc) { sendJson(request, response, 404, { error: "Not found" }); return; }
      sendJson(request, response, 200, doc);
      return;
    }

    if (request.method === "GET" && parts.length === 1 && ["contacts","opportunities","pipelines","workflows","workflowVersions","workflowExecutions","triggers","triggerStatus","notes","tasks","calendarEvents","tags","funnels","funnelSteps","funnelSubmissions","messageTemplates","messageSequences"].includes(parts[0])) {
      const collection = parts[0];
      const locationId = url.searchParams.get("locationId");
      const campaignId = url.searchParams.get("campaignId");
      const contactId = url.searchParams.get("contactId");
      let docs = store.listDocuments(collection);
      if (locationId) docs = docs.filter(d => d.locationId === locationId);
      if (campaignId) docs = docs.filter(d => d.campaignId === campaignId);
      if (contactId) docs = docs.filter(d => d.contactId === contactId);
      sendJson(request, response, 200, docs);
      return;
    }

    if (request.method === "POST" && parts.length === 1 && ["contacts","opportunities","pipelines","workflows","workflowVersions","workflowExecutions","triggers","triggerStatus","notes","tasks","calendarEvents","tags","funnels","funnelSteps","funnelSubmissions","messageTemplates","messageSequences"].includes(parts[0])) {
      const body = await readBody(request);
      const collection = parts[0];
      const id = body.id || null;
      const result = await store.upsertDocument(collection, id, body);
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "DELETE" && parts.length === 2 && ["contacts","opportunities","pipelines","workflows","workflowVersions","workflowExecutions","triggers","triggerStatus","notes","tasks","calendarEvents","tags","funnels","funnelSteps","funnelSubmissions","messageTemplates","messageSequences"].includes(parts[0])) {
      const [collection, id] = parts;
      await store.deleteDocument(collection, id);
      sendJson(request, response, 200, { deleted: true, id });
      return;
    }

    // ── Relationship queries ───────────────────────────────────────
    if (request.method === "GET" && parts[0] === "contacts" && parts[1] && parts[2] === "opportunities") {
      const docs = store.getContactOpportunities(parts[1]);
      sendJson(request, response, 200, docs);
      return;
    }

    if (request.method === "GET" && parts[0] === "contacts" && parts[1] && parts[2] === "notes") {
      const docs = store.getContactNotes(parts[1]);
      sendJson(request, response, 200, docs);
      return;
    }

    if (request.method === "GET" && parts[0] === "contacts" && parts[1] && parts[2] === "tasks") {
      const docs = store.getContactTasks(parts[1]);
      sendJson(request, response, 200, docs);
      return;
    }

    if (request.method === "GET" && parts[0] === "pipelines" && parts[1] && parts[2] === "opportunities") {
      const docs = store.getPipelineOpportunities(parts[1]);
      sendJson(request, response, 200, docs);
      return;
    }

    if (request.method === "GET" && parts[0] === "workflows" && parts[1] && parts[2] === "steps") {
      const docs = store.getWorkflowSteps(parts[1]);
      sendJson(request, response, 200, docs);
      return;
    }

    // ── Pipeline engine routes ────────────────────────────────────
    if (request.method === "POST" && parts[0] === "pipelines" && parts[1] && parts[2] === "stages" && parts.length === 3) {
      const body = await readBody(request);
      const stage = pipelineEngine.addStage(parts[1], body);
      sendJson(request, response, 200, stage);
      return;
    }

    if (request.method === "DELETE" && parts[0] === "pipelines" && parts[1] && parts[2] === "stages" && parts[3]) {
      const result = pipelineEngine.removeStage(parts[1], parts[3]);
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "PUT" && parts[0] === "pipelines" && parts[1] && parts[2] === "stages" && parts[3] === "reorder") {
      const body = await readBody(request);
      const stages = pipelineEngine.reorderStages(parts[1], body.stageIds);
      sendJson(request, response, 200, { stages });
      return;
    }

    if (request.method === "GET" && parts[0] === "pipelines" && parts[1] && parts[2] === "stats") {
      const stats = pipelineEngine.getPipelineStats(parts[1]);
      sendJson(request, response, 200, stats);
      return;
    }

    if (request.method === "POST" && parts[0] === "opportunities" && parts[1] && parts[2] === "transition") {
      const body = await readBody(request);
      try {
        const opp = await pipelineEngine.transitionOpportunity(parts[1], body.toStatus, body);
        sendJson(request, response, 200, opp);
      } catch (err) {
        sendJson(request, response, 400, { error: err.message });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/opportunities/bulk-transition") {
      const body = await readBody(request);
      const results = await pipelineEngine.bulkTransition(body.opportunityIds, body.toStatus, body);
      sendJson(request, response, 200, { results });
      return;
    }

    if (request.method === "GET" && parts[0] === "contacts" && parts[1] && parts[2] === "pipeline-summary") {
      const summary = await pipelineEngine.getContactPipelineSummary(parts[1]);
      sendJson(request, response, 200, summary);
      return;
    }

    // ── Workflow engine routes ──────────────────────────────────
    if (request.method === "GET" && parts[0] === "workflows" && parts[1] && parts[2] === "versions") {
      const versions = await workflowEngine.getWorkflowVersions(parts[1]);
      sendJson(request, response, 200, versions);
      return;
    }

    if (request.method === "GET" && parts[0] === "workflows" && parts[1] && parts[2] === "latest-version") {
      const version = await workflowEngine.getLatestVersion(parts[1]);
      sendJson(request, response, 200, version || {});
      return;
    }

    if (request.method === "POST" && parts[0] === "workflows" && parts[1] && parts[2] === "publish") {
      try {
        const result = await workflowEngine.publishWorkflow(parts[1]);
        sendJson(request, response, 200, result);
      } catch (err) {
        sendJson(request, response, 400, { error: err.message });
      }
      return;
    }

    if (request.method === "POST" && parts[0] === "workflows" && parts[1] && parts[2] === "draft") {
      const wf = await workflowEngine.draftWorkflow(parts[1]);
      sendJson(request, response, 200, wf);
      return;
    }

    if (request.method === "POST" && parts[0] === "workflows" && parts[1] && parts[2] === "steps" && parts.length === 3) {
      const body = await readBody(request);
      try {
        const step = workflowEngine.addStep(parts[1], body, body.afterIndex);
        sendJson(request, response, 200, step);
      } catch (err) {
        sendJson(request, response, 400, { error: err.message });
      }
      return;
    }

    if (request.method === "DELETE" && parts[0] === "workflows" && parts[1] && parts[2] === "steps" && parts[3]) {
      try {
        const result = workflowEngine.removeStep(parts[1], parts[3]);
        sendJson(request, response, 200, result);
      } catch (err) {
        sendJson(request, response, 400, { error: err.message });
      }
      return;
    }

    if (request.method === "PUT" && parts[0] === "workflows" && parts[1] && parts[2] === "steps" && parts[3] === "reorder") {
      const body = await readBody(request);
      try {
        const steps = workflowEngine.reorderSteps(parts[1], body.stepIds);
        sendJson(request, response, 200, { steps });
      } catch (err) {
        sendJson(request, response, 400, { error: err.message });
      }
      return;
    }

    if (request.method === "PUT" && parts[0] === "workflows" && parts[1] && parts[2] === "steps" && parts[3]) {
      const body = await readBody(request);
      try {
        const step = workflowEngine.updateStep(parts[1], parts[3], body);
        sendJson(request, response, 200, step);
      } catch (err) {
        sendJson(request, response, 400, { error: err.message });
      }
      return;
    }

    if (request.method === "POST" && parts[0] === "workflows" && parts[1] && parts[2] === "execute") {
      const body = await readBody(request);
      try {
        const result = await workflowEngine.executeWorkflowForContact(parts[1], body.contactId, body);
        sendJson(request, response, 200, result);
      } catch (err) {
        sendJson(request, response, 400, { error: err.message });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/workflows/stop-execution") {
      const body = await readBody(request);
      const result = await workflowEngine.stopWorkflowExecution(body.contactId, body.locationId, body.workflowId, body.userId, body.source);
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "GET" && parts[0] === "contacts" && parts[1] && parts[2] === "workflow-statuses") {
      const locationId = url.searchParams.get("locationId") || "";
      const statuses = workflowEngine.getWorkflowStatusesForContact(parts[1], locationId);
      sendJson(request, response, 200, statuses);
      return;
    }

    if (request.method === "GET" && url.pathname === "/step-templates") {
      const templates = workflowEngine.getStepTemplates();
      sendJson(request, response, 200, templates);
      return;
    }

    if (request.method === "POST" && parts[0] === "workflows" && parts[1] && parts[2] === "validate") {
      const result = workflowEngine.validateWorkflow(parts[1]);
      sendJson(request, response, 200, result);
      return;
    }

    // ── Trigger routes ────────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/triggers") {
      const body = await readBody(request);
      const trigger = await workflowEngine.createTrigger(body);
      sendJson(request, response, 200, trigger);
      return;
    }

    if (request.method === "PUT" && parts[0] === "triggers" && parts[1]) {
      const body = await readBody(request);
      try {
        const trigger = await workflowEngine.updateTrigger(parts[1], body);
        sendJson(request, response, 200, trigger);
      } catch (err) {
        sendJson(request, response, 400, { error: err.message });
      }
      return;
    }

    if (request.method === "DELETE" && parts[0] === "triggers" && parts[1]) {
      const result = await workflowEngine.deleteTrigger(parts[1]);
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && parts[0] === "triggers" && parts[1] && parts[2] === "toggle") {
      const trigger = workflowEngine.toggleTrigger(parts[1]);
      sendJson(request, response, 200, trigger);
      return;
    }

    if (request.method === "GET" && parts[0] === "triggers" && parts[1] && parts[2] === "for-workflow") {
      const triggers = workflowEngine.getTriggersForWorkflow(parts[1]);
      sendJson(request, response, 200, triggers);
      return;
    }

    if (request.method === "GET" && parts[0] === "triggers") {
      const locationId = url.searchParams.get("locationId") || "";
      const type = url.searchParams.get("type") || null;
      let triggers;
      if (locationId && type) {
        triggers = workflowEngine.getActiveTriggersByType(locationId, type);
      } else if (locationId) {
        triggers = workflowEngine.getTriggersByLocation(locationId);
      } else {
        triggers = workflowEngine.store.listDocuments("triggers").filter(t => !t.deleted);
      }
      sendJson(request, response, 200, triggers);
      return;
    }

    if (request.method === "GET" && url.pathname === "/migration/migrate-sourced") {
      const count = await store.migrateSourcedContacts();
      sendJson(request, response, 200, { migrated: count });
      return;
    }

    // ── Funnel routes ─────────────────────────────────────────
    if (parts[0] === "funnels" && parts.length === 1) {
      await funnelHandlers.handleFunnels(request.method, { locationId: url.searchParams.get("locationId"), campaignId: url.searchParams.get("campaignId") }, request, response, sendJson, readBody);
      return;
    }

    if (parts[0] === "funnels" && parts.length === 2 && parts[1] !== "embed") {
      await funnelHandlers.handleFunnelById(request.method, { id: parts[1] }, request, response, sendJson, readBody);
      return;
    }

    if (parts[0] === "funnels" && parts[1] && parts[2] === "submit") {
      await funnelHandlers.handleFunnelSubmit(request.method, { id: parts[1] }, request, response, sendJson, readBody);
      return;
    }

    if (parts[0] === "funnels" && parts[1] && parts[2] === "embed") {
      await funnelHandlers.handleFunnelEmbed(request.method, { id: parts[1] }, request, response, sendJson, readBody);
      return;
    }

    if (parts[0] === "funnels" && parts[1] && parts[2] === "steps" && parts.length === 3) {
      await funnelHandlers.handleFunnelSteps(request.method, { funnelId: parts[1] }, request, response, sendJson, readBody);
      return;
    }

    if (parts[0] === "funnels" && parts[1] && parts[2] === "steps" && parts.length === 4) {
      await funnelHandlers.handleFunnelStepById(request.method, { funnelId: parts[1], stepId: parts[3] }, request, response, sendJson, readBody);
      return;
    }

    // ── Messaging routes ──────────────────────────────────────
    if (parts[0] === "message-templates" && parts.length === 1) {
      await messagingHandlers.handleTemplates(request.method, { campaignId: url.searchParams.get("campaignId") }, request, response, sendJson, readBody);
      return;
    }

    if (parts[0] === "message-templates" && parts.length === 2) {
      await messagingHandlers.handleTemplateById(request.method, { id: parts[1] }, request, response, sendJson, readBody);
      return;
    }

    if (url.pathname === "/message-templates/render" && request.method === "POST") {
      // fallback: handled by parts-based match below
    }

    if (parts[0] === "message-templates" && parts[1] && parts[2] === "render") {
      await messagingHandlers.handleTemplateRender(request.method, { id: parts[1] }, request, response, sendJson, readBody);
      return;
    }

    if (parts[0] === "message-sequences" && parts.length === 1) {
      await messagingHandlers.handleSequences(request.method, { campaignId: url.searchParams.get("campaignId") }, request, response, sendJson, readBody);
      return;
    }

    if (parts[0] === "message-sequences" && parts.length === 2) {
      await messagingHandlers.handleSequenceById(request.method, { id: parts[1] }, request, response, sendJson, readBody);
      return;
    }

    if (request.method === "GET" && config.staticDir && !requireUiAuth(request, response)) {
      return;
    }

    // ── Tracking Webhooks ──────────────────────────────────────
    // Email open tracking pixel
    if (request.method === "GET" && parts[0] === "webhooks" && parts[1] === "pixel" && parts.length >= 5) {
      trackingEngine.servePixel(request, response);
      trackingEngine.recordOpen({
        campaignId: parts[2],
        investorId: parts[3],
        emailId: parts[4],
        ip: request.headers["x-forwarded-for"] || request.socket?.remoteAddress,
        userAgent: request.headers["user-agent"],
      }).catch(() => {});
      return;
    }

    // Email click tracking redirect
    if (request.method === "GET" && parts[0] === "webhooks" && parts[1] === "click" && parts.length >= 5) {
      const targetUrl = Buffer.from(parts[5] || "", "base64url").toString("utf8");
      trackingEngine.recordClick({
        campaignId: parts[2],
        investorId: parts[3],
        emailId: parts[4],
        targetUrl,
        ip: request.headers["x-forwarded-for"] || request.socket?.remoteAddress,
        userAgent: request.headers["user-agent"],
      }).catch(() => {});
      response.writeHead(302, { location: targetUrl || "https://example.com" });
      response.end();
      return;
    }

    // Brevo (Sendinblue) webhook
    if (request.method === "POST" && url.pathname === "/webhooks/brevo") {
      const body = await readBody(request);
      const result = await trackingEngine.handleBrevoWebhook(body);
      sendJson(request, response, 200, result);
      return;
    }

    // Mailgun webhook
    if (request.method === "POST" && url.pathname === "/webhooks/mailgun") {
      const body = await readBody(request);
      const result = await trackingEngine.handleMailgunWebhook(body);
      sendJson(request, response, 200, result);
      return;
    }

    // Generic webhook (reply, bounce detection)
    if (request.method === "POST" && url.pathname === "/webhooks/email") {
      const body = await readBody(request);
      const result = await trackingEngine.handleGenericWebhook(body);
      sendJson(request, response, 200, result);
      return;
    }

    // ── Analytics feedback loop ─────────────────────────────────
    if (request.method === "POST" && url.pathname === "/analytics/apply-refinements") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const refinements = analyticsEngine.recommendRefinements(body.campaignId);
      if (refinements?.recommendations?.length > 0) {
        const campaign = store.getCampaign(body.campaignId);
        if (campaign) {
          const patch = {};
          for (const rec of refinements.recommendations) {
            if (rec.action === "trigger_social_dispatch" && !patch.automationEnabled) {
              patch.automationEnabled = true;
            }
            if (rec.action === "run_enrichment_pipeline" && !patch.automationEnabled) {
              patch.automationEnabled = true;
            }
          }
          if (Object.keys(patch).length > 0) {
            await store.upsertCampaign({ ...campaign, ...patch });
          }
        }
      }
      sendJson(request, response, 200, {
        campaignId: body.campaignId,
        refinements,
        applied: refinements?.recommendations?.length || 0,
      });
      return;
    }

    // ── Rate limit status ──────────────────────────────────────
    if (request.method === "GET" && url.pathname === "/rate-limit/status") {
      const key = url.searchParams.get("key") || request.headers["x-api-key"] || "anonymous";
      sendJson(request, response, 200, rateLimiter.check(key));
      return;
    }

    if (request.method === "GET" && await serveStaticAsset(request, response, url.pathname, config.staticDir)) {
      return;
    }

    sendJson(request, response, 404, { error: "Not found" });
  } catch (error) {
    try {
      const statusCode = error instanceof UnsafeExecutionError ? error.statusCode : 500;
      sendJson(request, response, statusCode, {
        error: error.message,
        details: error instanceof UnsafeExecutionError ? error.details : undefined,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    } catch {
      if (!response.headersSent) {
        response.writeHead(500, { "content-type": "application/json" });
      }
      response.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
  });

  return { server, scheduler };
}

export async function startServer({ port = config.port, host = process.env.HOST || "127.0.0.1" } = {}) {
  const { server, scheduler } = await createApp();
  activeServer = server;
  activeScheduler = scheduler;
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  console.log(`SquidWeave listening on http://${host}:${port}`);
  scheduler.start();
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await startServer();
}

// ── Process-level error handlers ──────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason instanceof Error ? reason.message : reason);
  if (reason instanceof Error && reason.stack) {
    console.error(reason.stack.split('\n').slice(0, 3).join('\n'));
  }
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error(err.stack?.split('\n').slice(0, 5).join('\n') || err.stack);
  process.exit(1);
});

// Graceful shutdown
let shuttingDown = false;
let activeServer = null;
let activeScheduler = null;

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[SHUTDOWN] ${signal} received — draining...`);

  // Stop scheduler first (no new ticks)
  if (activeScheduler) {
    activeScheduler.stop();
    console.log('[SHUTDOWN] Scheduler stopped');
  }

  // Close HTTP server (stop accepting new connections)
  if (activeServer) {
    await new Promise(resolve => activeServer.close(resolve));
    console.log('[SHUTDOWN] HTTP server closed');
  }

  // Flush state to disk/postgres
  try {
    if (activeServer && typeof activeServer._store?.flush === 'function') {
      await activeServer._store.flush();
      console.log('[SHUTDOWN] State flushed');
    }
  } catch (err) {
    console.error('[SHUTDOWN] State flush error:', err.message);
  }

  console.log('[SHUTDOWN] Clean exit');
  process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
