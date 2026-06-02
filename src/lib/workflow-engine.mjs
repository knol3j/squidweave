const WORKFLOW_STATUSES = ["draft", "published", "archived"];

const TRIGGER_TYPES = {
  FACEBOOK_LEAD_ADD: "facebook_lead_add",
  CUSTOMER_REPLY: "customer_reply",
  CUSTOMER_BOOKED_APPOINTMENT: "customer_appointment",
  CUSTOMER_BOOKED_APPOINTMENT_V3: "customer_appointment_v3",
  PIPELINE_STAGE_UPDATED: "pipeline_stage_updated",
  CAMPAIGN_ADDED: "added_to_campaign",
  OPPORTUNITY_DECAY: "opportunity_decay",
  APPOINTMENT: "appointment",
  APPOINTMENT_V3: "appointment_v3",
  TRIGGER_LINK: "trigger_link",
  FORM_SUBMISSION: "form_submission",
  CONTACT_TAG: "contact_tag",
  OPPORTUNITY_STATUS_CHANGED: "opportunity_status_changed",
  FACEBOOK_LEAD_GEN: "facebook_lead_gen",
  BIRTHDAY_REMINDER: "birthday_reminder",
  CUSTOM_DATE_REMINDER: "custom_date_reminder",
  MAILGUN_EMAIL_EVENT: "mailgun_email_event",
  DND_CONTACT: "dnd_contact",
  TASK_DUE_DATE_REMINDER: "task_due_date_reminder",
  TWO_STEP_ORDER_FORM: "two_step_form_submission",
  CALL_STATUS: "call_status",
  SURVEY_SUBMISSION: "survey_submission",
  PRODUCT_ACCESS_GRANTED: "product_access_granted",
  PRODUCT_ACCESS_REMOVED: "product_access_removed",
  USER_LOG_IN: "user_log_in",
  PRODUCT_COMPLETED: "product_completed",
  PRODUCT_PROGRESS_PERCENTAGE: "product_progress_percentage",
  MEMBERSHIP_CONTACT_CREATED: "membership_contact_created",
  TASK_ADDED: "task_added",
  VALIDATION_ERROR: "validation_error",
  OFFER_ACCESS_GRANTED: "offer_access_granted",
  OFFER_ACCESS_REMOVED: "offer_access_removed",
  FUNNEL_SUBMISSION: "funnel_submission",
};

const STEP_TYPES = {
  CONDITION: "condition",
  BRANCH: "branch",
  DELAY: "delay",
  EMAIL: "email",
  SMS: "sms",
  CALL: "call",
  VOICEMAIL: "voicemail",
  WEBHOOK: "webhook",
  TAG: "tag",
  NOTE: "note",
  TASK: "task",
  CAMPAIGN: "campaign",
  REMINDER: "reminder",
  APPOINTMENT: "appointment",
  OPPORTUNITY_UPDATE: "opportunity_update",
  REVIEW_REQUEST: "review_request",
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  ASSIGNEE: "assignee",
  FOLLOWER: "follower",
};

