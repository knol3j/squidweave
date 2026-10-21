import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { B2BStore } from "../src/lib/b2b-store.mjs";
import {
  checkDomainAuth,
  getWarmupCap,
  canSendTo,
  recordSendOutcome,
} from "../src/lib/deliverability-engine.mjs";
import { registerB2BRoutes } from "../src/lib/b2b-routes.mjs";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://squidweave:squidweave@127.0.0.1:5432/squidweave";
const DOMAIN = "deliverability.test";

function mockResponse() {
  const res = {
    statusCode: null,
    body: null,
    _ended: false,
    writeHead(status) {
      this.statusCode = status;
    },
    end(payload) {
      this._ended = true;
      if (payload && !this.body) {
        try {
          this.body = JSON.parse(payload);
        } catch {
          this.body = payload;
        }
      }
    },
  };
  return res;
}

function mockRequest({ method = "GET", path = "/", body = null, host = "127.0.0.1:4010" } = {}) {
  return {
    method,
    url: path,
    headers: { host, origin: `http://${host}` },
    body,
  };
}

describe("sending domain store methods", () => {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  let store;

  async function purge() {
    await client.query("delete from sending_domains where domain = $1", [DOMAIN]);
  }

  before(async () => {
    await client.connect();
    await purge();
    store = new B2BStore(DATABASE_URL);
    await store.init();
  });

  after(async () => {
    await purge();
    await store.close();
    await client.end();
  });

  test("upsertSendingDomain creates and returns a domain row", async () => {
    const domain = await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 25 });
    assert.equal(domain.domain, DOMAIN);
    assert.equal(domain.daily_cap, 25);
    assert.ok(domain.id);

    const found = await store.getSendingDomain(DOMAIN);
    assert.ok(found);
    assert.equal(found.domain, DOMAIN);
  });

  test("recordSendAttempt increments the rolling window and daily counters", async () => {
    await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 50 });
    const afterSend = await store.recordSendAttempt(DOMAIN, { delivered: true });
    assert.equal(afterSend.sent_count_100, 1);
    assert.equal(afterSend.sent_today, 1);
    assert.equal(Number(afterSend.reputation_score), 0);
  });

  test("recordSendAttempt penalizes reputation on bounces", async () => {
    await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 50 });
    const afterBounce = await store.recordSendAttempt(DOMAIN, { bounced: true });
    assert.equal(afterBounce.bounce_count_100, 1);
    assert.ok(Number(afterBounce.reputation_score) < 0, "reputation should drop after a bounce");
  });

  test("recordSendAttempt penalizes reputation on complaints", async () => {
    await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 50 });
    const afterComplaint = await store.recordSendAttempt(DOMAIN, { complaint: true });
    assert.ok(Number(afterComplaint.reputation_score) < 0, "reputation should drop after a complaint");
  });

  test("resetDailyCountersIfNeeded resets sent_today when a day has passed", async () => {
    await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 50 });
    await client.query(
      "update sending_domains set sent_today = 10, sent_last_reset_at = now() - interval '2 days' where domain = $1",
      [DOMAIN],
    );
    const reset = await store.resetDailyCountersIfNeeded(DOMAIN);
    assert.equal(reset.sent_today, 0);
    assert.ok(new Date(reset.sent_last_reset_at) > new Date(Date.now() - 60_000));
  });
});

