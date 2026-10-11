import test from "node:test";
import assert from "node:assert/strict";
import { discoverDomains, mapCategory } from "../src/lib/search-discovery.mjs";

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(responseMap) {
  globalThis.fetch = async (url) => {
    const match = responseMap.find(({ test }) => test(url));
    if (!match) {
      return { ok: false, status: 404, text: async () => "not found" };
    }
    return match.response(url);
  };
}

function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH;
}

test("mapCategory maps pipeline categories correctly", () => {
  assert.equal(mapCategory("investment"), "investment");
  assert.equal(mapCategory("vc"), "investment");
  assert.equal(mapCategory("research"), "research");
  assert.equal(mapCategory("competitor"), "research");
  assert.equal(mapCategory("marketing"), "marketing");
  assert.equal(mapCategory("b2b"), "marketing");
  assert.equal(mapCategory("unknown"), "marketing");
});

test("discoverDomains returns deduplicated domains from DuckDuckGo and fallbacks", async () => {
  mockFetch([
    {
      test: (url) => url.includes("duckduckgo.com"),
      response: () => ({
        ok: true,
        status: 200,
        text: async () => `
          <html>
            <body>
              <a href="/l/?uddg=https%3A%2F%2Fexample.com%2Fpage">Example</a>
              <a href="/l/?uddg=https%3A%2F%2Ftest.io%2F">Test</a>
              <a href="/l/?uddg=https%3A%2F%2Fexample.com%2Fother">Duplicate</a>
            </body>
          </html>
        `,
      }),
    },
  ]);

  const results = await discoverDomains({ category: "b2b", query: "b2b saas", limit: 5 });
  assert.ok(results.length >= 2, `expected at least 2 results, got ${results.length}`);
  const domains = results.map(r => r.domain);
  assert.ok(domains.includes("example.com"));
  assert.ok(domains.includes("test.io"));
  assert.equal(new Set(domains).size, domains.length, "domains should be deduplicated");
  assert.ok(results.every(r => r.url && r.source));

  restoreFetch();
});

test("discoverDomains uses key-based engines when credentials are set", async () => {
  process.env.BRAVE_API_KEY = "test-brave-key";
  process.env.SERPER_API_KEY = "test-serper-key";

  mockFetch([
    {
      test: (url) => url.includes("api.search.brave.com"),
      response: () => ({
        ok: true,
        status: 200,
        json: async () => ({
          web: {
            results: [
              { url: "https://brave-source.com/page", title: "Brave Result", description: "snippet" },
            ],
          },
        }),
      }),
    },
    {
      test: (url) => url.includes("google.serper.dev"),
      response: () => ({
        ok: true,
        status: 200,
        json: async () => ({
          organic: [
            { link: "https://serper-source.com/page", title: "Serper Result", snippet: "snippet" },
          ],
        }),
      }),
    },
    {
      test: (url) => url.includes("duckduckgo.com"),
      response: () => ({
        ok: true,
        status: 200,
        text: async () => "<html><body></body></html>",
      }),
    },
  ]);

  const results = await discoverDomains({ category: "vc", query: "top vc firms", limit: 5 });
  const sources = results.map(r => r.source);
  assert.ok(sources.includes("brave") || sources.includes("serper"), `expected key-based source, got ${sources.join(", ")}`);
  assert.ok(results.every(r => r.domain));

  delete process.env.BRAVE_API_KEY;
  delete process.env.SERPER_API_KEY;
  restoreFetch();
});

test("discoverDomains returns fallback directories when search fails", async () => {
  mockFetch([
    {
      test: () => true,
      response: () => ({ ok: false, status: 500, text: async () => "error" }),
    },
  ]);

  const results = await discoverDomains({ category: "investment", limit: 5 });
  assert.ok(results.length > 0, "fallback directories should still return results");
  assert.ok(results.some(r => r.source === "directory"));
  assert.ok(results.every(r => r.domain));

  restoreFetch();
});

test("discoverDomains respects the limit", async () => {
  mockFetch([
    {
      test: (url) => url.includes("duckduckgo.com"),
      response: () => ({
        ok: true,
        status: 200,
        text: async () => `
          <html>
            <body>
              ${Array.from({ length: 20 }, (_, i) => `<a href="/l/?uddg=https%3A%2F%2Fsite${i}.com%2F">Site ${i}</a>`).join("\n")}
            </body>
          </html>
        `,
      }),
    },
  ]);

  const results = await discoverDomains({ category: "competitor", query: "sales engagement", limit: 5 });
  assert.equal(results.length, 5);

  restoreFetch();
});
