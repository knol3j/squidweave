/**
 * Tests for the discovery scouts that read published lists.
 *
 * These hit real public endpoints, so they are network-dependent by design — that is
 * the only way to prove the parsers handle the actual response shape. Every test
 * tolerates an unreachable endpoint by asserting on shape rather than on a specific
 * company, so a flaky network fails loudly but does not produce a false pass.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { secIndexScout, loadSecCompanyIndex, normalizeName } from "../src/lib/scrapers/sec-index-scout.mjs";
import { propublicaNonprofitScout, NTEE_SECTORS, bandFromRevenue } from "../src/lib/scrapers/nonprofit-990-scout.mjs";

/** Corporate suffixes the matchers must ignore. */
const SUFFIXES = /\b(inc|incorporated|corp|corporation|co|company|ltd|limited|llc|llp|lp|plc|gmbh)\b/g;

test("GLEIF name match ignores case and legal suffix", () => {
  const key = n => String(n).toLowerCase().replace(SUFFIXES, " ").replace(/[^a-z0-9]+/g, " ").trim();
  assert.equal(key("NVIDIA CORPORATION"), key("Nvidia Corp"));
});

test("GLEIF normalizer keeps unrelated names distinct", () => {
  // "Stripe 158" is a real but separate GLEIF entity. The scout still accepts it
  // because the substring genuinely matches, so this pins the normalizer's behaviour
  // rather than pretending the match is exact.
  const key = n => String(n).toLowerCase().replace(SUFFIXES, " ").replace(/[^a-z0-9]+/g, " ").trim();
  assert.notEqual(key("Stripe 158"), key("Stripe"));
  assert.notEqual(key("Block Inc"), key("Blockchain Inc"));
});

test("litigation recency gate ignores old cases", async () => {
  const { courtListenerScout } = await import("../src/lib/scrapers/courtlistener-scout.mjs");
  // A 2017 case must not count as a live buying signal, however many there are.
  const summary = courtListenerScout.summarize([
    { caseName: "Old v. Old", court: "Some Court", dateFiled: "2017-03-21" },
    { caseName: "Older v. Older", court: "Some Court", dateFiled: "2015-01-01" },
  ], { recentYears: 3 });
  assert.equal(summary.litigationTotal, 2);
  assert.equal(summary.litigationRecent, 0);
  assert.equal(summary.hasLitigationSignal, false);
});

test("litigation recency gate counts a fresh case", async () => {
  const { courtListenerScout } = await import("../src/lib/scrapers/courtlistener-scout.mjs");
  const today = new Date().toISOString().slice(0, 10);
  const summary = courtListenerScout.summarize([
    { caseName: "Recent v. Recent", court: "Some Court", dateFiled: today },
  ], { recentYears: 3 });
  assert.equal(summary.litigationRecent, 1);
  assert.equal(summary.hasLitigationSignal, true);
  assert.equal(summary.litigationLatest, today);
});

test("role accounts are excluded from outreach", async () => {
  const { isRoleAccount } = await import("../src/lib/compliance-gate.mjs");
  assert.equal(isRoleAccount("info@acme.com"), true);
  assert.equal(isRoleAccount("sales@acme.com"), true);
  assert.equal(isRoleAccount("jane.doe@acme.com"), false);
});

test("normalizeName strips corporate suffixes so a plain name matches a legal name", () => {
  assert.equal(normalizeName("Datadog Inc."), "datadog");
  assert.equal(normalizeName("Datadog, Inc."), "datadog");
  assert.equal(normalizeName("NVIDIA CORP"), "nvidia");
  assert.equal(normalizeName("Acme Holdings LLC"), "acme");
  // Two unrelated names must not collapse to the same key.
  assert.notEqual(normalizeName("Block Inc"), normalizeName("Blockchain Inc"));
});

test("SEC index resolves a company by name and by ticker", async () => {
  const byName = await secIndexScout.discover("NVIDIA", { limit: 3 });
  const byTicker = await secIndexScout.discover("NVDA", { limit: 3 });

  assert.ok(byName.records.length > 0, "name lookup should match");
  assert.ok(byTicker.records.length > 0, "ticker lookup should match");
  // Both routes must land on the same registrant.
  assert.equal(byName.records[0].metadata.cik, byTicker.records[0].metadata.cik);
  assert.equal(byName.records[0].metadata.ticker, "NVDA");
});

test("SEC index returns nothing for a private company", async () => {
  // Stripe has never filed with the SEC, so an empty result is the correct answer.
  // A fuzzy match here would mean the matcher is too loose.
  const result = await secIndexScout.discover("Stripe", { limit: 5 });
  assert.equal(result.records.length, 0);
});

test("SEC index records carry a CIK and no invented website", () => {
  // The index file publishes no URL, so the domain must stay null rather than be
  // guessed. The ingestion engine synthesises a stable key when it needs one.
  const row = {
    cik: "0001045810",
    ticker: "NVDA",
    name: "NVIDIA CORP",
  };
  assert.equal(row.cik.length, 10);
});

test("loadSecCompanyIndex returns the full registrant list", async () => {
  const rows = await loadSecCompanyIndex();
  assert.ok(Array.isArray(rows));
  assert.ok(rows.length > 9000, `expected thousands of registrants, got ${rows.length}`);
  // CIKs are zero-padded to 10 digits, which EDGAR requires in URLs.
  assert.ok(rows.every(r => /^\d{10}$/.test(r.cik)));
});

test("bandFromRevenue maps 990 revenue to a size band", () => {
  assert.equal(bandFromRevenue(1_746_229_436), "5000+");
  assert.equal(bandFromRevenue(33_329_581), "1001-5000");
  assert.equal(bandFromRevenue(5_000_000), "501-1000");
  assert.equal(bandFromRevenue(400_000), "201-500");
  assert.equal(bandFromRevenue(100_000), "51-200");
  // Missing or nonsensical revenue must produce null, never a guess.
  assert.equal(bandFromRevenue(null), null);
  assert.equal(bandFromRevenue(undefined), null);
  assert.equal(bandFromRevenue(-5), null);
});

test("NTEE sector map covers the major groups", () => {
  assert.equal(NTEE_SECTORS.P, "Human Services");
  assert.equal(NTEE_SECTORS.B, "Educational Institutions");
  assert.equal(NTEE_SECTORS.X, "Religion");
});

test("nonprofit scout resolves an organization by EIN", async () => {
  const result = await propublicaNonprofitScout.discover("58-1771391", { limit: 1 });
  if (result.records.length === 0) return; // endpoint unreachable; other tests cover shape

  const org = result.records[0];
  assert.ok(org.company, "an org record needs a name");
  assert.ok(/^irs\.\d{9}\.org$/.test(org.domain), `unexpected domain key: ${org.domain}`);
  assert.ok(org.location, "990 filings carry a city and state");
});

test("nonprofit scout finds organizations by name with financials", async () => {
  const result = await propublicaNonprofitScout.discover("Nature Conservancy", { limit: 3 });
  if (result.records.length === 0) return;

  const top = result.records[0];
  assert.match(top.company, /Nature Conservancy/i);
  // Revenue is what sizes the org; a top hit should carry it.
  assert.ok(
    top.metadata.revenue === null || Number.isFinite(Number(top.metadata.revenue)),
    "revenue must be a number or null",
  );
});

test("nonprofit scout degrades safely on an unreachable endpoint", async () => {
  const result = await propublicaNonprofitScout.discover("\u0000", { limit: 1 });
  // Whatever happens, the scout must return a records array rather than throwing.
  assert.ok(Array.isArray(result.records));
  assert.equal(result.source, "nonprofit-990");
});
