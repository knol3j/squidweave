import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OutreachEventRepository, AnalyticsEventRepository } from "../src/lib/repositories/event-repository.mjs";
import { getPostgresPool, closePostgresPool } from "../src/lib/repositories/base.mjs";
import { config } from "../src/config.mjs";

async function setupSchema(pool) {
  await pool.query(`create table if not exists outreach_events (
    id text primary key,
    campaign_id text not null,
    target_id text,
    type text not null,
    channel text not null default 'email',
    status text,
    timestamp timestamptz not null default now(),
    metadata jsonb not null default '{}',
    created_at timestamptz not null default now()
  )`);
  await pool.query(`create table if not exists analytics_events (
    id text primary key,
    campaign_id text not null,
    type text not null,
    channel text not null default 'email',
    value numeric,
    count integer not null default 1,
    timestamp timestamptz not null default now(),
    metadata jsonb not null default '{}',
    created_at timestamptz not null default now()
  )`);
}

async function cleanupTables(pool) {
  await pool.query("truncate table outreach_events, analytics_events");
}

describe("EventRepository", { skip: !config.databaseUrl }, () => {
  /** @type {import('pg').Pool} */
  let pool;

  it("connects and sets up tables", async () => {
    pool = await getPostgresPool();
    await setupSchema(pool);
    await cleanupTables(pool);
  });

  it("stores and retrieves outreach events", async () => {
    const repo = new OutreachEventRepository();
    const event = {
      campaignId: "camp-1",
      targetId: "target-1",
      type: "sent",
      channel: "email",
      status: "delivered",
      timestamp: "2026-05-01T00:00:00.000Z",
      metadata: { emailId: "em-1" },
    };
    const saved = await repo.add(event);
    assert.equal(saved.campaignId, "camp-1");

    const list = await repo.list({ campaignId: "camp-1" });
    assert.equal(list.length, 1);
    assert.equal(list[0].type, "sent");
    assert.equal(list[0].metadata.emailId, "em-1");
  });

  it("stores and retrieves analytics events", async () => {
    const repo = new AnalyticsEventRepository();
    const event = {
      campaignId: "camp-1",
      type: "click",
      channel: "email",
      value: 42,
      count: 1,
      timestamp: "2026-05-01T00:00:00.000Z",
      metadata: { url: "https://example.com" },
    };
    await repo.add(event);
    const list = await repo.list({ campaignId: "camp-1", type: "click" });
    assert.equal(list.length, 1);
    assert.equal(list[0].value, 42);
  });

  it("filters by targetId", async () => {
    const repo = new OutreachEventRepository();
    await repo.add({ campaignId: "camp-2", targetId: "a", type: "open" });
    await repo.add({ campaignId: "camp-2", targetId: "b", type: "open" });
    const list = await repo.list({ campaignId: "camp-2", targetId: "a" });
    assert.equal(list.length, 1);
  });
});
