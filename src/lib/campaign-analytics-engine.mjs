/**
 * CampaignAnalyticsEngine — Closes the automation loop by analyzing
 * campaign performance data and generating ICP refinement signals.
 *
 * Collects metrics from:
 *   - Content pack publishing (social dispatch outcomes)
 *   - Funding outreach (deck sends, opens, replies — when available)
 *   - Prospect activation pipeline (enrichment throughput, sequence rates)
 *   - Automation runs (decision quality, content generation frequency)
 *
 * Outputs refinement recommendations that feed back into the decision
 * engine for re-targeting and re-sequencing.
 */

function nowIso() {
  return new Date().toISOString();
}

function average(values = []) {
  const valid = values.filter(v => typeof v === "number" && Number.isFinite(v));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
}

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export class CampaignAnalyticsEngine {
  constructor({ store }) {
    this.store = store;
  }

  /**
   * Generate a full analytics snapshot for a campaign, combining data
   * from content dispatch, funding outreach, prospect activation, and
   * automation runs.
   */
  generateInsights(campaignId) {
    const campaign = this.store.getCampaign(campaignId);
    if (!campaign) return null;

    const contentPacks = this.store.listContentPacks(campaignId);
    const automationRuns = this.store.listAutomationRuns(campaignId);
    const fundingRuns = this.store.listFundingRuns(campaignId);
    const prospects = this.store.listSourcedContacts?.(campaignId) || [];
    const activationRuns = this.store.listActivationRuns?.(campaignId) || [];

    // ── Content dispatch metrics ──
    const packsPublished = contentPacks.filter(p => p.publishStatus === "published");
    const packsFailed = contentPacks.filter(p => p.publishStatus === "failed");
    const packsPending = contentPacks.filter(p => !p.publishedAt);

    const totalPublishedChannels = packsPublished.reduce(
      (sum, p) => sum + (p.publishResult?.summary?.published || 0),
      0,
    );
    const totalFailedChannels = packsPublished.reduce(
      (sum, p) => sum + (p.publishResult?.summary?.failed || 0),
      0,
    );

    // ── Funding outreach metrics ──
    const deckRuns = fundingRuns.filter(r => r.deckOutreach);
    const totalDeckSends = deckRuns.reduce(
      (sum, r) => sum + (r.deckOutreach?.sent || 0),
      0,
    );
    const totalDeckFailures = deckRuns.reduce(
      (sum, r) => sum + (r.deckOutreach?.failed || 0),
      0,
    );

    // ── Prospect pipeline metrics ──
    const enrichRuns = activationRuns.filter(r => r.action === "enrich");
    const sequenceRuns = activationRuns.filter(r => r.action.startsWith("sequence"));
    const totalEnriched = enrichRuns.reduce((s, r) => s + (r.processedContacts || 0), 0);
    const totalSequenced = sequenceRuns.reduce((s, r) => s + (r.processedContacts || 0), 0);

    const pipelineCounts = this._countProspectStages(prospects);

    // ── Automation run metrics ──
    const decisionsGenerated = automationRuns.filter(r => r.decisionId).length;
    const contentPacksGenerated = automationRuns.filter(r => r.contentPackId).length;
    const agentRunsTotal = automationRuns.reduce((s, r) => s + (r.agentRunCount || 0), 0);

    return {
      campaignId,
      analyzedAt: nowIso(),
      campaign: {
        name: campaign.name || campaign.clientName || campaignId,
        automationEnabled: !!campaign.automationEnabled,
      },
      contentDispatch: {
        totalPacks: contentPacks.length,
        published: packsPublished.length,
        failed: packsFailed.length,
        pending: packsPending.length,
        channelPublishRate: pct(totalPublishedChannels, totalPublishedChannels + totalFailedChannels),
        totalChannelPublishes: totalPublishedChannels,
      },
      fundingOutreach: {
        totalRuns: fundingRuns.length,
        deckSends: totalDeckSends,
        deckFailures: totalDeckFailures,
        deckSendSuccessRate: pct(totalDeckSends, totalDeckSends + totalDeckFailures),
      },
      prospectPipeline: {
        total: pipelineCounts.total,
        readyForEnrichment: pipelineCounts.readyForEnrichment,
        readyForSequencing: pipelineCounts.readyForSequencing,
        sequenced: pipelineCounts.sequenced,
        suppressed: pipelineCounts.suppressed,
        enrichmentThroughput: totalEnriched,
        sequenceThroughput: totalSequenced,
      },
      automationRun: {
        totalRuns: automationRuns.length,
        decisionsGenerated,
        contentPacksGenerated,
        agentRunsTotal,
      },
    };
  }

  /**
   * Generate ICP refinement signals based on campaign analytics.
   * Returns actionable recommendations for the decision engine.
   */
  recommendRefinements(campaignId) {
    const insights = this.generateInsights(campaignId);
    if (!insights) return null;

    const recommendations = [];

    // Content dispatch gaps
    if (insights.contentDispatch.pending > 0) {
      recommendations.push({
        type: "content_publish",
        priority: insights.contentDispatch.pending > 3 ? "high" : "normal",
        signal: `${insights.contentDispatch.pending} content packs waiting for social dispatch`,
        action: "trigger_social_dispatch",
      });
    }

    if (insights.contentDispatch.channelPublishRate < 80 && insights.contentDispatch.totalChannelPublishes > 0) {
      recommendations.push({
        type: "content_quality",
        priority: "high",
        signal: `Channel publish rate is ${insights.contentDispatch.channelPublishRate}% — some channels rejecting content`,
        action: "review_channel_adapter_config",
      });
    }

    // Funding outreach gaps
    if (insights.fundingOutreach.deckFailures > 0) {
      recommendations.push({
        type: "funding_delivery",
        priority: "high",
        signal: `${insights.fundingOutreach.deckFailures} deck emails failed to send`,
        action: "check_email_adapter_configuration",
      });
    }

    if (insights.fundingOutreach.deckSends === 0 && insights.fundingOutreach.totalRuns > 0) {
      recommendations.push({
        type: "funding_pipeline",
        priority: "normal",
        signal: "Funding runs completed but no deck emails were sent — Scoring may be too strict (threshold 0.7)",
        action: "review_funding_scoring_threshold",
      });
    }

    // Prospect pipeline bottlenecks
    if (insights.prospectPipeline.readyForEnrichment > 10 && insights.prospectPipeline.enrichmentThroughput === 0) {
      recommendations.push({
        type: "enrichment_bottleneck",
        priority: "high",
        signal: `${insights.prospectPipeline.readyForEnrichment} contacts stalled at enrichment with no enrichment run recorded`,
        action: "run_enrichment_pipeline",
      });
    }

    if (insights.prospectPipeline.readyForSequencing > 5 && insights.prospectPipeline.sequenceThroughput === 0) {
      recommendations.push({
        type: "sequencing_bottleneck",
        priority: "high",
        signal: `${insights.prospectPipeline.readyForSequencing} contacts ready for sequencing but none sequenced yet`,
        action: "run_sequencing_pipeline",
      });
    }

    // Automation health
    if (insights.automationRun.totalRuns > 0 && insights.automationRun.contentPacksGenerated === 0) {
      recommendations.push({
        type: "content_generation",
        priority: "medium",
        signal: "Automation runs are cycling but no content packs are being generated",
        action: "check_decision_engine_triggers_for_content_refresh",
      });
    }

    return {
      campaignId,
      generatedAt: nowIso(),
      recommendations,
      score: average(recommendations.map(r => (r.priority === "high" ? 1 : r.priority === "medium" ? 0.5 : 0.2))),
    };
  }

  /**
   * Full report combining insights + refinements + recommendations summary.
   */
  generateReport(campaignId) {
    const insights = this.generateInsights(campaignId);
    if (!insights) return null;
    const refinements = this.recommendRefinements(campaignId);
    return {
      reportId: crypto.randomUUID(),
      campaignId,
      generatedAt: nowIso(),
      insights,
      refinements,
      overallHealth: this._assessHealth(insights),
      _raw: { insights, refinements },
    };
  }

  // ── Private helpers ──

  _countProspectStages(prospects = []) {
    const counts = {
      total: prospects.length,
      readyForEnrichment: 0,
      readyForSequencing: 0,
      sequenced: 0,
      suppressed: 0,
    };

    for (const c of prospects) {
      if (["needs-enrichment", "ready-for-enrichment", "awaiting-provider"].includes(c.contactStatus)) {
        counts.readyForEnrichment += 1;
      }
      if (c.contactStatus === "ready-for-sequencing") {
        counts.readyForSequencing += 1;
      }
      if (["sequenced", "queued-for-dispatch"].includes(c.contactStatus)) {
        counts.sequenced += 1;
      }
      if (c.complianceStatus === "suppressed") {
        counts.suppressed += 1;
      }
    }
    return counts;
  }

  _assessHealth(insights) {
    if (!insights) return null;
    let score = 1.0;

    // Deduct for content publish failures
    if (insights.contentDispatch.totalPacks > 0) {
      const pubRate = insights.contentDispatch.channelPublishRate / 100;
      if (pubRate < 0.5) score -= 0.3;
      else if (pubRate < 0.8) score -= 0.1;
    }

    // Deduct for funding failures
    if (insights.fundingOutreach.deckFailures > 0) score -= 0.2;

    // Deduct for stalled pipelines
    if (insights.prospectPipeline.readyForEnrichment > 10 && insights.prospectPipeline.enrichmentThroughput === 0) score -= 0.2;
    if (insights.prospectPipeline.readyForSequencing > 5 && insights.prospectPipeline.sequenceThroughput === 0) score -= 0.15;

    return {
      score: Math.max(0, Math.round(score * 100)),
      label: score >= 0.8 ? "healthy" : score >= 0.5 ? "attention" : "critical",
    };
  }
}
