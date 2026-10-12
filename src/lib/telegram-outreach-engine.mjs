/**
 * Telegram outreach engine.
 *
 * Manages one-to-one Telegram message sequences for people in the B2B database.
 * The adapter (`src/adapters/telegram.mjs`) handles the Bot API; this engine
 * handles state, queueing, and webhook updates.
 */

import { randomUUID } from "node:crypto";

const VALID_STATES = new Set(["pending", "messaged", "replied", "stopped"]);

function validateState(state) {
  if (!VALID_STATES.has(state)) {
    throw new Error(`invalid telegram sequence state: ${state}`);
  }
}

/**
 * Build a standardized identifier for a telegram sequence row.
 */
function sequenceId(personId) {
  return `tg-${personId}`;
}

/**
 * Queue a Telegram message for a person.
 *
 * @param {import('./b2b-store.mjs').B2BStore} store
 * @param {object} params
 * @param {string} params.personId
 * @param {string} params.chatId
 * @param {string} params.body
 * @returns {Promise<object>}
 */
export async function queueTelegramMessage(store, { personId, chatId, body }) {
  if (!personId || !chatId || !body) {
    throw new Error("queueTelegramMessage requires personId, chatId, and body");
  }

  const person = await store.getPerson(personId);
  if (!person) throw new Error(`person not found: ${personId}`);

  const id = sequenceId(personId);
  await store._query(
    `insert into telegram_sequences (id, person_id, telegram_handle, chat_id, last_message_body, state, created_at, updated_at)
     values ($1, $2, $3, $4, $5, 'pending', now(), now())
     on conflict (id) do update set
       telegram_handle = coalesce(excluded.telegram_handle, telegram_sequences.telegram_handle),
       chat_id = coalesce(excluded.chat_id, telegram_sequences.chat_id),
       last_message_body = coalesce(excluded.last_message_body, telegram_sequences.last_message_body),
       updated_at = now()
     where telegram_sequences.state in ('pending', 'messaged', 'replied')`,
    [id, personId, null, chatId, body],
  );

  return store._queryOne("select * from telegram_sequences where id = $1", [id]);
}

/**
 * Send pending Telegram messages through the adapter.
 *
 * @param {import('./b2b-store.mjs').B2BStore} store
 * @param {Function} adapter - async ({ chatId, body, simulate }) => result
 * @param {number} [limit=10]
 * @returns {Promise<{sent: number, failed: number, results: object[]}>}
 */
export async function sendNextPendingMessages(store, adapter, limit = 10) {
  const rows = await store._queryAll(
    `select * from telegram_sequences where state = 'pending' order by created_at asc limit $1`,
    [limit],
  );

  const results = [];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.chat_id) {
      results.push({ id: row.id, ok: false, error: "no chat_id" });
      failed += 1;
      continue;
    }

    const body = row.last_message_body || "Hi, reaching out from SquidWeave.";
    const result = await adapter({ chatId: row.chat_id, body });
    const now = new Date().toISOString();

    if (result.ok) {
      await store._query(
        `update telegram_sequences set state = 'messaged', message_sent_at = $2, last_event_at = $2, updated_at = now() where id = $1`,
        [row.id, now],
      );
      sent += 1;
    } else {
      await store._query(
        `update telegram_sequences set state = 'stopped', last_event_at = $2, updated_at = now() where id = $1`,
        [row.id, now],
      );
      failed += 1;
    }

    results.push({ id: row.id, ok: result.ok, status: result.status, externalId: result.externalId, error: result.error });
  }

  return { sent, failed, results };
}

/**
 * Handle an incoming Telegram webhook update.
 *
 * @param {import('./b2b-store.mjs').B2BStore} store
 * @param {object} update - Telegram Update object
 * @returns {Promise<object|null>}
 */
export async function handleTelegramUpdate(store, update) {
  const message = update?.message;
  if (!message) return null;

  const chatId = message.chat?.id;
  if (!chatId) return null;

  const id = randomUUID();
  const text = message.text || "";
  const now = new Date().toISOString();

  // Map replies to existing sequences by chat_id.
  const rows = await store._queryAll(
    "select * from telegram_sequences where chat_id = $1 order by created_at desc limit 1",
    [String(chatId)],
  );

  if (rows.length > 0) {
    const row = rows[0];
    const newState = text.toLowerCase().includes("stop") ? "stopped" : "replied";
    await store._query(
      `update telegram_sequences set state = $2, last_event_at = $3, updated_at = now() where id = $1`,
      [row.id, newState, now],
    );
  }

  return {
    id,
    chatId,
    text,
    handled: rows.length > 0,
    createdAt: now,
  };
}

/**
 * List Telegram sequences, optionally filtered.
 *
 * @param {import('./b2b-store.mjs').B2BStore} store
 * @param {object} [options]
 * @param {string} [options.personId]
 * @param {string} [options.state]
 * @param {number} [options.limit]
 * @returns {Promise<object[]>}
 */
export async function listTelegramSequences(store, { personId = null, state = null, limit = 100 } = {}) {
  const clauses = [];
  const params = [];

  if (personId) {
    params.push(personId);
    clauses.push(`person_id = $${params.length}`);
  }
  if (state) {
    params.push(state);
    clauses.push(`state = $${params.length}`);
  }
  params.push(limit);

  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  return store._queryAll(
    `select * from telegram_sequences ${where} order by updated_at desc limit $${params.length}`,
    params,
  );
}

export { VALID_STATES };
