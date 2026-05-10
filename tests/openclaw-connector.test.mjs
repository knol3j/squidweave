import test from "node:test";
import assert from "node:assert/strict";
import { OpenclawConnector } from "../src/connectors/openclaw.mjs";

test("OpenclawConnector queries remote models through /v1/models", async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({
      data: [
        { id: "openclaw/default", object: "model" },
        { id: "openclaw/research", object: "model" },
      ],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const connector = new OpenclawConnector({
      baseUrl: "http://127.0.0.1:18789",
      token: "secret",
      dryRun: false,
    });

    const result = await connector.query({
      filter: { field: "id", op: "eq", value: "openclaw/default" },
    });

    assert.equal(calls[0].url, "http://127.0.0.1:18789/v1/models");
    assert.equal(calls[0].init.headers.authorization, "Bearer secret");
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].id, "openclaw/default");
  } finally {
    global.fetch = originalFetch;
  }
});

test("OpenclawConnector executes actions through /v1/chat/completions", async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: "{\"outcome\":\"executed\",\"summary\":\"Action executed\",\"followUp\":[],\"usedTools\":[\"workflow\"],\"notes\":[]}",
          },
        },
      ],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const connector = new OpenclawConnector({
      baseUrl: "http://127.0.0.1:18789",
      token: "secret",
      dryRun: false,
    });

    const result = await connector.execute(
      { type: "launch_test_batch", delta: 10, reason: "Seed signal." },
      { campaign: { id: "main-campaign" } },
    );

    assert.equal(calls[0].url, "http://127.0.0.1:18789/v1/chat/completions");
    assert.equal(calls[0].init.headers.authorization, "Bearer secret");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.model, "openclaw/default");
    assert.equal(result.accepted, true);
    assert.equal(result.delivery, "completed");
    assert.equal(result.payload.parsed.outcome, "executed");
  } finally {
    global.fetch = originalFetch;
  }
});
