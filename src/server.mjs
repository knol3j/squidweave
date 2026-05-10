import { createServer } from "node:http";
import { config } from "./config.mjs";
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

const store = await new Store(config.dataFile).init();
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
const memoryEngine = new MemoryEngine({ store });
const targetingEngine = new TargetingEngine({ store });
const schemaRegistry = new SchemaRegistry();
const queryEngine = new QueryEngine({ store, schemaRegistry, connectors });
const jobManager = new JobManager();
const decisionEngine = new DecisionEngine({ store, planner, connectors, config, targetingEngine, memoryEngine });
const automationEngine = new AutomationEngine({ store, decisionEngine, planner, memoryEngine });
const scheduler = new AutomationScheduler({
  store,
  automationEngine,
  intervalSeconds: config.schedulerIntervalSeconds,
});

function buildCorsHeaders(request) {
  const origin = request.headers.origin;
  const allowedOrigins = new Set([
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
  ]);

  return {
    "access-control-allow-origin": allowedOrigins.has(origin) ? origin : "http://127.0.0.1:3000",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
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
      .map(value => resolveConnectorName(String(value || "").trim().toLowerCase()))
      .filter(value => value && connectors[value]),
  )];
  return normalized.length ? normalized : normalizeConnectorList([fallbackConnector, "clawdbot"], fallbackConnector);
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
    connector: resolveConnectorName(body.connector || config.defaultConnector),
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
  };
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      response.writeHead(204, buildCorsHeaders(request));
      response.end();
      return;
    }

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
      sendJson(request, response, 200, memoryEngine.recall(campaignId, {
        targetId: url.searchParams.get("targetId"),
      }));
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
      if (!body.campaignId) {
        sendJson(request, response, 400, { error: "campaignId is required." });
        return;
      }
      const job = jobManager.createJob("automation", { campaignId: body.campaignId, reason: body.reason || "manual" });
      try {
        jobManager.push(job.id, "running", "Automation run started.");
        const result = await automationEngine.runCampaign(body.campaignId, {
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

    if (request.method === "GET" && url.pathname === "/automation/runs") {
      sendJson(request, response, 200, store.listAutomationRuns(url.searchParams.get("campaignId")));
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

    sendJson(request, response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(request, response, 500, {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

server.listen(config.port, "127.0.0.1", () => {
  console.log(`LocaleWeave listening on http://127.0.0.1:${config.port}`);
});