describe("deliverability engine", () => {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  let store;

  async function purge() {
    await client.query("delete from sending_domains where domain = $1", [DOMAIN]);
  }

  before(async () => {
    await client.connect();
    await purge();
    store = new B2BStore(DATABASE_URL);
    await store.init();
  });

  after(async () => {
    await purge();
    await store.close();
    await client.end();
  });

  test("checkDomainAuth returns status enums for a known domain", async () => {
    const result = await checkDomainAuth("google.com");
    assert.ok(["configured", "missing", "invalid"].includes(result.spf));
    assert.ok(["configured", "missing", "invalid"].includes(result.dkim));
    assert.ok(["configured", "missing", "invalid"].includes(result.dmarc));
    assert.ok(["none", "quarantine", "reject", null].includes(result.dmarcPolicy));
  });

  test("getWarmupCap starts warmup and returns phased caps", async () => {
    await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 50 });
    const cap = await getWarmupCap(store, DOMAIN);
    assert.ok(cap.cap >= 50);
    assert.ok(["week1", "week2", "week3", "week4", "rampant"].includes(cap.phase));
  });

  test("canSendTo allows a clean address under the daily cap", async () => {
    await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 50 });
    const result = await canSendTo(store, `user@${DOMAIN}`, DOMAIN, "legitimate_interest");
    assert.equal(result.allowed, true);
    assert.match(result.reason, /^allow:/);
  });

  test("canSendTo blocks when the daily cap is exceeded", async () => {
    await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 1 });
    await store.recordSendAttempt(DOMAIN, { delivered: true });
    const result = await canSendTo(store, `user@${DOMAIN}`, DOMAIN, "legitimate_interest");
    assert.equal(result.allowed, false);
    assert.match(result.reason, /cap/);
  });

  test("canSendTo blocks a suppressed address", async () => {
    await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 50 });
    await store.upsertSuppression({ email: `blocked@${DOMAIN}`, reason: "unsubscribe" });
    const result = await canSendTo(store, `blocked@${DOMAIN}`, DOMAIN, "legitimate_interest");
    assert.equal(result.allowed, false);
    assert.match(result.reason, /suppression/);
  });

  test("recordSendOutcome updates domain reputation", async () => {
    await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 50 });
    await recordSendOutcome(store, DOMAIN, { delivered: true });
    const afterBounce = await recordSendOutcome(store, DOMAIN, { bounced: true });
    assert.ok(Number(afterBounce.reputation_score) < 0);
  });
});

describe("deliverability routes", () => {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  let store;
  let handler;
  const host = "127.0.0.1:4010";

  async function purge() {
    await client.query("delete from sending_domains where domain = $1", [DOMAIN]);
  }

  before(async () => {
    await client.connect();
    await purge();
    store = new B2BStore(DATABASE_URL);
    await store.init();
    handler = registerB2BRoutes({
      b2b: store,
      sendJson: (_req, res, status, payload) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(payload));
      },
      readJsonBody: async (req) => req.body,
      log: () => {},
    });
  });

  after(async () => {
    await purge();
    await store.close();
    await client.end();
  });

  test("GET /b2b/deliverability/:domain returns auth and warmup state", async () => {
    await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 25 });
    const req = mockRequest({ method: "GET", path: `/b2b/deliverability/${encodeURIComponent(DOMAIN)}`, host });
    const res = mockResponse();
    const url = new URL(req.url, `http://${host}`);
    const handled = await handler(req, res, url);
    assert.equal(handled, true);
    assert.equal(res.statusCode, 200);
    assert.ok(["configured", "missing", "invalid"].includes(res.body.auth.spf));
    assert.ok(typeof res.body.warmup.cap === "number");
  });

  test("POST /b2b/deliverability/check returns an allow/block decision", async () => {
    await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 50 });
    const req = mockRequest({
      method: "POST",
      path: "/b2b/deliverability/check",
      body: { email: `user@${DOMAIN}`, sendingDomain: DOMAIN, consentBasis: "legitimate_interest" },
      host,
    });
    const res = mockResponse();
    const url = new URL(req.url, `http://${host}`);
    const handled = await handler(req, res, url);
    assert.equal(handled, true);
    assert.equal(res.statusCode, 200);
    assert.equal(typeof res.body.allowed, "boolean");
    assert.ok(res.body.reason);
  });

  test("POST /b2b/deliverability/outcome records a send outcome", async () => {
    await store.upsertSendingDomain({ domain: DOMAIN, dailyCap: 50 });
    const req = mockRequest({
      method: "POST",
      path: "/b2b/deliverability/outcome",
      body: { sendingDomain: DOMAIN, delivered: true },
      host,
    });
    const res = mockResponse();
    const url = new URL(req.url, `http://${host}`);
    const handled = await handler(req, res, url);
    assert.equal(handled, true);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.sent_today, 1);
  });
});

