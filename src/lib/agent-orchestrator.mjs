import { AGENT_DEFINITIONS, AGENT_IDS } from "./agent-system.mjs";

function unique(values = []) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))];
}

function average(values = []) {
  const valid = values.filter(value => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) {
    return null;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function percent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 100);
}

function splitTextList(value) {
  return unique(String(value || "").split(/[\n,]/g));
}

function top(items = [], limit = 3) {
  return items.slice(0, limit);
}

function getStageCoverage(runs) {
  const stages = new Map();
  for (const definition of AGENT_DEFINITIONS) {
    const current = stages.get(definition.stage) || { stage: definition.stage, total: 0, completed: 0 };
    current.total += 1;
    if (runs.some(run => run.agentId === definition.id && run.status === "completed")) {
      current.completed += 1;
    }
    stages.set(definition.stage, current);
  }
  return [...stages.values()];
}

export class AgentOrchestrator {
  constructor({ store }) {
    this.store = store;
    this.catalog = AGENT_DEFINITIONS;
  }

  listAgents() {
    return this.catalog.map(item => ({ ...item }));
  }

  resolveEnabledAgents(campaign) {
    const recognized = Array.isArray(campaign?.enabledModules) && campaign.enabledModules.length
      ? campaign.enabledModules.filter(agentId => AGENT_IDS.includes(agentId))
      : [];
    const enabled = recognized.length ? recognized : AGENT_IDS;
    return this.catalog.filter(agent => enabled.includes(agent.id));
  }

  buildContext(campaignId, options = {}) {
    const campaign = options.campaign || this.store.getCampaign(campaignId);
    const summary = options.summary || null;
    const memoryContext = options.memoryContext || {};
    const targeting = options.targeting || {};
    const latestContentPack = options.contentPack || this.store.getLatestContentPack(campaignId);
    const researchRecords = this.store.listResearchRecords(campaignId);
    const outreachEvents = this.store.listOutreachEvents(campaignId);
    const analyticsEvents = this.store.listEvents(campaignId);
    const decisions = this.store.listDecisions(campaignId);
    const automationRuns = this.store.listAutomationRuns(campaignId);
    const previousAgentRuns = this.store.listAgentRuns ? this.store.listAgentRuns(campaignId) : [];
    return {
      campaign,
      summary,
      memoryContext,
      targeting,
      latestContentPack,
      researchRecords,
      outreachEvents,
      analyticsEvents,
      decisions,
      automationRuns,
      previousAgentRuns,
      now: new Date().toISOString(),
    };
  }

  async runCampaign(campaignId, options = {}) {
    const context = this.buildContext(campaignId, options);
    if (!context.campaign) {
      throw new Error(`Unknown campaign: ${campaignId}`);
    }

    const previousByAgent = new Map();
    for (const run of context.previousAgentRuns) {
      previousByAgent.set(run.agentId, run);
    }

    const selectedAgents = this.resolveEnabledAgents(context.campaign);
    const results = [];
    const resultsByAgent = new Map();
    const runCreatedAt = new Date().toISOString();

    for (const definition of selectedAgents) {
      const payload = this.executeAgent(definition, context, {
        results,
        resultsByAgent,
        previous: previousByAgent.get(definition.id) || null,
      });
      const record = {
        id: crypto.randomUUID(),
        campaignId,
        automationRunId: options.automationRunId || null,
        decisionId: options.decision?.id || null,
        contentPackId: options.contentPack?.id || null,
        createdAt: runCreatedAt,
        agentId: definition.id,
        stage: definition.stage,
        outcome: definition.outcome,
        status: payload.status || "completed",
        summary: payload.summary || definition.outcome,
        handoff: payload.handoff || null,
        metrics: payload.metrics || {},
        output: payload.output || {},
      };
      results.push(record);
      resultsByAgent.set(definition.id, record);
    }

    if (this.store.addAgentRuns) {
      await this.store.addAgentRuns(results);
    } else {
      for (const result of results) {
        await this.store.addAgentRun(result);
      }
    }

    return {
      agentRuns: results,
      lifecycle: {
        coverage: getStageCoverage(results),
        activeAgents: results.length,
      },
    };
  }

