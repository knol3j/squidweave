/**
 * Email verification queue.
 *
 * Takes a discovered address from "unknown" to a real deliverability verdict by
 * combining three checks, cheapest first:
 *
 *   1. Syntax + MX. Does the domain accept mail at all? A domain with no MX
 *      record cannot receive anything, so every permuted address for it is dead
 *      and no SMTP traffic is spent.
 *   2. SMTP RCPT TO. Ask the receiving server whether the mailbox exists. This is
 *      the only check that actually proves deliverability, and it is also the
 *      fragile one: many providers (Gmail, Outlook, iCloud) accept every RCPT
 *      then discard, so a "yes" is not proof and a "no" is not proof either.
 *   3. Pattern confirmation. When a verified address at a domain already matches
 *      a known pattern, other permuted addresses at that domain inherit it.
 *
 * Scope note: this module deliberately does NOT do catch-all detection by
 * exhausting addresses, does not use any connection-scraping or credential
 * technique, and paces itself. Verifying addresses by hammering a mail server is
 * both unreliable and the fastest way to get your sending IP blocklisted, which
 * costs you every future send.
 *
 * Statuses written to `people.email_status`:
 *   verified  - server confirmed the mailbox
 *   risky     - catch-all domain, or a server that accepted everything
 *   invalid   - server explicitly rejected the mailbox
 *   unknown   - could not determine (timeout, greylisting, no MX)
 */

import dns from "node:dns/promises";
import net from "node:net";

// How long to wait for an SMTP banner or reply. Mail servers are slow under
// load; a short timeout produces false "unknown" verdicts.
const SMTP_TIMEOUT_MS = 8000;
// Minimum gap between SMTP connections to the same host, in milliseconds.
const SMTP_PACE_MS = 1500;
// Providers that accept every RCPT and silently discard. An address at one of
// these can never be verified by probing, so they are marked risky up front
// rather than spending connections learning nothing.
const CATCH_ALL_HINTS = [
  "googlemail.com",
  "gmail.com",
  "google.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "yahoo.com",
  "yahoo.co.uk",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
];

// Enhanced status codes and phrases that mean the RECEIVER refused us, not the
// mailbox. Spamhaus and similar blocklists answer 550 for every address, which
// would otherwise mark real mailboxes invalid and silently corrupt the database.
// These must resolve to "blocked", never "invalid".
const BLOCKED_MARKERS = [
  /spamhaus/i,
  /blocked using/i,
  /client host .* blocked/i,
  /ip.*blocked/i,
  /blacklist/i,
  /blocklist/i,
  /rejected.*spam/i,
  /5\.7\.1/, // Enhanced status: delivery not authorized, message refused
  /too many/i,
  /rate.?limit/i,
  /try again later/i,
  /greylist/i,
];

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function isSyntacticallyValid(email) {
  return typeof email === "string" && EMAIL_RE.test(email.trim());
}

export function domainOf(email) {
  if (!isSyntacticallyValid(email)) return null;
  return email.trim().toLowerCase().split("@")[1];
}

/**
 * Resolve the MX hosts for a domain, ordered by priority (lowest number first,
 * which is the order a real MTA would try).
 */
export async function resolveMx(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return records
      .filter(r => r && r.exchange)
      .sort((a, b) => a.priority - b.priority)
      .map(r => r.exchange.replace(/\.$/, ""));
  } catch {
    return [];
  }
}

/**
 * Probe one mailbox over SMTP by issuing RCPT TO and reading the reply code.
 *
 * Codes that matter:
 *   250 - accepted, the mailbox probably exists
 *   550/551/553 - rejected, the mailbox does not exist
 *   450/451/452 - temporary failure (greylisting, throttling). Not a verdict.
 *
 * Returns { status, code, detail }.
 */
