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

  async runCampaign(campaignId, options = {}) {
    await this.memoryEngine.consolidateCampaign(campaignId);
    const decision = await this.decisionEngine.run(campaignId);
    const campaign = this.store.getCampaign(campaignId);
    const contentPack = this.shouldRefreshContent(campaign, decision)
      ? await this.generateContentPack(campaignId, {
          summary: decision.summary,
          locales: options.locales,
          decisionId: decision.id,
          reason: options.reason || "decision-triggered",
        })
      : null;

    const run = {
      id: crypto.randomUUID(),
      campaignId,
      createdAt: new Date().toISOString(),
      reason: options.reason || "manual",
      decisionId: decision.id,
      contentPackId: contentPack?.id || null,
      status: "completed",
    };

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

    run.agentRunIds = agentResult.agentRuns.map(agentRun => agentRun.id);
    run.agentRunCount = agentResult.agentRuns.length;
    run.lifecycle = agentResult.lifecycle;
    await this.store.addAutomationRun(run);
    await this.memoryEngine.consolidateCampaign(campaignId);
    return { run, decision, contentPack, agentRuns: agentResult.agentRuns, lifecycle: agentResult.lifecycle };
  }
}
