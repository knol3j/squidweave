export class AutomationEngine {
  constructor({ store, decisionEngine, planner, memoryEngine }) {
    this.store = store;
    this.decisionEngine = decisionEngine;
    this.planner = planner;
    this.memoryEngine = memoryEngine;
  }

  shouldRefreshContent(decision) {
    const actionType = decision?.plan?.recommendedAction?.type;
    return [
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
    const contentPack = this.shouldRefreshContent(decision)
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

    await this.store.addAutomationRun(run);
    await this.memoryEngine.consolidateCampaign(campaignId);
    return { run, decision, contentPack };
  }
}
