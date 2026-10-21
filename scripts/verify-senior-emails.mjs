/**
 * Permute and SMTP-verify addresses for senior people who have none.
 *
 * Contactability is 25% of the account score and every company currently scores
 * zero on it, because no address has ever been verified. This generates candidates
 * for senior people at real domains, writes the best-supported one, and probes it.
 *
 * Deliberately conservative: it never overwrites an address that already exists, and
 * it records `unknown` rather than `verified` when the probe cannot decide (a
 * catch-all domain accepts everything, so acceptance proves nothing there).
 *
 * Usage: node scripts/verify-senior-emails.mjs [--limit N] [--dry-run]
 */

import pg from "pg";
import { B2BStore } from "../src/lib/b2b-store.mjs";
import { verifyEmail } from "../src/lib/email-verifier.mjs";
import { permuteEmail } from "../src/lib/scrapers/email-permutator.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) || 50 : 50;

// Only senior people: they are the ones contactability and decision-maker reach
// actually care about, and each probe costs a real SMTP round trip.
const QUERY = `
  select p.id, p.first_name, p.last_name, p.full_name, p.title, p.seniority,
         c.domain, c.name as company_name
  from people p
  join companies c on c.id = p.company_id
  where p.email is null
    and p.seniority in ('owner', 'c_level', 'vp', 'manager')
    and c.domain not like '%.local'
    and c.domain not like '%.github.io'
  order by p.confidence desc, p.seniority asc
  limit $1
`;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const store = new B2BStore(process.env.DATABASE_URL);
  await store.init();

  const result = await store._query(QUERY, [LIMIT]);
  const rows = result.rows;
  console.log(`${rows.length} senior people without an address${DRY_RUN ? " (DRY RUN — no writes)" : ""}\n`);

  const tally = { written: 0, verified: 0, risky: 0, invalid: 0, blocked: 0, skipped: 0 };

  for (const row of rows) {
    const candidates = permuteEmail(row.first_name, row.last_name, row.domain)
      // Skip patterns that collapse to nothing when a name part is missing.
      .filter(address => address && !address.startsWith("@"));
    if (candidates.length === 0) {
      tally.skipped += 1;
      continue;
    }

    // Probe the most common pattern first; if it is accepted, stop rather than
    // spending four more round trips on the same mailbox.
    let chosen = null;
    for (const address of candidates.slice(0, 3)) {
      const verdict = await verifyEmail(address);
      const status = verdict.status;

      if (status === "verified" || status === "risky") {
        chosen = { address, status, reason: verdict.reason };
        break;
      }
      if (!chosen && status === "blocked") {
        chosen = { address, status, reason: verdict.reason };
      }
      tally[status] = (tally[status] || 0) + 1;
    }

    const label = `${row.full_name || `${row.first_name} ${row.last_name}`} @ ${row.domain}`;
    if (!chosen) {
      console.log(`  ?  ${label.padEnd(46)} no acceptable candidate`);
      continue;
    }

    tally[chosen.status] = (tally[chosen.status] || 0) + 1;
    if (!DRY_RUN) {
      await store._query(
        `update people
            set email = $2, email_status = $3, source_url = coalesce(source_url, $4)
          where id = $1 and email is null`,
        [row.id, chosen.address, chosen.status, `https://${row.domain}`],
      );
      tally.written += 1;
    }
    console.log(
      `  ${chosen.status === "verified" ? "✓" : chosen.status === "risky" ? "~" : "!"}  ` +
        `${label.padEnd(46)} ${chosen.address.padEnd(34)} ${chosen.status}`,
    );
  }

  console.log(`\nwritten=${tally.written} verified=${tally.verified} risky=${tally.risky} ` +
    `invalid=${tally.invalid || 0} blocked=${tally.blocked || 0} skipped=${tally.skipped}`);

  await store.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
