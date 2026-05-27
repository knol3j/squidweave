import { Entity } from "../../lib/store.mjs";

export class MessageTemplate extends Entity {
  constructor(data = {}) {
    super(data);
    this.name = data.name || "";
    this.type = data.type || "email";
    this.subject = data.subject || "";
    this.body = data.body || "";
    this.variables = data.variables || [];
    this.category = data.category || "";
    this.campaignId = data.campaignId || "";
    this.tags = data.tags || [];
  }

  toJSON() {
    return {
      ...super.toJSON(),
      name: this.name,
      type: this.type,
      subject: this.subject,
      body: this.body,
      variables: this.variables,
      category: this.category,
      campaignId: this.campaignId,
      tags: this.tags,
    };
  }
}

export class MessageSequence extends Entity {
  constructor(data = {}) {
    super(data);
    this.name = data.name || "";
    this.description = data.description || "";
    this.steps = (data.steps || []).map(s => new MessageSequenceStep(s));
    this.triggerOn = data.triggerOn || "funnel_submission";
    this.triggerConfig = data.triggerConfig || {};
    this.campaignId = data.campaignId || "";
    this.status = data.status || "draft";
    this.tags = data.tags || [];
  }

  toJSON() {
    return {
      ...super.toJSON(),
      name: this.name,
      description: this.description,
      steps: this.steps.map(s => s.toJSON()),
      triggerOn: this.triggerOn,
      triggerConfig: this.triggerConfig,
      campaignId: this.campaignId,
      status: this.status,
      tags: this.tags,
    };
  }
}

export class MessageSequenceStep extends Entity {
  constructor(data = {}) {
    super(data);
    this.sequenceId = data.sequenceId || "";
    this.templateId = data.templateId || "";
    this.delayValue = data.delayValue ?? 0;
    this.delayUnit = data.delayUnit || "minutes";
    this.order = data.order ?? 0;
    this.conditions = data.conditions || [];
    this.enabled = data.enabled ?? true;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      sequenceId: this.sequenceId,
      templateId: this.templateId,
      delayValue: this.delayValue,
      delayUnit: this.delayUnit,
      order: this.order,
      conditions: this.conditions,
      enabled: this.enabled,
    };
  }
}
