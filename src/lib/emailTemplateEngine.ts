/**
 * Email Template Engine — investor-deck-aware email composition
 * All templates use {{variable}} syntax. Substitutes from investor deck + contact data.
 * Zero external dependencies. Fully local.
 */

import { fillTemplate, type InvestorDeck } from "./investorDeckStore";

// ─── Types ───────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string;
  name: string;
  category: "cold" | "warm" | "followup" | "deck" | "meeting" | "close";
  subject: string;
  body: string;
  description: string;
  variables: string[];
}

export interface ComposedEmail {
  subject: string;
  body: string;
  templateId: string;
  filledAt: string;
  recipientName: string;
  recipientFirm: string;
  recipientEmail: string;
}

export interface EmailSequence {
  id: string;
  name: string;
  steps: { templateId: string; delayDays: number; note: string }[];
}

// ─── Built-in Templates ──────────────────────────────────────────────

export const BUILT_IN_TEMPLATES: EmailTemplate[] = [
  {
    id: "cold-intro",
    name: "Cold Intro",
    category: "cold",
    description: "First outreach to an investor you've never contacted",
    subject: "{{companyName}} — {{tagline}}",
    body: `Hi {{firstName}},

I'm reaching out because {{companyName}} is {{tagline}}, and given your focus on {{investorFocus}}, I thought it would be a strong fit for {{firmName}}.

The problem we're solving: {{problem}}

Our solution: {{solution}}

Traction so far: {{traction}}
{{#revenue}}Revenue: {{revenue}} ({{growthRate}} growth){{/revenue}}

We're currently raising {{fundingAsk}} to {{useOfFunds}}.

Would you be open to a brief 15-minute call next week? I can share our deck and answer any questions.

Best,
{{senderName}}`,
    variables: ["firstName", "investorFocus", "firmName", "senderName"],
  },
  {
    id: "deck-share",
    name: "Deck Share",
    category: "deck",
    description: "Send investor deck after initial interest",
    subject: "{{companyName}} — Investor Deck & Financials",
    body: `Hi {{firstName}},

Thanks for your interest in {{companyName}}. As promised, here is our investor deck.

Quick highlights:
• Problem: {{problem}}
• Solution: {{solution}}
• Market: {{marketSize}}
• Traction: {{traction}}
• Customers: {{customerCount}}
• Revenue: {{revenue}} at {{growthRate}} growth
• Team: {{teamHighlights}}
• The ask: {{fundingAsk}}

Our moat: {{moat}}

Long-term vision: {{vision}}

Key metrics:
{{#keyMetrics}}• {{label}}: {{value}}
{{/keyMetrics}}

Let me know if you'd like to schedule a deeper dive. I'm happy to walk through the deck live.

Best,
{{senderName}}

P.S. Our runway is {{runway}} with a {{burnRate}} burn rate.`,
    variables: ["firstName", "senderName", "keyMetrics"],
  },
  {
    id: "meeting-request",
    name: "Meeting Request",
    category: "meeting",
    description: "Request a meeting after positive initial response",
    subject: "15-min intro call — {{companyName}}",
    body: `Hi {{firstName}},

Great speaking with you briefly. I'd love to get {{firmName}}'s take on what we're building at {{companyName}}.

In 15 minutes I can cover:
1. The problem: {{problem}}
2. Our solution: {{solution}}
3. Traction: {{traction}} — {{customerCount}} customers, {{revenue}} revenue
4. The round: {{fundingAsk}} for {{useOfFunds}}
5. Why now: {{marketSize}} market growing at {{growthRate}}

I'm available {{availability}}. Does any of that work for you?

Best,
{{senderName}}`,
    variables: ["firstName", "firmName", "senderName", "availability"],
  },
  {
    id: "followup-1",
    name: "Follow-up (1 week)",
    category: "followup",
    description: "Gentle follow-up after no response (1 week)",
    subject: "Re: {{companyName}} — quick follow-up",
    body: `Hi {{firstName}},

Wanted to follow up on my note from last week about {{companyName}}.

Since then we've {{recentWin}} — thought you'd find it relevant given your interest in {{investorFocus}}.

Quick recap:
• {{traction}}
• {{revenue}} revenue, {{growthRate}} growth
• Raising {{fundingAsk}}

Worth a 10-minute chat?

Best,
{{senderName}}`,
    variables: ["firstName", "recentWin", "investorFocus", "senderName"],
  },
  {
    id: "followup-2",
    name: "Follow-up (2 weeks)",
    category: "followup",
    description: "Final follow-up with social proof (2 weeks)",
    subject: "{{companyName}} — closing {{fundingAsk}} round soon",
    body: `Hi {{firstName}},

I'm circling back one last time on {{companyName}}.

We're closing our {{fundingAsk}} round in the next few weeks and have {{coInvestors}} already committed. Given your track record with {{notableInvestment}}, I'd love to have {{firmName}} involved.

The quick pitch:
{{problem}}
{{solution}}
{{traction}} — {{customerCount}} customers
{{revenue}} at {{growthRate}} growth

If the timing isn't right, I completely understand. Either way, thanks for your time.

Best,
{{senderName}}`,
    variables: ["firstName", "recentWin", "coInvestors", "notableInvestment", "firmName", "senderName"],
  },
  {
    id: "warm-intro",
    name: "Warm Intro",
    category: "warm",
    description: "When you have a mutual connection",
    subject: "Intro via {{mutualConnection}} — {{companyName}}",
    body: `Hi {{firstName}},

{{mutualConnection}} suggested I reach out to you directly.

{{companyName}} is {{tagline}}. We're solving {{problem}} with {{solution}}.

Current traction:
• {{customerCount}} customers
• {{revenue}} revenue
• {{growthRate}} growth
• {{marketSize}} market opportunity

We're raising {{fundingAsk}} and {{mutualConnection}} thought {{firmName}} would be a great fit given your work with {{notableInvestment}}.

Any interest in taking a look?

Best,
{{senderName}}`,
    variables: ["firstName", "mutualConnection", "firmName", "notableInvestment", "senderName"],
  },
  {
    id: "term-sheet-ask",
    name: "Term Sheet Request",
    category: "close",
    description: "After multiple positive meetings, request term sheet",
    subject: "{{companyName}} — ready for term sheet discussion",
    body: `Hi {{firstName}},

It's been great getting to know the {{firmName}} team over the past few weeks. Based on our conversations, I believe there's strong alignment on:

1. The market: {{marketSize}} growing at {{growthRate}}
2. Our traction: {{traction}}, {{revenue}} revenue
3. The team: {{teamHighlights}}
4. Our moat: {{moat}}

We're ready to move forward and would be excited to receive a term sheet from {{firmName}}. We're flexible on structure and want to find terms that work for both sides.

Our round details:
• Raising: {{fundingAsk}}
• Use of funds: {{useOfFunds}}
• Runway: {{runway}}
• Burn: {{burnRate}}
• LTV/CAC: {{ltv}} / {{cac}} ({{paybackPeriod}} payback)
• NRR: {{nrr}}

What's the next step on your end?

Best,
{{senderName}}`,
    variables: ["firstName", "firmName", "senderName"],
  },
  {
    id: "newsletter-update",
    name: "Investor Update",
    category: "followup",
    description: "Monthly/quarterly update to investors and prospects",
    subject: "{{companyName}} — {{month}} Update",
    body: `Hi {{firstName}},

Quick update from {{companyName}}:

Wins this month:
{{#wins}}• {{.}}
{{/wins}}

Key metrics:
• Revenue: {{revenue}} ({{growthRate}})
• Customers: {{customerCount}}
• NRR: {{nrr}}
• LTV/CAC: {{ltv}} / {{cac}}
• Runway: {{runway}}

What's next:
{{#nextSteps}}• {{.}}
{{/nextSteps}}

As always, happy to jump on a call if you'd like more detail.

Best,
{{senderName}}`,
    variables: ["firstName", "month", "senderName", "wins", "nextSteps"],
  },
];

