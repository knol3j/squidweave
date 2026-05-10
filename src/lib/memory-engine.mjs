const DAY_MS = 24 * 60 * 60 * 1000;
const POSITIVE_EVENTS = new Set(["positive_reply", "meeting_booked", "conversion"]);
const NEGATIVE_EVENTS = new Set(["unsubscribe", "bounce"]);
const ENGAGEMENT_EVENTS = new Set(["open", "click", "reply", "positive_reply", "meeting_booked", "conversion"]);

function dedupeStrings(values = []) {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
}

function latestByTimestamp(records, key = "timestamp") {
  return records
    .slice()
    .sort((a, b) => new Date(a[key]).getTime() - new Date(b[key]).getTime())
    .at(-1) || null;
}

function getNextEligibleAt(outreachEvents, cadenceDays = 3) {
  const latestEvent = latestByTimestamp(outreachEvents);
  if (!latestEvent) {
    return new Date().toISOString();
  }

  const lastAt = new Date(latestEvent.timestamp).getTime();
  const eventCadenceDays = latestEvent.type === "reply"
    ? 7
    : latestEvent.type === "click"
      ? 2
      : latestEvent.type === "open"
        ? 2
        : cadenceDays;

  return new Date(lastAt + (eventCadenceDays * DAY_MS)).toISOString();
}

function getTargetStatus(outreachEvents) {
  const latestEvent = latestByTimestamp(outreachEvents);
  if (!latestEvent) {
    return "uncontacted";
  }
  if (NEGATIVE_EVENTS.has(latestEvent.type)) {
    return "suppressed";
  }
  if (POSITIVE_EVENTS.has(latestEvent.type)) {
    return "engaged";
  }
  if (latestEvent.type === "reply") {
    return "responded";
  }
  if (ENGAGEMENT_EVENTS.has(latestEvent.type) || latestEvent.type === "sent") {
    return "contacted";
  }
  return "observed";
}

