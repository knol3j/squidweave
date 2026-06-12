import { buildResearchVerificationGate } from "./actionability.mjs";

export class AutomationEngine {
  constructor({ store, decisionEngine, planner, memoryEngine, agentOrchestrator }) {
    this.store = store;
    this.decisionEngine = decisionEngine;
    this.planner = planner;
    this.memoryEngine = memoryEngine;
    this.agentOrchestrator = agentOrchestrator;
  }

  shouldRefreshContent(campaign, decision) {
    const actionType = decision?.plan?.recommendedAction?.type;
    const creativeAgents = new Set(["CreativeDirector", "Copywriter", "SocialPublisher", "LandingPageArchitect"]);
    const hasCreativeAgent = Array.isArray(campaign?.enabledModules) && campaign.enabledModules.some(agentId => creativeAgents.has(agentId));
    return hasCreativeAgent || [
      "rotate_creative",
      "adjust_outreach_copy",
      "launch_test_batch",
      "pause_outreach",
    ].includes(actionType);
  }

  async generateContentPack(campaignId, options = {}) {
    const campaign = this.store.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Unknown campaign: ${campaignId}`);
    }

    const summary = options.summary || {
      campaignId,
      eventCount: 0,
      totals: {},
      derived: {},
      lastEventAt: null,
    };

    const pack = await this.planner.buildLocalizedContentPack(campaign, summary, options);
    const persisted = {
      id: crypto.randomUUID(),
      campaignId,
      createdAt: new Date().toISOString(),
      automationReason: options.reason || "manual",
      decisionId: options.decisionId || null,
      ...pack,
    };

    await this.store.addContentPack(persisted);
    return persisted;
  }

  async _pushToDlq(campaignId, runId, step, error) {
    const entry = {
      id: crypto.randomUUID(),
      campaignId,
      runId,
      step,
      error: error.message || String(error),
      stack: error.stack || null,
      failedAt: new Date().toISOString(),
    };
    try {
      await this.store.addDlqEntry(entry);
    } catch (dlqErr) {
      console.error("[automation:dlq] failed to write DLQ entry:", dlqErr.message);
    }
  }

  async runCampaign(campaignId, options = {}) {
    const run = {
      id: crypto.randomUUID(),
      campaignId,
      createdAt: new Date().toISOString(),
      reason: options.reason || "manual",
      status: "running",
    };
    const campaign = this.store.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Unknown campaign: ${campaignId}`);
    }

    if (!options.skipResearchVerification) {
      const records = typeof this.store.listResearchRecords === "function"
        ? this.store.listResearchRecords(campaignId)
        : [];
      const researchVerification = buildResearchVerificationGate({ campaign, records });
      if (!researchVerification.ready) {
        run.status = "blocked";
        run.blockedStage = researchVerification.blockingStage;
        run.blockingReason = researchVerification.blockingReason;
        run.researchVerification = researchVerification;
        await this.store.addAutomationRun(run);
        return {
          run,
          blocked: true,
          researchVerification,
          questions: researchVerification.questions,
          decision: null,
          contentPack: null,
          agentRuns: [],
          lifecycle: { coverage: [], activeAgents: 0, blockedStage: researchVerification.blockingStage },
        };
      }
    }

    try {
      await this.memoryEngine.consolidateCampaign(campaignId);
    } catch (memErr) {
      run.status = "failed";
      run.error = memErr.message;
      await this.store.addAutomationRun(run).catch(() => {});
      await this._pushToDlq(campaignId, run.id, "memory_consolidate", memErr);
      throw memErr;
      return; // unreachable but satisfies type checker
    }

    let decision;
    try {
      decision = await this.decisionEngine.run(campaignId);
    } catch (decErr) {
      run.status = "failed";
      run.error = decErr.message;
      await this.store.addAutomationRun(run).catch(() => {});
      await this._pushToDlq(campaignId, run.id, "decision", decErr);
      throw decErr;
      return;
    }

    let contentPack = null;
    if (this.shouldRefreshContent(campaign, decision)) {
      try {
        contentPack = await this.generateContentPack(campaignId, {
          summary: decision.summary,
          locales: options.locales,
          decisionId: decision.id,
          reason: options.reason || "decision-triggered",
        });
      } catch (cpErr) {
        run.status = "warned";
        run.contentPackError = cpErr.message;
        console.warn(`[automation:warn] content pack generation failed: ${cpErr.message}`);
        // Non-fatal — continue without contentPack
      }
    }

    const agentResult = this.agentOrchestrator
      ? await this.agentOrchestrator.runCampaign(campaignId, {
          automationRunId: run.id,
          campaign,
          decision,
          contentPack,
          summary: decision.summary,
          memoryContext: decision.memoryContext,
          targeting: decision.targeting,
        })
      : { agentRuns: [], lifecycle: { coverage: [], activeAgents: 0 } };

    run.decisionId = decision.id;
    run.contentPackId = contentPack?.id || null;
    run.agentRunIds = agentResult.agentRuns.map(agentRun => agentRun.id);
    run.agentRunCount = agentResult.agentRuns.length;
    run.lifecycle = agentResult.lifecycle;
    run.status = "completed";

    await this.store.addAutomationRun(run);
    await this.memoryEngine.consolidateCampaign(campaignId);
    return { run, decision, contentPack, agentRuns: agentResult.agentRuns, lifecycle: agentResult.lifecycle };
  }
}
