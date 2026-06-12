import { isActionableResearchRecord } from "./actionability.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.max(0, Math.min(1, numeric));
}

function normalizeTimestamp(value, fallback = new Date().toISOString()) {
  const date = value ? new Date(value) : null;
  if (date && Number.isFinite(date.getTime())) {
    return date.toISOString();
  }
  return fallback;
}

function average(values) {
  const valid = values.filter(value => typeof value === "number");
  if (valid.length === 0) {
    return null;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function dedupeStrings(values = []) {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
}

function buildReason(label, score) {
  if (score === null) {
    return null;
  }
  return `${label} ${Math.round(score * 100)}%`;
}

function sourceReliability(record = {}) {
  const explicit = Number(record?.metadata?.sourceReliability);
  if (Number.isFinite(explicit)) {
    return Math.max(0, Math.min(1, explicit));
  }
  const source = String(record?.source || "").toLowerCase();
  if (source.includes("sec")) return 0.88;
  if (source.includes("wikidata")) return 0.77;
  if (source.includes("github")) return 0.71;
  if (source.includes("hn")) return 0.62;
  if (source.includes("reddit")) return 0.58;
  if (source.includes("gdelt") || source.includes("rss")) return 0.66;
  return 0.5;
}

export function normalizeResearchRecord(input) {
  if (!input?.campaignId) {
    throw new Error("campaignId is required");
  }
  if (!input?.targetId) {
    throw new Error("targetId is required");
  }

  return {
    id: input.id || crypto.randomUUID(),
    campaignId: input.campaignId,
    targetId: input.targetId,
    source: input.source || "manual-ingest",
    company: input.company || "",
    contactName: input.contactName || "",
    title: input.title || "",
    segment: input.segment || "",
    region: input.region || "",
    preferredChannel: input.preferredChannel || "",
    channels: dedupeStrings(input.channels || []),
    fitScore: clampScore(input.fitScore),
    intentScore: clampScore(input.intentScore),
    recencyScore: clampScore(input.recencyScore),
    estimatedReach: Number.isFinite(Number(input.estimatedReach)) ? Number(input.estimatedReach) : null,
    notes: input.notes || "",
    metadata: input.metadata || {},
    capturedAt: normalizeTimestamp(input.capturedAt),
  };
}

export function normalizeOutreachEvent(input) {
  if (!input?.campaignId) {
    throw new Error("campaignId is required");
  }
  if (!input?.targetId) {
    throw new Error("targetId is required");
  }
  if (!input?.type) {
    throw new Error("type is required");
  }

  return {
    id: input.id || crypto.randomUUID(),
    campaignId: input.campaignId,
    targetId: input.targetId,
    type: input.type,
    channel: input.channel || "",
    metadata: input.metadata || {},
    timestamp: normalizeTimestamp(input.timestamp),
  };
}

function getLatestEvent(events) {
  return events
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .at(-1) || null;
}

function getLastEventByType(events, type) {
  return events
    .filter(event => event.type === type)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .at(-1) || null;
}

function computeNextEligibleAt(events, cadenceDays = 3) {
  const latest = getLatestEvent(events);
  if (!latest) {
    return new Date().toISOString();
  }

  const lastAt = new Date(latest.timestamp).getTime();
  const waitDays = latest.type === "sent"
    ? cadenceDays
    : latest.type === "open"
      ? 2
      : latest.type === "click"
        ? 2
        : latest.type === "reply"
          ? 7
          : 0;

  return new Date(lastAt + (waitDays * DAY_MS)).toISOString();
}

function computeStatus(events) {
  const latest = getLatestEvent(events);
  if (!latest) {
    return "uncontacted";
  }
  if (["unsubscribe", "bounce"].includes(latest.type)) {
    return "suppressed";
  }
  if (["positive_reply", "meeting_booked"].includes(latest.type)) {
    return "engaged";
  }
  if (latest.type === "reply") {
    return "responded";
  }
  if (["click", "open", "sent"].includes(latest.type)) {
    return "contacted";
  }
  return "observed";
}

function computeRecommendation(status, nextEligibleAt) {
  if (status === "suppressed") {
    return "suppress";
  }
  if (status === "engaged") {
    return "advance";
  }
  if (status === "responded") {
    return "await_response_handling";
  }
  if (status === "uncontacted") {
    return "initial_outreach";
  }
  return new Date(nextEligibleAt).getTime() <= Date.now() ? "reengage" : "wait";
}

export class TargetingEngine {
  constructor({ store }) {
    this.store = store;
  }

  rankTargets(campaignId) {
    const campaign = this.store.getCampaign ? this.store.getCampaign(campaignId) : {};
    const researchRecords = this.store
      .listResearchRecords(campaignId)
      .filter(record => isActionableResearchRecord(record, campaign));
    const outreachEvents = this.store.listOutreachEvents(campaignId);
    const playbooks = this.store.listPlaybooks ? this.store.listPlaybooks(campaignId) : [];
    const grouped = new Map();

    for (const record of researchRecords) {
      const current = grouped.get(record.targetId);
      if (!current || new Date(record.capturedAt).getTime() >= new Date(current.capturedAt).getTime()) {
        grouped.set(record.targetId, record);
      }
    }

    return [...grouped.values()]
      .map(record => {
        const targetEvents = outreachEvents.filter(event => event.targetId === record.targetId);
        const latestEvent = getLatestEvent(targetEvents);
        const positiveReply = getLastEventByType(targetEvents, "positive_reply");
        const click = getLastEventByType(targetEvents, "click");
        const open = getLastEventByType(targetEvents, "open");
        const status = computeStatus(targetEvents);
        const matchingPlaybooks = playbooks.filter(playbook => (
          (!playbook.segment || playbook.segment === record.segment)
          && (!playbook.region || playbook.region === record.region)
          && (!playbook.recommendedChannel || [record.preferredChannel, ...(record.channels || [])].includes(playbook.recommendedChannel))
        ));
        const bestPlaybook = matchingPlaybooks
          .slice()
          .sort((a, b) => b.confidence - a.confidence)
          .at(0) || matchingPlaybooks[0] || null;
        const nextEligibleAt = computeNextEligibleAt(targetEvents, bestPlaybook?.cadenceDays || 3);

        const srcReliability = sourceReliability(record);
        let score = average([record.fitScore, record.intentScore, record.recencyScore]) || 0;
        score += (srcReliability - 0.5) * 0.12;
        if (click) {
          score += 0.08;
        }
        if (positiveReply) {
          score += 0.12;
        }
        if (open) {
          score += 0.04;
        }
        if (status === "suppressed") {
          score = 0;
        }
        if (status === "engaged") {
          score += 0.05;
        }
        if (bestPlaybook) {
          score += bestPlaybook.confidence * 0.1;
        }

        const normalizedScore = Math.max(0, Math.min(1, score));
        const reasons = [
          buildReason("fit", record.fitScore),
          buildReason("intent", record.intentScore),
          buildReason("recency", record.recencyScore),
          `source reliability ${Math.round(srcReliability * 100)}%`,
          click ? "recent click detected" : null,
          positiveReply ? "positive reply detected" : null,
          bestPlaybook ? `playbook boost via ${bestPlaybook.recommendedChannel}` : null,
          status === "suppressed" ? "target suppressed from recent negative outcome" : null,
        ].filter(Boolean);

        return {
          targetId: record.targetId,
          company: record.company,
          contactName: record.contactName,
          title: record.title,
          segment: record.segment,
          region: record.region,
          source: record.source,
          channels: dedupeStrings([record.preferredChannel, ...(record.channels || [])]),
          fitScore: record.fitScore,
          intentScore: record.intentScore,
          recencyScore: record.recencyScore,
          sourceReliability: Number(srcReliability.toFixed(2)),
          score: Number(normalizedScore.toFixed(4)),
          status,
          recommendation: computeRecommendation(status, nextEligibleAt),
          recommendedChannel: bestPlaybook?.recommendedChannel || record.preferredChannel || record.channels?.[0] || null,
          nextEligibleAt,
          lastEngagementAt: latestEvent?.timestamp || null,
          estimatedReach: record.estimatedReach,
          reasons,
          latestResearchAt: record.capturedAt,
          outreachEvents: targetEvents.length,
          playbookId: bestPlaybook?.id || null,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  buildDecision(campaignId) {
    const rankings = this.rankTargets(campaignId);
    const actionable = rankings.filter(target => ["initial_outreach", "reengage", "advance"].includes(target.recommendation));
    const initialTargets = actionable.filter(target => target.recommendation === "initial_outreach").slice(0, 5);
    const reengagementQueue = actionable.filter(target => target.recommendation === "reengage").slice(0, 5);
    const advancementQueue = actionable.filter(target => target.recommendation === "advance").slice(0, 5);

    return {
      updatedAt: new Date().toISOString(),
      totalTargets: rankings.length,
      actionableTargets: actionable.length,
      topTargets: rankings.slice(0, 10),
      initialTargets,
      reengagementQueue,
      advancementQueue,
    };
  }
}
