import { EventEmitter } from "node:events";
import { createStateBackend } from "./state-backend.mjs";

/**
 * Entity classes modeled after GHL's Firestore entity model.
 * Provides structured data with relationships, timestamps, and validation.
 */
export class Entity {
  constructor(data = {}) {
    this.id = data.id || crypto.randomUUID();
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || this.createdAt;
    Object.assign(this, data);
  }

  toJSON() {
    const obj = { ...this };
    return obj;
  }

  patch(data) {
    Object.assign(this, data);
    this.updatedAt = new Date().toISOString();
  }
}

export class Contact extends Entity {
  static collection = "contacts";

  constructor(data = {}) {
    super(data);
    this.locationId = data.locationId || "";
    this.companyName = data.companyName || "";
    this.fullName = data.fullName || "";
    this.firstName = data.firstName || "";
    this.lastName = data.lastName || "";
    this.email = (data.email || "").toLowerCase();
    this.phone = data.phone || "";
    this.website = data.website || "";
    this.linkedinUrl = data.linkedinUrl || "";
    this.city = data.city || "";
    this.state = data.state || "";
    this.country = data.country || "";
    this.tags = data.tags || [];
    this.customFields = data.customFields || {};
    this.dnd = data.dnd || false;
    this.campaignIds = data.campaignIds || [];
    this.enrichmentStatus = data.enrichmentStatus || "pending";
    this.verificationStatus = data.verificationStatus || "pending";
    this.sequenceStatus = data.sequenceStatus || "unplanned";
  }
}

export class Pipeline extends Entity {
  static collection = "pipelines";

  constructor(data = {}) {
    super(data);
    this.locationId = data.locationId || "";
    this.name = data.name || "";
    this.stages = data.stages || [];
    this.showInFunnel = data.showInFunnel !== false;
  }

  addStage(stage) {
    this.stages.push({ id: crypto.randomUUID(), ...stage, order: this.stages.length });
    this.updatedAt = new Date().toISOString();
  }
}

export class Opportunity extends Entity {
  static collection = "opportunities";

  constructor(data = {}) {
    super(data);
    this.locationId = data.locationId || "";
    this.pipelineId = data.pipelineId || "";
    this.pipelineStageId = data.pipelineStageId || "";
    this.contactId = data.contactId || "";
    this.campaignId = data.campaignId || "";
    this.name = data.name || "";
    this.status = data.status || "open";
    this.monetaryValue = data.monetaryValue || 0;
    this.currency = data.currency || "USD";
    this.source = data.source || "";
    this.customFields = data.customFields || {};
    this.assignedTo = data.assignedTo || "";
    this.notes = data.notes || "";
    this.lostReason = data.lostReason || "";
  }
}

export class WorkflowStep extends Entity {
  static collection = "workflowSteps";

  constructor(data = {}) {
    super(data);
    this.workflowId = data.workflowId || "";
    this.type = data.type || "delay";
    this.order = data.order || 0;
    this.config = data.config || {};
    this.branches = data.branches || [];
    this.parentStepId = data.parentStepId || null;
  }
}

export class Workflow extends Entity {
  static collection = "workflows";

  constructor(data = {}) {
    super(data);
    this.locationId = data.locationId || "";
    this.name = data.name || "";
    this.description = data.description || "";
    this.status = data.status || "draft";
    this.triggerType = data.triggerType || "manual";
    this.triggerConfig = data.triggerConfig || {};
    this.stepIds = data.stepIds || [];
    this.publishedVersion = data.publishedVersion || null;
    this.campaignId = data.campaignId || "";
  }
}

export class Note extends Entity {
  static collection = "notes";

  constructor(data = {}) {
    super(data);
    this.contactId = data.contactId || "";
    this.campaignId = data.campaignId || "";
    this.body = data.body || "";
    this.author = data.author || "";
    this.pinned = data.pinned || false;
  }
}

export class Task extends Entity {
  static collection = "tasks";

  constructor(data = {}) {
    super(data);
    this.contactId = data.contactId || "";
    this.campaignId = data.campaignId || "";
    this.title = data.title || "";
    this.body = data.body || "";
    this.status = data.status || "pending";
    this.priority = data.priority || "medium";
    this.dueDate = data.dueDate || null;
    this.assignedTo = data.assignedTo || "";
    this.completedAt = data.completedAt || null;
  }
}

export class CalendarEvent extends Entity {
  static collection = "calendarEvents";

