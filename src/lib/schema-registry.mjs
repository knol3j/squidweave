const scalar = (name, type, options = {}) => ({ name, type, ...options });

export class SchemaRegistry {
  constructor() {
    this.collections = new Map();
    this.registerDefaults();
  }

  register(descriptor) {
    this.collections.set(descriptor.name, descriptor);
    return descriptor;
  }

  get(name) {
    return this.collections.get(name) || null;
  }

  list() {
    return [...this.collections.values()];
  }

  registerDefaults() {
    this.register({
      name: "campaigns",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [
        scalar("id", "string", { indexed: true }),
        scalar("name", "string"),
        scalar("connector", "string"),
        scalar("connectors", "string[]"),
        scalar("channel", "string"),
        scalar("objective", "string"),
      ],
      relations: [
        { name: "analyticsEvents", type: "many", collection: "analyticsEvents", localField: "id", foreignField: "campaignId" },
        { name: "researchRecords", type: "many", collection: "researchRecords", localField: "id", foreignField: "campaignId" },
        { name: "outreachEvents", type: "many", collection: "outreachEvents", localField: "id", foreignField: "campaignId" },
        { name: "decisions", type: "many", collection: "decisions", localField: "id", foreignField: "campaignId" },
        { name: "contentPacks", type: "many", collection: "contentPacks", localField: "id", foreignField: "campaignId" },
        { name: "automationRuns", type: "many", collection: "automationRuns", localField: "id", foreignField: "campaignId" },
        { name: "agentRuns", type: "many", collection: "agentRuns", localField: "id", foreignField: "campaignId" },
        { name: "prospectingRuns", type: "many", collection: "prospectingRuns", localField: "id", foreignField: "campaignId" },
        { name: "sourcedContacts", type: "many", collection: "sourcedContacts", localField: "id", foreignField: "campaignId" },
        { name: "activationRuns", type: "many", collection: "activationRuns", localField: "id", foreignField: "campaignId" },
        { name: "targetProfiles", type: "many", collection: "targetProfiles", localField: "id", foreignField: "campaignId" },
        { name: "playbooks", type: "many", collection: "playbooks", localField: "id", foreignField: "campaignId" },
      ],
      metadata: { label: "Campaigns", domain: "core" },
    });

    const campaignChildFields = [
      scalar("id", "string", { indexed: true }),
      scalar("campaignId", "string", { indexed: true }),
      scalar("createdAt", "datetime"),
    ];

    this.register({
      name: "analyticsEvents",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [...campaignChildFields, scalar("type", "string"), scalar("value", "number"), scalar("timestamp", "datetime")],
      relations: [{ name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" }],
      metadata: { label: "Analytics Events", domain: "signals" },
    });

    this.register({
      name: "researchRecords",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [
        ...campaignChildFields,
        scalar("targetId", "string", { indexed: true }),
        scalar("company", "string"),
        scalar("segment", "string"),
        scalar("region", "string"),
        scalar("fitScore", "number"),
        scalar("intentScore", "number"),
      ],
      relations: [
        { name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" },
        { name: "targetProfile", type: "one", collection: "targetProfiles", localField: "targetId", foreignField: "targetId" },
      ],
      metadata: { label: "Research Records", domain: "signals" },
    });

    this.register({
      name: "outreachEvents",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [
        ...campaignChildFields,
        scalar("targetId", "string", { indexed: true }),
        scalar("type", "string"),
        scalar("channel", "string"),
        scalar("timestamp", "datetime"),
      ],
      relations: [
        { name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" },
        { name: "targetProfile", type: "one", collection: "targetProfiles", localField: "targetId", foreignField: "targetId" },
      ],
      metadata: { label: "Outreach Events", domain: "signals" },
    });

    this.register({
      name: "targetProfiles",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [
        scalar("id", "string", { indexed: true }),
        scalar("campaignId", "string", { indexed: true }),
        scalar("targetId", "string", { indexed: true }),
        scalar("company", "string"),
        scalar("segment", "string"),
        scalar("region", "string"),
        scalar("preferredChannel", "string"),
      ],
      relations: [
        { name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" },
        { name: "researchRecords", type: "many", collection: "researchRecords", localField: "targetId", foreignField: "targetId" },
        { name: "outreachEvents", type: "many", collection: "outreachEvents", localField: "targetId", foreignField: "targetId" },
      ],
      metadata: { label: "Target Profiles", domain: "memory" },
    });

    this.register({
      name: "tacticObservations",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [scalar("id", "string", { indexed: true }), scalar("campaignId", "string", { indexed: true }), scalar("segment", "string")],
      relations: [{ name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" }],
      metadata: { label: "Tactic Observations", domain: "memory" },
    });

    this.register({
      name: "playbooks",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [scalar("id", "string", { indexed: true }), scalar("campaignId", "string", { indexed: true }), scalar("segment", "string"), scalar("region", "string")],
      relations: [{ name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" }],
      metadata: { label: "Playbooks", domain: "memory" },
    });

    this.register({
      name: "memoryConsolidations",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [scalar("id", "string", { indexed: true }), scalar("campaignId", "string", { indexed: true }), scalar("createdAt", "datetime")],
      relations: [{ name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" }],
      metadata: { label: "Memory Consolidations", domain: "memory" },
    });

    this.register({
      name: "decisions",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [scalar("id", "string", { indexed: true }), scalar("campaignId", "string", { indexed: true }), scalar("createdAt", "datetime")],
      relations: [{ name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" }],
      metadata: { label: "Decisions", domain: "automation" },
    });

    this.register({
      name: "contentPacks",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [scalar("id", "string", { indexed: true }), scalar("campaignId", "string", { indexed: true }), scalar("createdAt", "datetime")],
      relations: [{ name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" }],
      metadata: { label: "Content Packs", domain: "automation" },
    });

    this.register({
      name: "automationRuns",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [scalar("id", "string", { indexed: true }), scalar("campaignId", "string", { indexed: true }), scalar("createdAt", "datetime"), scalar("status", "string")],
      relations: [{ name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" }],
      metadata: { label: "Automation Runs", domain: "automation" },
    });

    this.register({
      name: "agentRuns",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [
        scalar("id", "string", { indexed: true }),
        scalar("campaignId", "string", { indexed: true }),
        scalar("automationRunId", "string", { indexed: true }),
        scalar("agentId", "string", { indexed: true }),
        scalar("stage", "string"),
        scalar("createdAt", "datetime"),
        scalar("status", "string"),
      ],
      relations: [{ name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" }],
      metadata: { label: "Agent Runs", domain: "automation" },
    });

    this.register({
      name: "prospectingRuns",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [
        scalar("id", "string", { indexed: true }),
        scalar("campaignId", "string", { indexed: true }),
        scalar("createdAt", "datetime"),
        scalar("reason", "string"),
        scalar("generatedCandidates", "number"),
      ],
      relations: [{ name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" }],
      metadata: { label: "Prospecting Runs", domain: "outreach" },
    });

    this.register({
      name: "sourcedContacts",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [
        scalar("id", "string", { indexed: true }),
        scalar("campaignId", "string", { indexed: true }),
        scalar("targetId", "string", { indexed: true }),
        scalar("company", "string"),
        scalar("fullName", "string"),
        scalar("title", "string"),
        scalar("email", "string"),
        scalar("contactStatus", "string"),
        scalar("complianceStatus", "string"),
        scalar("enrichmentStatus", "string"),
        scalar("verificationStatus", "string"),
        scalar("sequenceStatus", "string"),
        scalar("createdAt", "datetime"),
      ],
      relations: [{ name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" }],
      metadata: { label: "Sourced Contacts", domain: "outreach" },
    });

    this.register({
      name: "activationRuns",
      source: { type: "store", live: true },
      primaryKey: "id",
      fields: [
        scalar("id", "string", { indexed: true }),
        scalar("campaignId", "string", { indexed: true }),
        scalar("action", "string"),
        scalar("status", "string"),
        scalar("processedContacts", "number"),
        scalar("createdAt", "datetime"),
      ],
      relations: [{ name: "campaign", type: "one", collection: "campaigns", localField: "campaignId", foreignField: "id" }],
      metadata: { label: "Activation Runs", domain: "outreach" },
    });

    this.register({
      name: "connectorConfigs",
      source: { type: "store", live: false },
      primaryKey: "connector",
      fields: [scalar("connector", "string", { indexed: true }), scalar("baseUrl", "string"), scalar("dryRun", "boolean"), scalar("updatedAt", "datetime")],
      relations: [],
      metadata: { label: "Connector Configs", domain: "connectors" },
    });

    this.register({
      name: "openclawRemote",
      source: {
        type: "connector",
        connector: "openclaw",
        auth: "bearer",
        queryPath: "/query",
        live: false,
      },
      primaryKey: "id",
      fields: [scalar("id", "string"), scalar("name", "string"), scalar("status", "string")],
      relations: [],
      metadata: { label: "OpenClaw Remote", domain: "connectors", remote: true },
    });

    this.register({
      name: "clawdbotRemote",
      source: {
        type: "connector",
        connector: "clawdbot",
        auth: "bearer",
        queryPath: "/query",
        live: false,
      },
      primaryKey: "id",
      fields: [scalar("id", "string"), scalar("name", "string"), scalar("status", "string")],
      relations: [],
      metadata: { label: "ClawDBot Remote", domain: "connectors", remote: true },
    });
  }
}