  executeAgent(definition, context, runtime) {
    switch (definition.id) {
      case "ClientIntake":
        return this.runClientIntake(context);
      case "OfferArchitect":
        return this.runOfferArchitect(context);
      case "BrandStrategist":
        return this.runBrandStrategist(context);
      case "CreativeDirector":
        return this.runCreativeDirector(context);
      case "LandingPageArchitect":
        return this.runLandingPageArchitect(context);
      case "SeoMapper":
        return this.runSeoMapper(context);
      case "AudienceResearch":
        return this.runAudienceResearch(context);
      case "IntentMiner":
        return this.runIntentMiner(context);
      case "DataEnrichment":
        return this.runDataEnrichment(context);
      case "SegmentScorer":
        return this.runSegmentScorer(context);
      case "ChannelPlanner":
        return this.runChannelPlanner(context);
      case "ListHygiene":
        return this.runListHygiene(context);
      case "Copywriter":
        return this.runCopywriter(context);
      case "Personalization":
        return this.runPersonalization(context);
      case "OutboundOrchestrator":
        return this.runOutboundOrchestrator(context);
      case "AdOperator":
        return this.runAdOperator(context);
      case "SocialPublisher":
        return this.runSocialPublisher(context);
      case "SalesHandoff":
        return this.runSalesHandoff(context);
      case "PipelineManager":
        return this.runPipelineManager(context);
      case "OnboardingGuide":
        return this.runOnboardingGuide(context);
      case "RetentionOperator":
        return this.runRetentionOperator(context);
      case "ExpansionPlanner":
        return this.runExpansionPlanner(context);
      case "AnalyticsWatch":
        return this.runAnalyticsWatch(context);
      case "ExperimentLab":
        return this.runExperimentLab(context);
      case "ComplianceSentinel":
        return this.runComplianceSentinel(context, runtime.previous);
      default:
        return {
          status: "completed",
          summary: `${definition.id} completed.`,
          output: {},
        };
    }
  }

  runClientIntake(context) {
    const campaign = context.campaign;
    const missing = [
      !campaign.clientName && "clientName",
      !campaign.clientNeed && !campaign.objective && "clientNeed",
      !campaign.audience && "audience",
      !campaign.offer && "offer",
      !campaign.successDefinition && "successDefinition",
    ].filter(Boolean);
    return {
      status: missing.length ? "attention" : "completed",
      summary: missing.length
        ? `Intake incomplete: missing ${missing.join(", ")}.`
        : "Client brief is complete enough for autonomous execution.",
      output: {
        clientName: campaign.clientName || null,
        mission: campaign.clientNeed || campaign.objective || null,
        missingFields: missing,
        markets: unique(campaign.markets || campaign.locales || []),
      },
      handoff: missing.length ? "Operator should fill the intake gaps before scaling automation." : "OfferArchitect",
    };
  }

  runOfferArchitect(context) {
    const campaign = context.campaign;
    const pillars = unique([
      campaign.offer,
      campaign.differentiators,
      campaign.successDefinition,
      campaign.objective,
    ]);
    return {
      summary: `Offer architecture built with ${pillars.length} primary value pillars.`,
      metrics: { pillarCount: pillars.length },
      output: {
        primaryOffer: campaign.offer || campaign.objective || null,
        valuePillars: top(pillars, 4),
        riskReversal: campaign.successDefinition || "No explicit risk-reversal captured.",
      },
      handoff: "BrandStrategist",
    };
  }

  runBrandStrategist(context) {
    const campaign = context.campaign;
    const evidence = top(context.researchRecords.flatMap(record => record.metadata?.evidence || []), 3);
    return {
      summary: "Brand narrative and proof points aligned to the brief.",
      output: {
        voice: campaign.brandVoice || "direct, credible, concise",
        messagePillars: top(unique([campaign.differentiators, campaign.offer, campaign.clientNeed, ...evidence]), 4),
        antiPatterns: splitTextList(campaign.constraints),
      },
      handoff: "CreativeDirector",
    };
  }

