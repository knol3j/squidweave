import { summarizeCampaign } from "./analytics.mjs";
import { evaluatePolicy } from "./policy.mjs";

export class DecisionEngine {
  constructor({ store, planner, connectors, config, targetingEngine, memoryEngine }) {
    this.store = store;
    this.planner = planner;
    this.connectors = connectors;
    this.config = config;
    this.targetingEngine = targetingEngine;
    this.memoryEngine = memoryEngine;
  }

  async run(campaignId) {
    const campaign = this.store.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Unknown campaign: ${campaignId}`);
    }

    const events = this.store.listEvents(campaignId);
    const summary = summarizeCampaign(campaign, events);
    const recentDecisions = this.store.listDecisions(campaignId);
    const policyResult = evaluatePolicy(campaign, summary, this.config, recentDecisions);
    const memoryContext = this.memoryEngine.buildDecisionContext(campaignId);
    const plan = await this.planner.buildActionPlan(campaign, summary, policyResult, memoryContext);
    const targeting = this.targetingEngine.buildDecision(campaignId);

    let execution = null;
    let executions = [];
    if (plan.recommendedAction) {
      const connectorNames = Array.isArray(campaign.connectors) && campaign.connectors.length
        ? campaign.connectors
        : [campaign.connector || this.config.defaultConnector];

      executions = [];
      for (const connectorName of connectorNames) {
        const connector = this.connectors[connectorName];
        if (!connector) {
          throw new Error(`Unknown connector: ${connectorName}`);
        }
        executions.push(await connector.execute(plan.recommendedAction, {
          campaign,
          summary,
          targeting,
          memoryContext,
          latestContentPack: this.store.getLatestContentPack(campaignId),
        }));
      }
      execution = executions[0] || null;
    }

    const decision = {
      id: crypto.randomUUID(),
      campaignId,
      createdAt: new Date().toISOString(),
      summary,
      policyResult,
      plan,
      targeting,
      memoryContext,
      execution,
      executions,
    };

    await this.store.addDecision(decision);
    return decision;
  }
}
