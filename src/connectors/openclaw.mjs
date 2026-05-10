import { BaseConnector } from "./base.mjs";

function getPathValue(record, field) {
  return String(field || "")
    .split(".")
    .filter(Boolean)
    .reduce((value, key) => value?.[key], record);
}

function compareValues(left, operator, right) {
  switch (operator) {
    case "eq":
      return left === right;
    case "ne":
      return left !== right;
    case "gt":
      return left > right;
    case "gte":
      return left >= right;
    case "lt":
      return left < right;
    case "lte":
      return left <= right;
    case "in":
      return Array.isArray(right) && right.includes(left);
    case "contains":
      return Array.isArray(left) ? left.includes(right) : String(left || "").toLowerCase().includes(String(right || "").toLowerCase());
    case "startsWith":
      return String(left || "").startsWith(String(right || ""));
    case "endsWith":
      return String(left || "").endsWith(String(right || ""));
    default:
      return true;
  }
}

function buildPredicate(filter = {}) {
  if (!filter || typeof filter !== "object") {
    return () => true;
  }
  if (Array.isArray(filter.and) && filter.and.length) {
    const predicates = filter.and.map(buildPredicate);
    return item => predicates.every(predicate => predicate(item));
  }
  if (Array.isArray(filter.or) && filter.or.length) {
    const predicates = filter.or.map(buildPredicate);
    return item => predicates.some(predicate => predicate(item));
  }

  const { field, op = "eq", value } = filter;
  if (!field) {
    return () => true;
  }
  return item => compareValues(getPathValue(item, field), op, value);
}

function normalizeSort(sort) {
  if (!sort) {
    return [];
  }
  return Array.isArray(sort) ? sort : [sort];
}

function applySort(items, sort) {
  const rules = normalizeSort(sort);
  if (!rules.length) {
    return items;
  }

  return [...items].sort((left, right) => {
    for (const rule of rules) {
      const field = rule?.field;
      if (!field) {
        continue;
      }
      const direction = String(rule.direction || "asc").toLowerCase() === "desc" ? -1 : 1;
      const a = getPathValue(left, field);
      const b = getPathValue(right, field);
      if (a === b) {
        continue;
      }
      if (a == null) {
        return -1 * direction;
      }
      if (b == null) {
        return 1 * direction;
      }
      return a > b ? direction : -1 * direction;
    }
    return 0;
  });
}

function applySelect(items, fields) {
  if (!Array.isArray(fields) || !fields.length) {
    return items;
  }
  return items.map(item => {
    const next = {};
    for (const field of fields) {
      next[field] = getPathValue(item, field);
    }
    return next;
  });
}

function applySpec(items, spec = {}) {
  const filtered = items.filter(buildPredicate(spec.filter));
  const sorted = applySort(filtered, spec.sort);
  const offset = Math.max(0, Number(spec.offset) || 0);
  const limit = Number.isFinite(Number(spec.limit)) ? Math.max(0, Number(spec.limit)) : sorted.length;
  const paged = sorted.slice(offset, offset + limit);
  return {
    items: applySelect(paged, spec.select),
    totalCount: sorted.length,
  };
}

function mapModelRecord(item = {}) {
  const id = item.id || crypto.randomUUID();
  return {
    id,
    name: item.id || item.name || id,
    status: item.status || "available",
    ownedBy: item.owned_by || item.ownedBy || null,
    object: item.object || "model",
    created: item.created || null,
  };
}

