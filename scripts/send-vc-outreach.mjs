import { sendEmail } from '../src/adapters/email.mjs';
import fs from 'node:fs';

/*
 * VC Outreach Execution Script
 * Run: node scripts/send-vc-outreach.mjs [path-to-targets.json]
 * Requires: SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL in .env
 *
 * Targets JSON format:
 * [
 *   { "name": "...", "firm": "...", "email": "...", "checkSize": "...", "focus": "...", "personalHook": "..." }
 * ]
 */

const COMPANY = {
  name: process.env.COMPANY_NAME || 'Your Company',
  oneLiner: process.env.COMPANY_ONE_LINER || 'Brief value proposition',
  traction: process.env.COMPANY_TRACTION || 'Traction summary',
  raising: process.env.COMPANY_RAISING || 'Funding round',
  team: process.env.COMPANY_TEAM || 'Team summary',
  market: process.env.COMPANY_MARKET || 'Market summary',
  edge: process.env.COMPANY_EDGE || 'Key differentiator',
};

function loadTargets(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const targets = JSON.parse(raw);
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error('Targets file must contain a non-empty array');
  }
  for (const t of targets) {
    if (!t.email || !t.name) {
      throw new Error('Each target must have name and email');
    }
  }
  return targets;
}

function buildEmail(vc) {
  const subject = `${COMPANY.name} — ${COMPANY.traction.split(',')[0]} seeking ${COMPANY.raising}`;
  const text = `Hi ${vc.name.split(' ')[0]},

${COMPANY.oneLiner}. We're at ${COMPANY.traction}.

Why now: ${COMPANY.edge}

Team: ${COMPANY.team}

Raising: ${COMPANY.raising}

${vc.personalHook}. Would you be open to a 20-minute call next Tuesday or Wednesday?

Best,
${COMPANY.name} Team`;

  const html = `<p>Hi ${vc.name.split(' ')[0]},</p>
<p>${COMPANY.oneLiner}. We're at ${COMPANY.traction}.</p>
<p><strong>Why now:</strong> ${COMPANY.edge}</p>
<p><strong>Team:</strong> ${COMPANY.team}</p>
<p><strong>Raising:</strong> ${COMPANY.raising}</p>
<p>${vc.personalHook}. Would you be open to a 20-minute call next Tuesday or Wednesday?</p>
<p>Best,<br>${COMPANY.name} Team</p>`;

  return { subject, text, html };
}

async function main() {
  const targetsPath = process.argv[2] || process.env.VC_TARGETS_PATH || 'data/vc-targets.json';
  let VC_TARGETS;
  try {
    VC_TARGETS = loadTargets(targetsPath);
  } catch (err) {
    console.error(`Failed to load targets from ${targetsPath}:`, err.message);
    console.error('Copy data/vc-targets.example.json to data/vc-targets.json and fill in real targets.');
    process.exit(1);
  }

  const results = [];
  const dryRun = process.env.DRY_RUN === 'true';

  console.log(`\n🚀 Sending ${VC_TARGETS.length} VC outreach emails${dryRun ? ' (DRY RUN)' : ''}...\n`);

  for (const vc of VC_TARGETS) {
    const { subject, text, html } = buildEmail(vc);
    console.log(`→ ${vc.name} (${vc.firm || 'n/a'}) <${vc.email}>`);
    console.log(`  Subject: ${subject}`);

    if (dryRun) {
      results.push({ ok: true, to: vc.email, name: vc.name, dryRun: true });
      console.log('  ✅ DRY RUN — not sent\n');
      continue;
    }

    try {
      const result = await sendEmail({ to: vc.email, subject, text, html });
      if (result.ok) {
        results.push({ ok: true, to: vc.email, name: vc.name });
        console.log('  ✅ SENT\n');
      } else {
        results.push({ ok: false, to: vc.email, name: vc.name, error: result.error });
        console.log(`  ❌ FAILED: ${result.error}\n`);
      }
    } catch (err) {
      results.push({ ok: false, to: vc.email, name: vc.name, error: err.message });
      console.log(`  ❌ FAILED: ${err.message}\n`);
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  const logPath = `data/vc-outreach-${Date.now()}.json`;
  fs.writeFileSync(logPath, JSON.stringify({ sentAt: new Date().toISOString(), results }, null, 2));
  console.log(`\n📁 Results: ${logPath}`);
  console.log(`Summary: ${results.filter(r => r.ok).length} ok, ${results.filter(r => !r.ok).length} failed`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
