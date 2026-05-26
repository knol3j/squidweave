import crypto from "node:crypto";

const GHL_BASE = "https://services.leadconnectorhq.com";

export class GhlBridge {
  constructor({ store, contactSourcingEngine, memoryEngine, config }) {
    this.store = store;
    this.contactSourcingEngine = contactSourcingEngine;
    this.memoryEngine = memoryEngine;
    this.apiKey = config.apiKey || "";
    this.locationId = config.locationId || "";
    this.webhookSecret = config.webhookSecret || "";
    this.defaultCampaignId = config.defaultCampaignId || "";
    this.dryRun = config.dryRun !== false;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.locationId);
  }

  verifySignature(hmacHeader, rawBody) {
    if (!this.webhookSecret) return true;
    if (!hmacHeader) return false;
    const header = Array.isArray(hmacHeader) ? hmacHeader[0] : hmacHeader;
    const computed = crypto.createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    if (computed.length !== header.length) return false;
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(header));
  }

  buildAuthHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
    };
  }

  /**
   * Handle an incoming GHL webhook payload.
   * Maps the event type to SquidWeave's internal data models.
   */
  async ingestWebhook(payload, overrides = {}) {
    const { type, data } = payload;
    const campaignId = overrides.campaignId || this.defaultCampaignId;

    switch (type) {
      case "ContactCreate":
      case "ContactUpdate":
        return this._handleContactWebhook(data?.contact || data, campaignId, type);

      case "ContactDelete":
        return { action: "ignored", reason: "deletion not propagated" };

      case "OpportunityCreate":
      case "OpportunityUpdate":
        return this._handleOpportunityWebhook(data?.opportunity || data, data?.contact, campaignId, type);

      case "ConversationCreate":
        return this._handleConversationWebhook(data, campaignId, type);

      case "CampaignLog":
        return this._handleCampaignLogWebhook(data, campaignId, type);

      default:
        return { action: "ignored", reason: `unknown event type: ${type}` };
    }
  }

  /**
   * Contact webhook → SquidWeave prospect + research record
   */
  async _handleContactWebhook(contact, campaignId, eventType) {
    if (!contact?.id) {
      return { action: "ignored", reason: "no contact id in payload" };
    }

    const targetId = `ghl-${contact.id}`;

    const prospect = {
      id: targetId,
      campaignId,
      targetId,
      company: contact.companyName || "",
      fullName: contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
      title: contact.customFields?.find(f => f.id === "title")?.value || "",
      email: (contact.email || "").toLowerCase(),
      phone: contact.phone || "",
      linkedinUrl: contact.customFields?.find(f => f.id?.toLowerCase().includes("linkedin"))?.value || "",
      companyWebsite: contact.website || "",
      region: [contact.city, contact.state, contact.country].filter(Boolean).join(", "),
      segment: contact.tags?.join(", ") || "",
      source: `ghl-${eventType}`,
      contactStatus: "ready-for-enrichment",
      complianceStatus: contact.dnd ? "suppressed" : "reviewed",
    };

    const results = [];

    if (campaignId) {
      const imported = await this.contactSourcingEngine.importContacts(campaignId, [prospect], {
        source: prospect.source,
      });
      results.push({ action: "imported_prospect", count: imported.length });

      const record = {
        campaignId,
        targetId,
        company: prospect.company,
        contactName: prospect.fullName,
        title: prospect.title,
        segment: prospect.segment,
        source: `ghl-${eventType}`,
        channels: contact.dnd ? [] : ["email"],
      };
      await this.store.addResearchRecord(record);
      results.push({ action: "added_research_record" });

      await this.memoryEngine.consolidateCampaign(campaignId);
    }

    return { action: "contact_processed", targetId, details: results };
  }

  /**
   * Opportunity webhook → SquidWeave analytics event (intent signal) + research record
   */
  async _handleOpportunityWebhook(opportunity, contact, campaignId, eventType) {
    if (!opportunity?.id) return { action: "ignored", reason: "no opportunity id" };

    const targetId = contact?.id ? `ghl-${contact.id}` : `ghl-opp-${opportunity.id}`;
    const results = [];

    if (campaignId) {
      const stageMap = {
        "open": 0.3,
        "negotiation": 0.6,
        "closed-won": 1.0,
        "closed-lost": 0,
      };
      const intentScore = stageMap[opportunity.status] ?? 0.3;
      const eventType_ = eventType === "OpportunityCreate" ? "conversion" : "click";

      const event = {
        campaignId,
        type: eventType_,
        value: opportunity.monetaryValue || 1,
        metadata: {
          source: `ghl-${eventType}`,
          opportunityId: opportunity.id,
          pipelineId: opportunity.pipelineId,
          pipelineStageId: opportunity.pipelineStageId,
          status: opportunity.status,
          monetaryValue: opportunity.monetaryValue,
          targetId,
        },
      };

      const normalized = (await import("../lib/analytics.mjs")).normalizeEvent(event);
      await this.store.addEvent(normalized);
      results.push({ action: "added_analytics_event", type: normalized.type });

      if (contact) {
        const prospectImport = await this._handleContactWebhook(contact, campaignId, eventType);
        results.push(...(prospectImport.details || []));
      }
    }

    return { action: "opportunity_processed", targetId, results };
  }

  /**
   * Conversation webhook → SquidWeave outreach event + analytics reply event
   */
  async _handleConversationWebhook(data, campaignId, eventType) {
    if (!data?.id) return { action: "ignored", reason: "no conversation id" };

    const contactId = data.contactId || data.contact?.id;
    const targetId = contactId ? `ghl-${contactId}` : `ghl-conv-${data.id}`;
    const messages = data.messages || [];
    const results = [];

    for (const msg of messages) {
      if (!msg.body) continue;

      const isInbound = msg.direction === "inbound" || msg.type === "incoming";
      const outreachType = isInbound ? "reply" : "sent";
      const analyticsType = isInbound ? "reply" : "click";

      if (campaignId) {
        const outreachEvent = (await import("../lib/targeting-engine.mjs")).normalizeOutreachEvent({
          campaignId,
          targetId,
          type: outreachType,
          channel: msg.channelType || "email",
          metadata: {
            source: `ghl-${eventType}`,
            messageId: msg.id,
            conversationId: data.id,
            bodyPreview: msg.body?.slice(0, 200),
            direction: msg.direction,
          },
        });
        await this.store.addOutreachEvent(outreachEvent);
        results.push({ action: "added_outreach_event", type: outreachType });

        const analyticsEvent = (await import("../lib/analytics.mjs")).normalizeEvent({
          campaignId,
          type: analyticsType,
          value: 1,
          metadata: { source: `ghl-${eventType}`, conversationId: data.id, messageId: msg.id },
        });
        await this.store.addEvent(analyticsEvent);
        results.push({ action: "added_analytics_event", type: analyticsType });

        await this.memoryEngine.consolidateCampaign(campaignId);
      }
    }

    return { action: "conversation_processed", targetId, messageCount: messages.length, results };
  }

  /**
   * Campaign log webhook (email/SMS stats) → SquidWeave outreach events + analytics
   */
  async _handleCampaignLogWebhook(data, campaignId, eventType) {
    const contactId = data.contactId;
    const targetId = contactId ? `ghl-${contactId}` : null;

    const results = [];
    const logType = data.type || data.action || "unknown";
    const typeMap = {
      "email.sent": { outreach: "sent", analytics: "impression" },
      "email.open": { outreach: "open", analytics: "impression" },
      "email.click": { outreach: "click", analytics: "click" },
      "email.bounce": { outreach: "bounce", analytics: "bounce" },
      "email.reply": { outreach: "reply", analytics: "reply" },
      "email.unsubscribe": { outreach: "unsubscribe", analytics: "unsubscribe" },
      "sms.sent": { outreach: "sent", analytics: "impression" },
      "sms.reply": { outreach: "reply", analytics: "reply" },
    };

    const mapping = typeMap[logType];
    if (!mapping) {
      return { action: "ignored", reason: `unknown log type: ${logType}` };
    }

    if (campaignId && targetId) {
      const outreachEvent = (await import("../lib/targeting-engine.mjs")).normalizeOutreachEvent({
        campaignId,
        targetId,
        type: mapping.outreach,
        channel: logType.startsWith("sms") ? "sms" : "email",
        metadata: {
          source: `ghl-${eventType}`,
          logType,
          campaignLogId: data.id,
          messageId: data.messageId,
        },
      });
      await this.store.addOutreachEvent(outreachEvent);
      results.push({ action: "added_outreach_event", type: mapping.outreach });

      const analyticsEvent = (await import("../lib/analytics.mjs")).normalizeEvent({
        campaignId,
        type: mapping.analytics,
        value: 1,
        metadata: { source: `ghl-${eventType}`, logType },
      });
      await this.store.addEvent(analyticsEvent);
      results.push({ action: "added_analytics_event", type: mapping.analytics });

      await this.memoryEngine.consolidateCampaign(campaignId);
    }

    return { action: "campaign_log_processed", targetId, logType, results };
  }

  /**
   * Pull contacts from GHL API and import into a SquidWeave campaign.
   */
  async pullContacts(campaignId, options = {}) {
    if (!this.isConfigured()) {
      throw new Error("GHL bridge not configured: set GHL_API_KEY and GHL_LOCATION_ID");
    }

    const limit = options.limit || 100;
    const query = options.query || "";
    const url = `${GHL_BASE}/contacts/?locationId=${this.locationId}&limit=${limit}${query ? `&query=${encodeURIComponent(query)}` : ""}`;

    const response = await fetch(url, { headers: this.buildAuthHeaders() });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GHL API error ${response.status}: ${text}`);
    }

    const body = await response.json();
    const contacts = body.contacts || [];

    const prospects = contacts.map(c => ({
      id: `ghl-${c.id}`,
      campaignId,
      company: c.companyName || "",
      fullName: c.name || "",
      title: c.customFields?.find(f => f.id === "title")?.value || "",
      email: (c.email || "").toLowerCase(),
      phone: c.phone || "",
      linkedinUrl: c.customFields?.find(f => f.id?.toLowerCase().includes("linkedin"))?.value || "",
      companyWebsite: c.website || "",
      region: [c.city, c.state, c.country].filter(Boolean).join(", "),
      segment: c.tags?.join(", ") || "",
      source: "ghl-api-pull",
      contactStatus: options.markAs || "ready-for-enrichment",
    }));

    const imported = await this.contactSourcingEngine.importContacts(campaignId, prospects, {
      source: "ghl-api-pull",
    });

    return {
      total: contacts.length,
      imported: imported.length,
      campaignId,
    };
  }

  /**
   * Pull opportunities from GHL API → analytics events
   */
  async pullOpportunities(campaignId, options = {}) {
    if (!this.isConfigured()) {
      throw new Error("GHL bridge not configured");
    }

    const pipelineId = options.pipelineId || "";
    const limit = options.limit || 100;
    const url = `${GHL_BASE}/opportunities/bulk?locationId=${this.locationId}&limit=${limit}${pipelineId ? `&pipelineId=${pipelineId}` : ""}`;

    const response = await fetch(url, { headers: this.buildAuthHeaders() });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GHL API error ${response.status}: ${text}`);
    }

    const body = await response.json();
    const opportunities = body.opportunities || [];

    const events = [];
    for (const opp of opportunities) {
      const targetId = opp.contactId ? `ghl-${opp.contactId}` : `ghl-opp-${opp.id}`;
      const event = (await import("../lib/analytics.mjs")).normalizeEvent({
        campaignId,
        type: "conversion",
        value: opp.monetaryValue || 1,
        metadata: {
          source: "ghl-api-pull",
          opportunityId: opp.id,
          pipelineId: opp.pipelineId,
          pipelineStageId: opp.pipelineStageId,
          status: opp.status,
          monetaryValue: opp.monetaryValue,
          targetId,
        },
      });
      events.push(event);
    }

    for (const event of events) {
      await this.store.addEvent(event);
    }
    await this.memoryEngine.consolidateCampaign(campaignId);

    return { pulled: opportunities.length, eventsAdded: events.length, campaignId };
  }
}

/**
 * Register GHL bridge routes on the SquidWeave server.
 */
export function registerGhlRoutes(serverContext) {
  const { store, contactSourcingEngine, memoryEngine, config } = serverContext;

  const bridge = new GhlBridge({
    store,
    contactSourcingEngine,
    memoryEngine,
    config: {
      apiKey: process.env.GHL_API_KEY || "",
      locationId: process.env.GHL_LOCATION_ID || "",
      defaultCampaignId: process.env.GHL_DEFAULT_CAMPAIGN_ID || "",
      dryRun: config.dryRun,
    },
  });

  return bridge;
}