export async function smtpProbe(email, mxHost) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let stage = "banner";
    let resolved = false;
    let code = null;
    const replies = [];

    const finish = (status, detail) => {
      if (resolved) return;
      resolved = true;
      try {
        socket.destroy();
      } catch {
        // Already closed.
      }
      resolve({ status, code, detail });
    };

    const timer = setTimeout(() => finish("unknown", "timeout"), SMTP_TIMEOUT_MS);

    socket.setTimeout(SMTP_TIMEOUT_MS);
    socket.on("timeout", () => finish("unknown", "timeout"));
    socket.on("error", err => finish("unknown", `socket: ${err.message}`));

    socket.on("data", chunk => {
      const text = chunk.toString();
      replies.push(text.trim());
      const match = text.match(/^(\d{3})[\s-]/m);
      if (!match) return;
      const responseCode = Number(match[1]);

      if (stage === "banner") {
        // 220 greeting. Send EHLO, then MAIL FROM, then RCPT TO.
        socket.write("EHLO verify.squidweave.ai\r\n");
        stage = "ehlo";
        return;
      }
      if (stage === "ehlo") {
        socket.write("MAIL FROM:<probe@verify.squidweave.ai>\r\n");
        stage = "mail";
        return;
      }
      if (stage === "mail") {
        socket.write(`RCPT TO:<${email}>\r\n`);
        stage = "rcpt";
        return;
      }
      if (stage === "rcpt") {
        code = responseCode;
        socket.write("QUIT\r\n");
        clearTimeout(timer);
        // A rejection that is really a block on OUR IP must never be recorded as
        // an invalid mailbox. Check the reply text before trusting the code.
        const detail = replies.join(" | ");
        if (responseCode >= 200 && responseCode < 300) finish("verified", detail);
        else if (responseCode >= 500 && BLOCKED_MARKERS.some(marker => marker.test(detail))) {
          finish("blocked", detail);
        } else if (responseCode >= 500) finish("invalid", detail);
        else finish("unknown", detail);
      }
    });

    socket.connect(25, mxHost);
  });
}

/**
 * Verify one address. Runs the cheap checks first and only opens an SMTP
 * connection when they pass.
 *
 * @param {string} email
 * @returns {Promise<{status: string, reason: string, mx?: string[]}>}
 */
export async function verifyEmail(email) {
  if (!isSyntacticallyValid(email)) {
    return { status: "invalid", reason: "malformed" };
  }

  const domain = domainOf(email);

  // Providers that accept every recipient cannot be probed for a real answer.
  if (CATCH_ALL_HINTS.includes(domain)) {
    return { status: "risky", reason: "provider-accepts-all", mx: [] };
  }

  const mx = await resolveMx(domain);
  if (mx.length === 0) {
    // No MX means the domain cannot receive mail. Worth one A-record fallback:
    // some small domains run mail on the apex host with an implicit MX.
    try {
      const a = await dns.resolve4(domain);
      if (a.length > 0) {
        const probe = await smtpProbe(email, domain);
        // Normalize to `reason` so every caller reads the same field. The raw
        // SMTP transcript stays in `detail` for debugging.
        return { status: probe.status, reason: `implicit-mx(${domain})`, detail: probe.detail, mx: [domain] };
      }
    } catch {
      // Fall through to the no-mx verdict.
    }
    return { status: "invalid", reason: "no-mx-record", mx: [] };
  }

  // Probe the domain itself before trusting any address at it. Without this a
  // Google Workspace or M365 domain scores every permuted address as verified,
  // which is how a database fills with confident nonsense.
  if (await isCatchAll(domain)) {
    return { status: "risky", reason: "catch-all-domain", mx };
  }

  const probe = await smtpProbe(email, mx[0]);
  return {
    status: probe.status,
    reason: probe.status === "verified" ? "mailbox-accepted" : probe.status,
    detail: probe.detail,
    mx,
  };
}

/**
 * Detect whether a domain accepts every recipient (a catch-all mailbox).
 *
 * This matters more than any other check in this file. Google Workspace,
 * Microsoft 365, and most modern providers answer 250 to RCPT TO for ANY
 * address, valid or not, because revealing mailbox existence is an enumeration
 * vector. A probe at such a domain returns "verified" for
 * nobody-real-zzz9@domain, so every address scores as deliverable and the
 * database fills with confident nonsense.
 *
 * The test is to probe a random address that cannot exist. If the server accepts
 * it, the domain is a catch-all and no address there can be verified by probing.
 *
 * @param {string} domain
 * @returns {Promise<boolean>}
 */
