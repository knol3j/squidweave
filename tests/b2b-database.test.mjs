/**
 * B2B database tests. Uses node:test like the rest of this project.
 *
 * The two database-backed suites must not share tables: node:test runs describe
 * blocks concurrently, and each suite truncates in `before`, so one suite's setup
 * deletes the other's rows mid-run. Each suite therefore uses its own domain
 * namespace and only deletes what it created, in `after`.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { B2BStore, normalizeDomain, nameCompanyKey } from "../src/lib/b2b-store.mjs";
import { B2BIngestionEngine } from "../src/lib/b2b-ingestion-engine.mjs";
import { extractPeople } from "../src/lib/scrapers/team-page-scout.mjs";
import { seniorityFromFilingTitle, normalizeEdgarName } from "../src/lib/scrapers/sec-edgar-scout.mjs";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://squidweave:squidweave@127.0.0.1:5432/squidweave";

async function purgeDomain(client, domain) {
  // Delete children before parents to respect the foreign keys.
  await client.query(
    `delete from people_dedupe_index where person_id in
       (select id from people where company_id in (select id from companies where domain = $1))`,
    [domain],
  );
  await client.query(
    `delete from people where company_id in (select id from companies where domain = $1)`,
    [domain],
  );
  await client.query(
    `delete from company_sources where company_id in (select id from companies where domain = $1)`,
    [domain],
  );
  await client.query(`delete from account_scores where company_id in (select id from companies where domain = $1)`, [domain]);
  await client.query(`delete from companies where domain = $1`, [domain]);
}

describe("name parsing", () => {
  test("EDGAR surname-first names parse to given name first", () => {
    const parsed = normalizeEdgarName("SMITH BRADFORD L");
    assert.equal(parsed.firstName, "Bradford");
    assert.equal(parsed.lastName, "Smith");
    assert.equal(parsed.fullName, "Bradford L Smith");
    assert.equal(parsed.nameOrderUncertain, false);
  });

  test("EDGAR two-part name", () => {
    const parsed = normalizeEdgarName("KRESS COLETTE");
    assert.equal(parsed.firstName, "Colette");
    assert.equal(parsed.lastName, "Kress");
  });

  test("EDGAR three-part name without initial is flagged uncertain, not reordered", () => {
    // "HUANG JEN HSUN" is genuinely given-name-first, but the filing carries no
    // signal to prove it. Guessing corrupts the common surname-first case, so the
    // row is flagged for a human instead of silently reordered.
    const parsed = normalizeEdgarName("HUANG JEN HSUN");
    assert.equal(parsed.nameOrderUncertain, true);
  });

  test("empty and whitespace input returns null", () => {
    assert.equal(normalizeEdgarName(""), null);
    assert.equal(normalizeEdgarName("   "), null);
    assert.equal(normalizeEdgarName(null), null);
  });
});

describe("team-page extraction", () => {
  test("name on its own line, title on next", () => {
    assert.deepEqual(extractPeople("Jane Doe\nVP Engineering"), [
      { fullName: "Jane Doe", title: "VP Engineering", section: "staff" },
    ]);
  });

  test("name dash title on one line", () => {
    assert.deepEqual(extractPeople("Jane Doe - VP Engineering"), [
      { fullName: "Jane Doe", title: "VP Engineering", section: "staff" },
    ]);
  });

  test("name comma title on one line", () => {
    assert.deepEqual(extractPeople("Jane Doe, Chief Executive Officer"), [
      { fullName: "Jane Doe", title: "Chief Executive Officer", section: "staff" },
    ]);
  });

  test("section heading is not a person", () => {
    assert.deepEqual(extractPeople("Our Team\nJohn Smith\nHead of Sales"), [
      { fullName: "John Smith", title: "Head of Sales", section: "staff" },
    ]);
  });

  test("bare title line is dropped", () => {
    assert.deepEqual(extractPeople("VP Engineering"), []);
  });

  test("alumni titles are dropped", () => {
    // Regression: Linear's about page lists "Former CTO | Afterpay" with the
    // past-tense marker in the name field rather than the title.
    assert.deepEqual(extractPeople("Former CTO - Afterpay"), []);
    assert.deepEqual(extractPeople("Jane Doe\nFormer VP of Sales"), []);
  });

  test("investor and advisor sections are tagged non_staff", () => {
    // Regression: Linear's about page lists "Patrick Collison | CEO, Stripe"
    // under an Investors heading. Those are real people at other companies and
    // must never be stored as Linear staff.
    assert.deepEqual(
      extractPeople("Team\nKarri Saarinen\nCo-founder, CEO\nInvestors\nPatrick Collison\nCEO, Stripe"),
      [
        { fullName: "Karri Saarinen", title: "Co-founder, CEO", section: "staff" },
        { fullName: "Patrick Collison", title: "CEO, Stripe", section: "non_staff" },
      ],
    );
  });

  test("product titles that look like names are not people", () => {
    // Regression: basecamp.com/about lists "Shape Up | Manager Playbook".
    assert.deepEqual(extractPeople("Shape Up\nManager Playbook"), []);
  });

  test("email lines are not names", () => {
    assert.deepEqual(extractPeople("jane@acme.com\nVP Engineering"), []);
  });

  test("duplicate person within one page is collapsed", () => {
    assert.deepEqual(extractPeople("Jane Doe\nVP Engineering\nJane Doe\nVP Engineering"), [
      { fullName: "Jane Doe", title: "VP Engineering", section: "staff" },
    ]);
  });
});

describe("seniority from filing title", () => {
  test("chief roles are c_level", () => {
    assert.equal(seniorityFromFilingTitle("EVP & Chief Financial Officer"), "c_level");
    assert.equal(seniorityFromFilingTitle("Chief Accounting Officer"), "c_level");
  });

  test("CEO is owner", () => {
    assert.equal(seniorityFromFilingTitle("President and CEO"), "owner");
  });

  test("vice president is vp", () => {
    assert.equal(seniorityFromFilingTitle("Vice Chair and President"), "vp");
    assert.equal(seniorityFromFilingTitle("EVP, Worldwide Field Ops"), "vp");
  });

  test("unknown title yields unknown", () => {
    assert.equal(seniorityFromFilingTitle(""), "unknown");
    assert.equal(seniorityFromFilingTitle("Consultant"), "individual_contributor");
  });
});

describe("dedupe keys", () => {
  test("normalizeDomain strips scheme, www, path, trailing dot", () => {
    assert.equal(normalizeDomain("https://www.Example.com/path"), "example.com");
    assert.equal(normalizeDomain("example.com."), "example.com");
    assert.equal(normalizeDomain(""), null);
    assert.equal(normalizeDomain(null), null);
  });

  test("nameCompanyKey works for firstName/lastName shape", () => {
    assert.equal(
      nameCompanyKey({ firstName: "Jen", lastName: "Huang", companyDomain: "nvidia.com" }),
      "jen huang@nvidia.com",
    );
  });

  test("nameCompanyKey works for fullName shape", () => {
    // Regression: the team-page scout emits fullName only. A key that read only
    // firstName/lastName returned null, which silently disabled dedupe for it and
    // created a duplicate row on every re-ingest.
    assert.equal(
      nameCompanyKey({ fullName: "Karri Saarinen", companyDomain: "linear.app" }),
      "karri saarinen@linear.app",
    );
  });

  test("nameCompanyKey prefers explicit name parts", () => {
    assert.equal(
      nameCompanyKey({ firstName: "Jen", lastName: "Huang", fullName: "Wrong Name", companyDomain: "a.com" }),
      "jen huang@a.com",
    );
  });

  test("nameCompanyKey is case and whitespace insensitive", () => {
    assert.equal(
      nameCompanyKey({ fullName: "  Karri   Saarinen  ", companyDomain: "linear.app" }),
      nameCompanyKey({ fullName: "Karri Saarinen", companyDomain: "linear.app" }),
    );
  });
});

describe("b2b store against postgres", () => {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  let store;
  const ownedDomains = ["acme.test", "multi.test", "people.test", "coa.test", "cob.test", "verify.test"];

  before(async () => {
    await client.connect();
    await Promise.all(ownedDomains.map(domain => purgeDomain(client, domain)));
    store = new B2BStore(DATABASE_URL);
    await store.init();
  });

  after(async () => {
    await Promise.all(ownedDomains.map(domain => purgeDomain(client, domain)));
    await store.close();
    await client.end();
  });

  async function countCompanies(domain) {
    const { rows } = await client.query(`select count(*)::int as n from companies where domain = $1`, [domain]);
    return rows[0].n;
  }

  async function countPeople(domain) {
    const { rows } = await client.query(
      `select count(*)::int as n from people where company_id in
         (select id from companies where domain = $1)`,
      [domain],
    );
    return rows[0].n;
  }

  test("company upsert is idempotent on domain", async () => {
    const first = await store.upsertCompany({ domain: "acme.test", name: "Acme" }, { type: "sec-edgar" });
    assert.ok(first.id);
    const second = await store.upsertCompany({ domain: "acme.test", name: "Acme" }, { type: "sec-edgar" });
    assert.equal(second.id, first.id);
    assert.equal(await countCompanies("acme.test"), 1);
  });

  test("confidence rises with more independent sources and never exceeds 1", async () => {
    const company = await store.upsertCompany({ domain: "multi.test", name: "Multi" }, { type: "sec-edgar" });
    assert.ok(Math.abs(company.confidence - 0.95) < 0.001);
    const withJob = await store.upsertCompany({ domain: "multi.test" }, { type: "job-board" });
    assert.ok(withJob.confidence > 0.95);
    await store.upsertCompany({ domain: "multi.test" }, { type: "whois" });
    await store.upsertCompany({ domain: "multi.test" }, { type: "github" });
    const final = await store.getCompanyByDomain("multi.test");
    assert.ok(final.confidence <= 1);
  });

  test("person upsert dedupes by name+company", async () => {
    const company = await store.upsertCompany({ domain: "people.test", name: "People Co" }, { type: "sec-edgar" });
    const first = await store.upsertPerson(
      { companyId: company.id, fullName: "Jane Doe", title: "VP Sales" },
      { type: "sec-edgar" },
    );
    const second = await store.upsertPerson(
      { companyId: company.id, fullName: "Jane Doe", title: "VP Sales" },
      { type: "sec-edgar" },
    );
    assert.equal(second.id, first.id);
    assert.equal(await countPeople("people.test"), 1);
  });

  test("same name at a different company is not merged", async () => {
    const companyA = await store.upsertCompany({ domain: "coa.test", name: "A" }, { type: "sec-edgar" });
    const companyB = await store.upsertCompany({ domain: "cob.test", name: "B" }, { type: "sec-edgar" });
    const personA = await store.upsertPerson({ companyId: companyA.id, fullName: "Sam Lee" }, { type: "sec-edgar" });
    const personB = await store.upsertPerson({ companyId: companyB.id, fullName: "Sam Lee" }, { type: "sec-edgar" });
    assert.notEqual(personA.id, personB.id);
  });

  test("email status starts unknown and transitions to verified", async () => {
    const company = await store.upsertCompany({ domain: "verify.test", name: "V" }, { type: "sec-edgar" });
    const person = await store.upsertPerson(
      { companyId: company.id, fullName: "Bob Ray", email: "bob@verify.test" },
      { type: "sec-edgar" },
    );
    // The store returns raw column names, matching the rest of this codebase.
    assert.equal(person.email_status, "unknown");
    await store.updateEmailStatus(person.id, "verified", new Date().toISOString());
    const updated = await store.getPerson(person.id);
    assert.equal(updated.email_status, "verified");
    assert.ok(updated.email_verified_at);
  });
});

describe("ingestion engine", () => {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  let store;
  let engine;
  // A synthetic domain keeps this suite's rows disjoint from the store suite's.
  const DOMAIN = "edgar.test-corp.local";

  before(async () => {
    await client.connect();
    await purgeDomain(client, DOMAIN);
    store = new B2BStore(DATABASE_URL);
    await store.init();
    // Stub scouts so this suite never touches the network. The live sources are
    // exercised by the verification script; these tests cover the write path.
    const stubScout = (name, records) => ({
      name,
      async health() {
        return { ok: true };
      },
      async discover() {
        return { source: name, records };
      },
    });
    engine = new B2BIngestionEngine({
      store,
      scouts: [
        stubScout("sec-edgar", [
          {
            domain: null,
            company: "Test Corp",
            industry: "Software",
            people: [
              { fullName: "Amy Chen", title: "CEO", seniority: "owner" },
              { fullName: "Ben Diaz", title: "VP Sales", seniority: "vp" },
            ],
          },
        ]),
        stubScout("team-page", [
          {
            domain: "stub.test",
            company: "Stub Co",
            people: [
              { fullName: "Cara Fox", title: "CTO", section: "staff" },
              { fullName: "Dan Roe", title: "CEO, Elsewhere", section: "non_staff" },
            ],
          },
        ]),
      ],
    });
  });

  after(async () => {
    await purgeDomain(client, DOMAIN);
    await purgeDomain(client, "stub.test");
    await store.close();
    await client.end();
  });

  test("ingests companies and people", async () => {
    const run = await engine.ingestFromScout("sec-edgar", "Test Corp");
    assert.equal(run.companiesNew, 1);
    assert.equal(run.peopleNew, 2);
    const company = await store.getCompanyByDomain(DOMAIN);
    assert.ok(company);
    assert.equal((await store.listPeople({ companyId: company.id })).length, 2);
  });

  test("re-ingest creates no new rows", async () => {
    const run = await engine.ingestFromScout("sec-edgar", "Test Corp");
    assert.equal(run.companiesNew, 0);
    assert.equal(run.peopleNew, 0);
    assert.equal(run.companiesSeen, 1);
    const company = await store.getCompanyByDomain(DOMAIN);
    assert.equal((await store.listPeople({ companyId: company.id })).length, 2);
    // Regression: the dedupe key was built from whatever company field the caller
    // populated, so `findPerson` searched a different key than the index write
    // produced and every re-ingest duplicated every person.
    const { rows } = await client.query(
      `select count(*)::int as n from people where company_id in (select id from companies where domain = $1)`,
      [DOMAIN],
    );
    assert.equal(rows[0].n, 2);
  });

  test("company with no domain still stores its people", async () => {
    // EDGAR filings often leave the website field blank. Dropping those rows
    // would discard the best free officer data available.
    const company = await store.getCompanyByDomain(DOMAIN);
    assert.ok(company);
    assert.equal(company.name, "Test Corp");
  });

  test("non_staff people are skipped", async () => {
    const run = await engine.ingestFromScout("team-page", "stub.test");
    assert.equal(run.peopleNew, 1);
    assert.equal(run.skippedPeople.length, 1);
    assert.equal(run.skippedPeople[0].reason, "section:non_staff");
  });

  test("unknown scout throws", async () => {
    await assert.rejects(() => engine.ingestFromScout("no-such-scout", "x"), /Unknown scout/);
  });

  test("a throwing scout does not abort ingestAll", async () => {
    engine.scouts.push({
      name: "broken",
      async health() {
        return { ok: false, note: "down" };
      },
      async discover() {
        throw new Error("upstream 500");
      },
    });
    const runs = await engine.ingestAll({ "sec-edgar": "Test Corp", broken: "x" });
    assert.equal(runs.length, 3);
    assert.match(runs.find(r => r.scout === "broken").error, /500/);
    engine.scouts = engine.scouts.filter(s => s.name !== "broken");
  });
});