function scoreAverage(...values) {
  const valid = values.filter(value => typeof value === "number");
  if (valid.length === 0) {
    return null;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function summarizeTactic(observation) {
  const total = observation.totalTargets || 0;
  const successes = observation.positiveOutcomes || 0;
  const negatives = observation.negativeOutcomes || 0;
  const engagements = observation.engagedTargets || 0;
  return {
    successRate: total > 0 ? successes / total : 0,
    negativeRate: total > 0 ? negatives / total : 0,
    engagementRate: total > 0 ? engagements / total : 0,
  };
}

export class MemoryEngine {
  constructor({ store }) {
    this.store = store;
  }

  async consolidateCampaign(campaignId) {
    const researchRecords = this.store.listResearchRecords(campaignId);
    const outreachEvents = this.store.listOutreachEvents(campaignId);
    const decisions = this.store.listDecisions(campaignId);
    const campaigns = this.store.listCampaigns ? this.store.listCampaigns() : [];
    const campaign = campaigns.find(item => item.id === campaignId) || null;

    const latestResearchByTarget = new Map();
    for (const record of researchRecords) {
      const current = latestResearchByTarget.get(record.targetId);
      if (!current || new Date(record.capturedAt).getTime() >= new Date(current.capturedAt).getTime()) {
        latestResearchByTarget.set(record.targetId, record);
      }
    }

    const targetProfiles = [...latestResearchByTarget.values()].map(record => {
      const targetEvents = outreachEvents.filter(event => event.targetId === record.targetId);
      const latestEvent = latestByTimestamp(targetEvents);
      const lastPositiveEvent = latestByTimestamp(targetEvents.filter(event => POSITIVE_EVENTS.has(event.type)));
      const lastNegativeEvent = latestByTimestamp(targetEvents.filter(event => NEGATIVE_EVENTS.has(event.type)));
      const status = getTargetStatus(targetEvents);

      return {
        id: `${campaignId}:${record.targetId}`,
        campaignId,
        targetId: record.targetId,
        company: record.company,
        contactName: record.contactName,
        title: record.title,
        segment: record.segment,
        region: record.region,
        preferredChannel: record.preferredChannel,
        channels: dedupeStrings([record.preferredChannel, ...(record.channels || []), ...targetEvents.map(event => event.channel)]),
        fitScore: record.fitScore,
        intentScore: record.intentScore,
        recencyScore: record.recencyScore,
        memoryScore: scoreAverage(record.fitScore, record.intentScore, record.recencyScore),
        status,
        latestResearchAt: record.capturedAt,
        lastEngagementAt: latestEvent?.timestamp || null,
        lastPositiveAt: lastPositiveEvent?.timestamp || null,
        lastNegativeAt: lastNegativeEvent?.timestamp || null,
        nextEligibleAt: getNextEligibleAt(targetEvents),
        estimatedReach: record.estimatedReach,
        notes: dedupeStrings([record.notes, ...targetEvents.map(event => event.metadata?.note).filter(Boolean)]),
        source: record.source,
      };
    });

    const targetProfileById = new Map(targetProfiles.map(profile => [profile.targetId, profile]));
    const observationMap = new Map();

    for (const profile of targetProfiles) {
      const targetEvents = outreachEvents.filter(event => event.targetId === profile.targetId);
      const usedChannels = profile.channels.length > 0 ? profile.channels : [campaign?.channel || ""];

      for (const channel of usedChannels.filter(Boolean)) {
        const key = [campaignId, profile.segment || "unknown-segment", profile.region || "unknown-region", channel].join("|");
        const current = observationMap.get(key) || {
          id: key,
          campaignId,
          segment: profile.segment || "unknown-segment",
          region: profile.region || "unknown-region",
          channel,
          totalTargets: 0,
          engagedTargets: 0,
          positiveOutcomes: 0,
          negativeOutcomes: 0,
          lastObservedAt: null,
          targetIds: [],
        };

        current.totalTargets += 1;
        if (targetEvents.some(event => ENGAGEMENT_EVENTS.has(event.type))) {
          current.engagedTargets += 1;
        }
        if (targetEvents.some(event => POSITIVE_EVENTS.has(event.type))) {
          current.positiveOutcomes += 1;
        }
        if (targetEvents.some(event => NEGATIVE_EVENTS.has(event.type))) {
          current.negativeOutcomes += 1;
        }
        current.targetIds.push(profile.targetId);
        current.lastObservedAt = [current.lastObservedAt, profile.lastEngagementAt, profile.latestResearchAt]
          .filter(Boolean)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
          .at(-1) || current.lastObservedAt;

        observationMap.set(key, current);
      }
    }

    const tacticObservations = [...observationMap.values()].map(observation => {
      const rates = summarizeTactic(observation);
      return {
        ...observation,
        targetIds: dedupeStrings(observation.targetIds),
        successRate: Number(rates.successRate.toFixed(4)),
        negativeRate: Number(rates.negativeRate.toFixed(4)),
        engagementRate: Number(rates.engagementRate.toFixed(4)),
      };
    });

    const playbooks = tacticObservations
      .filter(observation => observation.totalTargets >= 2 && observation.successRate >= 0.5 && observation.negativeRate <= 0.2)
      .map(observation => ({
        id: `${observation.id}:playbook`,
        campaignId,
        segment: observation.segment,
        region: observation.region,
        recommendedChannel: observation.channel,
        cadenceDays: observation.engagementRate >= 0.6 ? 2 : 3,
        minSamples: observation.totalTargets,
        winRate: observation.successRate,
        riskRate: observation.negativeRate,
        confidence: Number((observation.successRate * (1 - observation.negativeRate)).toFixed(4)),
        targetIds: observation.targetIds,
        rationale: `Built from ${observation.totalTargets} targets with ${Math.round(observation.successRate * 100)}% positive outcome rate.`,
        lastValidatedAt: observation.lastObservedAt,
        status: observation.negativeRate > 0.15 ? "watch" : "trusted",
      }));

    await this.store.replaceTargetProfiles(campaignId, targetProfiles);
    await this.store.replaceTacticObservations(campaignId, tacticObservations);
    await this.store.replacePlaybooks(campaignId, playbooks);

    const snapshot = {
      id: crypto.randomUUID(),
      campaignId,
      createdAt: new Date().toISOString(),
      targetProfiles: targetProfiles.length,
      tacticObservations: tacticObservations.length,
      playbooks: playbooks.length,
      decisionsReviewed: decisions.length,
    };
    await this.store.addMemoryConsolidation(snapshot);

    return {
      snapshot,
      targetProfiles,
      tacticObservations,
      playbooks,
    };
  }

  recall(campaignId, options = {}) {
    const targetProfiles = this.store.listTargetProfiles(campaignId);
    const tacticObservations = this.store.listTacticObservations(campaignId);
    const playbooks = this.store.listPlaybooks(campaignId);
    const researchRecords = this.store.listResearchRecords(campaignId);
    const outreachEvents = this.store.listOutreachEvents(campaignId, options.targetId);
    const decisions = this.store.listDecisions(campaignId);
    const targetProfile = options.targetId
      ? targetProfiles.find(profile => profile.targetId === options.targetId) || null
      : null;

    const relevantPlaybooks = targetProfile
      ? playbooks.filter(playbook => (
          (!playbook.segment || playbook.segment === targetProfile.segment)
          && (!playbook.region || playbook.region === targetProfile.region)
        ))
      : playbooks;

    return {
      updatedAt: new Date().toISOString(),
      targetProfile,
      episodicMemories: {
        researchRecords: researchRecords.slice(-10),
        outreachEvents: outreachEvents.slice(-20),
        decisions: decisions.slice(-10),
      },
      semanticMemories: {
        targetProfiles: targetProfiles.slice(0, 20),
        tacticObservations: tacticObservations.slice(0, 20),
      },
      proceduralMemories: relevantPlaybooks
        .slice()
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10),
    };
  }

  buildDecisionContext(campaignId) {
    const targetProfiles = this.store.listTargetProfiles(campaignId);
    const playbooks = this.store.listPlaybooks(campaignId)
      .slice()
      .sort((a, b) => b.confidence - a.confidence);
    const latestSnapshot = this.store.listMemoryConsolidations(campaignId).at(-1) || null;

    return {
      refreshedAt: latestSnapshot?.createdAt || null,
      totalProfiles: targetProfiles.length,
      playbooks: playbooks.slice(0, 5),
      stale: !latestSnapshot,
    };
  }
}
