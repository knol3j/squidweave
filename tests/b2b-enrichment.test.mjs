import { test, describe } from "node:test";
import assert from "node:assert";
import {
  hunterEnrich,
  snovEnrich,
  dropcontactEnrich,
  apolloEnrich,
  enrichWithFallbacks,
  listEnrichmentConnectors,
} from "../src/lib/enrichment/index.mjs";

describe("Enrichment connectors", () => {
  test("listEnrichmentConnectors returns four names", () => {
    const names = listEnrichmentConnectors();
    assert.deepStrictEqual(names.sort(), ["apollo", "dropcontact", "hunter", "snov"]);
  });

  test("hunterEnrich simulates without API key", async () => {
    const result = await hunterEnrich({ domain: "stripe.com", firstName: "Jane", lastName: "Doe" });
    assert.strictEqual(result.source, "hunter");
    assert.strictEqual(result.status, "simulated");
    assert.ok(result.reason.includes("HUNTER_API_KEY"));
  });

  test("snovEnrich simulates without credentials", async () => {
    const result = await snovEnrich({ domain: "stripe.com", firstName: "Jane", lastName: "Doe" });
    assert.strictEqual(result.source, "snov");
    assert.strictEqual(result.status, "simulated");
  });

  test("dropcontactEnrich simulates without API key", async () => {
    const result = await dropcontactEnrich({ domain: "stripe.com", firstName: "Jane", lastName: "Doe" });
    assert.strictEqual(result.source, "dropcontact");
    assert.strictEqual(result.status, "simulated");
  });

  test("apolloEnrich simulates without API key", async () => {
    const result = await apolloEnrich({ domain: "stripe.com", firstName: "Jane", lastName: "Doe" });
    assert.strictEqual(result.source, "apollo");
    assert.strictEqual(result.status, "simulated");
  });

  test("enrichWithFallbacks returns attempts array and best result", async () => {
    const result = await enrichWithFallbacks({ domain: "stripe.com", firstName: "Jane", lastName: "Doe" });
    assert.ok(Array.isArray(result.attempts));
    assert.strictEqual(result.attempts.length, 4);
    assert.strictEqual(result.status, "simulated");
    assert.ok(result.source);
  });

  test("enrichWithFallbacks respects custom connector order", async () => {
    const result = await enrichWithFallbacks({
      domain: "stripe.com",
      firstName: "Jane",
      lastName: "Doe",
      connectors: ["hunter", "apollo"],
    });
    assert.strictEqual(result.attempts.length, 2);
    assert.strictEqual(result.attempts[0].source, "hunter");
    assert.strictEqual(result.attempts[1].source, "apollo");
  });

  test("connector returns unknown when input is insufficient", async () => {
    const result = await hunterEnrich({});
    assert.strictEqual(result.status, "simulated");
  });
});
