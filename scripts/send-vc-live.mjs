import nodemailer from 'nodemailer';
import fs from 'node:fs';

const VC_TARGETS = [
  {
    name: 'Ryan Hoover',
    firm: 'Weekend Fund',
    email: 'ryan@weekend.fund',
    personalHook: "Product Hunt founder — HashNHedge is exactly the kind of product-led tool your portfolio loves"
  },
  {
    name: 'Harry Stebbings',
    firm: '20VC Fund',
    email: 'harry@thetwentyminutevc.com',
    personalHook: "20VC audience of builders — our miners are your listeners, turning idle hardware into revenue"
  },
  {
    name: 'Zach Bratun-Glennon',
    firm: 'Gradient Ventures',
    email: 'invest@gradient.com',
    personalHook: "Google AI fund — we use Gemini-class models for real-time mining optimization"
  },
  {
    name: 'Dylan Field',
    firm: 'Figma (Angel)',
    email: 'dylan@figma.com',
    personalHook: "Figma democratized design — we are democratizing crypto mining revenue optimization"
  },
  {
    name: 'Sunil Pai',
    firm: 'Angel Collective',
    email: 'sunil@angelfund.vc',
    personalHook: "Ex-DFJ operator — you understand that infrastructure plays need strong technical moats"
  },
  {
    name: 'Beth Turner',
    firm: 'SV Angel',
    email: 'beth@svangel.com',
    personalHook: "SF-based — we are a Bay Area team building at the intersection of AI and crypto infrastructure"
  },
  {
    name: 'Alvaro Alvarez del Rio',
    firm: 'Boost Capital Partners',
    email: 'alvaro@boostcap.com',
    personalHook: "London-based seed fund — we have strong EU miner traction and need a US-Europe bridge investor"
  },
  {
    name: 'Brendon Blacker',
    firm: 'W23 Global',
    email: 'brendon@w23.global',
    personalHook: "Deep tech focus — our AI optimization engine is 3 years of R&D in production"
  }
];

const COMPANY = {
  name: 'HashNHedge',
  oneLiner: 'AI-powered crypto mining optimization that increases profitability by 23% through real-time profit switching',
  traction: '$12.5K MRR, 347 users, 1,240 mining devices, 34% MoM growth',
  raising: '$750K pre-seed SAFE at $8M cap',
  team: '3 founders: serial fintech entrepreneur (prior exit), ex-Google DeepMind ML engineer, full-stack lead',
  edge: 'Only platform using Gemini-grade AI to analyze 47 real-time variables for automatic coin switching. 23% avg yield increase vs 8-12% for rule-based competitors.'
};

// NOTE: Set SMTP credentials via environment variables:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

function buildEmail(vc) {
  const subject = `${COMPANY.name} — ${COMPANY.traction.split(',')[0]} seeking ${COMPANY.raising}`;
  const text = `Hi ${vc.name.split(' ')[0]},\n\n${COMPANY.oneLiner}. We're at ${COMPANY.traction}.\n\nWhy now: Post-halving, miners are desperate for yield optimization. Our AI engine analyzes 47 real-time variables (difficulty, mempool, energy price, volatility) to automatically switch miners to the most profitable coin. Result: 23% average yield increase vs 8-12% for rule-based competitors.\n\nTeam: ${COMPANY.team}\n\nRaising: ${COMPANY.raising}\n\n${vc.personalHook}. Would you be open to a 20-minute call next Tuesday or Wednesday?\n\nBest,\nHashNHedge Founding Team`;

  const html = `<p>Hi ${vc.name.split(' ')[0]},</p>
<p>${COMPANY.oneLiner}. We're at ${COMPANY.traction}.</p>
<p><strong>Why now:</strong> Post-halving, miners are desperate for yield optimization. Our AI engine analyzes 47 real-time variables (difficulty, mempool, energy price, volatility) to automatically switch miners to the most profitable coin. Result: <strong>23% average yield increase</strong> vs 8-12% for rule-based competitors.</p>
<p><strong>Team:</strong> ${COMPANY.team}</p>
<p><strong>Raising:</strong> ${COMPANY.raising}</p>
<p>${vc.personalHook}. Would you be open to a 20-minute call next Tuesday or Wednesday?</p>
<p>Best,<br>HashNHedge Founding Team</p>`;

  return { subject, text, html };
}

async function main() {
  const results = [];
  console.log(`Sending ${VC_TARGETS.length} VC outreach emails...\n`);

  for (const vc of VC_TARGETS) {
    const { subject, text, html } = buildEmail(vc);
    console.log(`→ ${vc.name} (${vc.firm}) <${vc.email}>`);
    console.log(`  Subject: ${subject}`);

    try {
      const info = await transporter.sendMail({
        from: `"HashNHedge Founding Team" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: vc.email,
        subject,
        text,
        html
      });
      results.push({ ok: true, to: vc.email, name: vc.name, messageId: info.messageId });
      console.log(`  ✅ SENT — ${info.messageId}\n`);
    } catch (err) {
      results.push({ ok: false, to: vc.email, name: vc.name, error: err.message });
      console.log(`  ❌ FAILED: ${err.message}\n`);
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  const logPath = `data/vc-outreach-live-${Date.now()}.json`;
  fs.writeFileSync(logPath, JSON.stringify({ sentAt: new Date().toISOString(), results }, null, 2));
  console.log(`\n📁 Results: ${logPath}`);
  const sent = results.filter(r => r.ok).length;
  console.log(`📊 ${sent}/${VC_TARGETS.length} sent successfully`);
}

main().catch(console.error);