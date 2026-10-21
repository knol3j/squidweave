/**
 * Seed the B2B database from real public sources.
 *
 * The database is empty right now because every test run purges its own
 * namespaced test data. That is correct test hygiene, but it leaves nothing for
 * the frontend to render, so this pulls real companies and people from the scouts
 * that read public data: SEC Form 4 filings (named officers), job board APIs
 * (hiring signals), and team pages.
 *
 * Idempotent — the store uses identity-keyed upserts, so re-running adds nothing.
 *
 * Usage: node scripts/seed-b2b.mjs
 */

import { B2BStore } from "../src/lib/b2b-store.mjs";
import { B2BIngestionEngine } from "../src/lib/b2b-ingestion-engine.mjs";
import { secEdgarScout } from "../src/lib/scrapers/sec-edgar-scout.mjs";
import { jobBoardScout } from "../src/lib/scrapers/job-board-scout.mjs";
import { teamPageScout } from "../src/lib/scrapers/team-page-scout.mjs";
import { githubOrgScout } from "../src/lib/scrapers/github-org-scout.mjs";
import { scoreAllCompanies } from "../src/lib/account-scoring-engine.mjs";

/**
 * Each entry says which scout to run and what to give it. Only companies the
 * chosen scout can actually find are listed: EDGAR needs the company name exactly
 * as it appears in filings, GitHub needs the org login, and the job boards and team
 * page need a real domain.
 *
 * `github` is the cheapest win and runs first for most entries, because it is the
 * only free source that supplies a location and an employee band.
 */
const TARGETS = [
  { domain: "nvidia.com", edgar: "NVIDIA CORP", github: "nvidia" },
  { domain: "microsoft.com", edgar: "MICROSOFT CORP", github: "microsoft" },
  { domain: "datadoghq.com", edgar: "DATADOG, INC.", github: "datadog" },
  { domain: "snowflake.com", edgar: "Snowflake Inc.", github: "snowflakedb" },
  { domain: "cloudflare.com", edgar: "CLOUDFLARE, INC.", github: "cloudflare" },
  { domain: "hashicorp.com", edgar: "HashiCorp Inc", github: "hashicorp" },
  { domain: "gitlab.com", edgar: "GitLab Inc.", github: "gitlab-com" },
  { domain: "twilio.com", edgar: "TWILIO, INC.", github: "twilio" },
  { domain: "okta.com", edgar: "OKTA, INC.", github: "okta" },
  { domain: "splunk.com", edgar: "SPLUNK INC.", github: "splunk" },
  { domain: "hubspot.com", edgar: "HUBSPOT, INC.", github: "hubspot" },
  { domain: "zendesk.com", edgar: "ZENDESK, INC.", github: "zendesk" },
  { domain: "dropbox.com", edgar: "Dropbox, Inc.", github: "dropbox" },
  { domain: "etsy.com", edgar: "ETSY, INC.", github: "etsy" },
  { domain: "pinterest.com", edgar: "Pinterest, Inc.", github: "pinterest" },
  { domain: "robinhood.com", edgar: "Robinhood Markets, Inc.", github: "robinhood" },
  { domain: "block.xyz", edgar: "Block, Inc.", github: "block" },
  { domain: "airbnb.com", edgar: "Airbnb, Inc.", github: "airbnb" },
  { domain: "uber.com", edgar: "UBER TECHNOLOGIES, INC.", github: "uber" },
  { domain: "lyft.com", edgar: "LYFT, INC.", github: "lyft" },
  { domain: "doordash.com", edgar: "DoorDash, Inc.", github: "doordash" },
  { domain: "asana.com", edgar: "ASANA, INC.", github: "asana" },
  { domain: "atlassian.com", edgar: "Atlassian Corp Plc", github: "atlassian" },
  { domain: "mongodb.com", edgar: "MongoDB, Inc.", github: "mongodb" },
  { domain: "elastic.co", edgar: "Elastic N.V.", github: "elastic" },
  { domain: "confluent.io", edgar: "Confluent, Inc.", github: "confluentinc" },
  { domain: "unity.com", edgar: "Unity Software Inc.", github: "unity-technologies" },
  { domain: "roblox.com", edgar: "Roblox Corp", github: "roblox" },
  { domain: "bumble.com", edgar: "BUMBLE INC.", github: "bumble" },
  { domain: "sofi.com", edgar: "SoFi Technologies, Inc.", github: "sofi" },
  { domain: "stripe.com", github: "stripe", jobBoard: "stripe.com" },
  { domain: "linear.app", github: "linear", teamPage: "linear.app" },
  { domain: "figma.com", github: "figma", teamPage: "figma.com" },
  { domain: "vercel.com", github: "vercel" },
  { domain: "supabase.com", github: "supabase" },
  { domain: "netlify.com", github: "netlify" },
  { domain: "render.com", github: "render" },
  { domain: "retool.com", github: "tryretool" },
  { domain: "airtable.com", github: "airtable" },
  { domain: "notion.so", github: "makenotion" },
  { domain: "postman.com", github: "postmanlabs" },
  { domain: "circleci.com", github: "circleci" },
  { domain: "pagerduty.com", github: "PagerDuty" },
  { domain: "newrelic.com", github: "newrelic" },
  { domain: "dbt-labs.com", github: "dbt-labs" },
  { domain: "fivetran.com", github: "fivetran" },
  { domain: "sentry.io", github: "getsentry" },
  { domain: "planetscale.com", github: "planetscale" },
  { domain: "fly.io", github: "superfly" },
  { domain: "railway.com", github: "railwayapp" },
  { domain: "deno.com", github: "denoland" },
  { domain: "astro.build", github: "withastro" },
  { domain: "remix.run", github: "remix-run" },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — nothing to seed into.");
    process.exit(1);
  }

  const store = new B2BStore(process.env.DATABASE_URL);
  await store.init();

  const engine = new B2BIngestionEngine({
    store,
    scouts: [secEdgarScout, jobBoardScout, teamPageScout, githubOrgScout],
  });

  const before = await store.stats();
  console.log(`before: ${before.companies} companies, ${before.people} people\n`);

  console.log("=== ingesting ===");
  for (const target of TARGETS) {
    const jobs = [];
    // GitHub first: it supplies firmographics the other sources do not, so the
    // company row is as complete as possible before anything else writes to it.
    if (target.github) jobs.push(["github-org", target.github]);
    if (target.edgar) jobs.push(["sec-edgar", target.edgar]);
    if (target.jobBoard) jobs.push(["job-board", target.jobBoard]);
    if (target.teamPage) jobs.push(["team-page", target.teamPage]);

    for (const [scoutName, query] of jobs) {
      process.stdout.write(`  ${target.domain.padEnd(16)} ${scoutName.padEnd(11)} `);
      try {
        const result = await engine.ingestFromScout(scoutName, query, { companyDomain: target.domain });
        console.log(
          `+${result.companiesNew}co +${result.peopleNew}pp ` +
            `(~${result.peopleUpdated || 0} updated)`,
        );
      } catch (error) {
        console.log(`ERROR: ${error.message}`);
      }
    }
  }

  console.log("\n=== scoring ===");
  const { scored } = await scoreAllCompanies(store);
  console.log(`scored ${scored} companies`);

  const after = await store.stats();
  console.log(`\nafter: ${after.companies} companies, ${after.people} people`);
  console.log(`by email status: ${JSON.stringify(after.byEmailStatus)}`);
  console.log(`by source:       ${JSON.stringify(after.bySource)}`);

  await store.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
