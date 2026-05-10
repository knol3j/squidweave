export class AutomationScheduler {
  constructor({ store, automationEngine, intervalSeconds = 120 }) {
    this.store = store;
    this.automationEngine = automationEngine;
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
    try {
      const campaigns = this.store.listCampaigns().filter(campaign => campaign.automationEnabled);
      for (const campaign of campaigns) {
        await this.automationEngine.runCampaign(campaign.id, { reason: "scheduled" });
      }
    } finally {
      this.running = false;
    }
  }

  start() {
    if (this.timer) {
      return this.getStatus();
    }
    this.timer = setInterval(() => {
      this.tick().catch(error => {
        console.error("Scheduler tick failed:", error.message);
      });
    }, this.intervalSeconds * 1000);
    return this.getStatus();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    return this.getStatus();
  }
}
