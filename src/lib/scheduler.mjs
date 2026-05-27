export class AutomationScheduler {
  constructor({
    store,
    automationEngine,
    socialDispatchEngine,
    fundingEngine,
    analyticsEngine,
    executionGuard,
    intervalSeconds = 120,
  }) {
    this.store = store;
    this.automationEngine = automationEngine;
    this.socialDispatchEngine = socialDispatchEngine || null;
    this.fundingEngine = fundingEngine || null;
    this.analyticsEngine = analyticsEngine || null;
    this.executionGuard = executionGuard || null;
    this.intervalSeconds = intervalSeconds;
    this.timer = null;
    this.running = false;
    this.lastTickAt = null;
  }

  isRunning() {
    return this.timer !== null;
  }

  getStatus() {
    return {
      running: this.isRunning(),
      intervalSeconds: this.intervalSeconds,
      lastTickAt: this.lastTickAt,
    };
  }

  async tick() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastTickAt = new Date().toISOString();
    const startedAt = Date.now();

    try {
      const campaigns = this.store
        .listCampaigns()
        .filter(campaign => campaign.automationEnabled);

      for (const campaign of campaigns) {
        try {
          // Phase 1: Content generation + agent orchestration
          if (this.executionGuard) {
            await this.executionGuard.run({
              campaignId: campaign.id,
              executionType: "automation_run",
              reason: "scheduled",
              idempotencyKey: this.executionGuard.buildIdempotencyKey({
                campaignId: campaign.id,
                executionType: "automation_run",
                reason: "scheduled",
              }),
              metadata: { scheduler: true },
              operation: () => this.automationEngine.runCampaign(campaign.id, {
                reason: "scheduled",
              }),
            });
          } else {
            await this.automationEngine.runCampaign(campaign.id, {
              reason: "scheduled",
            });
          }

          // Phase 2: Social dispatch — publish any new content packs
          if (this.socialDispatchEngine) {
            const dispatchOperation = () => this.socialDispatchEngine.dispatchCampaign(campaign.id);
            const dispatchResult = this.executionGuard
              ? (await this.executionGuard.run({
                  campaignId: campaign.id,
                  executionType: "social_dispatch",
                  reason: "scheduled",
                  idempotencyKey: this.executionGuard.buildIdempotencyKey({
                    campaignId: campaign.id,
                    executionType: "social_dispatch",
                    reason: "scheduled",
                  }),
                  liveSideEffect: true,
                  approvalToken: this.executionGuard.config.dryRun ? "" : "approved",
                  metadata: { scheduler: true },
                  operation: dispatchOperation,
                })).result
              : await dispatchOperation();
            if (dispatchResult.dispatched > 0) {
              console.log(
                `[SCHEDULER] Campaign ${campaign.id}: published ${dispatchResult.summary.published} social posts, ${dispatchResult.summary.failed} failed`,
              );
            }
          }

          // Phase 3: Funding outreach — run scoring and deck delivery
          if (this.fundingEngine) {
            const fundingOperation = () => this.fundingEngine.runCampaign(
              campaign.id,
              { prioritizedLimit: 20, maxPerRun: 20 },
            );
            const fundingResult = this.executionGuard
              ? (await this.executionGuard.run({
                  campaignId: campaign.id,
                  executionType: "funding_run",
                  reason: "scheduled",
                  idempotencyKey: this.executionGuard.buildIdempotencyKey({
                    campaignId: campaign.id,
                    executionType: "funding_run",
                    reason: "scheduled",
                  }),
                  liveSideEffect: true,
                  approvalToken: this.executionGuard.config.dryRun ? "" : "approved",
                  metadata: { scheduler: true, maxPerRun: 20 },
                  operation: fundingOperation,
                })).result
              : await fundingOperation();
            const deckCount =
              fundingResult.sequence?.run?.deckOutreach?.sent || 0;
            if (deckCount > 0) {
              console.log(
                `[SCHEDULER] Campaign ${campaign.id}: sent ${deckCount} funding deck emails`,
              );
            }
          }

          // Phase 4: Analytics — generate insights and refinement signals
          if (this.analyticsEngine) {
            const report = this.analyticsEngine.generateReport(campaign.id);
            await this.store.addEvent?.({
              type: "analytics_report",
              campaignId: campaign.id,
              report,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error(
            `[SCHEDULER] Campaign ${campaign.id} tick error:`,
            err.message,
          );
        }
      }

      const elapsed = Date.now() - startedAt;
      console.log(
        `[SCHEDULER] Tick completed for ${campaigns.length} campaigns in ${elapsed}ms`,
      );
    } finally {
      this.running = false;
    }
  }

  start() {
    if (this.timer) {
      return this.getStatus();
    }
    // Run first tick immediately, then on interval
    this.tick().catch(error => {
      console.error("Scheduler first tick failed:", error.message);
    });
    this.timer = setInterval(() => {
      this.tick().catch(error => {
        console.error("Scheduler tick failed:", error.message);
      });
    }, this.intervalSeconds * 1000);
    console.log(
      `[SCHEDULER] Started — tick interval: ${this.intervalSeconds}s`,
    );
    return this.getStatus();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log("[SCHEDULER] Stopped");
    return this.getStatus();
  }
}
