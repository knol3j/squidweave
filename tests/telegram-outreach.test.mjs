import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { B2BStore } from "../src/lib/b2b-store.mjs";
import { registerB2BRoutes } from "../src/lib/b2b-routes.mjs";
import { sendTelegramMessage } from "../src/adapters/telegram.mjs";
import {
  queueTelegramMessage,
  sendNextPendingMessages,
  handleTelegramUpdate,
  listTelegramSequences,
} from "../src/lib/telegram-outreach-engine.mjs";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://squidweave:squidweave@127.0.0.1:5432/squidweave";
const DOMAIN = "telegram-outreach.test";

function mockResponse() {
  const res = {
    statusCode: null,
    body: null,
    _ended: false,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
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

async function purgeTelegramData(client) {
  await client.query(
    `delete from telegram_sequences
     where person_id in (
       select id from people where company_id in (
         select id from companies where domain = $1 or domain like $2
       )
     )`,
    [DOMAIN, `%${DOMAIN}`],
  );
  await client.query(
    `delete from people_dedupe_index where person_id in
       (select id from people where company_id in (select id from companies where domain = $1 or domain like $2))`,
    [DOMAIN, `%${DOMAIN}`],
  );
  await client.query(
    `delete from people where company_id in (select id from companies where domain = $1 or domain like $2)`,
    [DOMAIN, `%${DOMAIN}`],
  );
  await client.query(
    `delete from company_sources where company_id in (select id from companies where domain = $1 or domain like $2)`,
    [DOMAIN, `%${DOMAIN}`],
  );
  await client.query(
    `delete from companies where domain = $1 or domain like $2`,
    [DOMAIN, `%${DOMAIN}`],
  );
}

describe("telegram adapter", () => {
  test("sendTelegramMessage simulates without a bot token", async () => {
    const original = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;
    const result = await sendTelegramMessage({ chatId: "123", body: "Hi" });
    assert.equal(result.status, "simulated");
    assert.equal(result.ok, true);
    assert.ok(result.externalId);
    if (original !== undefined) process.env.TELEGRAM_BOT_TOKEN = original;
  });
});

describe("telegram outreach engine against postgres", () => {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  let store;
  let company;
  let person;

  before(async () => {
    await client.connect();
    await purgeTelegramData(client);
    store = new B2BStore(DATABASE_URL);
    await store.init();
    company = await store.upsertCompany({ domain: DOMAIN, name: "Telegram Test Co" }, { type: "sec-edgar" });
    person = await store.upsertPerson(
      { companyId: company.id, fullName: "Tina Test", email: `tina@${DOMAIN}` },
      { type: "sec-edgar" },
    );
  });

  after(async () => {
    await purgeTelegramData(client);
    await store.close();
    await client.end();
  });

  test("queueTelegramMessage writes a pending sequence", async () => {
    const seq = await queueTelegramMessage(store, {
      personId: person.id,
      chatId: "42",
      body: "Hello from SquidWeave",
    });
    assert.equal(seq.person_id, person.id);
    assert.equal(seq.chat_id, "42");
    assert.equal(seq.state, "pending");
    assert.equal(seq.last_message_body, "Hello from SquidWeave");
  });

  test("sendNextPendingMessages sends pending rows via a simulated adapter", async () => {
    await queueTelegramMessage(store, {
      personId: person.id,
      chatId: "99",
      body: "Second message",
    });
    const result = await sendNextPendingMessages(
      store,
      ({ chatId, body }) => sendTelegramMessage({ chatId, body, simulate: true }),
      10,
    );
    assert.ok(result.sent >= 1, `expected at least one sent, got ${result.sent}`);
    assert.ok(result.results.every(r => r.status === "simulated"), "all sends should be simulated");
    const seqs = await listTelegramSequences(store, { personId: person.id });
    assert.ok(seqs.every(s => s.state === "messaged"), "sent rows should be messaged");
  });

  test("handleTelegramUpdate maps an incoming message to replied", async () => {
    const seq = await queueTelegramMessage(store, {
      personId: person.id,
      chatId: "100",
      body: "Outbound",
    });
    await sendNextPendingMessages(store, ({ chatId, body }) => sendTelegramMessage({ chatId, body, simulate: true }), 10);
    const update = {
      update_id: 1,
      message: { chat: { id: 100 }, text: "I am interested" },
    };
    const handled = await handleTelegramUpdate(store, update);
    assert.equal(handled.handled, true);
    const refreshed = (await listTelegramSequences(store, { personId: person.id, state: "replied" })).find(s => s.chat_id === "100");
    assert.ok(refreshed, "sequence should be marked replied");
  });

  test("handleTelegramUpdate stops on a stop keyword", async () => {
    const seq = await queueTelegramMessage(store, {
      personId: person.id,
      chatId: "101",
      body: "Outbound",
    });
    await sendNextPendingMessages(store, ({ chatId, body }) => sendTelegramMessage({ chatId, body, simulate: true }), 10);
    const update = {
      update_id: 2,
      message: { chat: { id: 101 }, text: "Please stop" },
    };
    await handleTelegramUpdate(store, update);
    const refreshed = (await listTelegramSequences(store, { personId: person.id, state: "stopped" })).find(s => s.chat_id === "101");
    assert.ok(refreshed, "sequence should be stopped");
  });

  test("listTelegramSequences filters by person and state", async () => {
    const pending = await listTelegramSequences(store, { personId: person.id, state: "pending" });
    assert.ok(Array.isArray(pending));
    const all = await listTelegramSequences(store, { personId: person.id });
    assert.ok(all.length >= pending.length);
  });
});

describe("telegram outreach routes", () => {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  let store;
  let handler;
  let company;
  let person;
  const host = "127.0.0.1:4010";

  before(async () => {
    await client.connect();
    await purgeTelegramData(client);
    store = new B2BStore(DATABASE_URL);
    await store.init();
    company = await store.upsertCompany({ domain: DOMAIN, name: "Route Test Co" }, { type: "sec-edgar" });
    person = await store.upsertPerson(
      { companyId: company.id, fullName: "Rex Route", email: `rex@${DOMAIN}` },
      { type: "sec-edgar" },
    );
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
    await purgeTelegramData(client);
    await store.close();
    await client.end();
  });

  test("POST /b2b/telegram/message queues a message", async () => {
    const req = mockRequest({
      method: "POST",
      path: "/b2b/telegram/message",
      body: { personId: person.id, chatId: "200", body: "Hi via HTTP" },
      host,
    });
    const res = mockResponse();
    const url = new URL(req.url, `http://${host}`);
    const handled = await handler(req, res, url);
    assert.equal(handled, true);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.person_id, person.id);
    assert.equal(res.body.chat_id, "200");
    assert.equal(res.body.state, "pending");
  });

  test("GET /b2b/telegram/sequences returns queued rows", async () => {
    const req = mockRequest({
      method: "GET",
      path: `/b2b/telegram/sequences?personId=${encodeURIComponent(person.id)}`,
      host,
    });
    const res = mockResponse();
    const url = new URL(req.url, `http://${host}`);
    const handled = await handler(req, res, url);
    assert.equal(handled, true);
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
  });

  test("POST /b2b/telegram/send-pending dispatches queued messages", async () => {
    await queueTelegramMessage(store, { personId: person.id, chatId: "202", body: "Send me" });
    const req = mockRequest({
      method: "POST",
      path: "/b2b/telegram/send-pending",
      body: { limit: 10 },
      host,
    });
    const res = mockResponse();
    const url = new URL(req.url, `http://${host}`);
    const handled = await handler(req, res, url);
    assert.equal(handled, true);
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.sent >= 1, `expected sent >= 1, got ${res.body.sent}`);
    const rows = await listTelegramSequences(store, { personId: person.id, state: "messaged" });
    assert.ok(rows.some(r => r.chat_id === "202"));
  });

  test("POST /b2b/telegram/webhook maps a reply to replied", async () => {
    const chatId = "201";
    await queueTelegramMessage(store, { personId: person.id, chatId, body: "Outbound HTTP" });
    const req = mockRequest({
      method: "POST",
      path: "/b2b/telegram/webhook",
      body: { update_id: 10, message: { chat: { id: Number(chatId) }, text: "Reply" } },
      host,
    });
    const res = mockResponse();
    const url = new URL(req.url, `http://${host}`);
    const handled = await handler(req, res, url);
    assert.equal(handled, true);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.handled, true);
    const rows = await listTelegramSequences(store, { personId: person.id, state: "replied" });
    assert.ok(rows.some(r => r.chat_id === chatId));
  });
});
