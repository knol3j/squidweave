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
// ──────────────────────────────────────────────────────────────────
import { normalizeEvent } from "./lib/analytics.mjs";
import { AutomationEngine } from "./lib/automation-engine.mjs";
import { OpenclawConnector } from "./connectors/openclaw.mjs";
import { ClawdbotConnector } from "./connectors/clawdbot.mjs";
import { DecisionEngine } from "./lib/decision-engine.mjs";
import { LocalPlanner } from "./lib/lmstudio-client.mjs";
import { MemoryEngine } from "./lib/memory-engine.mjs";
import { AutomationScheduler } from "./lib/scheduler.mjs";
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
import { createFreeSourceConnectors } from "./connectors/free-sources.mjs";
import { GhlBridge } from "./integrations/ghl-bridge.mjs";
import { registerFunnelRoutes, getFunnelCollections } from "./modules/funnel/funnel-routes.mjs";
import { registerMessagingRoutes, getMessagingCollections } from "./modules/messaging/messaging-routes.mjs";
import * as adapters from "./adapters/index.mjs";

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
    activeTab: "engine",
  });
  const campaign = await store.upsertCampaign(draft);
  await memoryEngine.consolidateCampaign(campaign.id);
  return {
    campaign,
    reason: reason || "prompt-autopilot",
  };
}

async function createApp() {
  const store = await new Store(config.dataFile, { seedFileUrl: config.seedDataFile }).init();
  const planner = new LocalPlanner(config.localizationModel, {
    defaultLocale: config.defaultLocale,
    defaultBrandVoice: config.defaultBrandVoice,
    defaultOffer: config.defaultOffer,
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
  const fundingEngine = new FundingEngine({ store });
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
    connectors: createFreeSourceConnectors(),
  });
  const decisionEngine = new DecisionEngine({ store, planner, connectors, config, targetingEngine, memoryEngine });
  const automationEngine = new AutomationEngine({ store, decisionEngine, planner, memoryEngine, agentOrchestrator });
  const ghlBridge = new GhlBridge({
    store,
    contactSourcingEngine,
    memoryEngine,
    config: config.ghl,
  });
  const funnelHandlers = registerFunnelRoutes({ store, workflowEngine, pipelineEngine });
  const messagingHandlers = registerMessagingRoutes({ store, workflowEngine });
  const scheduler = new AutomationScheduler({
    store,
    automationEngine,
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
      const result = await fundingEngine.sequenceOutreach(body.campaignId, { limit: body.limit });
      sendJson(request, response, 201, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/funding/run") {
      const body = await readBody(request);
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const result = await fundingEngine.runCampaign(body.campaignId, { limit: body.limit });
      sendJson(request, response, 200, result);
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

    if (request.method === "GET" && url.pathname === "/funding/outreach-events") {
      const campaignId = url.searchParams.get("campaignId");
      if (!campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      sendJson(request, response, 200, store.listFundingOutreachEvents(campaignId));
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
        const result = await automationEngine.runCampaign(campaignId, {
          locales: body.locales,
          reason: body.reason || "manual",
        });
        jobManager.complete(job.id, result);
        sendJson(request, response, 200, {
          job: jobManager.getJob(job.id),
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

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/contacts") {
      const body = await readBody(request);
      if (!ghlBridge.isConfigured()) {
        sendJson(request, response, 400, { error: "GHL not configured: set GHL_API_KEY and GHL_LOCATION_ID" });
        return;
      }
      const result = await ghlBridge.pullContacts(body.campaignId, body.options || {});
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/opportunities") {
      const body = await readBody(request);
      if (!ghlBridge.isConfigured()) {
        sendJson(request, response, 400, { error: "GHL not configured: set GHL_API_KEY and GHL_LOCATION_ID" });
        return;
      }
      const result = await ghlBridge.pullOpportunities(body.campaignId, body.options || {});
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/pipelines") {
      const body = await readBody(request);
      if (!ghlBridge.isConfigured()) {
        sendJson(request, response, 400, { error: "GHL not configured" });
        return;
      }
      const result = await ghlBridge.pullPipelines(body.campaignId, body.options || {});
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/workflows") {
      const body = await readBody(request);
      if (!ghlBridge.isConfigured()) {
        sendJson(request, response, 400, { error: "GHL not configured" });
        return;
      }
      const result = await ghlBridge.pullWorkflows(body.campaignId, body.options || {});
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/forms") {
      const body = await readBody(request);
      if (!ghlBridge.isConfigured()) {
        sendJson(request, response, 400, { error: "GHL not configured" });
        return;
      }
      const result = await ghlBridge.pullForms(body.campaignId, body.options || {});
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/calendars") {
      const body = await readBody(request);
      if (!ghlBridge.isConfigured()) {
        sendJson(request, response, 400, { error: "GHL not configured" });
        return;
      }
      const result = await ghlBridge.pullCalendars(body.campaignId, body.options || {});
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/sync/full") {
      const body = await readBody(request);
      if (!ghlBridge.isConfigured()) {
        sendJson(request, response, 400, { error: "GHL not configured" });
        return;
      }
      const result = await ghlBridge.fullSync(body.campaignId, body.options || {});
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/push/contact") {
      const body = await readBody(request);
      if (!ghlBridge.isConfigured()) {
        sendJson(request, response, 400, { error: "GHL not configured" });
        return;
      }
      const result = await ghlBridge.pushContact(body.contact, body.campaignId);
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/push/opportunity") {
      const body = await readBody(request);
      if (!ghlBridge.isConfigured()) {
        sendJson(request, response, 400, { error: "GHL not configured" });
        return;
      }
      const result = await ghlBridge.pushOpportunity(body.opportunity, body.campaignId);
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/push/note") {
      const body = await readBody(request);
      if (!ghlBridge.isConfigured()) {
        sendJson(request, response, 400, { error: "GHL not configured" });
        return;
      }
      const result = await ghlBridge.pushNote(body.note, body.campaignId);
      sendJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/integrations/ghl/push/task") {
      const body = await readBody(request);
      if (!ghlBridge.isConfigured()) {
        sendJson(request, response, 400, { error: "GHL not configured" });
        return;
      }
      const result = await ghlBridge.pushTask(body.task, body.campaignId);
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

    if (request.method === "GET" && await serveStaticAsset(request, response, url.pathname, config.staticDir)) {
      return;
    }

    sendJson(request, response, 404, { error: "Not found" });
  } catch (error) {
    try {
      sendJson(request, response, 500, {
        error: error.message,
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
  const { server } = await createApp();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  console.log(`LocaleWeave listening on http://${host}:${port}`);
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
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[SHUTDOWN] ${signal} received, exiting...`);
  process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
