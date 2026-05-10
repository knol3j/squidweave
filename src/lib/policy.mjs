export function evaluatePolicy(campaign, summary, config, recentDecisions) {
  const actions = [];
  const reasons = [];
  const latestDecision = recentDecisions.at(-1);

  if (latestDecision?.createdAt) {
    const lastRunMs = new Date(latestDecision.createdAt).getTime();
    const cooldownMs = config.decisionCooldownMinutes * 60 * 1000;
    if (Date.now() - lastRunMs < cooldownMs) {
      return {
        status: "cooldown",
        reasons: ["Campaign is in decision cooldown window."],
        allowedActions: [],
      };
    }
  }

  const { derived, totals } = summary;

  if (derived.unsubscribeRate >= config.maxUnsubscribeRate) {
    actions.push({
      type: "pause_outreach",
      delta: 1,
      channel: campaign.channel,
      reason: "Unsubscribe rate exceeded safety threshold.",
    });
    reasons.push("Unsubscribe rate is above the allowed threshold.");
  }

  if (derived.roas >= config.minRoasToScaleUp && totals.conversion >= 2) {
    actions.push({
      type: "scale_up_budget",
      delta: config.maxDailyBudgetDelta,
      newDailyBudget: Number((campaign.dailyBudget * (1 + config.maxDailyBudgetDelta)).toFixed(2)),
      reason: "ROAS is above target with multiple conversions.",
    });
  } else if (totals.spend > 0 && derived.roas > 0 && derived.roas < 1) {
    actions.push({
      type: "scale_down_budget",
      delta: config.maxDailyBudgetDelta,
      newDailyBudget: Number((campaign.dailyBudget * (1 - config.maxDailyBudgetDelta)).toFixed(2)),
      reason: "Campaign is spending but not recovering spend efficiently.",
    });
  }

  if (totals.impression >= 100 && derived.ctr < 0.01) {
    actions.push({
      type: "rotate_creative",
      delta: 1,
      reason: "CTR is too low after enough impressions.",
    });
  }

  if (totals.reply >= 10 && derived.positiveReplyRate < 0.15) {
    actions.push({
      type: "adjust_outreach_copy",
      delta: 1,
      reason: "Positive reply rate is weak.",
    });
  }

  if (totals.impression === 0 || (totals.click === 0 && totals.reply === 0)) {
    actions.push({
      type: "launch_test_batch",
      delta: Math.min(config.maxOutreachBatch, 25),
      reason: "Not enough signal yet. Launch a small controlled batch.",
    });
  }

  return {
    status: actions.length > 0 ? "ready" : "observe",
    reasons,
    allowedActions: actions.slice(0, 3),
  };
}
