import { sendEmail } from '../src/adapters/email.mjs';
import fs from 'node:fs';

/*
 * VC Outreach Execution Script
 * Run: node scripts/send-vc-outreach.mjs
 * Requires: SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL in .env
 */

const VC_TARGETS = [
  {
    name: 'Ryan Hoover',
    firm: 'Weekend Fund',
    email: 'ryan@weekend.fund',
    checkSize: '$100K-$300K',
    focus: 'Product-led, developer tools, emerging markets',
    personalHook: "Product Hunt founder — HashNHedge is exactly the kind of product-led tool your portfolio loves"
  },
  {
    name: 'Harry Stebbings',
    firm: '20VC Fund',
    email: 'harry@thetwentyminutevc.com',
    checkSize: '$100K-$300K',
    focus: 'SaaS, B2B, AI infrastructure',
    personalHook: "20VC audience of builders — our miners are your listeners, turning idle hardware into revenue"
  },
  {
    name: 'Zach Bratun-Glennon',
    firm: 'Gradient Ventures',
    email: 'invest@gradient.com',
    checkSize: '$1M-$10M',
    focus: 'AI, ML infrastructure',
    personalHook: "Google AI fund — we use Gemini-class models for real-time mining optimization"
  },
  {
    name: 'Dylan Field',
    firm: 'Figma (Angel)',
    email: 'dylan@figma.com',
    checkSize: 'Variable',
    focus: 'Design tools, developer tools',
    personalHook: "Figma democratized design — we are democratizing crypto mining revenue optimization"
  },
  {
    name: 'Sunil Pai',
    firm: 'Angel Collective',
    email: 'sunil@angelfund.vc',
    checkSize: '$100K-$1M',
    focus: 'Generalist, ex-DFJ',
    personalHook: "Ex-DFJ operator — you understand that infrastructure plays need strong technical moats"
  },
  {
    name: 'Beth Turner',
    firm: 'SV Angel',
    email: 'beth@svangel.com',
    checkSize: '$100K-$500K',
    focus: 'Generalist, San Francisco',
    personalHook: "SF-based — we are a Bay Area team building at the intersection of AI and crypto infrastructure"
  },
  {
    name: 'Alvaro Alvarez del Rio',
    firm: 'Boost Capital Partners',
    email: 'alvaro@boostcap.com',
    checkSize: '$300K-$750K',
    focus: 'Generalist, $35M fund',
    personalHook: "London-based seed fund — we have strong EU miner traction and need a US-Europe bridge investor"
  },
  {
    name: 'Brendon Blacker',
    firm: 'W23 Global',
    email: 'brendon@w23.global',
    checkSize: '$100K-$5M',
    focus: 'Deep Tech, Singapore',
    personalHook: "Deep tech focus — our AI optimization engine is 3 years of R&D in production"
  }
];

const COMPANY = {
  name: 'HashNHedge',
  oneLiner: 'AI-powered crypto mining optimization that increases profitability by 23% through real-time profit switching',
  traction: '$12.5K MRR, 347 users, 1,240 mining devices, 34% MoM growth',
  raising: '$750K pre-seed SAFE at $8M cap',
  team: '3 founders: serial fintech entrepreneur (prior exit), ex-Google DeepMind ML engineer, full-stack lead',
  market: '$4.2B SAM (retail & mid-size mining ops)',
  edge: 'Only platform using Gemini-grade AI to analyze 47 real-time variables for automatic coin switching. 23% avg yield increase vs 8-12% for rule-based competitors.'
};

function buildEmail(vc) {
  const subject = `${COMPANY.name} — ${COMPANY.traction.split(',')[0]} seeking ${COMPANY.raising}`;
  const text = `Hi ${vc.name.split(' ')[0]},

${COMPANY.oneLiner}. We're at ${COMPANY.traction}.

Why now: Post-halving, miners are desperate for yield optimization. Our AI engine analyzes 47 real-time variables (difficulty, mempool, energy price, volatility) to automatically switch miners to the most profitable coin. Result: 23% average yield increase vs 8-12% for rule-based competitors.

Team: ${COMPANY.team}

Raising: ${COMPANY.raising}

${vc.personalHook}. Would you be open to a 20-minute call next Tuesday or Wednesday?

Best,
HashNHedge Founding Team
https://hashnhedge.com (placeholder)`;

  const html = `<p>Hi ${vc.name.split(' ')[0]},</p>
<p>${COMPANY.oneLiner}. We're at ${COMPANY.traction}.</p>
<p><strong>Why now:</strong> Post-halving, miners are desperate for yield optimization. Our AI engine analyzes 47 real-time variables (difficulty, mempool, energy price, volatility) to automatically switch miners to the most profitable coin. Result: <strong>23% average yield increase</strong> vs 8-12% for rule-based competitors.</p>
<p><strong>Team:</strong> ${COMPANY.team}</p>
<p><strong>Raising:</strong> ${COMPANY.raising}</p>
<p>${vc.personalHook}. Would you be open to a 20-minute call next Tuesday or Wednesday?</p>
<p>Best,<br>HashNHedge Founding Team<br>https://hashnhedge.com (placeholder)</p>`;

  return { subject, text, html };
}

async function main() {
  const results = [];
  const dryRun = process.env.DRY_RUN === 'true';

  console.log(`\n🚀 Sending ${VC_TARGETS.length} VC outreach emails${dryRun ? ' (DRY RUN)' : ''}...\n`);

  for (const vc of VC_TARGETS) {
    const { subject, text, html } = buildEmail(vc);
    console.log(`→ ${vc.name} (${vc.firm}) <${vc.email}>`);
    console.log(`  Subject: ${subject}`);

    if (dryRun) {
      results.push({ ok: true, dryRun: true, to: vc.email, name: vc.name });
      console.log(`  ✅ DRY RUN — not sent\n`);
      continue;
    }

    const result = await sendEmail({ to: vc.email, subject, text, html });
    results.push({ ...result, name: vc.name, firm: vc.firm });

    if (result.ok) {
      console.log(`  ✅ SENT\n`);
    } else {
      console.log(`  ❌ FAILED: ${result.error}\n`);
    }

    // Rate limit: 2 seconds between sends
    await new Promise(r => setTimeout(r, 2000));
  }

  // Save results
  const logPath = `data/vc-outreach-${Date.now()}.json`;
  fs.writeFileSync(logPath, JSON.stringify({ sentAt: new Date().toISOString(), results }, null, 2));
  console.log(`\n📁 Results saved to ${logPath}`);

  const sent = results.filter(r => r.ok).length;
  console.log(`📊 Summary: ${sent}/${VC_TARGETS.length} emails sent successfully`);
}

main().catch(console.error);
