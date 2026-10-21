/**
 * Enrich companies already in the database from the other sources.
 *
 * Discovery adds a company row before it knows anything about that company, so the
 * cheapest scout to run first (the SEC index, one request for 10,000 rows) leaves
 * rows with a name and nothing else — no location, no industry, no people. Those
 * rows score near zero and are the bulk of the low tail.
 *
 * This walks the existing companies and re-runs the richer scouts against each one,
 * so rows gain people and firmographics without a new discovery pass.
 *
 * Which scouts run per company, and in what order:
 *   1. sec-edgar  — officers from Form 4 filings, plus SIC industry. Highest value.
 *   2. github-org — location and an employee band. Free and always available.
 *   3. team-page  — staff, section-tagged. Only worth trying when we have a domain.
 *
 * Every write is an identity-keyed upsert, so re-running adds nothing.
 *
 * Usage:
 *   node scripts/enrich-b2b.mjs --limit 100            (worst-scoring first)
 *   node scripts/enrich-b2b.mjs --limit 50 --min-people 1
 */

import { B2BStore } from "../src/lib/b2b-store.mjs";
import { B2BIngestionEngine } from "../src/lib/b2b-ingestion-engine.mjs";
import { secEdgarScout } from "../src/lib/scrapers/sec-edgar-scout.mjs";
import { githubOrgScout } from "../src/lib/scrapers/github-org-scout.mjs";
import { teamPageScout } from "../src/lib/scrapers/team-page-scout.mjs";
import { scoreAllCompanies } from "../src/lib/account-scoring-engine.mjs";

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
}

/**
 * Companies to enrich: those with the fewest sources first, because a row with one
 * source is the one most likely to be a name-only stub. Ties break on domain so the
 * batch is deterministic.
 */
const CANDIDATE_QUERY = `
  select c.id, c.domain, c.name,
         (select count(*) from people p where p.company_id = c.id) as people,
         (select count(*) from company_sources cs where cs.company_id = c.id) as sources,
         coalesce(s.score, 0) as score
  from companies c
  left join account_scores s on s.company_id = c.id
  where c.domain not like '%.local'
  order by sources asc, people asc, score asc, c.domain asc
  limit $1
`;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const limit = argValue("--limit", 100);
  const maxPeople = argValue("--max-people", Infinity);

  const store = new B2BStore(process.env.DATABASE_URL);
  await store.init();
  const engine = new B2BIngestionEngine({
    store,
    scouts: [secEdgarScout, githubOrgScout, teamPageScout],
  });

  const result = await store._query(CANDIDATE_QUERY, [limit]);
  const rows = result.rows.filter(row => row.people < maxPeople);
  console.log(`enriching ${rows.length} companies (fewest sources first)\n`);

  let gainedPeople = 0;
  let gainedFirmographics = 0;

  for (const row of rows) {
    // The org login is the domain's registrable label, which is what GitHub uses for
    // most companies ("stripe.com" -> "stripe"). Skip multi-label domains where the
    // guess would be wrong more often than right.
    const label = row.domain.split(".")[0];
    const guessableOrg = /^[a-z0-9-]{3,}$/i.test(label) && row.domain.split(".").length === 2;

    const jobs = [
      // Officers carry SIC industry, so this runs before GitHub writes a band.
      // `companyDomain` is essential: EDGAR filings carry no website field, so
      // without it the engine synthesises a second company row (`edgar.<name>.local`)
      // and the officers land there instead of on the company we already have.
      ["sec-edgar", row.name, { limit: 1, companyDomain: row.domain }],
    ];
    if (guessableOrg) jobs.push(["github-org", label, {}]);
    // A team page is worth a read only when the domain is real and short.
    if (guessableOrg && !row.domain.includes(".")) jobs.push(["team-page", row.domain, {}]);

    const before = await store._queryOne(
      "select (select count(*) from people p where p.company_id = $1) as people",
      [row.id],
    );

    let added = 0;
    const notes = [];
    for (const [scout, query, options] of jobs) {
      try {
        const r = await engine.ingestFromScout(scout, query, options);
        added += r.peopleNew;
        if (r.companiesNew > 0 || r.peopleUpdated > 0) notes.push(`${scout}:+${r.companiesNew}co/${r.peopleNew}pp`);
      } catch (error) {
        notes.push(`${scout}:ERR`);
      }
    }

    const after = await store._queryOne(
      "select (select count(*) from people p where p.company_id = $1) as people",
      [row.id],
    );
    const delta = (after?.people || 0) - (before?.people || 0);
    gainedPeople += delta;
    if (notes.length > 0) gainedFirmographics += 1;

    console.log(
      `  ${row.domain.padEnd(28)} ${row.people}->${after?.people || 0} people ` +
        `[${row.sources} src] ${notes.join(" ")}`,
    );
  }

  console.log("\n=== scoring ===");
  const { scored, skipped } = await scoreAllCompanies(store);
  console.log(`rescored ${scored} companies${skipped.length ? ` (skipped ${skipped.length})` : ""}`);

  const stats = await store.stats();
  console.log(
    `\nnow: ${stats.companies} companies, ${stats.people} people (+${gainedPeople} from this run)`,
  );
  const spread = await store._queryOne("select min(score) as lo, max(score) as hi, round(avg(score),3) as avg from account_scores");
  console.log(`score spread: ${spread.lo} .. ${spread.hi} (avg ${spread.avg})`);

  await store.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
