import fs from 'fs';

const STATE_PATH = '/home/gnul/squidweave/data/state.json';
const CONNECTOR_PATH = '/home/gnul/squidweave/src/connectors/vc-sourcing-connector.mjs';

const src = fs.readFileSync(CONNECTOR_PATH, 'utf8');
const match = src.match(/const SEED_VC_FUNDS = (\[[\s\S]*?\]);/);
const funds = eval(match[1]);

const uniqueDomains = [...new Set(funds.map(f => f.domain))];
console.log('Fund entries:', funds.length, '| Unique domains:', uniqueDomains.length);

const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

const existingEmails = new Set((state.sourcedContacts || []).map(c => c.email));
const existingFunds = new Set((state.investorRecords || []).map(r => r.fund));

let addedPrimary = 0;
let addedSecondary = 0;
let skippedExisting = 0;

const primaryContacts = [];
const secondaryContacts = [];
const fundRecords = [];

for (const domain of uniqueDomains) {
  const primaryEmail = `partner@${domain}`;
  if (!existingEmails.has(primaryEmail)) {
    primaryContacts.push({
      firstName: "partner",
      lastName: "",
      jobTitle: "Partner",
      email: primaryEmail,
      source: "pattern-email-guess",
      sourceMix: ["pattern-guess"],
      enrichmentStatus: "pending",
      confidence: 0.3,
      notes: "pattern-generator"
    });
    addedPrimary++;
  } else {
    skippedExisting++;
  }

  for (const prefix of ["info", "contact", "hello"]) {
    const secEmail = `${prefix}@${domain}`;
    if (!existingEmails.has(secEmail)) {
      secondaryContacts.push({
        firstName: "",
        lastName: "",
        jobTitle: "",
        email: secEmail,
        source: "pattern-email-guess",
        sourceMix: ["pattern-guess", "secondary-pattern"],
        enrichmentStatus: "pending",
        confidence: 0.2,
        notes: "pattern-generator"
      });
      addedSecondary++;
    }
  }

  const domainFunds = funds.filter(f => f.domain === domain);
  for (const f of domainFunds) {
    if (!existingFunds.has(f.fund)) {
      fundRecords.push({
        fund: f.fund,
        domain: f.domain,
        sectors: f.sectors,
        stage: f.stage,
        geo: f.geo,
        sourcedContactEmails: [primaryEmail, ...["info", "contact", "hello"].map(p => `${p}@${domain}`)]
      });
    }
  }
}

state.sourcedContacts = [...(state.sourcedContacts || []), ...primaryContacts, ...secondaryContacts];
state.investorRecords = fundRecords;

console.log('');
console.log('Generated:', addedPrimary, 'primary,', addedSecondary, 'secondary');
console.log('Skipped (existing):', skippedExisting);
console.log('Investor records created:', fundRecords.length);

const tmpPath = STATE_PATH + '.tmp';
fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
fs.renameSync(tmpPath, STATE_PATH);

const verify = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
console.log('Final SC:', (verify.sourcedContacts || []).length);
console.log('Final IR:', (verify.investorRecords || []).length);

const pg = verify.sourcedContacts.filter(c => c.sourceMix?.includes('pattern-guess') && !c.sourceMix?.includes('secondary-pattern'));
const sec = verify.sourcedContacts.filter(c => c.sourceMix?.includes('secondary-pattern'));
console.log('Pattern-primary:', pg.length, '| Pattern-secondary:', sec.length);
