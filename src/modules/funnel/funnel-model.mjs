import { Entity } from "../../lib/store.mjs";

export class Funnel extends Entity {
  constructor(data = {}) {
    super(data);
    this.name = data.name || "";
    this.description = data.description || "";
    this.steps = data.steps || [];
    this.settings = {
      theme: data.settings?.theme || "light",
      redirectUrl: data.settings?.redirectUrl || "",
      submitCta: data.settings?.submitCta || "Submit",
      brandColor: data.settings?.brandColor || "#2563eb",
      logoUrl: data.settings?.logoUrl || "",
      ...data.settings,
    };
    this.published = data.published ?? false;
    this.locationId = data.locationId || "";
    this.campaignId = data.campaignId || "";
    this.tags = data.tags || [];
    this.workflowId = data.workflowId || "";
  }

  toJSON() {
    return {
      ...super.toJSON(),
      name: this.name,
      description: this.description,
      steps: this.steps,
      settings: this.settings,
      published: this.published,
      locationId: this.locationId,
      campaignId: this.campaignId,
      tags: this.tags,
      workflowId: this.workflowId,
    };
  }
}

export class FunnelStep extends Entity {
  constructor(data = {}) {
    super(data);
    this.funnelId = data.funnelId || "";
    this.type = data.type || "question";
    this.order = data.order ?? 0;
    this.title = data.title || "";
    this.description = data.description || "";
    this.required = data.required ?? true;
    this.placeholder = data.placeholder || "";
    this.fields = data.fields || [];
    this.choices = data.choices || [];
    this.nextStepMap = data.nextStepMap || {};
    this.imageUrl = data.imageUrl || "";
  }

  toJSON() {
    return {
      ...super.toJSON(),
      funnelId: this.funnelId,
      type: this.type,
      order: this.order,
      title: this.title,
      description: this.description,
      required: this.required,
      placeholder: this.placeholder,
      fields: this.fields,
      choices: this.choices,
      nextStepMap: this.nextStepMap,
      imageUrl: this.imageUrl,
    };
  }
}

export class FunnelSubmission extends Entity {
  constructor(data = {}) {
    super(data);
    this.funnelId = data.funnelId || "";
    this.answers = data.answers || [];
    this.contact = {
      name: data.contact?.name || "",
      email: data.contact?.email || "",
      phone: data.contact?.phone || "",
      ...(data.contact || {}),
    };
    this.contactId = data.contactId || "";
    this.opportunityId = data.opportunityId || "";
    this.pipelineId = data.pipelineId || "";
    this.pipelineStageId = data.pipelineStageId || "";
    this.completedAt = data.completedAt || new Date().toISOString();
    this.source = data.source || "funnel";
    this.metadata = data.metadata || {};
  }

  toJSON() {
    return {
      ...super.toJSON(),
      funnelId: this.funnelId,
      answers: this.answers,
      contact: this.contact,
      contactId: this.contactId,
      opportunityId: this.opportunityId,
      pipelineId: this.pipelineId,
      pipelineStageId: this.pipelineStageId,
      completedAt: this.completedAt,
      source: this.source,
      metadata: this.metadata,
    };
  }
}
