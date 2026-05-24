import crypto from "node:crypto";

const metricTypes = [
  "impression",
  "click",
  "conversion",
  "reply",
  "positive_reply",
  "unsubscribe",
  "bounce",
  "spend",
  "revenue",
];

export function normalizeEvent(input) {
  if (!input?.campaignId) {
    throw new Error("campaignId is required");
  }
  if (!input?.type) {
    throw new Error("type is required");
  }

  return {
    id: input.id || crypto.randomUUID(),
    campaignId: input.campaignId,
    type: input.type,
    value: Number.isFinite(Number(input.value)) ? Number(input.value) : 1,
    metadata: input.metadata || {},
    timestamp: input.timestamp || new Date().toISOString(),
  };
}

export function summarizeCampaign(campaign, events) {
  const totals = Object.fromEntries(metricTypes.map(type => [type, 0]));

  for (const event of events) {
    if (totals[event.type] !== undefined) {
      totals[event.type] += event.value;
    }
  }

  const impressions = totals.impression;
  const clicks = totals.click;
  const conversions = totals.conversion;
  const replies = totals.reply;
  const positiveReplies = totals.positive_reply;
  const unsubscribes = totals.unsubscribe;
  const spend = totals.spend;
  const revenue = totals.revenue;

  const ctr = impressions > 0 ? clicks / impressions : 0;
  const cvr = clicks > 0 ? conversions / clicks : 0;
  const replyRate = impressions > 0 ? replies / impressions : 0;
  const positiveReplyRate = replies > 0 ? positiveReplies / replies : 0;
  const unsubscribeRate = impressions > 0 ? unsubscribes / impressions : 0;
  const cpa = conversions > 0 ? spend / conversions : spend;
  const roas = spend > 0 ? revenue / spend : 0;

  return {
    campaignId: campaign.id,
    eventCount: events.length,
    totals,
    derived: {
      ctr,
      cvr,
      replyRate,
      positiveReplyRate,
      unsubscribeRate,
      cpa,
      roas,
    },
    lastEventAt: events.at(-1)?.timestamp || null,
  };
}
