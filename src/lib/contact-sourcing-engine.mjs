const DEFAULT_ROLE_CLUSTERS = [
  "VP Marketing",
  "Head of Growth",
  "Demand Generation Director",
  "Revenue Operations Director",
  "Lifecycle Marketing Manager",
];

function unique(values = []) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))];
}

function average(values = []) {
  const valid = values.filter(value => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) {
    return null;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function titleCase(value = "") {
  return String(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shortList(items = [], limit = 4) {
  return items.slice(0, limit);
}

function inferRoleCluster(record, campaign) {
  const fromAudience = unique(String(campaign.audience || "").split(/[,/]| and /i)).filter(item => item.length >= 4);
  const fromTitle = record.title ? [record.title] : [];
  return unique([...fromTitle, ...fromAudience, ...DEFAULT_ROLE_CLUSTERS]).slice(0, 5);
}

function determineSourceMix(record, campaign) {
  const mix = [
    "linkedin-sales-navigator",
    "crm-or-customer-data",
    "enrichment-platform",
  ];
  if ((record.channels || []).includes("email") || String(campaign.channel || "").toLowerCase() === "email") {
    mix.push("email-verification-provider");
  }
  if ((record.channels || []).includes("linkedin") || String(campaign.channel || "").toLowerCase() === "linkedin") {
    mix.push("linkedin-company-page");
  }
  return unique(mix);
}

function buildSearchQuery(record, role, campaign) {
  return [
    role,
    record.company,
    record.region,
    record.segment,
    campaign.offer,
  ].filter(Boolean).join(" | ");
}

function buildEnrichmentChecklist(campaign) {
  return [
    "Start from known accounts and roles instead of broad scraping.",
    "Capture company domain, LinkedIn URL, title, and source evidence before enrichment.",
    "Run enrichment/verification before sending any cold sequence.",
    "Deduplicate against CRM, suppression, and prior outreach history.",
    "Respect opt-out, suppression, and region-specific direct marketing rules.",
    campaign.constraints ? `Campaign constraint review: ${campaign.constraints}` : null,
  ].filter(Boolean);
}

function guessSeniority(role = "") {
  const normalized = String(role).toLowerCase();
  if (/\b(vp|chief|cmo|head)\b/.test(normalized)) {
    return "executive";
  }
  if (/\b(director|lead)\b/.test(normalized)) {
    return "director";
  }
  if (/\b(manager)\b/.test(normalized)) {
    return "manager";
  }
  return "practitioner";
}

function candidateScore(record, role) {
  const fit = typeof record.fitScore === "number" ? record.fitScore : 0.5;
  const intent = typeof record.intentScore === "number" ? record.intentScore : 0.5;
  const recency = typeof record.recencyScore === "number" ? record.recencyScore : 0.5;
  const seniorityBoost = guessSeniority(role) === "executive" ? 0.08 : guessSeniority(role) === "director" ? 0.05 : 0.02;
  return Number(Math.min(1, ((fit + intent + recency) / 3) + seniorityBoost).toFixed(4));
}

export class ContactSourcingEngine {
  constructor({ store, targetingEngine, memoryEngine }) {
    this.store = store;
    this.targetingEngine = targetingEngine;
    this.memoryEngine = memoryEngine;
  }

  getCampaign(campaignId) {
    const campaign = this.store.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Unknown campaign: ${campaignId}`);
    }
    return campaign;
  }

  buildPlan(campaignId) {
    const campaign = this.getCampaign(campaignId);
    const targetDecision = this.targetingEngine.buildDecision(campaignId);
    const memoryContext = this.memoryEngine.buildDecisionContext
      ? this.memoryEngine.buildDecisionContext(campaignId)
      : null;
    const records = this.store.listResearchRecords(campaignId)
      .slice()
      .sort((a, b) => (typeof b.fitScore === "number" ? b.fitScore : 0) - (typeof a.fitScore === "number" ? a.fitScore : 0));
    const topAccounts = shortList(records, 8).map(record => ({
      targetId: record.targetId,
      company: record.company || record.targetId,
      segment: record.segment,
      region: record.region,
      sourceMix: determineSourceMix(record, campaign),
      roleClusters: inferRoleCluster(record, campaign),
      preferredChannel: record.preferredChannel || campaign.channel || null,
      evidence: shortList(record.metadata?.evidence || [], 3),
    }));

    return {
      campaignId,
      generatedAt: new Date().toISOString(),
      objective: campaign.clientNeed || campaign.objective || "",
      audience: campaign.audience || "",
      offer: campaign.offer || "",
      channel: campaign.channel || "",
      topAccounts,
      sourcingWorkflow: [
        "Pick the highest-fit accounts and attach 2-5 likely buyer roles.",
        "Use LinkedIn Sales Navigator or CRM to confirm real people at the account.",
        "Enrich against company domain, LinkedIn URL, and professional email sources.",
        "Verify deliverability and deduplicate before outreach.",
        "Push validated contacts into sequencing only after suppression checks.",
      ],
      enrichmentChecklist: buildEnrichmentChecklist(campaign),
      proceduralSignals: memoryContext && typeof memoryContext.then !== "function"
        ? shortList(memoryContext.playbooks || [], 3).map(playbook => ({
            segment: playbook.segment,
            region: playbook.region,
            channel: playbook.recommendedChannel,
            confidence: playbook.confidence,
          }))
        : [],
      targetSummary: {
        totalTargets: targetDecision.totalTargets || 0,
        actionableTargets: targetDecision.actionableTargets || 0,
      },
    };
  }

  generateCandidates(campaignId, options = {}) {
    const campaign = this.getCampaign(campaignId);
    const limit = Number(options.limit) || 20;
    const records = this.store.listResearchRecords(campaignId)
      .slice()
      .sort((a, b) => {
        const left = average([a.fitScore, a.intentScore, a.recencyScore]) || 0;
        const right = average([b.fitScore, b.intentScore, b.recencyScore]) || 0;
        return right - left;
      })
      .slice(0, Math.max(1, Math.ceil(limit / 3)));

    const contacts = [];
    for (const record of records) {
      const roles = inferRoleCluster(record, campaign);
      for (const role of roles) {
        contacts.push({
          id: crypto.randomUUID(),
          campaignId,
          targetId: record.targetId,
          company: record.company || record.targetId,
          region: record.region || "",
          segment: record.segment || "",
          role,
          seniority: guessSeniority(role),
          preferredChannel: record.preferredChannel || campaign.channel || "",
          sourceMix: determineSourceMix(record, campaign),
          searchQuery: buildSearchQuery(record, role, campaign),
          contactStatus: "needs-enrichment",
          enrichmentStatus: "pending",
          verificationStatus: "pending",
          sequenceStatus: "unplanned",
          evidence: shortList(record.metadata?.evidence || [], 3),
          sourceUrl: record.metadata?.sourceUrl || null,
          score: candidateScore(record, role),
          complianceStatus: "pending-review",
          createdAt: new Date().toISOString(),
        });
      }
    }

    return contacts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async generateAndPersist(campaignId, options = {}) {
    const plan = this.buildPlan(campaignId);
    const candidates = this.generateCandidates(campaignId, options);
    const run = {
      id: crypto.randomUUID(),
      campaignId,
      createdAt: new Date().toISOString(),
      reason: options.reason || "manual",
      generatedCandidates: candidates.length,
      plan,
    };

    await this.store.addProspectingRun(run);
    await this.store.addSourcedContacts(candidates);

    return {
      run,
      plan,
      candidates,
    };
  }

  async importContacts(campaignId, contacts = [], options = {}) {
    this.getCampaign(campaignId);
    const normalized = contacts
      .map(contact => ({
        id: contact.id || crypto.randomUUID(),
        campaignId,
        targetId: String(contact.targetId || contact.company || crypto.randomUUID()),
        company: String(contact.company || "").trim(),
        fullName: String(contact.fullName || contact.contactName || "").trim(),
        title: String(contact.title || contact.role || "").trim(),
        email: String(contact.email || "").trim().toLowerCase(),
        linkedinUrl: String(contact.linkedinUrl || "").trim(),
        companyWebsite: String(contact.companyWebsite || "").trim(),
        phone: String(contact.phone || "").trim(),
        region: String(contact.region || "").trim(),
        segment: String(contact.segment || "").trim(),
        preferredChannel: String(contact.preferredChannel || "").trim(),
        contactStatus: contact.contactStatus || "ready-for-enrichment",
        complianceStatus: contact.complianceStatus || "reviewed",
        enrichmentStatus: contact.enrichmentStatus || (contact.email || contact.linkedinUrl ? "completed" : "pending"),
        verificationStatus: contact.verificationStatus || (contact.email ? "verified" : "pending"),
        sequenceStatus: contact.sequenceStatus || "unplanned",
        source: contact.source || options.source || "manual-import",
        notes: String(contact.notes || "").trim(),
        createdAt: new Date().toISOString(),
      }))
      .filter(contact => contact.company || contact.fullName || contact.email);

    await this.store.addSourcedContacts(normalized);
    return normalized;
  }
}