function extractChatMessage(payload = {}) {
  if (typeof payload.output_text === "string" && payload.output_text) {
    return payload.output_text;
  }

  if (Array.isArray(payload.output)) {
    const text = payload.output
      .flatMap(item => Array.isArray(item?.content) ? item.content : [])
      .map(item => item?.text || item?.content || "")
      .filter(Boolean)
      .join("\n");
    if (text) {
      return text;
    }
  }

  const message = payload.choices?.[0]?.message?.content;
  if (typeof message === "string") {
    return message;
  }
  if (Array.isArray(message)) {
    return message
      .map(item => typeof item === "string" ? item : item?.text || item?.content || "")
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function parseJsonBlock(text) {
  if (!text) {
    return null;
  }
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function buildActionRequest(action, context, connectorName) {
  return [
    "You are the execution bridge behind a local marketing automation control plane.",
    "Use your configured tools and policies if available.",
    "If live execution is not possible, respond with a blocked or simulated outcome instead of inventing success.",
    "Return JSON only.",
    'JSON schema: {"outcome":"executed|accepted|simulated|blocked","summary":"string","followUp":["string"],"usedTools":["string"],"notes":["string"]}',
    `Connector: ${connectorName}`,
    `Action: ${JSON.stringify(action)}`,
    `Context: ${JSON.stringify(context)}`,
  ].join("\n");
}

export class OpenclawConnector extends BaseConnector {
  constructor(options) {
    super("openclaw", options);
    this.modelsPath = "/v1/models";
    this.chatCompletionsPath = "/v1/chat/completions";
  }

  getCapabilities() {
    return {
      ...super.getCapabilities(),
      queryPath: this.modelsPath,
      executePath: this.chatCompletionsPath,
      openClawCompatible: true,
      requiresOpenAiHttpSurface: true,
    };
  }

  async requestJson(pathname, init = {}, purpose = "request") {
    const response = await fetch(this.buildEndpoint(pathname), {
      ...init,
      headers: this.buildAuthHeaders({
        "content-type": "application/json",
        ...(init.headers || {}),
      }),
    });

    const bodyText = await response.text();
    if ([401, 403].includes(response.status)) {
      this.markAuthError(response.status, bodyText || "Authentication rejected by gateway.");
    } else if (response.ok) {
      this.clearAuthError();
    }

    let parsed = null;
    try {
      parsed = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const hint = response.status === 404
        ? "OpenClaw's OpenAI-compatible HTTP surface may not be enabled. Enable /v1/models and /v1/chat/completions on the gateway."
        : null;
      const message = parsed?.error?.message || parsed?.error || bodyText || `OpenClaw ${purpose} failed with ${response.status}`;
      throw new Error(hint ? `${message} ${hint}` : message);
    }

    return parsed;
  }

  async probeOpenAiSurface(timeoutMs = 4000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.buildEndpoint(this.modelsPath), {
        method: "GET",
        headers: this.buildAuthHeaders(),
        signal: controller.signal,
      });

      const bodyText = response.ok ? "" : await response.text();
      if ([401, 403].includes(response.status)) {
        this.markAuthError(response.status, bodyText || "Authentication rejected by gateway.");
      } else if (response.ok) {
        this.clearAuthError();
      }

      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          message: "OpenClaw OpenAI-compatible HTTP surface is reachable.",
          needsHttpSurface: false,
        };
      }

      if (response.status === 404) {
        return {
          ok: false,
          status: response.status,
          message: "OpenClaw gateway is reachable, but /v1/models is not enabled. Enable the OpenAI-compatible HTTP surface on the gateway.",
          needsHttpSurface: true,
        };
      }

      return {
        ok: false,
        status: response.status,
        message: bodyText || `HTTP ${response.status}`,
        needsHttpSurface: false,
      };
    } catch (error) {
      return {
        ok: false,
        status: null,
        message: error.message,
        needsHttpSurface: false,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async diagnose(timeoutMs = 4000) {
    const configured = this.isConfigured();
    if (!configured) {
      return {
        connector: this.name,
        configured: false,
        baseUrl: this.baseUrl || null,
        gatewayReachable: false,
        authAccepted: false,
        openAiHttpSurfaceReachable: false,
        requiresOpenAiHttpSurface: true,
        ready: false,
        summary: "Missing base URL or token.",
        recommendations: [
          "Set the base URL to your OpenClaw gateway, usually http://127.0.0.1:18789.",
          "Set the token to the same shared-secret value as OPENCLAW_GATEWAY_TOKEN.",
        ],
      };
    }

    const probe = await this.probeOpenAiSurface(timeoutMs);
    const authAccepted = probe.ok || ![401, 403].includes(Number(probe.status));
    const ready = probe.ok;
    const recommendations = [];

    if (probe.needsHttpSurface) {
      recommendations.push("Enable OpenClaw's OpenAI-compatible HTTP surface so /v1/models and /v1/chat/completions are served.");
    }
    if ([401, 403].includes(Number(probe.status))) {
      recommendations.push("Verify the gateway token and keep OPENCLAW_TOKEN aligned with OPENCLAW_GATEWAY_TOKEN.");
    }
    if (!probe.ok && !probe.needsHttpSurface && ![401, 403].includes(Number(probe.status))) {
      recommendations.push("Verify the gateway is running on the configured host and port.");
    }

    return {
      connector: this.name,
      configured: true,
      baseUrl: this.baseUrl || null,
      gatewayReachable: Boolean(probe.ok || probe.needsHttpSurface || probe.status),
      authAccepted,
      openAiHttpSurfaceReachable: probe.ok,
      requiresOpenAiHttpSurface: true,
      ready,
      summary: probe.message,
      recommendations,
    };
  }

  async query(spec = {}) {
    if (this.dryRun || !this.isConfigured()) {
      return {
        connector: this.name,
        mode: this.dryRun ? "dry-run-disabled" : "not-configured",
        accepted: false,
        items: [],
        totalCount: 0,
        source: "connector",
      };
    }

    const payload = await this.requestJson(this.modelsPath, { method: "GET", headers: {} }, "model discovery");
    const models = Array.isArray(payload?.data) ? payload.data.map(mapModelRecord) : [];
    const projected = applySpec(models, spec);

    return {
      connector: this.name,
      mode: "live",
      accepted: true,
      source: "connector",
      items: projected.items,
      totalCount: projected.totalCount,
      raw: payload,
    };
  }

  async execute(action, context) {
    if (!action?.type) {
      throw new Error("Connector action requires a type.");
    }

    const payload = {
      executionId: crypto.randomUUID(),
      action,
      context,
      metadata: {
        connector: this.name,
        sentAt: new Date().toISOString(),
      },
    };

    if (!this.supports(action.type)) {
      return {
        connector: this.name,
        mode: "unsupported-action",
        accepted: false,
        executionId: payload.executionId,
        actionType: action.type,
        payload,
      };
    }

    if (this.dryRun || !this.isConfigured()) {
      return {
        connector: this.name,
        mode: this.dryRun ? "dry-run-disabled" : "not-configured",
        accepted: false,
        executionId: payload.executionId,
        actionType: action.type,
        payload,
      };
    }

    const request = {
      model: "openclaw/default",
      messages: [
        {
          role: "user",
          content: buildActionRequest(action, context, this.name),
        },
      ],
      user: context?.campaign?.id ? `${this.name}:${context.campaign.id}` : this.name,
      stream: false,
    };

    const response = await this.requestJson(this.chatCompletionsPath, {
      method: "POST",
      body: JSON.stringify(request),
    }, "action execution");

    const text = extractChatMessage(response);
    const parsed = parseJsonBlock(text);
    const outcome = parsed?.outcome || "accepted";
    const accepted = !["blocked"].includes(outcome);

    return {
      connector: this.name,
      mode: "live",
      accepted,
      status: 200,
      executionId: payload.executionId,
      actionType: action.type,
      payload: {
        request,
        response,
        text,
        parsed,
      },
      delivery: accepted ? (outcome === "executed" ? "completed" : "accepted") : "rejected",
      tokenLikelyRotated: false,
    };
  }

  async getStatus(options = {}) {
    const status = await super.getStatus(options);
    if (!options.probe || this.dryRun || !this.isConfigured()) {
      return status;
    }

    const diagnosis = await this.diagnose(options.timeoutMs || 4000);
    if (!diagnosis.ready) {
      status.reachable = diagnosis.gatewayReachable;
      status.mode = diagnosis.summary.includes("/v1/models is not enabled")
        ? "http-surface-disabled"
        : diagnosis.authAccepted
          ? "error"
          : "auth-error";
      status.error = diagnosis.summary;
    } else {
      status.reachable = true;
      status.mode = "live";
      status.error = null;
    }
    status.diagnosis = diagnosis;
    return status;
  }
}
