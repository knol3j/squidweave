/**
 * Bridge the B2B database into the outreach funnel tables.
 *
 * The B2B database and the funnel are two separate stores that never talked to each
 * other: 193 companies and 1142 people sat in `companies`/`people` while
 * `sourced_contacts` — the table outreach reads — was empty, and `contacts` held 3
 * rows. This closes that gap.
 *
 * The compliance gate decides what is eligible to write, and it is stricter than it
 * first appears. `checkOutreachAllowed` requires a valid consent basis, and OSINT data
 * has none by definition — these people never opted in. So the default run writes
 * nothing, by design.
 *
 * That is the correct outcome, not a bug to route around: harvesting 1142 addresses
 * without consent is what CAN-SPAM and GDPR prohibit, and `DRY_RUN=false` is now live.
 *
 * `--consent-basis` exists for the case where consent genuinely exists (an event list,
 * a gated download). It requires the basis to pass `isValidConsentBasis`, so it cannot
 * be used to launder scraped addresses into "consented" ones.
 *
 * Idempotent: a second run updates rather than duplicates, keyed on (campaign_id, email).
 */

import { B2BStore } from "../src/lib/b2b-store.mjs";
import { checkOutreachAllowed, isRoleAccount } from "../src/lib/compliance-gate.mjs";

const SENIORITY_RANK = {
  c_level: 100, owner: 95, vp: 80, head: 75, director: 70,
  board: 55, manager: 45, individual_contributor: 25,
};

function seniorityScore(seniority) {
  return SENIORITY_RANK[String(seniority || "").toLowerCase()] ?? 20;
}

/** Deterministic id so a re-run updates instead of inserting a duplicate. */
function deterministicId(campaignId, email) {
  // A stable string key is enough: the column is text, and (campaign_id, email) is
  // already unique in practice. Using a hash of both keeps ids stable across runs.
  let h = 0;
  const s = `${campaignId}|${email}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `src_${Math.abs(h).toString(36)}_${email.replace(/[^a-z0-9]/gi, "").slice(0, 24)}`;
}

async function main() {
  const args = process.argv.slice(2);
  const flag = name => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : null;
  };

  const campaignId = flag("campaign") || "generic-enterprise-saas-outbound";
  const limit = Number(flag("limit") || 100000);
  const minRank = Number(flag("min-rank") || 0);
  const dryRun = args.includes("--dry-run");
  const consentBasis = flag("consent-basis");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set — refusing to run against an unknown database.");
    process.exit(1);
  }

  if (!consentBasis && !dryRun) {
    console.error(
      "Refusing to write: no --consent-basis given.\n" +
      "  OSINT-derived contacts have no consent, and the compliance gate will block them\n" +
      "  all. Pass --dry-run to see what is eligible, or --consent-basis <basis> when a\n" +
      "  real lawful basis exists (the basis must pass isValidConsentBasis)."
    );
    process.exit(2);
  }

  const store = new B2BStore(dbUrl);
  await store.init();

  const people = await store.listPeople({ limit });
  const stats = {
    scanned: people.length, noEmail: 0, roleAccount: 0, blockedByGate: 0,
    belowRank: 0, wouldWrite: 0, written: 0, updated: 0,
  };
  const blockReasons = {};

  for (const p of people) {
    if (!p.email) { stats.noEmail++; continue; }
    if (isRoleAccount(p.email)) { stats.roleAccount++; continue; }

    // `listPeople` does `select *`, so the row is snake_case: `company_id`, not
    // `companyId`. Reading the camelCase form silently yields undefined, which makes
    // every company lookup a no-op and leaves `company` blank on all rows.
    const person = await store.getPerson(p.id);
    const company = p.company_id ? await store.getCompany(p.company_id) : null;
    const domain = company?.domain || String(p.email).split("@")[1] || "";

    const verdict = await checkOutreachAllowed({
      store,
      email: p.email,
      consentBasis,
      bounceState: { email_status: person?.emailStatus || "unknown" },
      audit: !dryRun,
    });

    if (!verdict.allowed) {
      stats.blockedByGate++;
      const key = String(verdict.reason || "unknown");
      blockReasons[key] = (blockReasons[key] || 0) + 1;
      continue;
    }

    const rank = seniorityScore(p.seniority);
    if (rank < minRank) { stats.belowRank++; continue; }

    if (dryRun) {
      stats.wouldWrite++;
      if (stats.wouldWrite <= 5) {
        // `listPeople` returns snake_case rows, unlike the rest of the store's methods,
        // so read the column name it actually uses.
        const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "(no name)";
        console.log(`  eligible: ${p.email} | ${name} | ${p.seniority} | rank ${rank}`);
      }
      continue;
    }

    const id = deterministicId(campaignId, p.email);
    // `listPeople` hands back snake_case, so every field below is read from the column
    // name the database actually uses.
    const firstName = p.first_name || "";
    const lastName = p.last_name || "";
    const enrichment = {
      seniority: p.seniority || "", department: p.department || "",
      companyDomain: domain, employeeBand: company?.employee_range || "",
      industry: company?.industry || "", location: company?.location || "",
      emailStatus: person?.email_status || "",
    };
    const fullRecord = { person: p, company: company || null };

    const res = await store._query(
      `insert into sourced_contacts
         (id, campaign_id, email, first_name, last_name, company, title, linkedin_url,
          source, score, status, enrichment, full_record, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'new',$11::jsonb,$12::jsonb,now(),now())
       on conflict (id) do update set
         first_name = excluded.first_name, last_name = excluded.last_name,
         company = excluded.company, title = excluded.title,
         linkedin_url = excluded.linkedin_url, score = excluded.score,
         enrichment = excluded.enrichment, full_record = excluded.full_record,
         updated_at = now()
       returning (xmax = 0) as inserted`,
      [
        id, campaignId, p.email, firstName, lastName,
        company?.name || "", p.title || "", p.linkedin_url || "",
        p.source_type || "b2b-database", rank,
        JSON.stringify(enrichment), JSON.stringify(fullRecord),
      ]
    );
    if (res.rows?.[0]?.inserted) stats.written++; else stats.updated++;
  }

  console.log(dryRun ? "\n=== DRY RUN — nothing written ===" : "\n=== bridge complete ===");
  console.log(JSON.stringify(stats, null, 2));
  if (Object.keys(blockReasons).length) {
    console.log("blocked by gate:", JSON.stringify(blockReasons, null, 2));
  }

  await store.close();
}

main().catch(err => {
  console.error("bridge failed:", err.message);
  process.exit(1);
});
