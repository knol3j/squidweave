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
    `<p style="color: #666;">Warmly,<br/>${escapeHtml(process.env.SMTP_FROM_NAME || 'LocaleWeave Team')}</p>`,
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
    `${process.env.SMTP_FROM_NAME || 'LocaleWeave Team'}`,
  ].join('\n');

  return { html, text };
}

export class FundingDeckEngine {
  constructor({ dryRun = true, sendEmailFn = null, retryPolicy = {} } = {}) {
    this.dryRun = dryRun;
    this.sendEmailFn = sendEmailFn;
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
    const subject = `Investment Opportunity: ${campaign?.name || campaign?.clientName || 'LocaleWeave Proposal'}`;

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
