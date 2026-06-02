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

function parseName(value = "") {
  const cleaned = String(value || "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return { firstName: "", lastName: "", fullName: "" };
  }
  const parts = cleaned.split(" ").filter(Boolean);
  return {
    firstName: titleCase(parts[0] || ""),
    lastName: titleCase(parts.slice(1).join(" ")),
    fullName: titleCase(parts.join(" ")),
  };
}

function parseEmailIdentity(email = "") {
  const normalized = String(email || "").trim().toLowerCase();
  const match = normalized.match(/^([^@]+)@([^@]+\.[^@]+)$/);
  if (!match) {
    return { email: normalized, domain: "", name: parseName("") };
  }
  const local = match[1].replace(/\+.*$/, "");
  return {
    email: normalized,
    domain: match[2],
    name: parseName(local),
  };
}

function normalizePhone(value = "") {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) {
    return "";
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function completeContactProfile(contact, campaign, provider) {
  const emailIdentity = parseEmailIdentity(contact.email);
  const explicitName = parseName(contact.fullName || contact.contactName || "");
  const inferredName = explicitName.fullName ? explicitName : emailIdentity.name;
  const phone = normalizePhone(contact.phone);
  const hasRoute = Boolean(emailIdentity.email || contact.linkedinUrl || phone);
  const companyDomain = contact.companyDomain || contact.domain || emailIdentity.domain || "";
  const inferredCompany = contact.company || (
    companyDomain
      ? titleCase(companyDomain.split(".").slice(0, -1).join(" "))
      : ""
  );
  const fullName = contact.fullName || inferredName.fullName || titleCase(contact.role || contact.title || "");
  const firstName = contact.firstName || inferredName.firstName || "";
  const lastName = contact.lastName || inferredName.lastName || "";
  const hasMinimumIdentity = Boolean(fullName || firstName || contact.role || contact.title);
  const missingFields = [];
  if (!fullName && !firstName) missingFields.push("name");
  if (!emailIdentity.email) missingFields.push("email");
  if (!phone) missingFields.push("phone");
  if (!contact.linkedinUrl) missingFields.push("linkedinUrl");
  if (!inferredCompany) missingFields.push("company");
  if (!contact.title && !contact.role) missingFields.push("title");
  const ready = hasMinimumIdentity && hasRoute;

  return {
    ...contact,
    email: emailIdentity.email || contact.email || "",
    phone: phone || contact.phone || "",
    firstName,
    lastName,
    fullName,
    company: inferredCompany,
    companyDomain,
    title: contact.title || titleCase(contact.role || ""),
    preferredChannel: summarizeChannel({ ...contact, email: emailIdentity.email, phone }, campaign),
    enrichmentStatus: ready ? "completed" : "queued",
    verificationStatus: emailIdentity.email ? "verified" : (phone ? "phone-route-present" : "pending"),
    contactStatus: ready ? "ready-for-sequencing" : "awaiting-provider",
    complianceStatus: contact.complianceStatus === "pending-review" && hasRoute ? "reviewed" : contact.complianceStatus,
    enrichmentProvider: provider,
    missingFields,
    profileCompletionScore: Number(((6 - missingFields.length) / 6).toFixed(4)),
    lastActionAt: nowIso(),
  };
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
async function _dispatchToConnectors(campaignId, campaign, selected, operation, store, connectorMap) {
  const connectorResults = [];
  const connectorIssues = [];
  const connectorNames = Array.isArray(operation.connectors) && operation.connectors.length
    ? operation.connectors
    : [campaign.connector || (store && store.config && store.config.defaultConnector) || operation.defaultConnector];
  for (const connectorName of connectorNames) {
    const connector = connectorMap[connectorName];
    if (!connector) {
      connectorIssues.push({ connector: connectorName, reason: "missing-connector" });
      continue;
    }
    if (typeof connector.isConfigured === "function" && !connector.isConfigured()) {
      connectorIssues.push({ connector: connectorName, reason: "not-configured" });
    }
    connectorResults.push(await connector.execute(operation.payload, {
      campaign,
      contacts: selected,
    }));
  }
  return { connectorResults, connectorIssues };
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
    const provider = options.provider || "internal-waterfall";
    const updatedContacts = selected.map(contact => completeContactProfile(contact, campaign, provider));

    await this.store.updateSourcedContacts(campaignId, updatedContacts);

    const connectorResults = [];
    const connectorIssues = [];
    if (options.dispatch && selected.length) {
      const { connectorResults: cr, connectorIssues: ci } = await _dispatchToConnectors(
        campaignId,
        campaign,
        selected,
        {
          connectors: options.connectors,
          defaultConnector: this.config.defaultConnector,
          payload: {
            type: "enrich_contact_batch",
            provider: options.provider || "internal-waterfall",
            campaignId,
            limit: selected.length,
          },
        },
        this.store,
        this.connectors,
      );
      connectorResults.push(...cr);
      connectorIssues.push(...ci);
    }

    const run = {
      id: crypto.randomUUID(),
      campaignId,
      action: "enrich",
      provider: options.provider || "internal-waterfall",
      status: connectorIssues.length ? "attention" : "completed",
      processedContacts: updatedContacts.length,
      connectorResults,
      connectorIssues,
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
    const connectorIssues = [];
    if (options.dispatch && selected.length) {
      const { connectorResults: cr, connectorIssues: ci } = await _dispatchToConnectors(
        campaignId,
        campaign,
        updatedContacts,
        {
          connectors: options.connectors,
          defaultConnector: this.config.defaultConnector,
          payload: {
            type: "queue_outreach_sequence",
            campaignId,
            limit: selected.length,
          },
        },
        this.store,
        this.connectors,
      );
      connectorResults.push(...cr);
      connectorIssues.push(...ci);
    }

    const run = {
      id: crypto.randomUUID(),
      campaignId,
      action: options.dispatch ? "sequence-and-dispatch" : "sequence",
      status: connectorIssues.length ? "attention" : "completed",
      processedContacts: updatedContacts.length,
      connectorResults,
      connectorIssues,
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