const MESSAGE_CHANNEL_TYPES = {
  TYPE_CALL: 1, TYPE_SMS: 2, TYPE_EMAIL: 3, TYPE_SMS_REVIEW_REQUEST: 4,
  TYPE_WEBCHAT: 5, TYPE_SMS_NO_SHOW_REQUEST: 6, TYPE_CAMPAIGN_SMS: 7,
  TYPE_CAMPAIGN_CALL: 8, TYPE_CAMPAIGN_EMAIL: 9, TYPE_CAMPAIGN_VOICEMAIL: 10,
  TYPE_FACEBOOK: 11, TYPE_CAMPAIGN_FACEBOOK: 12, TYPE_CAMPAIGN_MANUAL_CALL: 13,
  TYPE_CAMPAIGN_MANUAL_SMS: 14, TYPE_GMB: 15, TYPE_CAMPAIGN_GMB: 16,
  TYPE_REVIEW: 17, TYPE_INSTAGRAM: 18, TYPE_WHATSAPP: 19,
  TYPE_CUSTOM_SMS: 20, TYPE_CUSTOM_EMAIL: 21, TYPE_CUSTOM_PROVIDER_SMS: 22,
  TYPE_CUSTOM_PROVIDER_EMAIL: 23, TYPE_IVR_CALL: 24, TYPE_ACTIVITY_CONTACT: 25,
  TYPE_ACTIVITY_INVOICE: 26, TYPE_ACTIVITY_PAYMENT: 27,
  TYPE_ACTIVITY_OPPORTUNITY: 28, TYPE_LIVE_CHAT: 29,
  TYPE_LIVE_CHAT_INFO_MESSAGE: 30, TYPE_ACTIVITY_APPOINTMENT: 31,
  TYPE_INFO_FACEBOOK_COMMENT: 32, TYPE_INFO_INSTAGRAM_COMMENT: 33,
  TYPE_CUSTOM_CALL: 34, TYPE_GROUP_SMS: 35, TYPE_INTERNAL_CHAT: 36,
  TYPE_INTERNAL_COMMENT: 37, TYPE_ACTIVITY_EMPLOYEE_ACTION_LOG: 38,
  TYPE_NO_SHOW: 100,
};

const EXECUTION_STATUSES = ["queued", "running", "completed", "failed", "skipped"];

function validateStep(step, index) {
  if (!step.type) return { valid: false, reason: `Step ${index}: missing type` };
  if (!Object.values(STEP_TYPES).includes(step.type)) {
    return { valid: false, reason: `Step ${index}: unknown step type "${step.type}"` };
  }
  return { valid: true };
}

export class WorkflowEngine {
  constructor({ store }) {
    this.store = store;
  }

  getWorkflow(workflowId) {
    const doc = this.store.getDocument("workflows", workflowId);
    if (!doc) throw new Error(`Unknown workflow: ${workflowId}`);
    return doc;
  }

  async createWorkflow(data) {
    const workflow = {
      id: data.id || crypto.randomUUID(),
      locationId: data.locationId || "",
      name: data.name || "Untitled Workflow",
      status: data.status || "draft",
      workflowData: data.workflowData || { steps: [] },
      originId: data.originId || "",
      folderId: data.folderId || "",
      triggerId: data.triggerId || "",
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!WORKFLOW_STATUSES.includes(workflow.status)) {
      workflow.status = "draft";
    }
    await this.store.upsertDocument("workflows", workflow.id, workflow);
    return workflow;
  }

  async updateWorkflow(workflowId, data) {
    const wf = this.getWorkflow(workflowId);
    if (data.name != null) wf.name = data.name;
    if (data.originId != null) wf.originId = data.originId;
    if (data.folderId != null) wf.folderId = data.folderId;
    if (data.triggerId != null) wf.triggerId = data.triggerId;
    if (data.workflowData != null) {
      if (!data.workflowData.steps || !Array.isArray(data.workflowData.steps)) {
        throw new Error("workflowData must contain a steps array");
      }
      for (let i = 0; i < data.workflowData.steps.length; i++) {
        const result = validateStep(data.workflowData.steps[i], i);
        if (!result.valid) throw new Error(result.reason);
      }
      wf.workflowData = data.workflowData;
    }
    wf.updatedAt = new Date().toISOString();
    await this.store.upsertDocument("workflows", workflowId, wf);
    return wf;
  }

  async deleteWorkflow(workflowId) {
    const wf = this.getWorkflow(workflowId);
    wf.deleted = true;
    wf.updatedAt = new Date().toISOString();
    await this.store.upsertDocument("workflows", workflowId, wf);
    return { deleted: true };
  }

  async publishWorkflow(workflowId) {
    const wf = this.getWorkflow(workflowId);
    if (wf.status === "published") {
      throw new Error(`Workflow "${workflowId}" is already published`);
    }

    const versionId = `${workflowId}_v${Date.now()}`;
    const version = {
      id: versionId,
      workflowId: workflowId,
      locationId: wf.locationId,
      workflowData: JSON.parse(JSON.stringify(wf.workflowData)),
      dateAdded: new Date().toISOString(),
    };
    await this.store.upsertDocument("workflowVersions", versionId, version);

    wf.status = "published";
    wf.updatedAt = new Date().toISOString();
    await this.store.upsertDocument("workflows", workflowId, wf);
    return { workflow: wf, version };
  }

