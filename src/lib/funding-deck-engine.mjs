import { withRetryPolicy } from "./retry-policy.mjs";

function buildDeckMarkdown(campaign) {
  const name = campaign?.name || campaign?.clientName || campaign?.id || "Company";
  return [
    `# ${name} — Fundraising Brief`,
    "",
    "## Problem",
    campaign?.objective || "Define the market problem and urgency.",
    "",
    "## Solution",
    campaign?.offer || "Summarize the product and differentiator.",
    "",
    "## Why Now",
    campaign?.differentiators || "Market timing and strategic wedge.",
    "",
    "## Go-to-Market",
    campaign?.audience || "Target ICP, channels, and expected CAC/LTV motion.",
  ].join("\n");
}

export class FundingDeckEngine {
  constructor({ dryRun = true, retryPolicy = {} } = {}) {
    this.dryRun = dryRun;
    this.retryPolicy = { maxAttempts: 3, initialDelayMs: 200, ...retryPolicy };
  }

  async prepareAndSend({ campaign, investors = [] }) {
    const deck = {
      id: `deck-${campaign?.id || crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      markdown: buildDeckMarkdown(campaign),
      title: `${campaign?.name || campaign?.clientName || "Campaign"} Fundraising Deck`,
    };

    const shortlisted = [...investors]
      .filter(item => Number(item.score || 0) >= 0.7)
      .slice(0, 25);

    const runs = [];
    for (const investor of shortlisted) {
      const execution = await withRetryPolicy(async () => ({
        status: this.dryRun ? "simulated" : "sent",
        externalId: `outreach-${investor.id}-${Date.now()}`,
      }), {
        ...this.retryPolicy,
        operationName: `investor_outreach:${investor.id}`,
      });

      runs.push({
        investorId: investor.id,
        fundName: investor.fundName,
        email: investor.email || null,
        status: execution.status === "success" ? "sent" : "failed",
        attempts: execution.attempts,
        externalId: execution.result?.externalId || null,
        error: execution.error || null,
      });
    }

    return {
      campaignId: campaign?.id,
      deck,
      outreach: {
        sent: runs.filter(item => item.status === "sent").length,
        failed: runs.filter(item => item.status === "failed").length,
        runs,
      },
    };
  }
}
