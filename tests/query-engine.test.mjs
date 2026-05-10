import test from "node:test";
import assert from "node:assert/strict";
import { QueryEngine } from "../src/lib/query-engine.mjs";
import { SchemaRegistry } from "../src/lib/schema-registry.mjs";

const store = {
  getCollection(name) {
    if (name === "researchRecords") {
      return [
        { id: "r1", campaignId: "c1", company: "Alpha", fitScore: 0.9, metadata: { sourceUrl: "https://a.example" } },
        { id: "r2", campaignId: "c1", company: "Beta", fitScore: 0.7, metadata: { sourceUrl: "https://b.example" } },
        { id: "r3", campaignId: "c2", company: "Gamma", fitScore: 0.95, metadata: { sourceUrl: "https://c.example" } },
      ];
    }
    if (name === "campaigns") {
      return [
        { id: "c1", name: "Main Campaign", connector: "openclaw" },
        { id: "c2", name: "Expansion Campaign", connector: "clawdbot" },
      ];
    }
    return [];
  },
};

const connectors = {
  openclaw: {
    async query(spec) {
      return {
        connector: "openclaw",
        mode: "live",
        accepted: true,
        items: [
          { id: "oc-1", name: "Remote alpha", status: "active" },
          { id: "oc-2", name: "Remote beta", status: "idle" },
        ].filter(item => !spec?.filter || item.status === spec.filter.value),
        totalCount: 2,
      };
    },
  },
};

test("QueryEngine filters, sorts, and paginates collections", () => {
  const engine = new QueryEngine({ store, schemaRegistry: new SchemaRegistry(), connectors });
  return engine.execute({
    collection: "researchRecords",
    filter: {
      and: [
        { field: "campaignId", op: "eq", value: "c1" },
        { field: "fitScore", op: "gte", value: 0.7 },
      ],
    },
    sort: { field: "fitScore", direction: "desc" },
    limit: 1,
  }).then(result => {
    assert.equal(result.totalCount, 2);
    assert.equal(result.count, 1);
    assert.equal(result.items[0].company, "Alpha");
  });
});

test("QueryEngine supports field selection and nested paths", () => {
  const engine = new QueryEngine({ store, schemaRegistry: new SchemaRegistry(), connectors });
  return engine.execute({
    collection: "researchRecords",
    filter: { field: "metadata.sourceUrl", op: "contains", value: "b.example" },
    select: ["id", "metadata.sourceUrl"],
  }).then(result => {
    assert.deepEqual(result.items, [{ id: "r2", "metadata.sourceUrl": "https://b.example" }]);
  });
});

test("QueryEngine resolves declared joins from schema relations", async () => {
  const engine = new QueryEngine({ store, schemaRegistry: new SchemaRegistry(), connectors });
  const result = await engine.execute({
    collection: "campaigns",
    filter: { field: "id", op: "eq", value: "c1" },
    include: [{ relation: "researchRecords", select: ["id", "company"] }],
  });

  assert.equal(result.items[0].researchRecords.length, 2);
  assert.deepEqual(result.items[0].researchRecords[0], { id: "r1", company: "Alpha" });
});

test("QueryEngine supports connector-backed collection sources", async () => {
  const engine = new QueryEngine({ store, schemaRegistry: new SchemaRegistry(), connectors });
  const result = await engine.execute({
    collection: "openclawRemote",
    filter: { field: "status", op: "eq", value: "active" },
  });

  assert.equal(result.sourceStatus.type, "connector");
  assert.equal(result.sourceStatus.connector, "openclaw");
  assert.equal(result.items[0].id, "oc-1");
});