// ─── Storage ─────────────────────────────────────────────────────────

const TEMPLATE_STORAGE_KEY = "sw_email_templates";
const SEQUENCE_STORAGE_KEY = "sw_email_sequences";
const SENT_STORAGE_KEY = "sw_sent_emails";

export function saveCustomTemplate(template: EmailTemplate): void {
  const existing = loadCustomTemplates();
  const filtered = existing.filter(t => t.id !== template.id);
  filtered.push(template);
  try { localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(filtered)); } catch { /* silent */ }
}

export function loadCustomTemplates(): EmailTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return [];
}

export function getAllTemplates(): EmailTemplate[] {
  return [...BUILT_IN_TEMPLATES, ...loadCustomTemplates()];
}

export function getTemplatesByCategory(category: EmailTemplate["category"]): EmailTemplate[] {
  return getAllTemplates().filter(t => t.category === category);
}

export function saveSequence(sequence: EmailSequence): void {
  const existing = loadSequences();
  const filtered = existing.filter(s => s.id !== sequence.id);
  filtered.push(sequence);
  try { localStorage.setItem(SEQUENCE_STORAGE_KEY, JSON.stringify(filtered)); } catch { /* silent */ }
}

export function loadSequences(): EmailSequence[] {
  try {
    const raw = localStorage.getItem(SEQUENCE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return [];
}

export function recordSentEmail(email: ComposedEmail): void {
  const existing = loadSentEmails();
  existing.unshift({ ...email, filledAt: new Date().toISOString() });
  try { localStorage.setItem(SENT_STORAGE_KEY, JSON.stringify(existing.slice(0, 200))); } catch { /* silent */ }
}

export function loadSentEmails(): ComposedEmail[] {
  try {
    const raw = localStorage.getItem(SENT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return [];
}

// ─── Composition ─────────────────────────────────────────────────────

/**
 * Compose an email from a template, filling in deck + contact variables.
 */
export function composeEmail(
  templateId: string,
  contact: {
    firstName: string;
    lastName?: string;
    fullName?: string;
    email: string;
    title?: string;
    firmName?: string;
    investorFocus?: string;
    notableInvestment?: string;
  },
  deck?: InvestorDeck | null,
  extraVars?: Record<string, string>,
): ComposedEmail | null {
  const template = getAllTemplates().find(t => t.id === templateId);
  if (!template) return null;

  const fullName = `${contact.firstName} ${contact.lastName || ""}`.trim();
  const contactVars: Record<string, string> = {
    firstName: contact.firstName,
    lastName: contact.lastName || "",
    fullName,
    email: contact.email,
    title: contact.title || "",
    firmName: contact.firmName || "your firm",
    investorFocus: contact.investorFocus || "this space",
    notableInvestment: contact.notableInvestment || "similar companies",
    senderName: extraVars?.senderName || "",
    availability: extraVars?.availability || "Tuesday or Thursday afternoons",
    mutualConnection: extraVars?.mutualConnection || "",
    recentWin: extraVars?.recentWin || "hit several key milestones",
    coInvestors: extraVars?.coInvestors || "several strategic angels",
    month: extraVars?.month || new Date().toLocaleString("en", { month: "long" }),
    wins: extraVars?.wins || "",
    nextSteps: extraVars?.nextSteps || "",
    keyMetrics: deck?.extracted.keyMetrics.map(k => `${k.label}: ${k.value}`).join("\n• ") || "",
  };

  const subject = fillTemplate(template.subject, deck, contactVars);
  const body = fillTemplate(template.body, deck, contactVars);

  return {
    subject,
    body,
    templateId: template.id,
    filledAt: new Date().toISOString(),
    recipientName: contact.fullName || contact.firstName,
    recipientFirm: contact.firmName || "",
    recipientEmail: contact.email,
  };
}

/**
 * Preview a template with all variables filled (for UI preview pane).
 */
export function previewTemplate(
  templateId: string,
  deck?: InvestorDeck | null,
): { subject: string; body: string } | null {
  return composeEmail(
    templateId,
    {
      firstName: "Alex",
      lastName: "Investor",
      email: "alex@firm.com",
      title: "Partner",
      firmName: "Example Ventures",
      investorFocus: "enterprise AI",
      notableInvestment: "DataDog",
    },
    deck,
    {
      senderName: "Your Name",
      availability: "Tuesday or Thursday afternoons",
      mutualConnection: "Jane Smith",
      recentWin: "signed 3 enterprise deals",
      coInvestors: "two top-tier funds",
      wins: "• Signed 3 enterprise customers\n• Launched v2 platform\n• Hit $100K MRR",
      nextSteps: "• Expand sales team\n• Launch enterprise tier\n• Series A raise",
    },
  ) || null;
}

/**
 * Get estimated reading time and character count for an email.
 */
export function getEmailStats(body: string): { chars: number; words: number; readTime: string } {
  const chars = body.length;
  const words = body.split(/\s+/).filter(w => w.length > 0).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return { chars, words, readTime: `${minutes} min read` };
}

/**
 * Export a sequence as a JSON file for download.
 */
export function exportSequence(sequence: EmailSequence): string {
  const templates = getAllTemplates();
  const steps = sequence.steps.map(step => {
    const tmpl = templates.find(t => t.id === step.templateId);
    return {
      ...step,
      templateName: tmpl?.name || step.templateId,
      subject: tmpl?.subject || "",
    };
  });
  return JSON.stringify({ ...sequence, steps }, null, 2);
}