  runCreativeDirector(context) {
    const pack = context.latestContentPack;
    return {
      status: pack ? "completed" : "attention",
      summary: pack
        ? `Creative direction synchronized across ${pack.variants?.length || 0} generated variants.`
        : "Creative direction drafted, but no generated content pack exists yet.",
      output: {
        conceptAngles: top(unique([
          context.campaign.baseHeadline,
          context.campaign.baseBody,
          context.campaign.offer,
          context.campaign.differentiators,
        ]), 4),
        localizedVariants: pack?.variants?.map(variant => ({
          locale: variant.locale,
          headline: variant.headline,
          cta: variant.cta,
        })) || [],
      },
      handoff: "LandingPageArchitect",
    };
  }

  runLandingPageArchitect(context) {
    const campaign = context.campaign;
    return {
      summary: "Landing page structure generated for the current brief.",
      output: {
        sections: [
          "Hero promise",
          "Proof and differentiation",
          "Pain and urgency",
          "Offer breakdown",
          "FAQ and objections",
          "Final CTA",
        ],
        hero: {
          headline: campaign.baseHeadline || campaign.offer || campaign.objective || "Clarify the offer",
          cta: campaign.baseCta || "Book a call",
        },
      },
      handoff: "SeoMapper",
    };
  }

  runSeoMapper(context) {
    const tokens = new Map();
    for (const record of context.researchRecords) {
      for (const value of [record.segment, record.region, record.title, record.company, ...(record.metadata?.evidence || [])]) {
        for (const token of String(value || "").toLowerCase().split(/[^a-z0-9+#-]+/g).filter(item => item.length >= 4)) {
          tokens.set(token, (tokens.get(token) || 0) + 1);
        }
      }
    }
    const keywords = [...tokens.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([term, score]) => ({ term, score }));
    return {
      status: keywords.length ? "completed" : "attention",
      summary: keywords.length ? `SEO map built from ${keywords.length} research-derived keywords.` : "No research-derived keyword map available yet.",
      output: {
        keywords,
        markets: unique(context.campaign.markets || context.campaign.locales || []),
      },
      handoff: "AudienceResearch",
    };
  }

  runAudienceResearch(context) {
    const profiles = context.memoryContext?.semantic?.targetProfiles || context.targeting?.topTargets || [];
    const segments = new Map();
    for (const item of profiles) {
      const key = `${item.segment || "unknown"}::${item.region || "global"}`;
      segments.set(key, (segments.get(key) || 0) + 1);
    }
    return {
      summary: `Audience research identified ${segments.size} active segment clusters.`,
      metrics: { segmentCount: segments.size },
      output: {
        clusters: [...segments.entries()].map(([key, count]) => {
          const [segment, region] = key.split("::");
          return { segment, region, targets: count };
        }),
      },
      handoff: "IntentMiner",
    };
  }

  runIntentMiner(context) {
    const topTargets = top(context.targeting?.topTargets || [], 5);
    return {
      summary: `Intent miner surfaced ${topTargets.length} high-priority targets.`,
      output: {
        topTargets: topTargets.map(target => ({
          targetId: target.targetId,
          company: target.company,
          score: target.score,
          reasons: target.reasons,
        })),
      },
      handoff: "DataEnrichment",
    };
  }

  runDataEnrichment(context) {
    const completeness = context.researchRecords.map(record => {
      const fields = [record.company, record.contactName, record.title, record.segment, record.region, record.preferredChannel];
      return fields.filter(Boolean).length / fields.length;
    });
    const avgCompleteness = average(completeness);
    return {
      summary: `Data enrichment coverage is ${percent(avgCompleteness) ?? 0}% across research records.`,
      metrics: { avgCompleteness: avgCompleteness || 0 },
      output: {
        records: context.researchRecords.length,
        avgCompleteness,
        missingChannels: context.researchRecords.filter(record => !(record.preferredChannel || record.channels?.length)).map(record => record.targetId),
      },
      handoff: "SegmentScorer",
    };
  }

  runSegmentScorer(context) {
    const topTargets = top(context.targeting?.topTargets || [], 5);
    const averageScore = average(topTargets.map(target => target.score));
    return {
      summary: `Segment scorer prioritized ${topTargets.length} targets with ${percent(averageScore) ?? 0}% average score.`,
      metrics: { averageScore: averageScore || 0 },
      output: {
        rankedTargets: topTargets.map(target => ({
          targetId: target.targetId,
          segment: target.segment,
          region: target.region,
          recommendation: target.recommendation,
          score: target.score,
        })),
      },
      handoff: "ChannelPlanner",
    };
  }

  runChannelPlanner(context) {
    const topTargets = top(context.targeting?.topTargets || [], 5);
    const channels = unique(topTargets.flatMap(target => [target.recommendedChannel, ...(target.channels || [])]));
    return {
      summary: `Channel plan recommends ${channels.length || 1} primary distribution rails.`,
      output: {
        primaryChannel: context.campaign.channel || channels[0] || "email",
        recommendedChannels: channels.length ? channels : [context.campaign.channel || "email"],
        locales: unique(context.campaign.markets || context.campaign.locales || []),
      },
      handoff: "ListHygiene",
    };
  }

  runListHygiene(context) {
    const targets = context.targeting?.topTargets || [];
    const suppressed = targets.filter(target => target.status === "suppressed").length;
    const actionable = targets.filter(target => ["initial_outreach", "reengage", "advance"].includes(target.recommendation)).length;
    return {
      summary: `List hygiene cleared ${actionable} actionable targets and suppressed ${suppressed}.`,
      output: {
        actionable,
        suppressed,
        blockedTargetIds: targets.filter(target => target.status === "suppressed").map(target => target.targetId),
      },
      handoff: "Copywriter",
    };
  }

  runCopywriter(context) {
    const variants = context.latestContentPack?.variants || [];
    return {
      status: variants.length ? "completed" : "attention",
      summary: variants.length
        ? `Copywriter prepared ${variants.length} localized variants.`
        : "Copywriter has brief context but no generated localized variants yet.",
      output: {
        subjectLines: variants.map(variant => ({ locale: variant.locale, subject: variant.subject })),
        headlines: variants.map(variant => ({ locale: variant.locale, headline: variant.headline })),
      },
      handoff: "Personalization",
    };
  }

  runPersonalization(context) {
    const topTargets = top(context.targeting?.topTargets || [], 3);
    return {
      summary: `Personalization built cues for ${topTargets.length} high-priority targets.`,
      output: {
        cues: topTargets.map(target => ({
          targetId: target.targetId,
          company: target.company,
          segment: target.segment,
          angle: top(target.reasons || [], 2).join("; "),
        })),
      },
      handoff: "OutboundOrchestrator",
    };
  }

  runOutboundOrchestrator(context) {
    const queue = [
      ...(context.targeting?.initialTargets || []),
      ...(context.targeting?.reengagementQueue || []),
    ];
    return {
      summary: `Outbound orchestration queued ${queue.length} targets for action.`,
      metrics: { queueSize: queue.length },
      output: {
        queue: queue.map(target => ({
          targetId: target.targetId,
          company: target.company,
          action: target.recommendation,
          channel: target.recommendedChannel,
          nextEligibleAt: target.nextEligibleAt,
        })),
      },
      handoff: "AdOperator",
    };
  }

  runAdOperator(context) {
    const decision = context.decisions.at(-1);
    return {
      summary: `Ad operator is aligned to ${decision?.plan?.recommendedAction?.type || "current paid posture"}.`,
      output: {
        action: decision?.plan?.recommendedAction || null,
        budget: context.campaign.dailyBudget || null,
        roas: context.summary?.derived?.roas || 0,
      },
      handoff: "SocialPublisher",
    };
  }

  runSocialPublisher(context) {
    const variants = context.latestContentPack?.variants || [];
    return {
      status: variants.length ? "completed" : "attention",
      summary: variants.length
        ? `Social publisher packaged ${variants.length} locale-specific social assets.`
        : "Social publisher has no creative variants to schedule yet.",
      output: {
        queue: variants.map(variant => ({
          locale: variant.locale,
          channel: variant.channel,
          headline: variant.headline,
        })),
      },
      handoff: "SalesHandoff",
    };
  }

  runSalesHandoff(context) {
    const hotLeads = (context.targeting?.topTargets || []).filter(target => target.recommendation === "advance").slice(0, 5);
    return {
      summary: `Sales handoff prepared ${hotLeads.length} hot leads.`,
      output: {
        leads: hotLeads.map(lead => ({
          targetId: lead.targetId,
          company: lead.company,
          contactName: lead.contactName,
          rationale: top(lead.reasons || [], 2),
        })),
      },
      handoff: "PipelineManager",
    };
  }

  runPipelineManager(context) {
    const outreach = context.outreachEvents;
    const statusCounts = outreach.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
    return {
      summary: `Pipeline manager updated ${outreach.length} outreach events across the funnel.`,
      output: {
        counts: statusCounts,
        meetingsBooked: statusCounts.meeting_booked || 0,
        positiveReplies: statusCounts.positive_reply || 0,
      },
      handoff: "OnboardingGuide",
    };
  }

  runOnboardingGuide(context) {
    const successMetrics = splitTextList(context.campaign.successMetrics);
    return {
      summary: "Onboarding guide created the first-value checklist.",
      output: {
        milestones: top(unique([
          "Confirm implementation owner",
          "Deliver first-value workflow",
          "Capture baseline metrics",
          ...successMetrics,
        ]), 5),
      },
      handoff: "RetentionOperator",
    };
  }

  runRetentionOperator(context) {
    const negativeSignals = context.analyticsEvents.filter(event => ["unsubscribe", "bounce"].includes(event.type)).length;
    return {
      summary: `Retention operator detected ${negativeSignals} negative signals requiring follow-up.`,
      output: {
        negativeSignals,
        reengagementQueue: top(context.targeting?.reengagementQueue || [], 5).map(item => ({
          targetId: item.targetId,
          company: item.company,
          nextEligibleAt: item.nextEligibleAt,
        })),
      },
      handoff: "ExpansionPlanner",
    };
  }

  runExpansionPlanner(context) {
    const positiveReplies = context.outreachEvents.filter(event => ["positive_reply", "meeting_booked"].includes(event.type)).length;
    return {
      summary: `Expansion planner found ${positiveReplies} expansion-ready relationships.`,
      output: {
        expansionCandidates: positiveReplies,
        triggers: top(unique([
          context.campaign.successDefinition,
          context.campaign.offer,
          "Introduce higher-tier outcome package",
        ]), 3),
      },
      handoff: "AnalyticsWatch",
    };
  }

  runAnalyticsWatch(context) {
    return {
      summary: `Analytics watch processed ${context.analyticsEvents.length} analytics events.`,
      output: {
        eventCount: context.analyticsEvents.length,
        derived: context.summary?.derived || {},
        totals: context.summary?.totals || {},
      },
      handoff: "ExperimentLab",
    };
  }

  runExperimentLab(context) {
    const recommendedAction = context.decisions.at(-1)?.plan?.recommendedAction?.type || "launch_test_batch";
    const variants = context.latestContentPack?.variants || [];
    return {
      summary: `Experiment lab prepared a ${recommendedAction} testing backlog.`,
      output: {
        backlog: top(unique([
          `Test CTA framing for ${context.campaign.offer || context.campaign.objective || "current offer"}`,
          `Compare best locale variants across ${variants.length || 1} creative lines`,
          `Validate channel mix for ${context.campaign.channel || "primary channel"}`,
        ]), 3),
      },
      handoff: "ComplianceSentinel",
    };
  }

  runComplianceSentinel(context, previousRun) {
    const constraints = splitTextList(context.campaign.constraints);
    const repeatedAttention = previousRun?.status === "attention";
    return {
      status: constraints.length || repeatedAttention ? "attention" : "completed",
      summary: constraints.length
        ? `Compliance sentinel preserved ${constraints.length} explicit campaign constraints.`
        : "Compliance sentinel found no explicit constraints in the brief.",
      output: {
        constraints,
        dryRun: true,
        requiresOperatorReview: Boolean(constraints.length),
      },
      handoff: constraints.length ? "Operator review before live deployment." : "Automation run complete.",
    };
  }
}