export async function isCatchAll(domain) {
  const mx = await resolveMx(domain);
  if (mx.length === 0) return false;
  // A local part that is long and random enough that no real mailbox will match.
  const random = `zzq-probe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const probe = await smtpProbe(`${random}@${domain}`, mx[0]);
  return probe.status === "verified";
}

/**
 * Confirm the email pattern in use at a domain from a verified address.
 * "jane.doe@acme.com" implies the pattern is "first.last", so a permuted
 * "janedoe@acme.com" can be ruled out without probing it.
 *
 * @returns {"first"|"last"|"first.last"|"flast"|"firstl"|"first_last"|"f.last"|"last.first"|null}
 */
export function detectPattern(email, firstName, lastName) {
  if (!email || !firstName || !lastName) return null;
  const local = email.trim().toLowerCase().split("@")[0];
  const f = firstName.toLowerCase();
  const l = lastName.toLowerCase();
  const candidates = [
    ["first.last", `${f}.${l}`],
    ["first_last", `${f}_${l}`],
    ["f.last", `${f[0]}.${l}`],
    ["last.first", `${l}.${f}`],
    ["flast", `${f[0]}${l}`],
    ["firstl", `${f}${l[0]}`],
    ["first", f],
    ["last", l],
  ];
  for (const [name, value] of candidates) {
    if (local === value) return name;
  }
  return null;
}

export { CATCH_ALL_HINTS, SMTP_PACE_MS };

/**
 * A paced worker that verifies addresses and writes the result back to the
 * store. Pacing matters: SMTP probing is the one part of this pipeline that a
 * receiving server can notice and block you for.
 */
export class EmailVerificationQueue {
  /**
   * @param {object} options
   * @param {import("./b2b-store.mjs").B2BStore} options.store
   * @param {number} [options.batchSize] people per batch
   * @param {number} [options.paceMs] delay between SMTP probes
   */
  constructor({ store, batchSize = 25, paceMs = SMTP_PACE_MS }) {
    this.store = store;
    this.batchSize = batchSize;
    this.paceMs = paceMs;
  }

  /** People whose address has not been verified yet, plus those we were
   *  blocked from verifying (worth retrying once the IP reputation recovers). */
  async pending(limit = this.batchSize) {
    const rows = await this.store._queryAll(
      `select id, email, first_name, last_name from people
       where email is not null and email_status in ('unknown', 'blocked')
       order by confidence desc
       limit $1`,
      [limit],
    );
    return rows;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verify one batch. Never throws on a single address: a failed probe is
   * recorded as "unknown" with its reason so the queue can retry later.
   */
  async verifyOne(row) {
    let result;
    try {
      result = await verifyEmail(row.email);
    } catch (err) {
      result = { status: "unknown", reason: `error: ${err.message}` };
    }
    const verifiedAt = result.status === "verified" ? new Date().toISOString() : null;
    await this.store.updateEmailStatus(row.id, result.status, verifiedAt);
    return { id: row.id, email: row.email, ...result };
  }

  /**
   * Work through the queue. Stops after `maxBatches` so a caller can drive it
   * incrementally rather than holding a socket open for an hour.
   */
  async run({ maxBatches = 4 } = {}) {
    const summary = { checked: 0, verified: 0, invalid: 0, risky: 0, unknown: 0, blocked: 0, results: [] };

    for (let batch = 0; batch < maxBatches; batch += 1) {
      const rows = await this.pending(this.batchSize);
      if (rows.length === 0) break;

      for (const row of rows) {
        const outcome = await this.verifyOne(row);
        summary.checked += 1;
        summary[outcome.status] = (summary[outcome.status] || 0) + 1;
        summary.results.push(outcome);
        // Only pace when a socket was actually opened. A no-MX or malformed
        // rejection costs no connection, so waiting would just waste time.
        if (outcome.reason !== "no-mx-record" && outcome.reason !== "malformed") {
          await this.sleep(this.paceMs);
        }
      }
    }

    return summary;
  }
}
