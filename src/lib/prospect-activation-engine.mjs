function unique(values = []) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))];
}

function titleCase(value = "") {
  return String(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function summarizeChannel(contact, campaign) {
  if (contact.preferredChannel) {
    return contact.preferredChannel;
  }
  if (contact.email) {
    return "email";
  }
  return campaign.channel || "linkedin";
}

function buildSequenceSteps(channel, campaign, contact) {
  const offer = campaign.offer || "strategy review";
  const objective = campaign.clientNeed || campaign.objective || "pipeline growth";
  const company = contact.company || "target account";
  const name = contact.fullName || contact.role || contact.title || "buyer";

  if (channel === "linkedin") {
    return [
      `Connection request referencing ${company} and ${objective}.`,
      `Follow-up message anchored on ${offer} and one evidence-backed pain point for ${name}.`,
      `Value drop with proof asset, benchmark, or case study tailored to ${contact.segment || "the segment"}.`,
    ];
  }

  return [
    `Cold email 1 focused on ${objective} and a concrete outcome for ${company}.`,
    `Follow-up email with proof, objection handling, and localized relevance for ${contact.region || "the region"}.`,
    `Breakup email offering ${offer} or a lighter CTA.`,
  ];
}

function buildPersonalizationAngles(contact) {
  return unique([
    ...(contact.evidence || []),
    contact.segment ? `${titleCase(contact.segment)} segment pressure` : null,
    contact.region ? `${String(contact.region).toUpperCase()} market context` : null,
    contact.role || contact.title || null,
  ]).slice(0, 4);
}

function nowIso() {
  return new Date().toISOString();
}

export class ProspectActivationEngine {
  constructor({ store, connectors, config }) {
    this.store = store;
    this.connectors = connectors;
    this.config = config;
  }

  getCampaign(campaignId) {
    const campaign = this.store.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Unknown campaign: ${campaignId}`);
    }
    return campaign;
  }

  buildPipeline(campaignId) {
    this.getCampaign(campaignId);
    const contacts = this.store.listSourcedContacts(campaignId);
    const counts = contacts.reduce((acc, contact) => {
      acc.total += 1;
      acc.byStatus[contact.contactStatus || "unknown"] = (acc.byStatus[contact.contactStatus || "unknown"] || 0) + 1;
      acc.byCompliance[contact.complianceStatus || "unknown"] = (acc.byCompliance[contact.complianceStatus || "unknown"] || 0) + 1;
      acc.bySequence[contact.sequenceStatus || "unplanned"] = (acc.bySequence[contact.sequenceStatus || "unplanned"] || 0) + 1;
      if (["needs-enrichment", "ready-for-enrichment", "awaiting-provider"].includes(contact.contactStatus)) {
        acc.readyForEnrichment += 1;
      }
      if (contact.contactStatus === "ready-for-sequencing") {
        acc.readyForSequencing += 1;
      }
      if (["sequenced", "queued-for-dispatch"].includes(contact.contactStatus)) {
        acc.sequenced += 1;
      }
      if (contact.complianceStatus === "suppressed") {
        acc.suppressed += 1;
      }
      return acc;
    }, {
      total: 0,
      readyForEnrichment: 0,
      readyForSequencing: 0,
      sequenced: 0,
      suppressed: 0,
      byStatus: {},
      byCompliance: {},
      bySequence: {},
    });

    const recentRuns = this.store.listActivationRuns(campaignId)
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      campaignId,
      generatedAt: nowIso(),
      counts,
      recentRuns,
    };
  }

  async enrichContacts(campaignId, options = {}) {
    const campaign = this.getCampaign(campaignId);
    const contacts = this.store.listSourcedContacts(campaignId);
    const candidates = contacts.filter(contact => (
      ["needs-enrichment", "ready-for-enrichment", "awaiting-provider"].includes(contact.contactStatus)
      && contact.complianceStatus !== "suppressed"
    ));

    const limit = Number(options.limit) > 0 ? Number(options.limit) : candidates.length;
    const selected = candidates.slice(0, limit);
    const updatedContacts = selected.map(contact => {
      const hasMinimumIdentity = Boolean(contact.fullName || contact.role || contact.title);
      const hasRoute = Boolean(contact.email || contact.linkedinUrl);
      const nextStatus = hasMinimumIdentity && hasRoute ? "ready-for-sequencing" : "awaiting-provider";
      return {
        ...contact,
        fullName: contact.fullName || titleCase(contact.role || ""),
        title: contact.title || titleCase(contact.role || ""),
        preferredChannel: summarizeChannel(contact, campaign),
        enrichmentStatus: hasRoute ? "completed" : "queued",
        verificationStatus: contact.email ? "verified" : "pending",
        contactStatus: nextStatus,
        complianceStatus: contact.complianceStatus === "pending-review" && contact.email ? "reviewed" : contact.complianceStatus,
        enrichmentProvider: options.provider || "internal-waterfall",
        lastActionAt: nowIso(),
      };
    });

    await this.store.updateSourcedContacts(campaignId, updatedContacts);

    const connectorResults = [];
    if (options.dispatch && selected.length) {
      const connectorNames = Array.isArray(options.connectors) && options.connectors.length
        ? options.connectors
        : [campaign.connector || this.config.defaultConnector];
      for (const connectorName of connectorNames) {
        const connector = this.connectors[connectorName];
        if (!connector) {
          continue;
        }
        connectorResults.push(await connector.execute({
          type: "enrich_contact_batch",
          provider: options.provider || "internal-waterfall",
          campaignId,
          limit: selected.length,
        }, {
          campaign,
          contacts: selected,
        }));
      }
    }

    const run = {
      id: crypto.randomUUID(),
      campaignId,
      action: "enrich",
      provider: options.provider || "internal-waterfall",
      status: "completed",
      processedContacts: updatedContacts.length,
      connectorResults,
      createdAt: nowIso(),
    };

    await this.store.addActivationRun(run);
    return {
      run,
      contacts: this.store.listSourcedContacts(campaignId),
      pipeline: this.buildPipeline(campaignId),
    };
  }

  async sequenceContacts(campaignId, options = {}) {
    const campaign = this.getCampaign(campaignId);
    const contacts = this.store.listSourcedContacts(campaignId);
    const candidates = contacts.filter(contact => (
      contact.contactStatus === "ready-for-sequencing"
      && contact.complianceStatus !== "suppressed"
    ));

    const limit = Number(options.limit) > 0 ? Number(options.limit) : candidates.length;
    const selected = candidates.slice(0, limit);
    const updatedContacts = selected.map(contact => {
      const channel = summarizeChannel(contact, campaign);
      return {
        ...contact,
        sequenceStatus: options.dispatch ? "queued-for-dispatch" : "planned",
        contactStatus: options.dispatch ? "queued-for-dispatch" : "sequenced",
        sequencePlan: {
          channel,
          offer: campaign.offer || "",
          steps: buildSequenceSteps(channel, campaign, contact),
          personalizationAngles: buildPersonalizationAngles(contact),
          createdAt: nowIso(),
        },
        lastActionAt: nowIso(),
      };
    });

    await this.store.updateSourcedContacts(campaignId, updatedContacts);

    const connectorResults = [];
    if (options.dispatch && selected.length) {
      const connectorNames = Array.isArray(options.connectors) && options.connectors.length
        ? options.connectors
        : [campaign.connector || this.config.defaultConnector];
      for (const connectorName of connectorNames) {
        const connector = this.connectors[connectorName];
        if (!connector) {
          continue;
        }
        connectorResults.push(await connector.execute({
          type: "queue_outreach_sequence",
          campaignId,
          limit: selected.length,
        }, {
          campaign,
          contacts: updatedContacts,
        }));
      }
    }

    const run = {
      id: crypto.randomUUID(),
      campaignId,
      action: options.dispatch ? "sequence-and-dispatch" : "sequence",
      status: "completed",
      processedContacts: updatedContacts.length,
      connectorResults,
      createdAt: nowIso(),
    };

    await this.store.addActivationRun(run);
    return {
      run,
      contacts: this.store.listSourcedContacts(campaignId),
      pipeline: this.buildPipeline(campaignId),
    };
  }
}