  async draftWorkflow(workflowId) {
    const wf = this.getWorkflow(workflowId);
    wf.status = "draft";
    wf.updatedAt = new Date().toISOString();
    await this.store.upsertDocument("workflows", workflowId, wf);
    return wf;
  }

  async getWorkflowVersions(workflowId) {
    return this.store.listDocuments("workflowVersions", doc => doc.workflowId === workflowId);
  }

  async getLatestVersion(workflowId) {
    const versions = await this.getWorkflowVersions(workflowId);
    if (versions.length === 0) return null;
    versions.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    return versions[0];
  }

  addStep(workflowId, stepData, afterIndex) {
    const wf = this.getWorkflow(workflowId);
    if (wf.status === "published") {
      throw new Error("Cannot modify steps on a published workflow. Create a draft first.");
    }
    const steps = wf.workflowData.steps || [];
    const step = {
      id: stepData.id || crypto.randomUUID(),
      type: stepData.type || "email",
      order: afterIndex != null ? afterIndex + 1 : steps.length,
      config: stepData.config || {},
      ...stepData,
    };
    const validation = validateStep(step, step.order);
    if (!validation.valid) throw new Error(validation.reason);

    if (afterIndex != null) {
      steps.splice(afterIndex + 1, 0, step);
    } else {
      steps.push(step);
    }
    steps.forEach((s, i) => { s.order = i; });
    wf.workflowData.steps = steps;
    wf.updatedAt = new Date().toISOString();
    this.store.upsertDocument("workflows", workflowId, wf);
    return step;
  }

