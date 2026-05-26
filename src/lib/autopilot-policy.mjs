const MONEY_PATTERN = /(\$\s*\d+[\d,]*(?:\.\d+)?)|(\d+[\d,]*(?:\.\d+)?\s*(?:usd|dollars?|k|m))/gi;

function toNumber(token) {
  if (!token) return null;
  const normalized = token.toLowerCase().replace(/[$,\susdollars]/g, "");
  if (!normalized) return null;
  if (normalized.endsWith("k")) return Number(normalized.slice(0, -1)) * 1000;
  if (normalized.endsWith("m")) return Number(normalized.slice(0, -1)) * 1000000;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function inferBudget({ prompt, campaign }) {
  const text = `${prompt || ""} ${(campaign?.constraints || "")}`.toLowerCase();
  const explicitZero = /(\b0\b|zero)\s*(dollars?|usd|budget)|no\s+budget|without\s+budget|bootstrapped/.test(text);
  if (explicitZero) {
    return { mode: "zero", amount: 0, source: "prompt" };
  }

  const matches = [...text.matchAll(MONEY_PATTERN)]
    .map(match => toNumber(match[0]))
    .filter(value => Number.isFinite(value) && value >= 0);

  const dailyBudget = Number(campaign?.dailyBudget);
  if (Number.isFinite(dailyBudget) && dailyBudget > 0) {
    return { mode: "paid", amount: dailyBudget * 30, source: "campaign.dailyBudget" };
  }
  if (matches.length) {
    const amount = Math.max(...matches);
    return { mode: amount > 0 ? "paid" : "zero", amount, source: "prompt" };
  }

  return { mode: "unknown", amount: null, source: "none" };
}

function inferObjective(prompt = "", campaign = {}) {
  const text = `${prompt} ${campaign?.objective || ""}`.toLowerCase();
  const funding = /(fundraising|fund raise|investor|venture|vc\b|seed round|series [abc]|term sheet|pitch deck)/.test(text);
  return funding ? "vc_funding" : "revenue_growth";
}

function detectPaidChannels(prompt = "", campaign = {}) {
  const text = `${prompt} ${campaign?.channel || ""}`.toLowerCase();
  const channels = new Set();
  if (/google|search ads|youtube ads|display ads/.test(text)) channels.add("google_ads");
  if (/meta|facebook|instagram ads/.test(text)) channels.add("meta_ads");
  if (/linkedin ads/.test(text)) channels.add("linkedin_ads");
  if (channels.size === 0) {
    channels.add("google_ads");
    channels.add("meta_ads");
  }
  return [...channels];
}

export function buildAutopilotPolicy({ prompt, campaign = {} }) {
  const budget = inferBudget({ prompt, campaign });
  const objectiveMode = inferObjective(prompt, campaign);
  const paidChannels = detectPaidChannels(prompt, campaign);

  const paidAdsEnabled = budget.mode === "paid";
  const organicEnabled = true;
  const fundingEnabled = objectiveMode === "vc_funding";

  return {
    classification: {
      objectiveMode,
      budgetMode: budget.mode,
      budgetAmount: budget.amount,
      budgetSource: budget.source,
    },
    stages: {
      businessAnalysis: {
        enabled: true,
        actions: ["brief_normalization", "constraints_mapping", "market_landscape_scan", "execution_plan_generation"],
      },
      paidAds: {
        enabled: paidAdsEnabled,
        channels: paidAdsEnabled ? paidChannels : [],
        actions: paidAdsEnabled ? ["audience_build", "creative_generation", "campaign_launch", "budget_pacing"] : [],
      },
      organicOutreach: {
        enabled: organicEnabled,
        channels: ["email", "social", "telegram"],
        actions: ["prospect_generation", "enrichment", "sequence_orchestration", "social_content_schedule"],
      },
      funding: {
        enabled: fundingEnabled,
        actions: fundingEnabled
          ? ["business_due_diligence", "market_research_deep_dive", "deck_generation", "investor_pipeline_scoring", "investor_outreach_sequence"]
          : [],
      },
    },
    toolRecommendations: {
      creativeProviders: ["nano-banana", "sora"],
      orchestration: ["email-sequencing", "social-publishing", "telegram-bot-automation"],
      paidConnectors: paidAdsEnabled ? paidChannels : [],
    },
  };
}
