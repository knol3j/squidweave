/**
 * Account scoring and compliance gate tests. Uses node:test like the rest of the
 * project. The compliance suite uses its own domain namespace and purges only
 * what it created, so it does not collide with the other database-backed suites.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { B2BStore } from "../src/lib/b2b-store.mjs";
import { scoreCompany, scoreAllCompanies, rankCompanies, WEIGHTS } from "../src/lib/account-scoring-engine.mjs";
import {
  checkOutreachAllowed,
  recordSuppression,
  isRoleAccount,
  isValidConsentBasis,
  normalizeEmail,
} from "../src/lib/compliance-gate.mjs";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://squidweave:squidweave@127.0.0.1:5432/squidweave";

describe("pure compliance helpers", () => {
  test("normalizeEmail lowercases and trims", () => {
    assert.equal(normalizeEmail("  Jane.Doe@ACME.com "), "jane.doe@acme.com");
    assert.equal(normalizeEmail("no-at-sign"), null);
    assert.equal(normalizeEmail(null), null);
    assert.equal(normalizeEmail(42), null);
  });

  test("isRoleAccount catches functional mailboxes", () => {
    for (const email of [
      "postmaster@acme.com",
      "noreply@acme.com",
      "no-reply@acme.com",
      "abuse@acme.com",
      "support@acme.com",
      "webmaster@acme.com",
      "info@acme.com",
      "sales@acme.com",
    ]) {
      assert.ok(isRoleAccount(email), email);
    }
  });

  test("isRoleAccount passes real people through", () => {
    for (const email of ["jane.doe@acme.com", "jdoe@acme.com", "jane@acme.com", "postmaster.jane@acme.com"]) {
      assert.ok(!isRoleAccount(email), email);
    }
  });

  test("consent bases are an explicit allowlist", () => {
    assert.ok(isValidConsentBasis("explicit_opt_in"));
    assert.ok(isValidConsentBasis("legitimate_interest"));
    assert.ok(!isValidConsentBasis("because_i_said_so"));
    assert.ok(!isValidConsentBasis(""));
    assert.ok(!isValidConsentBasis(undefined));
  });
});

describe("account scoring (pure)", () => {
  const company = (over = {}) => ({
    id: "c1",
    domain: "acme.test",
    confidence: 0.8,
    employee_range: "51-200",
    tech_stack: [],
    source_urls: [],
    ...over,
  });

  test("a senior, verified, hiring company outscores a junior one with no data", () => {
    const strong = scoreCompany(null, company(), [
      { full_name: "Amy Chen", seniority: "owner", email: "amy@acme.test", email_status: "verified" },
    ]);
    const weak = scoreCompany(null, company(), [
      { full_name: "Cara Fox", seniority: "individual_contributor", email: null, email_status: "unknown" },
    ]);
    assert.ok(strong.score > weak.score, `${strong.score} should exceed ${weak.score}`);
  });

  test("score is always clamped to 0..1", () => {
    const maxed = scoreCompany(
      null,
      company({ confidence: 1, tech_stack: ["hiring:sdr", "hiring:sales", "hiring:account-executive"], employee_range: "51-200" }),
      Array.from({ length: 10 }, (_, i) => ({
        full_name: `P${i}`,
        seniority: "c_level",
        email: `p${i}@acme.test`,
        email_status: "verified",
      })),
    );
    assert.ok(maxed.score >= 0 && maxed.score <= 1, `score ${maxed.score} out of range`);

    const empty = scoreCompany(null, company({ confidence: 0, employee_range: null }), []);
    assert.equal(empty.score, 0);
  });

  test("every component is present and carries a reason", () => {
    const result = scoreCompany(null, company(), []);
    for (const key of Object.keys(WEIGHTS)) {
      assert.ok(key in result.components, `missing component ${key}`);
      assert.equal(typeof result.components[key].value, "number", `${key}.value not a number`);
      assert.ok(result.components[key].reason, `${key} has no reason`);
    }
  });

  test("weights sum to 1 so the score is a true weighted average", () => {
    const total = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `weights sum to ${total}, expected 1`);
  });

  test("missing signals contribute zero rather than an assumed default", () => {
    // Regression guard: a company with no data must not score like an average one.
    const noData = scoreCompany(null, company({ confidence: 0, employee_range: null, tech_stack: [] }), []);
    assert.equal(noData.score, 0);
    assert.equal(noData.components.hiringSignal.value, 0);
    assert.equal(noData.components.firmographicFit.value, 0);
    assert.equal(noData.components.contactability.value, 0);
  });

  test("hiring signal rewards sales and marketing roles specifically", () => {
    const gtm = scoreCompany(
      null,
      company({ tech_stack: ["hiring:sdr", "hiring:account-executive", "hiring:marketing-manager"] }),
      [],
    );
    const other = scoreCompany(
      null,
      company({ tech_stack: ["hiring:backend-engineer", "hiring:data-scientist", "hiring:devops"] }),
      [],
    );
    assert.ok(gtm.components.hiringSignal.value > other.components.hiringSignal.value);
  });

  test("a senior person with no address is worth less than one with an address", () => {
    const reachable = scoreCompany(null, company(), [
      { full_name: "A", seniority: "c_level", email: "a@acme.test", email_status: "verified" },
    ]);
    const unreachable = scoreCompany(null, company(), [
      { full_name: "A", seniority: "c_level", email: null, email_status: "unknown" },
    ]);
    assert.ok(reachable.components.decisionMakerReach.value > unreachable.components.decisionMakerReach.value);
  });
});

describe("compliance gate against postgres", () => {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  let store;
  const DOMAIN = "compliance-gate.test";

  async function purge() {
    await client.query(
      `delete from compliance_events where subject like '%@${DOMAIN}' or subject like '%@www.${DOMAIN}'`,
    );
    await client.query(`delete from suppression_list where email like '%@${DOMAIN}'`);
    await client.query(`delete from domain_suppression where domain = $1`, [DOMAIN]);
    await client.query(
      `delete from people_dedupe_index where person_id in
         (select id from people where company_id in (select id from companies where domain = $1))`,
      [DOMAIN],
    );
    await client.query(
      `delete from people where company_id in (select id from companies where domain = $1)`,
      [DOMAIN],
    );
    await client.query(
      `delete from company_sources where company_id in (select id from companies where domain = $1)`,
      [DOMAIN],
    );
    await client.query(`delete from companies where domain = $1`, [DOMAIN]);
  }

  before(async () => {
    await client.connect();
    await purge();
    store = new B2BStore(DATABASE_URL);
    await store.init();

    const company = await store.upsertCompany({ domain: DOMAIN, name: "Gate Co" }, { type: "sec-edgar" });
    await store.upsertPerson(
      { companyId: company.id, fullName: "Amy Chen", email: `amy@${DOMAIN}` },
      { type: "sec-edgar" },
    );
  });

  after(async () => {
    await purge();
    await store.close();
    await client.end();
  });

  test("a clean address with a valid basis is allowed", async () => {
    const result = await checkOutreachAllowed({
      store,
      email: `fresh.person@${DOMAIN}`,
      consentBasis: "legitimate_interest",
    });
    assert.equal(result.allowed, true);
    assert.match(result.reason, /^allow:/);
  });

  test("no consent basis blocks (fail-closed)", async () => {
    const result = await checkOutreachAllowed({ store, email: `fresh.person@${DOMAIN}` });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "consent:missing");
  });

  test("an unrecognized consent basis blocks", async () => {
    const result = await checkOutreachAllowed({
      store,
      email: `fresh.person@${DOMAIN}`,
      consentBasis: "vibes",
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "consent:missing");
  });

  test("a role account blocks unless explicitly allowed", async () => {
    const blocked = await checkOutreachAllowed({
      store,
      email: `postmaster@${DOMAIN}`,
      consentBasis: "legitimate_interest",
    });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.reason, "role_account");

    const allowed = await checkOutreachAllowed({
      store,
      email: `postmaster@${DOMAIN}`,
      consentBasis: "legitimate_interest",
      allowRoleAccounts: true,
    });
    assert.equal(allowed.allowed, true);
  });

  test("a hard bounce blocks but does not create a permanent suppression", async () => {
    // A bounce is a block, not an opt-out: the address stays re-probeable.
    const person = await store.getPersonByEmail(`amy@${DOMAIN}`);
    await store.updateEmailStatus(person.id, "invalid");

    const result = await checkOutreachAllowed({
      store,
      email: `AMY@${DOMAIN}`,
      consentBasis: "legitimate_interest",
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "email:hard_bounce");
    assert.equal(await store.getSuppression(`amy@${DOMAIN}`), null);
  });

  test("an unverifiable address blocks", async () => {
    const person = await store.getPersonByEmail(`amy@${DOMAIN}`);
    await store.updateEmailStatus(person.id, "blocked");
    const result = await checkOutreachAllowed({
      store,
      email: `amy@${DOMAIN}`,
      consentBasis: "legitimate_interest",
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "email:verification_blocked");
  });

  test("an unsubscribe blocks, case-insensitively", async () => {
    await recordSuppression({ store, email: `Ben@${DOMAIN}`, reason: "unsubscribe", source: "link_click" });
    const result = await checkOutreachAllowed({
      store,
      email: `ben@${DOMAIN}`,
      consentBasis: "legitimate_interest",
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "suppression:unsubscribe");
  });

  test("a spam complaint is permanent even when an expiry is supplied", async () => {
    // Honouring an opt-out is not something a timestamp should override.
    await recordSuppression({
      store,
      email: `cara@${DOMAIN}`,
      reason: "spam_complaint",
      source: "abuse_report",
      expiresAt: new Date(Date.now() + 86400000),
    });
    const entry = await store.getSuppression(`cara@${DOMAIN}`);
    assert.ok(entry);
    assert.equal(entry.expires_at, null);
    const result = await checkOutreachAllowed({
      store,
      email: `cara@${DOMAIN}`,
      consentBasis: "legitimate_interest",
    });
    assert.equal(result.allowed, false);
  });

  test("a temporary suppression expires and stops blocking", async () => {
    await store.upsertSuppression({
      email: `temp@${DOMAIN}`,
      reason: "soft_bounce",
      expiresAt: new Date(Date.now() - 1000),
    });
    assert.equal(await store.getSuppression(`temp@${DOMAIN}`), null);
  });

  test("domain suppression blocks every address at that domain", async () => {
    await store.upsertDomainSuppression({
      domain: DOMAIN,
      reason: "no_solicitation_policy",
      detail: "website ToS",
    });
    const result = await checkOutreachAllowed({
      store,
      email: `someone.new@${DOMAIN}`,
      consentBasis: "legitimate_interest",
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "domain:no_solicitation_policy");
  });

  test("every decision is audited, including the blocks", async () => {
    const events = await store.listComplianceEvents({ limit: 500 });
    const mine = events.filter(e => String(e.subject).endsWith(`@${DOMAIN}`));
    assert.ok(mine.length > 0, "no audit rows recorded");
    assert.ok(mine.some(e => e.decision === "block"), "no blocked decision audited");
    for (const event of mine) {
      assert.ok(event.reason, "audit row without a reason");
    }
  });
});

describe("scoring and ranking against postgres", () => {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  let store;
  const DOMAIN = "scoring-gate.test";

  async function purge() {
    await client.query(`delete from account_scores where company_id in (select id from companies where domain = $1)`, [DOMAIN]);
    await client.query(
      `delete from people_dedupe_index where person_id in
         (select id from people where company_id in (select id from companies where domain = $1))`,
      [DOMAIN],
    );
    await client.query(`delete from people where company_id in (select id from companies where domain = $1)`, [DOMAIN]);
    await client.query(`delete from company_sources where company_id in (select id from companies where domain = $1)`, [DOMAIN]);
    await client.query(`delete from companies where domain = $1`, [DOMAIN]);
  }

  before(async () => {
    await client.connect();
    await purge();
    store = new B2BStore(DATABASE_URL);
    await store.init();

    const hot = await store.upsertCompany(
      { domain: DOMAIN, name: "Hot", employeeRange: "51-200", industry: "SaaS" },
      { type: "sec-edgar" },
    );
    const ceo = await store.upsertPerson(
      { companyId: hot.id, fullName: "Amy Chen", title: "CEO", seniority: "owner", email: `amy@${DOMAIN}` },
      { type: "sec-edgar" },
    );
    await store.updateEmailStatus(ceo.id, "verified", new Date().toISOString());
    await store.upsertCompany(
      {
        domain: DOMAIN,
        techStack: ["hiring:account-executive", "hiring:sdr", "hiring:backend-engineer"],
      },
      { type: "job-board" },
    );

    const cold = await store.upsertCompany(
      { domain: "cold.scoring-gate.test", name: "Cold", employeeRange: "1-10" },
      { type: "directory" },
    );
    await store.upsertPerson(
      { companyId: cold.id, fullName: "Zed Roe", title: "Intern", seniority: "individual_contributor" },
      { type: "directory" },
    );
  });

  after(async () => {
    await purge();
    await client.query(`delete from account_scores where company_id in (select id from companies where domain = $1)`, ["cold.scoring-gate.test"]);
    await client.query(`delete from people where company_id in (select id from companies where domain = $1)`, ["cold.scoring-gate.test"]);
    await client.query(`delete from company_sources where company_id in (select id from companies where domain = $1)`, ["cold.scoring-gate.test"]);
    await client.query(`delete from companies where domain = $1`, ["cold.scoring-gate.test"]);
    await store.close();
    await client.end();
  });

  test("scoreAllCompanies scores and persists", async () => {
    const { scored } = await scoreAllCompanies(store);
    assert.ok(scored >= 2);
    const saved = await store.getAccountScore(
      (await store.getCompanyByDomain(DOMAIN)).id,
    );
    assert.ok(saved);
    assert.ok(Number(saved.score) > 0);
    assert.ok(saved.components && typeof saved.components === "object");
  });

  test("re-scoring updates in place instead of adding rows", async () => {
    const before = await client.query(
      `select count(*)::int as n from account_scores s join companies c on c.id = s.company_id
       where c.domain in ($1, $2)`,
      [DOMAIN, "cold.scoring-gate.test"],
    );
    await scoreAllCompanies(store);
    const after = await client.query(
      `select count(*)::int as n from account_scores s join companies c on c.id = s.company_id
       where c.domain in ($1, $2)`,
      [DOMAIN, "cold.scoring-gate.test"],
    );
    assert.equal(after.rows[0].n, before.rows[0].n);
  });

  test("rankCompanies returns best-first and the strong account leads", async () => {
    const ranked = await rankCompanies(store, { limit: 50 });
    assert.ok(ranked.length >= 2);
    for (let i = 1; i < ranked.length; i += 1) {
      assert.ok(
        Number(ranked[i - 1].score) >= Number(ranked[i].score),
        "ranking is not sorted descending",
      );
    }
    assert.equal(ranked[0].domain, DOMAIN);
  });

  test("minScore filters the tail", async () => {
    const all = await rankCompanies(store, { limit: 50 });
    const top = await rankCompanies(store, { limit: 50, minScore: 0.6 });
    assert.ok(top.length <= all.length);
    for (const row of top) {
      assert.ok(Number(row.score) >= 0.6);
    }
  });
});
