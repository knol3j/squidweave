import test from "node:test";
import assert from "node:assert/strict";
import {
  discoverCompanies,
  discoverInvestors,
  discoverContacts,
  deriveEmailPattern,
  discoverKeywords,
  discoverCompetitors,
  discoverJobSignals,
  discoverTechStack,
  discoverTrends,
} from "../src/lib/data-derivation.mjs";

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(htmlOrJson, { json = false } = {}) {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => (json ? "" : htmlOrJson),
    json: async () => (json ? htmlOrJson : {}),
  });
}

function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH;
}

const DUCKDUCKGO_HTML = `
<html>
  <body>
    <a href="/l/?uddg=https%3A%2F%2Fexample.com%2F">Example Inc</a>
    <a href="/l/?uddg=https%3A%2F%2Ftest.io%2F">Test Co</a>
    <a href="/l/?uddg=https%3A%2F%2Fdemo.app%2F">Demo App</a>
  </body>
</html>
`;

test("discoverCompanies returns structured company records", async () => {
  mockFetch(DUCKDUCKGO_HTML);
  const results = await discoverCompanies("b2b saas", { limit: 5 });
  assert.ok(results.length >= 2);
  assert.ok(results.some(r => r.domain === "example.com"));
  assert.ok(results.every(r => r.name && r.url && r.source));
  restoreFetch();
});

test("discoverInvestors returns structured VC records", async () => {
  mockFetch(DUCKDUCKGO_HTML);
  const results = await discoverInvestors("top vc firms", { limit: 5 });
  assert.ok(results.length >= 2);
  assert.ok(results.every(r => r.fundName && r.domain && r.stageFocus));
  restoreFetch();
});

test("discoverContacts returns people for a domain and role", async () => {
  const html = `
    <html><body>
      <a href="/l/?uddg=https%3A%2F%2Fexample.com%2Fabout">Jane Doe - CEO | Example</a>
      <a href="/l/?uddg=https%3A%2F%2Fexample.com%2Fteam">John Smith - Founder | Example</a>
    </body></html>
  `;
  mockFetch(html);
  const results = await discoverContacts("example.com", "founder", { limit: 5 });
  assert.ok(results.length >= 2);
  assert.ok(results.some(r => r.domain === "example.com"));
  restoreFetch();
});

test("deriveEmailPattern returns patterns for a domain", async () => {
  mockFetch(DUCKDUCKGO_HTML);
  const result = await deriveEmailPattern("example.com", { count: 3 });
  assert.equal(result.domain, "example.com");
  assert.ok(result.primaryPattern.includes("{domain}"));
  assert.equal(result.patterns.length, 3);
  restoreFetch();
});

test("discoverKeywords extracts related keywords", async () => {
  mockFetch(DUCKDUCKGO_HTML);
  const results = await discoverKeywords("marketing automation", { limit: 5 });
  assert.ok(results.length > 0);
  assert.ok(results.every(r => r.keyword && r.source));
  restoreFetch();
});

test("discoverCompetitors returns competitor records", async () => {
  mockFetch(DUCKDUCKGO_HTML);
  const results = await discoverCompetitors("apollo.io", { limit: 5 });
  assert.ok(results.length >= 2);
  assert.ok(results.every(r => r.name && r.domain));
  restoreFetch();
});

test("discoverJobSignals returns hiring signals", async () => {
  mockFetch(DUCKDUCKGO_HTML);
  const results = await discoverJobSignals("Example Inc", { limit: 5 });
  assert.ok(results.length >= 2);
  assert.ok(results.every(r => r.hiring && r.url));
  restoreFetch();
});

test("discoverTechStack infers stack from search results", async () => {
  const html = `
    <html><body>
      <a href="/l/?uddg=https%3A%2F%2Fexample.com%2Fcareers%2Freact-engineer">React Engineer</a>
      <a href="/l/?uddg=https%3A%2F%2Fexample.com%2Fcareers%2Fnode-developer">Node Developer</a>
    </body></html>
  `;
  mockFetch(html);
  const result = await discoverTechStack("example.com", { limit: 5 });
  assert.equal(result.domain, "example.com");
  assert.ok(result.stack.some(s => s.technology === "react"));
  assert.ok(result.stack.some(s => s.technology === "node"));
  restoreFetch();
});

test("discoverTrends returns news/trend records", async () => {
  mockFetch(DUCKDUCKGO_HTML);
  const results = await discoverTrends("AI marketing", { limit: 5 });
  assert.ok(results.length >= 2);
  assert.ok(results.every(r => r.title && r.url && r.topic));
  restoreFetch();
});
