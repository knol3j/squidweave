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

  async _ghlGet(path) {
    const url = `${GHL_BASE}${path}${path.includes("?") ? "&" : "?"}locationId=${this.locationId}`;
    const res = await fetch(url, { headers: this.buildAuthHeaders() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GHL GET ${path} error ${res.status}: ${text}`);
    }
    return res.json();
  }

  async _ghlPost(path, body) {
    const url = `${GHL_BASE}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.buildAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GHL POST ${path} error ${res.status}: ${text}`);
    }
    return res.json();
  }

  async _ghlPut(path, body) {
    const url = `${GHL_BASE}${path}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: this.buildAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GHL PUT ${path} error ${res.status}: ${text}`);
    }
    return res.json();
  }

  async _ghlDelete(path) {
    const url = `${GHL_BASE}${path}`;
    const res = await fetch(url, { method: "DELETE", headers: this.buildAuthHeaders() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GHL DELETE ${path} error ${res.status}: ${text}`);
    }
    return res.json();
  }

  /**
   * Handle an incoming GHL webhook payload.
   * Maps all event types to SquidWeave's internal data model.
   */
  async ingestWebhook(payload, overrides = {}) {
    const { type, data } = payload;
    const campaignId = overrides.campaignId || this.defaultCampaignId;

    switch (type) {
      case "ContactCreate":
      case "ContactUpdate":
        return this._handleContactWebhook(data?.contact || data, campaignId, type);
      case "ContactDelete":
        return this._handleContactDeleteWebhook(data, campaignId);
      case "OpportunityCreate":
      case "OpportunityUpdate":
        return this._handleOpportunityWebhook(data?.opportunity || data, data?.contact, campaignId, type);
      case "OpportunityDelete":
        return this._handleOpportunityDeleteWebhook(data, campaignId);
      case "PipelineCreate":
      case "PipelineUpdate":
        return this._handlePipelineWebhook(data, campaignId, type);
      case "PipelineDelete":
        return this._handlePipelineDeleteWebhook(data, campaignId);
      case "WorkflowCreate":
      case "WorkflowUpdate":
        return this._handleWorkflowWebhook(data, campaignId, type);
      case "WorkflowDelete":
        return this._handleWorkflowDeleteWebhook(data, campaignId);
      case "ConversationCreate":
        return this._handleConversationWebhook(data, campaignId, type);
      case "CampaignLog":
        return this._handleCampaignLogWebhook(data, campaignId, type);
      case "AppointmentCreate":
      case "AppointmentUpdate":
        return this._handleAppointmentWebhook(data, campaignId, type);
      case "AppointmentDelete":
        return this._handleAppointmentDeleteWebhook(data, campaignId);
      default:
        return { action: "ignored", reason: `unknown event type: ${type}` };
    }
  }

  // ── Contact webhooks ──

  async _handleContactWebhook(contact, campaignId, eventType) {
    if (!contact?.id) return { action: "ignored", reason: "no contact id" };

    const targetId = `ghl-${contact.id}`;
    const results = [];

    if (!this.dryRun) {
      await this.store.upsertContact({
        id: targetId,
        contactId: contact.id,
        locationId: contact.locationId || this.locationId,
        companyName: contact.companyName || "",
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        fullName: contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
        email: (contact.email || "").toLowerCase(),
        phone: contact.phone || "",
        website: contact.website || "",
        linkedinUrl: contact.customFields?.find(f => f.id?.toLowerCase().includes("linkedin"))?.value || "",
        city: contact.city || "",
        state: contact.state || "",
        country: contact.country || "",
        tags: contact.tags || [],
        dnd: contact.dnd || false,
        customFields: (contact.customFields || []).reduce((acc, f) => { acc[f.id] = f.value; return acc; }, {}),
        enrichmentStatus: "synced",
        verificationStatus: "synced",
      });
      results.push({ action: "upserted_contact" });
    }

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

    if (campaignId) {
      const imported = await this.contactSourcingEngine.importContacts(campaignId, [prospect], {
        source: prospect.source,
      });
      results.push({ action: "imported_prospect", count: imported.length });

      const record = {
        campaignId, targetId,
        company: prospect.company, contactName: prospect.fullName,
        title: prospect.title, segment: prospect.segment,
        source: `ghl-${eventType}`,
        channels: contact.dnd ? [] : ["email"],
      };
      await this.store.addResearchRecord(record);
      results.push({ action: "added_research_record" });

      await this.memoryEngine.consolidateCampaign(campaignId);
    }

    return { action: "contact_processed", targetId, details: results };
  }

  async _handleContactDeleteWebhook(data, campaignId) {
    const contactId = data?.contact?.id || data?.id;
    if (!contactId) return { action: "ignored", reason: "no contact id" };
    const targetId = `ghl-${contactId}`;
    if (!this.dryRun) {
      await this.store.deleteDocument("contacts", targetId);
    }
    return { action: "contact_deleted", targetId };
  }

  // ── Opportunity webhooks ──

  async _handleOpportunityWebhook(opportunity, contact, campaignId, eventType) {
    if (!opportunity?.id) return { action: "ignored", reason: "no opportunity id" };

    const targetId = contact?.id ? `ghl-${contact.id}` : `ghl-opp-${opportunity.id}`;
    const results = [];

    if (!this.dryRun) {
      await this.store.upsertOpportunity({
        id: `ghl-opp-${opportunity.id}`,
        locationId: opportunity.locationId || this.locationId,
        pipelineId: opportunity.pipelineId || "",
        pipelineStageId: opportunity.pipelineStageId || "",
        contactId: `ghl-${contact?.id || opportunity.contactId || ""}`,
        campaignId,
        name: opportunity.name || "",
        status: opportunity.status || "open",
        monetaryValue: opportunity.monetaryValue || 0,
        currency: opportunity.currency || "USD",
        source: opportunity.source || `ghl-${eventType}`,
        assignedTo: opportunity.assignedTo || "",
        notes: opportunity.notes || "",
        lostReason: opportunity.lostReason || "",
        customFields: (opportunity.customFields || []).reduce((acc, f) => { acc[f.id] = f.value; return acc; }, {}),
      });
      results.push({ action: "upserted_opportunity" });
    }

    if (campaignId) {
      const stageMap = {
        open: 0.3, negotiation: 0.6, "closed-won": 1.0, "closed-lost": 0,
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
      results.push({ action: "added_analytics_event" });

      if (contact) {
        const prospectImport = await this._handleContactWebhook(contact, campaignId, eventType);
        results.push(...(prospectImport.details || []));
      }

      await this.memoryEngine.consolidateCampaign(campaignId);
    }

    return { action: "opportunity_processed", targetId, results };
  }

  async _handleOpportunityDeleteWebhook(data, campaignId) {
    const oppId = data?.opportunity?.id || data?.id;
    if (!oppId) return { action: "ignored", reason: "no opportunity id" };
    if (!this.dryRun) {
      await this.store.deleteDocument("opportunities", `ghl-opp-${oppId}`);
    }
    return { action: "opportunity_deleted", id: oppId };
  }

  // ── Pipeline webhooks ──

  async _handlePipelineWebhook(data, campaignId, eventType) {
    const pipeline = data?.pipeline || data;
    if (!pipeline?.id) return { action: "ignored", reason: "no pipeline id" };

    if (!this.dryRun) {
      await this.store.upsertPipeline({
        id: `ghl-pipeline-${pipeline.id}`,
        locationId: pipeline.locationId || this.locationId,
        name: pipeline.name || "",
        stages: (pipeline.stages || []).map((s, i) => ({
          id: s.id || crypto.randomUUID(),
          name: s.name || `Stage ${i + 1}`,
          order: s.order ?? i,
        })),
        showInFunnel: pipeline.showInFunnel !== false,
      });
    }
    return { action: "pipeline_processed", pipelineId: pipeline.id };
  }

  async _handlePipelineDeleteWebhook(data, campaignId) {
    const pipelineId = data?.pipeline?.id || data?.id;
    if (!pipelineId) return { action: "ignored", reason: "no pipeline id" };
    if (!this.dryRun) {
      await this.store.deleteDocument("pipelines", `ghl-pipeline-${pipelineId}`);
    }
    return { action: "pipeline_deleted", id: pipelineId };
  }

  // ── Workflow webhooks ──

  async _handleWorkflowWebhook(data, campaignId, eventType) {
    const workflow = data?.workflow || data;
    if (!workflow?.id) return { action: "ignored", reason: "no workflow id" };

    if (!this.dryRun) {
      const wfId = `ghl-wf-${workflow.id}`;
      await this.store.upsertWorkflow({
        id: wfId,
        locationId: workflow.locationId || this.locationId,
        name: workflow.name || "",
        description: workflow.description || "",
        status: workflow.status || "draft",
        triggerType: workflow.triggerType || "manual",
        triggerConfig: workflow.triggerConfig || {},
        campaignId,
        publishedVersion: workflow.publishedVersion || null,
      });

      if (workflow.steps) {
        for (const [i, step] of (workflow.steps || []).entries()) {
          await this.store.upsertWorkflowStep({
            workflowId: wfId,
            type: step.type || "delay",
            order: step.order ?? i,
            config: step.config || {},
            branches: step.branches || [],
            parentStepId: step.parentStepId || null,
          });
        }
      }
    }
    return { action: "workflow_processed", workflowId: workflow.id };
  }

  async _handleWorkflowDeleteWebhook(data, campaignId) {
    const wfId = data?.workflow?.id || data?.id;
    if (!wfId) return { action: "ignored", reason: "no workflow id" };
    if (!this.dryRun) {
      await this.store.deleteDocument("workflows", `ghl-wf-${wfId}`);
    }
    return { action: "workflow_deleted", id: wfId };
  }

  // ── Appointment webhooks ──

  async _handleAppointmentWebhook(data, campaignId, eventType) {
    const appointment = data?.appointment || data;
    if (!appointment?.id) return { action: "ignored", reason: "no appointment id" };

    if (!this.dryRun) {
      await this.store.upsertCalendarEvent({
        id: `ghl-event-${appointment.id}`,
        contactId: appointment.contactId ? `ghl-${appointment.contactId}` : "",
        campaignId,
        title: appointment.title || appointment.name || "Appointment",
        description: appointment.description || appointment.notes || "",
        startTime: appointment.startTime || appointment.startAt || "",
        endTime: appointment.endTime || appointment.endAt || "",
        status: appointment.status || "scheduled",
        location: appointment.location || "",
        meetingLink: appointment.meetingLink || appointment.meetingUrl || "",
      });
    }
    return { action: "appointment_processed", appointmentId: appointment.id };
  }

  async _handleAppointmentDeleteWebhook(data, campaignId) {
    const apptId = data?.appointment?.id || data?.id;
    if (!apptId) return { action: "ignored", reason: "no appointment id" };
    if (!this.dryRun) {
      await this.store.deleteDocument("calendarEvents", `ghl-event-${apptId}`);
    }
    return { action: "appointment_deleted", id: apptId };
  }

  // ── Conversation webhook (unchanged) ──

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
          campaignId, targetId, type: outreachType,
          channel: msg.channelType || "email",
          metadata: {
            source: `ghl-${eventType}`, messageId: msg.id,
            conversationId: data.id, bodyPreview: msg.body?.slice(0, 200),
            direction: msg.direction,
          },
        });
        await this.store.addOutreachEvent(outreachEvent);
        results.push({ action: "added_outreach_event", type: outreachType });

        const analyticsEvent = (await import("../lib/analytics.mjs")).normalizeEvent({
          campaignId, type: analyticsType, value: 1,
          metadata: { source: `ghl-${eventType}`, conversationId: data.id, messageId: msg.id },
        });
        await this.store.addEvent(analyticsEvent);
        results.push({ action: "added_analytics_event", type: analyticsType });

        await this.memoryEngine.consolidateCampaign(campaignId);
      }
    }

    return { action: "conversation_processed", targetId, messageCount: messages.length, results };
  }

  // ── Campaign log webhook (unchanged) ──

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
    if (!mapping) return { action: "ignored", reason: `unknown log type: ${logType}` };

    if (campaignId && targetId) {
      const outreachEvent = (await import("../lib/targeting-engine.mjs")).normalizeOutreachEvent({
        campaignId, targetId, type: mapping.outreach,
        channel: logType.startsWith("sms") ? "sms" : "email",
        metadata: { source: `ghl-${eventType}`, logType, campaignLogId: data.id, messageId: data.messageId },
      });
      await this.store.addOutreachEvent(outreachEvent);
      results.push({ action: "added_outreach_event", type: mapping.outreach });

      const analyticsEvent = (await import("../lib/analytics.mjs")).normalizeEvent({
        campaignId, type: mapping.analytics, value: 1,
        metadata: { source: `ghl-${eventType}`, logType },
      });
      await this.store.addEvent(analyticsEvent);
      results.push({ action: "added_analytics_event", type: mapping.analytics });

      await this.memoryEngine.consolidateCampaign(campaignId);
    }

    return { action: "campaign_log_processed", targetId, logType, results };
  }

  // ── Pull from GHL API ──

  async pullContacts(campaignId, options = {}) {
    if (!this.isConfigured()) throw new Error("GHL bridge not configured: set GHL_API_KEY and GHL_LOCATION_ID");
    const limit = options.limit || 100;
    const query = options.query || "";
    const url = `${GHL_BASE}/contacts/?locationId=${this.locationId}&limit=${limit}${query ? `&query=${encodeURIComponent(query)}` : ""}`;

    const response = await fetch(url, { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`GHL API error ${response.status}: ${await response.text()}`);

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

    for (const c of contacts) {
      if (!this.dryRun) {
        await this.store.upsertContact({
          id: `ghl-${c.id}`,
          contactId: c.id,
          locationId: this.locationId,
          companyName: c.companyName || "",
          firstName: c.firstName || "",
          lastName: c.lastName || "",
          fullName: c.name || "",
          email: (c.email || "").toLowerCase(),
          phone: c.phone || "",
          website: c.website || "",
          linkedinUrl: c.customFields?.find(f => f.id?.toLowerCase().includes("linkedin"))?.value || "",
          city: c.city || "",
          state: c.state || "",
          country: c.country || "",
          tags: c.tags || [],
          dnd: c.dnd || false,
        });
      }
    }

    const imported = await this.contactSourcingEngine.importContacts(campaignId, prospects, {
      source: "ghl-api-pull",
    });

    return { total: contacts.length, imported: imported.length, campaignId };
  }

  async pullOpportunities(campaignId, options = {}) {
    if (!this.isConfigured()) throw new Error("GHL bridge not configured");
    const pipelineId = options.pipelineId || "";
    const limit = options.limit || 100;
    const url = `${GHL_BASE}/opportunities/bulk?locationId=${this.locationId}&limit=${limit}${pipelineId ? `&pipelineId=${pipelineId}` : ""}`;

    const response = await fetch(url, { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`GHL API error ${response.status}: ${await response.text()}`);

    const body = await response.json();
    const opportunities = body.opportunities || [];

    const events = [];
    for (const opp of opportunities) {
      const targetId = opp.contactId ? `ghl-${opp.contactId}` : `ghl-opp-${opp.id}`;

      if (!this.dryRun) {
        await this.store.upsertOpportunity({
          id: `ghl-opp-${opp.id}`,
          locationId: this.locationId,
          pipelineId: opp.pipelineId || "",
          pipelineStageId: opp.pipelineStageId || "",
          contactId: opp.contactId ? `ghl-${opp.contactId}` : "",
          campaignId,
          name: opp.name || "",
          status: opp.status || "open",
          monetaryValue: opp.monetaryValue || 0,
          currency: opp.currency || "USD",
          source: opp.source || "ghl-api-pull",
          assignedTo: opp.assignedTo || "",
        });
      }

      const event = (await import("../lib/analytics.mjs")).normalizeEvent({
        campaignId, type: "conversion", value: opp.monetaryValue || 1,
        metadata: {
          source: "ghl-api-pull", opportunityId: opp.id,
          pipelineId: opp.pipelineId, pipelineStageId: opp.pipelineStageId,
          status: opp.status, monetaryValue: opp.monetaryValue, targetId,
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

  async pullPipelines(options = {}) {
    if (!this.isConfigured()) throw new Error("GHL bridge not configured");
    const data = await this._ghlGet("/pipelines/");
    const pipelines = data.pipelines || [];

    for (const p of pipelines) {
      if (!this.dryRun) {
        await this.store.upsertPipeline({
          id: `ghl-pipeline-${p.id}`,
          locationId: this.locationId,
          name: p.name || "",
          stages: (p.stages || []).map((s, i) => ({
            id: s.id || crypto.randomUUID(),
            name: s.name || `Stage ${i + 1}`,
            order: s.order ?? i,
          })),
          showInFunnel: p.showInFunnel !== false,
        });
      }
    }

    return { pulled: pipelines.length };
  }

  async pullWorkflows(options = {}) {
    if (!this.isConfigured()) throw new Error("GHL bridge not configured");
    const data = await this._ghlGet("/workflows/");
    const workflows = data.workflows || [];

    for (const w of workflows) {
      if (!this.dryRun) {
        const wfId = `ghl-wf-${w.id}`;
        await this.store.upsertWorkflow({
          id: wfId,
          locationId: this.locationId,
          name: w.name || "",
          description: w.description || "",
          status: w.status || "draft",
          triggerType: w.triggerType || "manual",
          triggerConfig: w.triggerConfig || {},
          publishedVersion: w.publishedVersion || null,
        });

        if (w.steps) {
          for (const [i, step] of (w.steps || []).entries()) {
            await this.store.upsertWorkflowStep({
              workflowId: wfId,
              type: step.type || "delay",
              order: step.order ?? i,
              config: step.config || {},
              branches: step.branches || [],
              parentStepId: step.parentStepId || null,
            });
          }
        }
      }
    }

    return { pulled: workflows.length };
  }

  async pullForms(options = {}) {
    if (!this.isConfigured()) throw new Error("GHL bridge not configured");
    const data = await this._ghlGet("/forms/");
    return { pulled: (data.forms || []).length };
  }

  async pullCalendars(options = {}) {
    if (!this.isConfigured()) throw new Error("GHL bridge not configured");
    const data = await this._ghlGet("/calendars/");
    return { pulled: (data.calendars || []).length };
  }

  /**
   * Full sync: pull all entities from GHL into local store.
   */
  async fullSync(campaignId, options = {}) {
    if (!this.isConfigured()) throw new Error("GHL bridge not configured");
    const results = {};

    results.contacts = await this.pullContacts(campaignId, options);
    results.opportunities = await this.pullOpportunities(campaignId, options);
    results.pipelines = await this.pullPipelines(options);
    results.workflows = await this.pullWorkflows(options);
    results.forms = await this.pullForms(options);
    results.calendars = await this.pullCalendars(options);

    if (campaignId) {
      await this.memoryEngine.consolidateCampaign(campaignId);
    }

    return results;
  }

  // ── Push to GHL API ──

  async pushContact(campaignId, contactData) {
    if (this.dryRun) return { action: "dry_run", contactData };

    const body = {
      locationId: this.locationId,
      firstName: contactData.firstName || "",
      lastName: contactData.lastName || "",
      name: contactData.fullName || `${contactData.firstName || ""} ${contactData.lastName || ""}`.trim(),
      email: (contactData.email || "").toLowerCase(),
      phone: contactData.phone || "",
      website: contactData.website || "",
      companyName: contactData.companyName || "",
      city: contactData.city || "",
      state: contactData.state || "",
      country: contactData.country || "",
      tags: contactData.tags || [],
      customFields: Object.entries(contactData.customFields || {}).map(([id, value]) => ({ id, value })),
    };

    const result = await this._ghlPost("/contacts/", body);
    return { action: "contact_pushed", ghlContactId: result.contact?.id || result.id };
  }

  async pushOpportunity(opportunityData) {
    if (this.dryRun) return { action: "dry_run", opportunityData };

    const body = {
      locationId: this.locationId,
      pipelineId: opportunityData.pipelineId || "",
      pipelineStageId: opportunityData.pipelineStageId || "",
      contactId: opportunityData.contactId?.replace(/^ghl-/, "") || "",
      name: opportunityData.name || "",
      status: opportunityData.status || "open",
      monetaryValue: opportunityData.monetaryValue || 0,
      assignedTo: opportunityData.assignedTo || "",
      notes: opportunityData.notes || "",
    };

    const result = await this._ghlPost("/opportunities/", body);
    return { action: "opportunity_pushed", ghlOpportunityId: result.opportunity?.id || result.id };
  }

  async pushNote(contactId, noteBody) {
    if (this.dryRun) return { action: "dry_run", noteBody };

    const rawContactId = contactId.replace(/^ghl-/, "");
    const result = await this._ghlPost(`/contacts/${rawContactId}/notes/`, {
      body: noteBody,
    });
    return { action: "note_pushed", ghlNoteId: result.id };
  }

  async pushTask(taskData) {
    if (this.dryRun) return { action: "dry_run", taskData };

    const body = {
      locationId: this.locationId,
      contactId: taskData.contactId?.replace(/^ghl-/, "") || "",
      title: taskData.title || "",
      body: taskData.body || "",
      status: taskData.status || "pending",
      priority: taskData.priority || "medium",
      dueDate: taskData.dueDate || null,
      assignedTo: taskData.assignedTo || "",
    };

    const result = await this._ghlPost("/tasks/", body);
    return { action: "task_pushed", ghlTaskId: result.id };
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
      webhookSecret: process.env.GHL_WEBHOOK_SECRET || "",
      dryRun: config.dryRun,
    },
  });

  return bridge;
}
