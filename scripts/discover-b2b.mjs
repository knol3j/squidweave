/**
 * Bulk-discover companies and nonprofits into the B2B database.
 *
 * The per-target seed script knows 57 companies by hand. This uses the sources that
 * publish a *list* rather than requiring a name up front, so the database grows
 * without a human curating targets:
 *
 *   - SEC company index: 10,445 registrants in one request. Filtered by ticker so
 *     the batch is deterministic, then each CIK is handed to the Form 4 scout to
 *     pull named officers.
 *   - ProPublica 990s: nonprofits carry revenue, assets, and a mailing address,
 *     which the corporate sources do not publish.
 *
 * Every write goes through identity-keyed upserts, so re-running adds nothing.
 *
 * Usage:
 *   node scripts/discover-b2b.mjs --sec 100          (first 100 SEC registrants)
 *   node scripts/discover-b2b.mjs --nonprofits 50    (50 nonprofits by name seed)
 *   node scripts/discover-b2b.mjs --sec 200 --nonprofits 50 --officers
 */

import { B2BStore } from "../src/lib/b2b-store.mjs";
import { B2BIngestionEngine } from "../src/lib/b2b-ingestion-engine.mjs";
import { secIndexScout, loadSecCompanyIndex } from "../src/lib/scrapers/sec-index-scout.mjs";
import { secEdgarScout } from "../src/lib/scrapers/sec-edgar-scout.mjs";
import { propublicaNonprofitScout } from "../src/lib/scrapers/nonprofit-990-scout.mjs";
import { githubOrgScout } from "../src/lib/scrapers/github-org-scout.mjs";
import { scoreAllCompanies } from "../src/lib/account-scoring-engine.mjs";

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? Number(process.argv[i + 1]) || fallback : fallback;
}

// Nonprofit names chosen to span sectors, so `byIndustry` is meaningful in the UI
// rather than one repeated value.
const NONPROFIT_SEEDS = [
  "Nature Conservancy", "American Red Cross", "Wikimedia", "Feeding America",
  "Habitat for Humanity", "Goodwill Industries", "Boys and Girls Clubs",
  "United Way", "Salvation Army", "Doctors Without Borders",
  "American Cancer Society", "Make-A-Wish Foundation", "Special Olympics",
  "ASPCA", "World Wildlife Fund", "Planned Parenthood",
  "Rotary International", "Kiwanis International", "YMCA",
  "Teach For America", "City Year", "Year Up",
  "Wikimedia Foundation", "Electronic Frontier Foundation", "Apache Software Foundation",
  "Mozilla Foundation", "Python Software Foundation", "Linux Foundation",
  "Creative Commons", "Internet Archive",
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const secCount = argValue("--sec", 0);
  const nonprofitCount = argValue("--nonprofits", 0);
  const withOfficers = process.argv.includes("--officers");

  if (secCount === 0 && nonprofitCount === 0) {
    console.log("Nothing requested. Try: --sec 100 --nonprofits 50 --officers");
    process.exit(0);
  }

  const store = new B2BStore(process.env.DATABASE_URL);
  await store.init();
  const engine = new B2BIngestionEngine({
    store,
    scouts: [secIndexScout, secEdgarScout, propublicaNonprofitScout, githubOrgScout],
  });

  const before = await store.stats();
  console.log(`before: ${before.companies} companies, ${before.people} people\n`);

  let addedCompanies = 0;
  let addedPeople = 0;

  if (secCount > 0) {
    console.log(`=== SEC index: ${secCount} registrants ===`);
    const rows = await loadSecCompanyIndex();
    // Deterministic slice: alphabetical by name, so two runs cover the same ground.
    const batch = [...rows].sort((a, b) => a.name.localeCompare(b.name)).slice(0, secCount);

    for (const row of batch) {
      process.stdout.write(`  ${(row.ticker || row.cik).padEnd(7)} ${String(row.name).slice(0, 34).padEnd(36)}`);
      try {
        const result = await engine.ingestFromScout("sec-index", row.name, { limit: 1 });
        addedCompanies += result.companiesNew;

        // Officers are a second, per-company request, so they are opt-in.
        if (withOfficers) {
          const officerResult = await engine.ingestFromScout("sec-edgar", row.name, {
            limit: 1,
            companyDomain: null,
          });
          addedPeople += officerResult.peopleNew;
          process.stdout.write(` +${result.companiesNew}co +${officerResult.peopleNew}pp\n`);
        } else {
          console.log(` +${result.companiesNew}co`);
        }
      } catch (error) {
        console.log(` ERROR ${error.message}`);
      }
    }
  }

  if (nonprofitCount > 0) {
    console.log(`\n=== nonprofits: ${Math.min(nonprofitCount, NONPROFIT_SEEDS.length)} seeds ===`);
    const seeds = NONPROFIT_SEEDS.slice(0, nonprofitCount);
    for (const name of seeds) {
      process.stdout.write(`  ${name.slice(0, 38).padEnd(40)}`);
      try {
        const result = await engine.ingestFromScout("nonprofit-990", name, { limit: 1 });
        addedCompanies += result.companiesNew;
        console.log(` +${result.companiesNew}co`);
      } catch (error) {
        console.log(` ERROR ${error.message}`);
      }
    }
  }

  console.log("\n=== scoring ===");
  const { scored, skipped } = await scoreAllCompanies(store);
  console.log(`scored ${scored} companies${skipped.length ? ` (skipped ${skipped.length})` : ""}`);

  const after = await store.stats();
  console.log(
    `\nafter: ${after.companies} companies (+${after.companies - before.companies}), ` +
      `${after.people} people (+${after.people - before.people})`,
  );
  console.log(`by source: ${JSON.stringify(after.bySource)}`);

  await store.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