  removeStep(workflowId, stepId) {
    const wf = this.getWorkflow(workflowId);
    if (wf.status === "published") {
      throw new Error("Cannot modify steps on a published workflow. Create a draft first.");
    }
    const steps = wf.workflowData.steps || [];
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx === -1) throw new Error(`Step "${stepId}" not found`);
    steps.splice(idx, 1);
    steps.forEach((s, i) => { s.order = i; });
    wf.workflowData.steps = steps;
    wf.updatedAt = new Date().toISOString();
    this.store.upsertDocument("workflows", workflowId, wf);
    return { removed: true };
  }

  reorderSteps(workflowId, stepIds) {
    const wf = this.getWorkflow(workflowId);
    if (wf.status === "published") {
      throw new Error("Cannot modify steps on a published workflow. Create a draft first.");
    }
    const steps = wf.workflowData.steps || [];
    const stepMap = new Map(steps.map(s => [s.id, s]));
    const reordered = stepIds.map((id, i) => {
      const step = stepMap.get(id);
      if (!step) throw new Error(`Step "${id}" not found`);
      return { ...step, order: i };
    });
    wf.workflowData.steps = reordered;
    wf.updatedAt = new Date().toISOString();
    this.store.upsertDocument("workflows", workflowId, wf);
    return wf.workflowData.steps;
  }

  updateStep(workflowId, stepId, data) {
    const wf = this.getWorkflow(workflowId);
    if (wf.status === "published") {
      throw new Error("Cannot modify steps on a published workflow. Create a draft first.");
    }
    const steps = wf.workflowData.steps || [];
    const step = steps.find(s => s.id === stepId);
    if (!step) throw new Error(`Step "${stepId}" not found`);
    Object.assign(step, data);
    wf.updatedAt = new Date().toISOString();
    this.store.upsertDocument("workflows", workflowId, wf);
    return step;
  }

  async executeWorkflowForContact(workflowId, contactId, options = {}) {
    const wf = this.getWorkflow(workflowId);
    if (wf.status !== "published") {
      throw new Error(`Cannot execute unpublished workflow "${workflowId}"`);
    }

    const version = await this.getLatestVersion(workflowId);
    const steps = version ? version.workflowData.steps : wf.workflowData.steps;
    if (!steps || steps.length === 0) {
      return { workflowId, contactId, status: "completed", stepsExecuted: 0 };
    }

    const executionId = crypto.randomUUID();
    const execution = {
      id: executionId,
      workflowId,
      contactId,
      locationId: wf.locationId,
      status: "running",
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      results: [],
      ...options,
    };
    await this.store.upsertDocument("workflowExecutions", executionId, execution);

    let result;
    try {
      result = await this._executeSteps(steps, contactId, wf, execution, options);
    } catch (err) {
      execution.status = "failed";
      execution.error = err.message;
      execution.completedAt = new Date().toISOString();
      await this.store.upsertDocument("workflowExecutions", executionId, execution);
      throw err;
    }

    return result;
  }

  async _executeSteps(steps, contactId, wf, execution, options) {
    let currentIndex = 0;
    const results = [];
    const context = { contactId, locationId: wf.locationId, variables: options.variables || {} };

    while (currentIndex < steps.length) {
      const step = steps[currentIndex];
      execution.currentStepIndex = currentIndex;
      const stepResult = { stepId: step.id, type: step.type, startedAt: new Date().toISOString(), completedAt: null, status: "running" };

      try {
        await this._executeStep(step, context, options);
        stepResult.status = "completed";
      } catch (err) {
        stepResult.status = "failed";
        stepResult.error = err.message;
        results.push(stepResult);
        execution.results = results;
        execution.status = "failed";
        execution.error = `Step ${step.id} (${step.type}) failed: ${err.message}`;
        execution.completedAt = new Date().toISOString();
        await this.store.upsertDocument("workflowExecutions", execution.id, execution);
        return { workflowId: wf.id, contactId, status: "failed", stepsExecuted: results.length, results, error: stepResult.error };
      }

      stepResult.completedAt = new Date().toISOString();
      results.push(stepResult);

      if (step.type === STEP_TYPES.CONDITION) {
        const branchResult = this._evaluateCondition(step, context);
        if (branchResult.nextStepId) {
          const branchIndex = steps.findIndex(s => s.id === branchResult.nextStepId);
          if (branchIndex !== -1) {
            currentIndex = branchIndex;
            continue;
          }
        }
      }

      if (step.type === STEP_TYPES.DELAY) {
        const delayMs = this._getDelayMs(step);
        await this._sleep(delayMs);
      }

      currentIndex++;
    }

    execution.status = "completed";
    execution.results = results;
    execution.completedAt = new Date().toISOString();
    await this.store.upsertDocument("workflowExecutions", execution.id, execution);
    return { workflowId: wf.id, contactId, status: "completed", stepsExecuted: results.length, results };
  }

  async _executeStep(step, context, options) {
    switch (step.type) {
      case STEP_TYPES.EMAIL:
      case STEP_TYPES.SMS:
      case STEP_TYPES.CALL:
      case STEP_TYPES.VOICEMAIL:
        return this._executeCommunicationStep(step, context, options);
      case STEP_TYPES.WEBHOOK:
        return this._executeWebhookStep(step, context, options);
      case STEP_TYPES.TAG:
        return this._executeTagStep(step, context, options);
      case STEP_TYPES.NOTE:
        return this._executeNoteStep(step, context, options);
      case STEP_TYPES.TASK:
        return this._executeTaskStep(step, context, options);
      case STEP_TYPES.CAMPAIGN:
        return this._executeCampaignStep(step, context, options);
      case STEP_TYPES.OPPORTUNITY_UPDATE:
        return this._executeOpportunityStep(step, context, options);
      case STEP_TYPES.ASSIGNEE:
        return this._executeAssigneeStep(step, context, options);
      case STEP_TYPES.CONDITION:
      case STEP_TYPES.DELAY:
        return;
      default:
        if (typeof options.onUnknownStep === "function") {
          await options.onUnknownStep(step, context);
        }
    }
  }

  async _executeCommunicationStep(step, context, options) {
    if (typeof options.onCommunication === "function") {
      await options.onCommunication({
        type: step.type,
        templateId: step.config?.templateId,
        subject: step.config?.subject,
        body: step.config?.body,
        from: step.config?.from,
        contactId: context.contactId,
        locationId: context.locationId,
      });
    }
  }

  async _executeWebhookStep(step, context, options) {
    if (typeof options.onWebhook === "function") {
      await options.onWebhook({
        url: step.config?.url,
        method: step.config?.method || "POST",
        headers: step.config?.headers || {},
        body: step.config?.body || {},
        contactId: context.contactId,
      });
    } else if (step.config?.url) {
      try {
        const response = await fetch(step.config.url, {
          method: step.config.method || "POST",
          headers: { "content-type": "application/json", ...(step.config.headers || {}) },
          body: JSON.stringify({ contactId: context.contactId, ...(step.config.body || {}) }),
        });
        if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
      } catch (err) {
        if (step.config?.continueOnError) return;
        throw err;
      }
    }
  }

  async _executeTagStep(step, context, options) {
    const tags = step.config?.tags || [];
    const action = step.config?.action || "add";
    if (typeof options.onTag === "function") {
      await options.onTag({ tags, action, contactId: context.contactId, locationId: context.locationId });
    }
  }

  async _executeNoteStep(step, context, options) {
    const noteContent = step.config?.body || "";
    if (typeof options.onNote === "function") {
      await options.onNote({ body: noteContent, contactId: context.contactId, locationId: context.locationId });
    }
  }

  async _executeTaskStep(step, context, options) {
    const task = {
      title: step.config?.title || "Untitled Task",
      body: step.config?.body || "",
      dueDate: step.config?.dueDate || null,
      assignedTo: step.config?.assignedTo || "",
      priority: step.config?.priority || "normal",
    };
    if (typeof options.onTask === "function") {
      await options.onTask({ ...task, contactId: context.contactId, locationId: context.locationId });
    }
  }

  async _executeCampaignStep(step, context, options) {
    const targetCampaignId = step.config?.campaignId;
    if (!targetCampaignId) return;
    if (typeof options.onCampaign === "function") {
      await options.onCampaign({ campaignId: targetCampaignId, contactId: context.contactId, locationId: context.locationId });
    }
  }

  async _executeOpportunityStep(step, context, options) {
    const update = {
      pipelineId: step.config?.pipelineId || "",
      pipelineStageId: step.config?.pipelineStageId || "",
      status: step.config?.status || "open",
      monetaryValue: step.config?.monetaryValue || null,
    };
    if (typeof options.onOpportunityUpdate === "function") {
      await options.onOpportunityUpdate({ ...update, contactId: context.contactId, locationId: context.locationId });
    }
  }

  async _executeAssigneeStep(step, context, options) {
    const assignee = step.config?.assignee || "";
    if (typeof options.onAssignee === "function") {
      await options.onAssignee({ assignee, contactId: context.contactId, locationId: context.locationId });
    }
  }

  _evaluateCondition(step, context) {
    if (typeof step.config?.evaluate === "function") {
      return step.config.evaluate(context);
    }
    const conditions = step.config?.conditions || [];
    for (const cond of conditions) {
      const fieldValue = this._getNestedValue(context, cond.field);
      const matches = this._compareValues(fieldValue, cond.operator, cond.value);
      if (matches) {
        return { matched: true, nextStepId: cond.thenStepId || step.config?.thenStepId };
      }
    }
    return { matched: false, nextStepId: step.config?.elseStepId };
  }

  _getDelayMs(step) {
    const config = step.config || {};
    if (config.durationMs) return config.durationMs;
    const units = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
    const unit = config.unit || "minutes";
    return (config.duration || 0) * (units[unit] || 60000);
  }

  _getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  _compareValues(a, operator, b) {
    switch (operator) {
      case "==": case "===": return a === b;
      case "!=": case "!==": return a !== b;
      case ">": return a > b;
      case ">=": return a >= b;
      case "<": return a < b;
      case "<=": return a <= b;
      case "contains": return typeof a === "string" && a.includes(b);
      case "startsWith": return typeof a === "string" && a.startsWith(b);
      case "endsWith": return typeof a === "string" && a.endsWith(b);
      case "in": return Array.isArray(b) && b.includes(a);
      case "notIn": return Array.isArray(b) && !b.includes(a);
      default: return false;
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getWorkflowStatusesForContact(contactId, locationId) {
    const executions = this.store.listDocuments("workflowExecutions", doc => doc.contactId === contactId && doc.locationId === locationId);
    const workflowIds = [...new Set(executions.map(e => e.workflowId))];
    return workflowIds.map(wfId => {
      const wf = this.store.getDocument("workflows", wfId);
      const contactExecutions = executions.filter(e => e.workflowId === wfId)
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
      const latest = contactExecutions[0] || null;
      return {
        workflowId: wfId,
        workflowName: wf?.name || "Unknown",
        status: latest?.status || "none",
        startedAt: latest?.startedAt || null,
        completedAt: latest?.completedAt || null,
        executionCount: contactExecutions.length,
      };
    });
  }

  async stopWorkflowExecution(contactId, locationId, workflowId, userId, source = "web_app") {
    const executions = this.store.listDocuments("workflowExecutions", doc => doc.workflowId === workflowId && doc.contactId === contactId && doc.locationId === locationId && doc.status === "running");
    for (const exec of executions) {
      exec.status = "stopped";
      exec.stoppedAt = new Date().toISOString();
      exec.stoppedBy = userId || "system";
      exec.stopSource = source;
      await this.store.upsertDocument("workflowExecutions", exec.id, exec);
    }
    return { stopped: executions.length };
  }

  // ── Trigger management ────────────────────────────────────────────

  async createTrigger(data) {
    const trigger = {
      id: data.id || crypto.randomUUID(),
      workflowId: data.workflowId || "",
      locationId: data.locationId || "",
      originId: data.originId || "",
      folderId: data.folderId || "",
      type: data.type || TRIGGER_TYPES.CUSTOMER_REPLY,
      title: data.title || "",
      description: data.description || "",
      active: data.active !== false,
      conditions: data.conditions || [],
      actions: data.actions || [],
      zapId: data.zapId || "",
      matchYear: data.matchYear || false,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.store.upsertDocument("triggers", trigger.id, trigger);
    return trigger;
  }

  async updateTrigger(triggerId, data) {
    const trigger = this.store.getDocument("triggers", triggerId);
    if (!trigger) throw new Error(`Unknown trigger: ${triggerId}`);
    if (data.title != null) trigger.title = data.title;
    if (data.description != null) trigger.description = data.description;
    if (data.active != null) trigger.active = data.active;
    if (data.conditions != null) trigger.conditions = data.conditions;
    if (data.actions != null) trigger.actions = data.actions;
    if (data.type != null) trigger.type = data.type;
    if (data.zapId != null) trigger.zapId = data.zapId;
    if (data.matchYear != null) trigger.matchYear = data.matchYear;
    trigger.updatedAt = new Date().toISOString();
    await this.store.upsertDocument("triggers", triggerId, trigger);
    return trigger;
  }

  async deleteTrigger(triggerId) {
    const trigger = this.store.getDocument("triggers", triggerId);
    if (!trigger) return { deleted: false };
    trigger.deleted = true;
    trigger.updatedAt = new Date().toISOString();
    await this.store.upsertDocument("triggers", triggerId, trigger);
    return { deleted: true };
  }

  getActiveTriggersByType(locationId, type) {
    return this.store.listDocuments("triggers", doc => doc.locationId === locationId && doc.type === type && doc.active === true && doc.deleted === false)
      .filter(t => t.deleted === false);
  }

  getTriggersForWorkflow(workflowId) {
    return this.store.listDocuments("triggers", doc => doc.workflowId === workflowId).filter(t => !t.deleted);
  }

  getTriggersByLocation(locationId) {
    return this.store.listDocuments("triggers", doc => doc.locationId === locationId).filter(t => !t.deleted);
  }

  toggleTrigger(triggerId) {
    const trigger = this.store.getDocument("triggers", triggerId);
    if (!trigger) throw new Error(`Unknown trigger: ${triggerId}`);
    trigger.active = !trigger.active;
    trigger.updatedAt = new Date().toISOString();
    this.store.upsertDocument("triggers", triggerId, trigger);
    return trigger;
  }

  async createContactTriggerStatus(data) {
    const status = {
      id: data.id || crypto.randomUUID(),
      contactId: data.contactId || "",
      workflowId: data.workflowId || "",
      locationId: data.locationId || "",
      status: data.status || "queued",
      triggerId: data.triggerId || "",
      triggeredAt: new Date().toISOString(),
      completedAt: null,
      result: data.result || null,
    };
    await this.store.upsertDocument("triggerStatus", status.id, status);
    return status;
  }

  // ── Template management for workflow steps ──────────────────────────

  getStepTemplates() {
    return [
      { type: "email", name: "Send Email", description: "Send an email to the contact", configFields: ["templateId", "subject", "body", "from"] },
      { type: "sms", name: "Send SMS", description: "Send an SMS message to the contact", configFields: ["templateId", "body", "from"] },
      { type: "call", name: "Make Call", description: "Call the contact", configFields: ["phoneNumber", "callerId"] },
      { type: "voicemail", name: "Leave Voicemail", description: "Drop a voicemail", configFields: ["message", "callerId"] },
      { type: "condition", name: "Condition/Branch", description: "Branch based on conditions", configFields: ["conditions", "thenStepId", "elseStepId"] },
      { type: "delay", name: "Delay", description: "Wait before next step", configFields: ["duration", "unit"] },
      { type: "webhook", name: "Webhook", description: "Call an external API", configFields: ["url", "method", "headers", "body", "continueOnError"] },
      { type: "tag", name: "Add/Remove Tags", description: "Add or remove contact tags", configFields: ["tags", "action"] },
      { type: "note", name: "Add Note", description: "Add a note to the contact", configFields: ["body"] },
      { type: "task", name: "Create Task", description: "Create a task for the contact", configFields: ["title", "body", "dueDate", "assignedTo", "priority"] },
      { type: "campaign", name: "Add to Campaign", description: "Add contact to another campaign", configFields: ["campaignId"] },
      { type: "reminder", name: "Send Reminder", description: "Send a reminder", configFields: ["templateId", "delay"] },
      { type: "appointment", name: "Schedule Appointment", description: "Schedule an appointment for the contact", configFields: ["calendarId", "slot"] },
      { type: "opportunity_update", name: "Update Opportunity", description: "Update opportunity stage/status", configFields: ["pipelineId", "pipelineStageId", "status", "monetaryValue"] },
      { type: "review_request", name: "Request Review", description: "Send a review request", configFields: ["templateId", "source"] },
      { type: "facebook", name: "Facebook Action", description: "Send Facebook message", configFields: ["templateId", "pageId"] },
      { type: "instagram", name: "Instagram Action", description: "Send Instagram message", configFields: ["templateId", "accountId"] },
      { type: "assignee", name: "Assign Contact", description: "Assign contact to a user", configFields: ["assignee"] },
    ];
  }

  validateWorkflow(workflowId) {
    const wf = this.getWorkflow(workflowId);
    const errors = [];
    const warnings = [];
    const steps = wf.workflowData?.steps || [];

    if (steps.length === 0) {
      warnings.push("Workflow has no steps");
    }

    const stepIds = new Set();
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (!s.id) { errors.push(`Step ${i}: missing id`); continue; }
      if (stepIds.has(s.id)) { errors.push(`Step ${i}: duplicate id "${s.id}"`); }
      stepIds.add(s.id);

      const valid = validateStep(s, i);
      if (!valid.valid) errors.push(valid.reason);

      if (s.type === "webhook" && !s.config?.url) {
        warnings.push(`Step ${i} (${s.id}): webhook step has no URL`);
      }
      if (s.type === "email" && !s.config?.templateId && !s.config?.body) {
        warnings.push(`Step ${i} (${s.id}): email step has no template or body`);
      }
      if (s.type === "condition" && (!s.config?.thenStepId && !s.config?.elseStepId)) {
        warnings.push(`Step ${i} (${s.id}): condition has no branch targets`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
