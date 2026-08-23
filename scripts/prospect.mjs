#!/usr/bin/env node
import { ProspectingEngine } from '../src/lib/prospecting.mjs';

const icp = {
  description: process.argv[2] || 'AI/crypto infrastructure startups',
  keyword: process.argv[3] || 'crypto mining',
  language: process.argv[4] || 'Python',
  industry: 'crypto',
  minStars: 10,
  preferredLanguages: ['Python','TypeScript','Rust','Go']
};

console.log(`SquidWeave Prospecting Funnel v1.0`);
console.log(`Target: ${icp.description}`);
console.log(`---`);

const engine = new ProspectingEngine({ maxLeads: 30 });
engine.run(icp).then(leads => {
  console.log(`---`);
  console.log(`Top 10 leads:`);
  leads.slice(0,10).forEach((l, i) => {
    console.log(`${i+1}. ${l.name} (${l.domain || 'no domain'}) — Score: ${l.score}/20`);
    if (l.emails?.length) console.log(`   Emails: ${l.emails.slice(0,3).join(', ')}`);
    if (l.jobs?.hiring) console.log(`   Hiring: ${l.jobs.boards.join(', ')}`);
  });
}).catch(console.error);
