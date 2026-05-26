const VALID_STATUSES = ["open", "won", "lost", "abandoned"];
const VALID_TRANSITIONS = {
  open: ["won", "lost", "abandoned"],
  won: [],
  lost: ["open"],
  abandoned: ["open"],
};

function validateStageTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed) return { valid: false, reason: `unknown source status "${fromStatus}"` };
  if (!allowed.includes(toStatus)) return { valid: false, reason: `cannot transition from "${fromStatus}" to "${toStatus}"` };
  return { valid: true };
}

export class PipelineEngine {
  constructor({ store }) {
    this.store = store;
  }

  getPipeline(pipelineId) {
    const doc = this.store.getDocument("pipelines", pipelineId);
    if (!doc) throw new Error(`Unknown pipeline: ${pipelineId}`);
    return new this.store.constructor.Pipeline ? Object.assign(Object.create(this.store.constructor.Pipeline.prototype), doc) : doc;
  }

  async createPipeline(data) {
    const pipeline = {
      id: data.id || crypto.randomUUID(),
      locationId: data.locationId || "",
      name: data.name || "Untitled Pipeline",
      stages: (data.stages || []).map((s, i) => ({
        id: s.id || crypto.randomUUID(),
        name: s.name || `Stage ${i + 1}`,
        order: i,
        color: s.color || "#6366f1",
        probability: s.probability ?? null,
      })),
      showInFunnel: data.showInFunnel !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.store.upsertDocument("pipelines", pipeline.id, pipeline);
    return pipeline;
  }

  async updatePipeline(pipelineId, data) {
    const pipeline = this.getPipeline(pipelineId);
    if (data.name != null) pipeline.name = data.name;
    if (data.showInFunnel != null) pipeline.showInFunnel = data.showInFunnel;
    if (data.stages) {
      pipeline.stages = data.stages.map((s, i) => ({
        id: s.id || crypto.randomUUID(),
        name: s.name || `Stage ${i + 1}`,
        order: i,
        color: s.color || "#6366f1",
        probability: s.probability ?? null,
      }));
    }
    pipeline.updatedAt = new Date().toISOString();
    await this.store.upsertDocument("pipelines", pipelineId, pipeline);
    return pipeline;
  }

  async deletePipeline(pipelineId) {
    const opportunities = this.store.listDocuments("opportunities", { pipelineId });
    if (opportunities.length > 0) {
      throw new Error(`Cannot delete pipeline "${pipelineId}": ${opportunities.length} opportunities still reference it`);
    }
    await this.store.deleteDocument("pipelines", pipelineId);
    return { deleted: true };
  }

  addStage(pipelineId, stageData) {
    const pipeline = this.getPipeline(pipelineId);
    const stage = {
      id: stageData.id || crypto.randomUUID(),
      name: stageData.name || "New Stage",
      order: pipeline.stages.length,
      color: stageData.color || "#6366f1",
      probability: stageData.probability ?? null,
    };
    pipeline.stages.push(stage);
    pipeline.updatedAt = new Date().toISOString();
    this.store.upsertDocument("pipelines", pipelineId, pipeline);
    return stage;
  }

  removeStage(pipelineId, stageId) {
    const pipeline = this.getPipeline(pipelineId);
    const idx = pipeline.stages.findIndex(s => s.id === stageId);
    if (idx === -1) throw new Error(`Stage "${stageId}" not found in pipeline "${pipelineId}"`);

    const stageOpportunities = this.store.listDocuments("opportunities", { pipelineStageId: stageId });
    if (stageOpportunities.length > 0) {
      throw new Error(`Cannot remove stage "${stageId}": ${stageOpportunities.length} opportunities in it`);
    }

    pipeline.stages.splice(idx, 1);
    pipeline.stages.forEach((s, i) => { s.order = i; });
    pipeline.updatedAt = new Date().toISOString();
    this.store.upsertDocument("pipelines", pipelineId, pipeline);
    return { removed: true };
  }

  reorderStages(pipelineId, stageIds) {
    const pipeline = this.getPipeline(pipelineId);
    const stageMap = new Map(pipeline.stages.map(s => [s.id, s]));
    const reordered = stageIds.map((id, i) => {
      const stage = stageMap.get(id);
      if (!stage) throw new Error(`Stage "${id}" not found`);
      return { ...stage, order: i };
    });
    pipeline.stages = reordered;
    pipeline.updatedAt = new Date().toISOString();
    this.store.upsertDocument("pipelines", pipelineId, pipeline);
    return pipeline.stages;
  }

  async getOpportunity(opportunityId) {
    const doc = this.store.getDocument("opportunities", opportunityId);
    if (!doc) throw new Error(`Unknown opportunity: ${opportunityId}`);
    return doc;
  }

  async createOpportunity(data) {
    const opportunity = {
      id: data.id || crypto.randomUUID(),
      locationId: data.locationId || "",
      pipelineId: data.pipelineId || "",
      pipelineStageId: data.pipelineStageId || "",
      contactId: data.contactId || "",
      campaignId: data.campaignId || "",
      name: data.name || "Untitled Opportunity",
      status: data.status || "open",
      monetaryValue: data.monetaryValue || 0,
      currency: data.currency || "USD",
      source: data.source || "",
      customFields: data.customFields || {},
      assignedTo: data.assignedTo || "",
      notes: data.notes || "",
      lostReason: data.lostReason || "",
      stageHistory: data.stageHistory || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.store.upsertDocument("opportunities", opportunity.id, opportunity);
    return opportunity;
  }

  async updateOpportunity(opportunityId, data) {
    const opp = await this.getOpportunity(opportunityId);
    if (data.name != null) opp.name = data.name;
    if (data.monetaryValue != null) opp.monetaryValue = data.monetaryValue;
    if (data.currency != null) opp.currency = data.currency;
    if (data.assignedTo != null) opp.assignedTo = data.assignedTo;
    if (data.notes != null) opp.notes = data.notes;
    if (data.lostReason != null) opp.lostReason = data.lostReason;
    if (data.customFields != null) opp.customFields = { ...opp.customFields, ...data.customFields };
    if (data.contactId != null) opp.contactId = data.contactId;
    if (data.pipelineId != null) opp.pipelineId = data.pipelineId;
    opp.updatedAt = new Date().toISOString();
    await this.store.upsertDocument("opportunities", opportunityId, opp);
    return opp;
  }

  async transitionOpportunity(opportunityId, toStatus, options = {}) {
    const opp = await this.getOpportunity(opportunityId);
    const fromStatus = opp.status;
    const validation = validateStageTransition(fromStatus, toStatus);
    if (!validation.valid) throw new Error(validation.reason);

    const entry = {
      from: fromStatus,
      to: toStatus,
      timestamp: new Date().toISOString(),
      reason: options.reason || "",
      by: options.by || "system",
    };
    opp.stageHistory = [...(opp.stageHistory || []), entry];
    opp.status = toStatus;
    if (toStatus === "lost") opp.lostReason = options.lostReason || opp.lostReason || "";
    if (toStatus === "won") opp.lostReason = "";
    if (toStatus === "lost" || toStatus === "won") opp.pipelineStageId = options.pipelineStageId || opp.pipelineStageId || "";

    if (options.pipelineStageId) {
      opp.pipelineStageId = options.pipelineStageId;
    }

    opp.updatedAt = new Date().toISOString();
    await this.store.upsertDocument("opportunities", opportunityId, opp);
    return opp;
  }

  async deleteOpportunity(opportunityId) {
    await this.store.deleteDocument("opportunities", opportunityId);
    return { deleted: true };
  }

  async listOpportunities(filters = {}) {
    return this.store.listDocuments("opportunities", filters);
  }

  getPipelineStats(pipelineId) {
    const pipeline = this.getPipeline(pipelineId);
    const opportunities = this.store.listDocuments("opportunities", { pipelineId });
    const totalValue = opportunities.reduce((sum, o) => sum + (o.monetaryValue || 0), 0);

    const stageStats = pipeline.stages.map(stage => {
      const stageOpps = opportunities.filter(o => o.pipelineStageId === stage.id);
      const stageValue = stageOpps.reduce((sum, o) => sum + (o.monetaryValue || 0), 0);
      return {
        stageId: stage.id,
        stageName: stage.name,
        order: stage.order,
        opportunityCount: stageOpps.length,
        totalValue: stageValue,
        wonCount: stageOpps.filter(o => o.status === "won").length,
        lostCount: stageOpps.filter(o => o.status === "lost").length,
      };
    });

    return {
      pipelineId,
      pipelineName: pipeline.name,
      totalOpportunities: opportunities.length,
      totalValue,
      openValue: opportunities.filter(o => o.status === "open").reduce((sum, o) => sum + (o.monetaryValue || 0), 0),
      wonCount: opportunities.filter(o => o.status === "won").length,
      lostCount: opportunities.filter(o => o.status === "lost").length,
      abandonedCount: opportunities.filter(o => o.status === "abandoned").length,
      stages: stageStats,
    };
  }

  async bulkTransition(opportunityIds, toStatus, options = {}) {
    const results = [];
    for (const id of opportunityIds) {
      try {
        const result = await this.transitionOpportunity(id, toStatus, options);
        results.push({ id, status: "ok", result });
      } catch (err) {
        results.push({ id, status: "error", error: err.message });
      }
    }
    return results;
  }

  async assignOpportunity(opportunityId, assignee) {
    return this.updateOpportunity(opportunityId, { assignedTo: assignee });
  }

  async getContactPipelineSummary(contactId) {
    const opportunities = this.store.listDocuments("opportunities", { contactId });
    return {
      contactId,
      totalOpportunities: opportunities.length,
      openCount: opportunities.filter(o => o.status === "open").length,
      wonCount: opportunities.filter(o => o.status === "won").length,
      lostCount: opportunities.filter(o => o.status === "lost").length,
      totalValue: opportunities.reduce((sum, o) => sum + (o.monetaryValue || 0), 0),
      wonValue: opportunities.filter(o => o.status === "won").reduce((sum, o) => sum + (o.monetaryValue || 0), 0),
      opportunities: opportunities.map(o => ({
        id: o.id, name: o.name, status: o.status, pipelineId: o.pipelineId,
        monetaryValue: o.monetaryValue, currency: o.currency,
      })),
    };
  }
}
