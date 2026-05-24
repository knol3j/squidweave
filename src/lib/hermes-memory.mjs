function truncateText(value, maxLength = 400) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
}

function stringifyPayload(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value || "");
  }
}

function toMemoryEntries(payload) {
  const campaign = payload.campaign || {};
  const summary = payload.summary || {};
  const baseMetadata = {
    campaignId: payload.campaignId,
    connector: campaign.connector || null,
    locales: campaign.locales || [],
    markets: campaign.markets || [],
    recordedAt: new Date().toISOString(),
  };

  return [
    {
      scope: "campaign",
      category: "brief",
      text: truncateText([
        campaign.clientNeed || campaign.objective,
        campaign.audience,
        campaign.offer,
        campaign.successDefinition,
      ].filter(Boolean).join(" | "), 900),
      metadata: {
        ...baseMetadata,
        type: "campaign-brief",
        clientName: campaign.clientName || null,
      },
    },
    {
      scope: "campaign",
      category: "performance",
      text: truncateText(`Derived metrics: ${stringifyPayload(summary.derived || {})}`, 900),
      metadata: {
        ...baseMetadata,
        type: "performance-summary",
        eventCount: summary.eventCount || 0,
      },
    },
    ...((payload.playbooks || []).slice(0, 10).map(playbook => ({
      scope: "campaign",
      category: "playbook",
      text: truncateText(playbook.rationale || `${playbook.segment}/${playbook.region} via ${playbook.recommendedChannel}`, 900),
      metadata: {
        ...baseMetadata,
        type: "playbook",
        segment: playbook.segment || null,
        region: playbook.region || null,
        channel: playbook.recommendedChannel || null,
        confidence: playbook.confidence || 0,
      },
    }))),
    ...((payload.agentRuns || []).slice(-25).map(run => ({
      scope: "agent",
      category: "agent-run",
      text: truncateText(`${run.agentId}: ${run.summary}`, 900),
      metadata: {
        ...baseMetadata,
        type: "agent-run",
        agentId: run.agentId,
        stage: run.stage,
        status: run.status,
        handoff: run.handoff || null,
      },
    }))),
  ].filter(entry => entry.text);
}

export class HermesMemoryClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || "";
    this.token = options.token || "";
    this.healthPath = options.healthPath || "/health";
    this.upsertPath = options.upsertPath || "/v1/memory/upsert";
    this.recallPath = options.recallPath || "/v1/memory/recall";
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.token);
  }

  buildEndpoint(pathname = "") {
    if (!this.baseUrl) {
      return "";
    }
    const base = this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
    return `${base}${path}`;
  }

  buildHeaders(extraHeaders = {}) {
    return {
      ...extraHeaders,
      ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
    };
  }

  async request(pathname, init = {}) {
    const response = await fetch(this.buildEndpoint(pathname), {
      ...init,
      headers: this.buildHeaders({
        "content-type": "application/json",
        ...(init.headers || {}),
      }),
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }
    if (!response.ok) {
      throw new Error(parsed?.error || parsed?.message || text || `Hermes request failed with ${response.status}`);
    }
    return parsed;
  }

  async getStatus(timeoutMs = 4000) {
    if (!this.isConfigured()) {
      return {
        configured: false,
        ready: false,
        baseUrl: this.baseUrl || null,
        summary: "Hermes base URL or token is missing.",
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(this.buildEndpoint(this.healthPath), {
        method: "GET",
        headers: this.buildHeaders(),
        signal: controller.signal,
      });
      return {
        configured: true,
        ready: response.ok,
        baseUrl: this.baseUrl,
        summary: response.ok ? "Hermes memory service reachable." : `Hermes returned HTTP ${response.status}.`,
      };
    } catch (error) {
      return {
        configured: true,
        ready: false,
        baseUrl: this.baseUrl,
        summary: error.message,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async syncCampaignMemory(payload) {
    if (!this.isConfigured()) {
      return {
        synced: false,
        mode: "not-configured",
        entries: 0,
      };
    }

    const entries = toMemoryEntries(payload);
    if (!entries.length) {
      return {
        synced: false,
        mode: "empty",
        entries: 0,
      };
    }

    const response = await this.request(this.upsertPath, {
      method: "POST",
      body: JSON.stringify({
        campaignId: payload.campaignId,
        entries,
      }),
    });

    return {
      synced: true,
      mode: "live",
      entries: entries.length,
      response,
    };
  }

  async recallCampaignMemory({ campaignId, query, limit = 8, targetId = null }) {
    if (!this.isConfigured()) {
      return {
        mode: "not-configured",
        items: [],
      };
    }

    const response = await this.request(this.recallPath, {
      method: "POST",
      body: JSON.stringify({
        campaignId,
        query,
        targetId,
        limit,
      }),
    });

    return {
      mode: "live",
      items: Array.isArray(response?.items) ? response.items : Array.isArray(response?.memories) ? response.memories : [],
      raw: response,
    };
  }
}