  constructor(data = {}) {
    super(data);
    this.contactId = data.contactId || "";
    this.campaignId = data.campaignId || "";
    this.title = data.title || "";
    this.description = data.description || "";
    this.startTime = data.startTime || "";
    this.endTime = data.endTime || "";
    this.status = data.status || "scheduled";
    this.location = data.location || "";
    this.meetingLink = data.meetingLink || "";
  }
}

export class Tag extends Entity {
  static collection = "tags";

  constructor(data = {}) {
    super(data);
    this.locationId = data.locationId || "";
    this.name = data.name || "";
    this.color = data.color || "#6366f1";
    this.contactCount = data.contactCount || 0;
  }
}

const defaultState = () => ({
  campaigns: {},
  connectorConfigs: {},
  analyticsEvents: [],
  researchRecords: [],
  outreachEvents: [],
  targetProfiles: [],
  tacticObservations: [],
  playbooks: [],
  memoryConsolidations: [],
  decisions: [],
  contentPacks: [],
  automationRuns: [],
  agentRuns: [],
  prospectingRuns: [],
  sourcedContacts: [],
  activationRuns: [],
  investorRecords: [],
  fundingOutreachEvents: [],
  fundingRuns: [],
  executionReceipts: [],
  /** Collection-based entity storage (mirrors GHL Firestore collections) */
  collections: {
    contacts: {},
    pipelines: {},
    opportunities: {},
    workflows: {},
    workflowSteps: {},
    workflowVersions: {},
    workflowExecutions: {},
    triggers: {},
    triggerStatus: {},
    notes: {},
    tasks: {},
    calendarEvents: {},
    tags: {},
    funnels: {},
    funnelSteps: {},
    funnelSubmissions: {},
    messageTemplates: {},
    messageSequences: {},
  },
});

export class Store {
  constructor(fileUrl, options = {}) {
    this.fileUrl = fileUrl;
    this.seedFileUrl = options.seedFileUrl || null;
    this.backend = options.backend || createStateBackend({
      fileUrl,
      seedFileUrl: this.seedFileUrl,
      databaseUrl: options.databaseUrl,
      stateBackend: options.stateBackend,
      postgresSchema: options.postgresSchema,
      postgresTable: options.postgresTable,
      postgresStateKey: options.postgresStateKey,
    });
    this.state = defaultState();
    this.events = new EventEmitter();
    this.sequence = 0;
    this._persistTimer = null;
    this._persistPromise = null;
    this._persistDebounceMs = options.persistDebounceMs ?? 500;
    this._maxEventsPerCollection = options.maxEventsPerCollection ?? 50_000;
    this._indexes = new Map();
  }

  async init() {
    this.state = await this.backend.load(defaultState);
    return this;
  }

  async persist() {
    if (this._persistTimer) {
      clearTimeout(this._persistTimer);
    }
    return new Promise((resolve, reject) => {
      this._persistTimer = setTimeout(async () => {
        try {
          this._compactEventArrays();
          await this.backend.save(this.state);
          this._persistPromise = null;
          resolve();
        } catch (err) {
          this._persistPromise = null;
          reject(err);
        }
      }, this._persistDebounceMs);
      this._persistPromise ??= new Promise((res) => {
        const orig = this._persistTimer;
        const check = setInterval(() => {
          if (this._persistTimer !== orig) {
            clearInterval(check);
            res();
          }
        }, 10);
      });
    });
  }

  /** Trim the oldest events when a collection exceeds maxEventsPerCollection */
  _compactEventArrays() {
    for (const key of Object.keys(this.state)) {
      if (Array.isArray(this.state[key]) && this.state[key].length > this._maxEventsPerCollection) {
        this.state[key] = this.state[key].slice(-this._maxEventsPerCollection);
      }
    }
  }

  /** Force an immediate synchronous persist (bypasses debounce). Use on shutdown. */
  flushSync() {
    if (this._persistTimer) {
      clearTimeout(this._persistTimer);
      this._persistTimer = null;
    }
    this._compactEventArrays();
    return this.backend.flush(this.state);
  }

  emitChange(collection, operation, payload = {}) {
    const event = {
      id: ++this.sequence,
      collection,
      operation,
      timestamp: new Date().toISOString(),
      ...payload,
    };
    this.events.emit("change", event);
    return event;
  }

  subscribe(listener) {
    this.events.on("change", listener);
    return () => this.events.off("change", listener);
  }

