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

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailBody(deck, investor, campaign) {
  const name = campaign?.name || campaign?.clientName || "Company";
  const html = [
    `<!DOCTYPE html>`,
    `<html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">`,
    `<h2 style="color: #1a1a2e;">Investment Opportunity: ${escapeHtml(name)}</h2>`,
    `<p>Dear ${escapeHtml(investor?.partnerName || investor?.fundName || 'Investor')},</p>`,
    `<p>I'm reaching out regarding ${escapeHtml(name)} — a company that aligns with ${escapeHtml(investor?.fundName || 'your fund')}'s investment thesis.</p>`,
    `<hr/>`,
    `<h3>Executive Summary</h3>`,
    `<p><strong>Problem:</strong> ${escapeHtml(campaign?.objective || 'See attached brief.')}</p>`,
    `<p><strong>Solution:</strong> ${escapeHtml(campaign?.offer || '')}</p>`,
    `<p><strong>Differentiation:</strong> ${escapeHtml(campaign?.differentiators || '')}</p>`,
    `<p><strong>Target Market:</strong> ${escapeHtml(campaign?.audience || '')}</p>`,
    `<hr/>`,
    `<p style="color: #666;">I'd welcome the opportunity to share the full deck and discuss how we're approaching this market.</p>`,
    `<p style="color: #666;">Warmly,<br/>${escapeHtml(process.env.SMTP_FROM_NAME || 'SquidWeave Team')}</p>`,
    `</body></html>`,
  ].join('\n');

  const text = [
    `Investment Opportunity: ${name}`,
    ``,
    `Dear ${investor?.partnerName || investor?.fundName || 'Investor'},`,
    ``,
    `I'm reaching out regarding ${name} — a company that aligns with ${investor?.fundName || 'your fund'}'s investment thesis.`,
    ``,
    `EXECUTIVE SUMMARY`,
    `Problem: ${campaign?.objective || 'See attached brief.'}`,
    `Solution: ${campaign?.offer || ''}`,
    `Differentiation: ${campaign?.differentiators || ''}`,
    `Target Market: ${campaign?.audience || ''}`,
    ``,
    `I'd welcome the opportunity to share the full deck and discuss how we're approaching this market.`,
    ``,
    `Warmly,`,
    `${process.env.SMTP_FROM_NAME || 'SquidWeave Team'}`,
  ].join('\n');

  return { html, text };
}

/** Cached generated decks keyed by deckId for the /decks/:id route */
const deckCache = new Map();

export class FundingDeckEngine {
  constructor({ dryRun = true, sendEmailFn = null, retryPolicy = {} } = {}) {
    this.dryRun = dryRun;
    this.sendEmailFn = sendEmailFn;
    this.retryPolicy = { maxAttempts: 3, initialDelayMs: 200, ...retryPolicy };
  }

  /** Return cached deck HTML for serving */
  static getCachedDeck(deckId) {
    return deckCache.get(deckId) || null;
  }

  /**
   * Generate a shareable deck URL (hosted via the server's /decks/ route).
   * Returns an object with the URL, deck metadata, and rendered HTML body.
   */
  async generateDeckUrl({ fundName, partnerName, campaignId, campaign } = {}) {
    const resolvedCampaign = campaign || { id: campaignId };
    const deck = {
      id: `deck-${resolvedCampaign.id || campaignId || crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      markdown: buildDeckMarkdown(resolvedCampaign),
      title: `${resolvedCampaign?.name || resolvedCampaign?.clientName || 'Company'} Fundraising Deck`,
      investor: { fundName, partnerName },
    };

    // Build a rich HTML preview (same styling as the email body)
    const emailBody = buildEmailBody(deck, { fundName, partnerName }, resolvedCampaign);
    deck.htmlBody = emailBody.html;

    // Return a URL that the server's /decks/:id route will resolve.
    // Cache so GET /decks/:id can serve it.
    deckCache.set(deck.id, deck);
    return {
      url: `/decks/${deck.id}`,
      deck,
    };
  }

  async prepareAndSend({ campaign, investors = [] }) {
    const deck = {
      id: `deck-${campaign?.id || crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      markdown: buildDeckMarkdown(campaign),
      title: `${campaign?.name || campaign?.clientName || "Campaign"} Fundraising Deck`,
    };
    deckCache.set(deck.id, deck);

    const shortlisted = [...investors]
      .filter(item => Number(item.score || 0) >= 0.7)
      .slice(0, 25);

    const runs = [];

    // No email adapter configured — fall back to file-handoff simulation
    if (!this.sendEmailFn) {
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
        note: 'no email adapter configured — results are simulated',
      };
    }

    // Real email delivery with sendEmailFn
    const subject = `Investment Opportunity: ${campaign?.name || campaign?.clientName || 'SquidWeave Proposal'}`;

    for (const investor of shortlisted) {
      try {
        const emailBody = buildEmailBody(deck, investor, campaign);
        const result = await this.sendEmailFn({
          to: investor.email || '',
          subject,
          html: emailBody.html,
          text: emailBody.text,
        });

        if (result.ok) {
          runs.push({
            investorId: investor.id,
            fundName: investor.fundName,
            email: investor.email || null,
            status: 'sent',
            attempts: 1,
            externalId: `email-${investor.id}-${Date.now()}`,
          });
        } else {
          runs.push({
            investorId: investor.id,
            fundName: investor.fundName,
            email: investor.email || null,
            status: 'failed',
            attempts: 1,
            error: result.error,
          });
        }
      } catch (err) {
        runs.push({
          investorId: investor.id,
          fundName: investor.fundName,
          email: investor.email || null,
          status: 'failed',
          attempts: 1,
          error: err.message,
        });
      }
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
