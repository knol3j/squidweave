import { Supermemory } from "supermemory";

function truncateText(value, maxLength = 4000) {
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

function toDocuments(payload) {
  const campaign = payload.campaign || {};
  const summary = payload.summary || {};
  const baseMetadata = {
    campaignId: payload.campaignId,
    connector: campaign.connector || null,
    locales: campaign.locales || [],
    markets: campaign.markets || [],
    recordedAt: new Date().toISOString(),
  };

  const documents = [
    {
      content: truncateText([
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
      content: truncateText(`Derived metrics: ${stringifyPayload(summary.derived || {})}`, 900),
      metadata: {
        ...baseMetadata,
        type: "performance-summary",
        eventCount: summary.eventCount || 0,
      },
    },
    ...(payload.playbooks || []).slice(0, 10).map(playbook => ({
      content: truncateText(playbook.rationale || `${playbook.segment}/${playbook.region} via ${playbook.recommendedChannel}`, 900),
      metadata: {
        ...baseMetadata,
        type: "playbook",
        segment: playbook.segment || null,
        region: playbook.region || null,
        channel: playbook.recommendedChannel || null,
        confidence: playbook.confidence || 0,
      },
    })),
    ...(payload.agentRuns || []).slice(-25).map(run => ({
      content: truncateText(`${run.agentId}: ${run.summary}`, 900),
      metadata: {
        ...baseMetadata,
        type: "agent-run",
        agentId: run.agentId,
        stage: run.stage,
        status: run.status,
        handoff: run.handoff || null,
      },
    })),
  ];

  return documents.filter(doc => doc.content);
}

export class SupermemoryClient {
  constructor(options = {}) {
    const clientOptions = {};
    if (options.apiKey) {
      clientOptions.apiKey = options.apiKey;
    }
    if (options.baseUrl) {
      clientOptions.baseUrl = options.baseUrl;
    }
    this.client = options.apiKey ? new Supermemory(clientOptions) : null;
    this.namespacePrefix = options.namespacePrefix || "squidweave";
  }

  namespace(campaignId) {
    const safeId = String(campaignId || "default").replace(/[^a-zA-Z0-9_:-]/g, "_");
    return `${this.namespacePrefix}_campaign_${safeId}`;
  }

  operatorNamespace(operatorId) {
    const safeId = String(operatorId || "default").replace(/[^a-zA-Z0-9_:-]/g, "_");
    return `${this.namespacePrefix}_operator_${safeId}`;
  }

  isConfigured() {
    return Boolean(this.client);
  }

  async getStatus() {
    if (!this.isConfigured()) {
      return {
        configured: false,
        ready: false,
        summary: "Supermemory API key is missing.",
      };
    }

    try {
      const { namespaces, pagination } = await this.client.namespaces.list({ limit: 1 });
      return {
        configured: true,
        ready: true,
        summary: "Supermemory API reachable.",
        totalNamespaces: pagination?.total || namespaces?.length || 0,
      };
    } catch (error) {
      return {
        configured: true,
        ready: false,
        summary: error.message,
      };
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

    const documents = toDocuments(payload);
    if (!documents.length) {
      return {
        synced: false,
        mode: "empty",
        entries: 0,
      };
    }

    const namespace = this.namespace(payload.campaignId);
    const results = await Promise.all(
      documents.map(doc =>
        this.client.add(namespace, {
          ...doc,
          dreaming: "instant",
        }).catch(error => ({ error: error.message }))
      )
    );
    const errors = results.filter(r => r.error);

    return {
      synced: true,
      mode: "live",
      entries: documents.length,
      errors: errors.length ? errors : undefined,
    };
  }

  async recallCampaignMemory({ campaignId, query, limit = 8, targetId = null }) {
    if (!this.isConfigured()) {
      return {
        mode: "not-configured",
        items: [],
      };
    }

    const namespace = this.namespace(campaignId);
    const searchQuery = targetId
      ? `${query} target:${targetId}`
      : query;

    const { results } = await this.client.search(namespace, {
      query: searchQuery,
      limit: Number(limit) || 8,
      searchMode: "hybrid",
    });

    return {
      mode: "live",
      items: (results || []).map(result => ({
        text: result.memory ?? result.chunk ?? "",
        similarity: result.similarity ?? 0,
        metadata: result.metadata ?? {},
      })),
    };
  }

  async addResearchRecord(campaignId, record) {
    if (!this.isConfigured()) {
      return { added: false, reason: "not-configured" };
    }

    const namespace = this.namespace(campaignId);
    const content = truncateText([
      record.company,
      record.contactName,
      record.title,
      record.segment,
      record.region,
      record.notes,
      ...(record.metadata?.evidence || []),
    ].filter(Boolean).join(" | "), 2000);

    if (!content) {
      return { added: false, reason: "empty" };
    }

    const result = await this.client.add(namespace, {
      content,
      id: record.targetId ? `research-${record.targetId}` : undefined,
      metadata: {
        type: "research-record",
        targetId: record.targetId || null,
        company: record.company || null,
        segment: record.segment || null,
        region: record.region || null,
        source: record.source || null,
      },
      dreaming: "dynamic",
    });

    return { added: true, documentId: result.id };
  }

  async addPromptRun(campaignId, { prompt, classification, summary }) {
    if (!this.isConfigured()) {
      return { added: false, reason: "not-configured" };
    }

    const namespace = this.namespace(campaignId);
    const result = await this.client.add(namespace, {
      content: truncateText(`Prompt: ${prompt}\n\nClassification: ${classification || "unknown"}\n\nResult: ${stringifyPayload(summary)}`, 3000),
      metadata: {
        type: "prompt-run",
        prompt: truncateText(prompt, 500),
        classification: classification || null,
      },
      dreaming: "instant",
    });

    return { added: true, documentId: result.id };
  }

  async searchPromptHistory(campaignId, prompt, limit = 5) {
    if (!this.isConfigured()) {
      return { items: [] };
    }

    const namespace = this.namespace(campaignId);
    const { results } = await this.client.search(namespace, {
      query: prompt,
      limit: Number(limit) || 5,
      searchMode: "memories",
      filter: {
        field: "metadata.type",
        operator: "eq",
        value: "prompt-run",
      },
    });

    return {
      items: (results || []).map(result => ({
        text: result.memory ?? result.chunk ?? "",
        similarity: result.similarity ?? 0,
        metadata: result.metadata ?? {},
      })),
    };
  }

  async addChatMessage(operatorId, { role, content, metadata = {} }) {
    if (!this.isConfigured()) {
      return { added: false, reason: "not-configured" };
    }

    const namespace = this.operatorNamespace(operatorId);
    const result = await this.client.add(namespace, {
      content: truncateText(`${role}: ${content}`, 3000),
      metadata: {
        type: "chat-message",
        role,
        ...metadata,
      },
      dreaming: "instant",
    });

    return { added: true, documentId: result.id };
  }

  async searchChatMemory(operatorId, query, limit = 8) {
    if (!this.isConfigured()) {
      return { items: [] };
    }

    const namespace = this.operatorNamespace(operatorId);
    const { results } = await this.client.search(namespace, {
      query,
      limit: Number(limit) || 8,
      searchMode: "hybrid",
    });

    return {
      items: (results || []).map(result => ({
        text: result.memory ?? result.chunk ?? "",
        similarity: result.similarity ?? 0,
        metadata: result.metadata ?? {},
      })),
    };
  }
}