  getCollection(name) {
    const value = this.state[name];
    if (Array.isArray(value)) {
      return [...value];
    }
    if (value && typeof value === "object") {
      return Object.values(value);
    }
    return [];
  }

  listCampaigns() {
    return Object.values(this.state.campaigns);
  }

  getCampaign(campaignId) {
    return this.state.campaigns[campaignId] || null;
  }

  async upsertCampaign(campaign) {
    const current = this.getCampaign(campaign.id);
    this.state.campaigns[campaign.id] = {
      createdAt: current?.createdAt || new Date().toISOString(),
      ...current,
      ...campaign,
      lastUpdatedAt: new Date().toISOString(),
    };
    await this.persist();
    this.emitChange("campaigns", current ? "update" : "insert", {
      item: this.state.campaigns[campaign.id],
      key: campaign.id,
    });
    return this.state.campaigns[campaign.id];
  }

  listConnectorConfigs() {
    return { ...this.state.connectorConfigs };
  }

  getConnectorConfig(connectorName) {
    return this.state.connectorConfigs[connectorName] || null;
  }

  async upsertConnectorConfig(connectorName, config) {
    this.state.connectorConfigs[connectorName] = {
      ...this.getConnectorConfig(connectorName),
      ...config,
      connector: connectorName,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    this.emitChange("connectorConfigs", "upsert", {
      item: this.state.connectorConfigs[connectorName],
      key: connectorName,
    });
    return this.state.connectorConfigs[connectorName];
  }

  listEvents(campaignId) {
    if (!campaignId) {
      return [...this.state.analyticsEvents];
    }
    return this.state.analyticsEvents.filter(event => event.campaignId === campaignId);
  }

  async addEvent(event) {
    this.state.analyticsEvents.push(event);
    await this.persist();
    this.emitChange("analyticsEvents", "insert", { item: event });
    return event;
  }

  listResearchRecords(campaignId) {
    if (!campaignId) {
      return [...this.state.researchRecords];
    }
    return this.state.researchRecords.filter(record => record.campaignId === campaignId);
  }

  async addResearchRecord(record) {
    this.state.researchRecords.push(record);
    await this.persist();
    this.emitChange("researchRecords", "insert", { item: record });
    return record;
  }

  listOutreachEvents(campaignId, targetId) {
    return this.state.outreachEvents.filter(event => {
      if (campaignId && event.campaignId !== campaignId) {
        return false;
      }
      if (targetId && event.targetId !== targetId) {
        return false;
      }
      return true;
    });
  }

  async addOutreachEvent(event) {
    this.state.outreachEvents.push(event);
    await this.persist();
    this.emitChange("outreachEvents", "insert", { item: event });
    return event;
  }

  listTargetProfiles(campaignId) {
    if (!campaignId) {
      return [...this.state.targetProfiles];
    }
    return this.state.targetProfiles.filter(profile => profile.campaignId === campaignId);
  }

  async replaceTargetProfiles(campaignId, profiles) {
    this.state.targetProfiles = this.state.targetProfiles.filter(profile => profile.campaignId !== campaignId);
    this.state.targetProfiles.push(...profiles);
    await this.persist();
    this.emitChange("targetProfiles", "replace", { campaignId, count: profiles.length });
    return profiles;
  }

  listTacticObservations(campaignId) {
    if (!campaignId) {
      return [...this.state.tacticObservations];
    }
    return this.state.tacticObservations.filter(observation => observation.campaignId === campaignId);
  }

  async replaceTacticObservations(campaignId, observations) {
    this.state.tacticObservations = this.state.tacticObservations.filter(observation => observation.campaignId !== campaignId);
    this.state.tacticObservations.push(...observations);
    await this.persist();
    this.emitChange("tacticObservations", "replace", { campaignId, count: observations.length });
    return observations;
  }

  listPlaybooks(campaignId) {
    if (!campaignId) {
      return [...this.state.playbooks];
    }
    return this.state.playbooks.filter(playbook => playbook.campaignId === campaignId);
  }

  async replacePlaybooks(campaignId, playbooks) {
    this.state.playbooks = this.state.playbooks.filter(playbook => playbook.campaignId !== campaignId);
    this.state.playbooks.push(...playbooks);
    await this.persist();
    this.emitChange("playbooks", "replace", { campaignId, count: playbooks.length });
    return playbooks;
  }

  listMemoryConsolidations(campaignId) {
    if (!campaignId) {
      return [...this.state.memoryConsolidations];
    }
    return this.state.memoryConsolidations.filter(snapshot => snapshot.campaignId === campaignId);
  }

  async addMemoryConsolidation(snapshot) {
    this.state.memoryConsolidations.push(snapshot);
    await this.persist();
    this.emitChange("memoryConsolidations", "insert", { item: snapshot });
    return snapshot;
  }

  async addDecision(decision) {
    this.state.decisions.push(decision);
    await this.persist();
    this.emitChange("decisions", "insert", { item: decision });
    return decision;
  }

  listDecisions(campaignId) {
    if (!campaignId) {
      return [...this.state.decisions];
    }
    return this.state.decisions.filter(decision => decision.campaignId === campaignId);
  }

  async addContentPack(contentPack) {
    this.state.contentPacks.push(contentPack);
    await this.persist();
    this.emitChange("contentPacks", "insert", { item: contentPack });
    return contentPack;
  }

  listContentPacks(campaignId) {
    if (!campaignId) {
      return [...this.state.contentPacks];
    }
    return this.state.contentPacks.filter(pack => pack.campaignId === campaignId);
  }

  getLatestContentPack(campaignId) {
    return this.listContentPacks(campaignId).at(-1) || null;
  }

  async addAutomationRun(run) {
    this.state.automationRuns.push(run);
    await this.persist();
    this.emitChange("automationRuns", "insert", { item: run });
    return run;
  }

  listAutomationRuns(campaignId) {
    if (!campaignId) {
      return [...this.state.automationRuns];
    }
    return this.state.automationRuns.filter(run => run.campaignId === campaignId);
  }

  async addAgentRun(run) {
    this.state.agentRuns.push(run);
    await this.persist();
    this.emitChange("agentRuns", "insert", { item: run });
    return run;
  }

  async addAgentRuns(runs) {
    this.state.agentRuns.push(...runs);
    await this.persist();
    this.emitChange("agentRuns", "insertMany", { count: runs.length, items: runs });
    return runs;
  }

  listAgentRuns(campaignId) {
    if (!campaignId) {
      return [...this.state.agentRuns];
    }
    return this.state.agentRuns.filter(run => run.campaignId === campaignId);
  }

  async addProspectingRun(run) {
    this.state.prospectingRuns.push(run);
    await this.persist();
    this.emitChange("prospectingRuns", "insert", { item: run });
    return run;
  }

  listProspectingRuns(campaignId) {
    if (!campaignId) {
      return [...this.state.prospectingRuns];
    }
    return this.state.prospectingRuns.filter(run => run.campaignId === campaignId);
  }

  async addSourcedContact(contact) {
    this.state.sourcedContacts.push(contact);
    await this.persist();
    this.emitChange("sourcedContacts", "insert", { item: contact });
    return contact;
  }

  async addSourcedContacts(contacts) {
    this.state.sourcedContacts.push(...contacts);
    await this.persist();
    this.emitChange("sourcedContacts", "insertMany", { count: contacts.length, items: contacts });
    return contacts;
  }

  async updateSourcedContacts(campaignId, updates = []) {
    const nextById = new Map(updates.map(item => [item.id, item]));
    let changed = 0;
    this.state.sourcedContacts = this.state.sourcedContacts.map(contact => {
      if (contact.campaignId !== campaignId) {
        return contact;
      }
      const patch = nextById.get(contact.id);
      if (!patch) {
        return contact;
      }
      changed += 1;
      return {
        ...contact,
        ...patch,
      };
    });
    await this.persist();
    this.emitChange("sourcedContacts", "updateMany", { campaignId, count: changed, items: updates });
    return this.listSourcedContacts(campaignId);
  }

  listSourcedContacts(campaignId) {
    if (!campaignId) {
      return [...this.state.sourcedContacts];
    }
    return this.state.sourcedContacts.filter(contact => contact.campaignId === campaignId);
  }

  async addActivationRun(run) {
    this.state.activationRuns.push(run);
    await this.persist();
    this.emitChange("activationRuns", "insert", { item: run });
    return run;
  }

  listActivationRuns(campaignId) {
    if (!campaignId) {
      return [...this.state.activationRuns];
    }
    return this.state.activationRuns.filter(run => run.campaignId === campaignId);
  }

  listInvestorRecords(campaignId) {
    if (!campaignId) {
      return [...this.state.investorRecords];
    }
    return this.state.investorRecords.filter(record => record.campaignId === campaignId);
  }

  async addInvestorRecords(records = []) {
    this.state.investorRecords.push(...records);
    await this.persist();
    this.emitChange("investorRecords", "insertMany", { count: records.length, items: records });
    return records;
  }

  async updateInvestorRecord(campaignId, investorId, patch) {
    const idx = this.state.investorRecords.findIndex(r => r.campaignId === campaignId && r.id === investorId);
    if (idx === -1) return null;
    const updated = { ...this.state.investorRecords[idx], ...patch, updatedAt: new Date().toISOString() };
    this.state.investorRecords[idx] = updated;
    await this.persist();
    this.emitChange("investorRecords", "update", { id: investorId, diff: patch });
    return updated;
  }

  listFundingOutreachEvents(campaignId) {
    if (!campaignId) {
      return [...this.state.fundingOutreachEvents];
    }
    return this.state.fundingOutreachEvents.filter(event => event.campaignId === campaignId);
  }

  async addFundingOutreachEvents(events = []) {
    this.state.fundingOutreachEvents.push(...events);
    await this.persist();
    this.emitChange("fundingOutreachEvents", "insertMany", { count: events.length, items: events });
    return events;
  }

  listFundingRuns(campaignId) {
    if (!campaignId) {
      return [...this.state.fundingRuns];
    }
    return this.state.fundingRuns.filter(run => run.campaignId === campaignId);
  }

  async addFundingRun(run) {
    this.state.fundingRuns.push(run);
    await this.persist();
    this.emitChange("fundingRuns", "insert", { item: run });
    return run;
  }

  listExecutionReceipts(filters = {}) {
    const {
      campaignId = null,
      executionType = null,
      status = null,
      idempotencyKey = null,
    } = filters;
    return this.state.executionReceipts.filter(receipt => {
      if (campaignId && receipt.campaignId !== campaignId) return false;
      if (executionType && receipt.executionType !== executionType) return false;
      if (status && receipt.status !== status) return false;
      if (idempotencyKey && receipt.idempotencyKey !== idempotencyKey) return false;
      return true;
    });
  }

  getExecutionReceipt(receiptId) {
    return this.state.executionReceipts.find(receipt => receipt.id === receiptId) || null;
  }

  async addExecutionReceipt(receipt) {
    this.state.executionReceipts.push(receipt);
    await this.persist();
    this.emitChange("executionReceipts", "insert", { item: receipt });
    return receipt;
  }

  async updateExecutionReceipt(receiptId, patch) {
    const index = this.state.executionReceipts.findIndex(receipt => receipt.id === receiptId);
    if (index === -1) {
      return null;
    }
    const updated = {
      ...this.state.executionReceipts[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.state.executionReceipts[index] = updated;
    await this.persist();
    this.emitChange("executionReceipts", "update", { id: receiptId, diff: patch, item: updated });
    return updated;
  }

  async addDlqEntry(entry) {
    if (!this.state.deadLetterQueue) {
      this.state.deadLetterQueue = [];
    }
    this.state.deadLetterQueue.push(entry);
    await this.persist();
    this.emitChange("deadLetterQueue", "insert", { item: entry });
    return entry;
  }

  listDlqEntries(filters = {}) {
    const entries = this.state.deadLetterQueue || [];
    const { campaignId = null, runId = null, since = null } = filters;
    return entries.filter(entry => {
      if (campaignId && entry.campaignId !== campaignId) return false;
      if (runId && entry.runId !== runId) return false;
      if (since && new Date(entry.failedAt) < new Date(since)) return false;
      return true;
    });
  }

  async popDlqEntry(entryId) {
    const idx = (this.state.deadLetterQueue || []).findIndex(e => e.id === entryId);
    if (idx === -1) return null;
    const [entry] = this.state.deadLetterQueue.splice(idx, 1);
    await this.persist();
    this.emitChange("deadLetterQueue", "delete", { id: entryId });
    return entry;
  }

  // ── Collection-based entity methods (inspired by GHL Firestore model) ──

  /**
   * Get a document from a named collection.
   */
  getDocument(collectionName, docId) {
    const col = this.state.collections[collectionName];
    if (!col) return null;
    return col[docId] ? structuredClone(col[docId]) : null;
  }

  /**
   * List all documents in a collection, optionally filtered.
   */
  listDocuments(collectionName, filterFn) {
    const col = this.state.collections[collectionName];
    if (!col) return [];
    const docs = Object.values(col);
    return filterFn ? docs.filter(filterFn) : docs;
  }

  /**
   * Upsert a document in a named collection.
   */
  async upsertDocument(collectionName, docId, data) {
    if (!this.state.collections[collectionName]) {
      this.state.collections[collectionName] = {};
    }
    const existing = this.state.collections[collectionName][docId];
    const now = new Date().toISOString();
    const doc = {
      ...(existing || {}),
      ...data,
      id: docId,
      updatedAt: now,
      createdAt: existing?.createdAt || now,
    };
    this.state.collections[collectionName][docId] = doc;
    await this.persist();
    this.emitChange(collectionName, existing ? "update" : "insert", { key: docId, item: doc });
    this._reindex(collectionName);
    return doc;
  }

  /**
   * Delete a document from a named collection.
   */
  async deleteDocument(collectionName, docId) {
    const col = this.state.collections[collectionName];
    if (!col || !col[docId]) return false;
    const doc = col[docId];
    delete col[docId];
    await this.persist();
    this.emitChange(collectionName, "delete", { key: docId, item: doc });
    this._reindex(collectionName);
    return true;
  }

  /**
   * Query documents in a collection by field/value equality (simple index).
   */
  queryDocuments(collectionName, field, value) {
    const col = this.state.collections[collectionName];
    if (!col) return [];
    const indexKey = `${collectionName}:${field}`;
    if (this._indexes.has(indexKey)) {
      const idx = this._indexes.get(indexKey);
      const ids = idx.get(String(value));
      if (!ids) return [];
      return ids.map(id => col[id]).filter(Boolean);
    }
    // Fallback: scan
    return Object.values(col).filter(doc => doc[field] === value);
  }

  /**
   * Build index for a collection field for fast queries.
   */
  _ensureIndex(collectionName, field) {
    const indexKey = `${collectionName}:${field}`;
    if (this._indexes.has(indexKey)) return;
    const idx = new Map();
    const col = this.state.collections[collectionName];
    if (col) {
      for (const [id, doc] of Object.entries(col)) {
        const val = doc[field];
        const key = String(val);
        if (!idx.has(key)) idx.set(key, []);
        idx.get(key).push(id);
      }
    }
    this._indexes.set(indexKey, idx);
  }

  _reindex(collectionName) {
    for (const [key] of this._indexes) {
      if (key.startsWith(`${collectionName}:`)) {
        this._indexes.delete(key);
      }
    }
  }

  // ── Entity-specific convenience methods ──

  async upsertContact(contactData) {
    const id = contactData.id || contactData.contactId || `contact-${crypto.randomUUID()}`;
    const contact = new Contact(contactData);
    contact.id = id;
    return this.upsertDocument("contacts", id, contact.toJSON());
  }

  listContacts(locationId, campaignId) {
    let docs = this.listDocuments("contacts");
    if (locationId) docs = docs.filter(c => c.locationId === locationId);
    if (campaignId) docs = docs.filter(c => c.campaignIds?.includes(campaignId));
    return docs;
  }

  async upsertPipeline(pipelineData) {
    const id = pipelineData.id || `pipeline-${crypto.randomUUID()}`;
    const pipeline = new Pipeline(pipelineData);
    pipeline.id = id;
    return this.upsertDocument("pipelines", id, pipeline.toJSON());
  }

  listPipelines(locationId) {
    let docs = this.listDocuments("pipelines");
    if (locationId) docs = docs.filter(p => p.locationId === locationId);
    return docs;
  }

  async upsertOpportunity(oppData) {
    const id = oppData.id || `opp-${crypto.randomUUID()}`;
    const opp = new Opportunity(oppData);
    opp.id = id;
    return this.upsertDocument("opportunities", id, opp.toJSON());
  }

  listOpportunities(campaignId, pipelineId) {
    let docs = this.listDocuments("opportunities");
    if (campaignId) docs = docs.filter(o => o.campaignId === campaignId);
    if (pipelineId) docs = docs.filter(o => o.pipelineId === pipelineId);
    return docs;
  }

  async upsertWorkflow(wfData) {
    const id = wfData.id || `workflow-${crypto.randomUUID()}`;
    const wf = new Workflow(wfData);
    wf.id = id;
    return this.upsertDocument("workflows", id, wf.toJSON());
  }

  listWorkflows(locationId, campaignId) {
    let docs = this.listDocuments("workflows");
    if (locationId) docs = docs.filter(w => w.locationId === locationId);
    if (campaignId) docs = docs.filter(w => w.campaignId === campaignId);
    return docs;
  }

  async upsertWorkflowStep(stepData) {
    const id = stepData.id || `step-${crypto.randomUUID()}`;
    const step = new WorkflowStep(stepData);
    step.id = id;
    return this.upsertDocument("workflowSteps", id, step.toJSON());
  }

  listWorkflowSteps(workflowId) {
    return this.queryDocuments("workflowSteps", "workflowId", workflowId)
      .sort((a, b) => a.order - b.order);
  }

  async upsertNote(noteData) {
    const id = noteData.id || `note-${crypto.randomUUID()}`;
    const note = new Note(noteData);
    note.id = id;
    return this.upsertDocument("notes", id, note.toJSON());
  }

  listNotes(contactId, campaignId) {
    let docs = this.listDocuments("notes");
    if (contactId) docs = docs.filter(n => n.contactId === contactId);
    if (campaignId) docs = docs.filter(n => n.campaignId === campaignId);
    return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async upsertTask(taskData) {
    const id = taskData.id || `task-${crypto.randomUUID()}`;
    const task = new Task(taskData);
    task.id = id;
    return this.upsertDocument("tasks", id, task.toJSON());
  }

  listTasks(contactId, campaignId, status) {
    let docs = this.listDocuments("tasks");
    if (contactId) docs = docs.filter(t => t.contactId === contactId);
    if (campaignId) docs = docs.filter(t => t.campaignId === campaignId);
    if (status) docs = docs.filter(t => t.status === status);
    return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async upsertCalendarEvent(eventData) {
    const id = eventData.id || `event-${crypto.randomUUID()}`;
    const event = new CalendarEvent(eventData);
    event.id = id;
    return this.upsertDocument("calendarEvents", id, event.toJSON());
  }

  listCalendarEvents(contactId, campaignId, status) {
    let docs = this.listDocuments("calendarEvents");
    if (contactId) docs = docs.filter(e => e.contactId === contactId);
    if (campaignId) docs = docs.filter(e => e.campaignId === campaignId);
    if (status) docs = docs.filter(e => e.status === status);
    return docs.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }

  async upsertTag(tagData) {
    const id = tagData.id || `tag-${crypto.randomUUID()}`;
    const tag = new Tag(tagData);
    tag.id = id;
    return this.upsertDocument("tags", id, tag.toJSON());
  }

  listTags(locationId) {
    let docs = this.listDocuments("tags");
    if (locationId) docs = docs.filter(t => t.locationId === locationId);
    return docs;
  }

  // ── Relationship traversal methods ──

  getContactOpportunities(contactId) {
    return this.queryDocuments("opportunities", "contactId", contactId);
  }

  getPipelineOpportunities(pipelineId) {
    return this.queryDocuments("opportunities", "pipelineId", pipelineId);
  }

  getWorkflowSteps(workflowId) {
    return this.listWorkflowSteps(workflowId);
  }

  getContactNotes(contactId) {
    return this.listNotes(contactId);
  }

  getContactTasks(contactId) {
    return this.listTasks(contactId);
  }

  // ── Data migration helper ──

  /**
   * Migrate flat sourcedContacts into collection-based contacts.
   */
  async migrateSourcedContacts() {
    const contacts = this.state.sourcedContacts || [];
    for (const c of contacts) {
      if (!c.id) continue;
      if (this.state.collections.contacts[c.id]) continue;
      await this.upsertContact({
        id: c.id,
        companyName: c.company || "",
        fullName: c.fullName || "",
        email: c.email || "",
        phone: c.phone || "",
        linkedinUrl: c.linkedinUrl || "",
        website: c.companyWebsite || "",
        city: c.city || "",
        state: c.state || "",
        tags: c.segment ? c.segment.split(", ") : [],
        campaignIds: c.campaignId ? [c.campaignId] : [],
        enrichmentStatus: c.enrichmentStatus || "pending",
        verificationStatus: c.verificationStatus || "pending",
        sequenceStatus: c.sequenceStatus || "unplanned",
      });
    }
    return { migrated: contacts.length };
  }

  snapshot() {
    return structuredClone(this.state);
  }
}
