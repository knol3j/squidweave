import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
});

export class Store {
  constructor(fileUrl, options = {}) {
    this.fileUrl = fileUrl;
    this.seedFileUrl = options.seedFileUrl || null;
    this.state = defaultState();
    this.events = new EventEmitter();
    this.sequence = 0;
    this._persistTimer = null;
    this._persistPromise = null;
    this._persistDebounceMs = options.persistDebounceMs ?? 500;
    this._maxEventsPerCollection = options.maxEventsPerCollection ?? 50_000;
  }

  async init() {
    await mkdir(dirname(fileURLToPath(this.fileUrl)), { recursive: true });
    try {
      const raw = await readFile(this.fileUrl, "utf8");
      this.state = { ...defaultState(), ...JSON.parse(raw) };
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      if (this.seedFileUrl) {
        await copyFile(this.seedFileUrl, this.fileUrl);
        const raw = await readFile(this.fileUrl, "utf8");
        this.state = { ...defaultState(), ...JSON.parse(raw) };
        return this;
      }
      await this.persist();
    }
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
          await writeFile(this.fileUrl, JSON.stringify(this.state, null, 2));
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
    writeFile(this.fileUrl, JSON.stringify(this.state, null, 2));
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

  snapshot() {
    return structuredClone(this.state);
  }
}
