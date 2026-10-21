/**
 * Compliance gate.
 *
 * The one question this module answers is "may we contact this address, on this
 * domain, right now?" It is the only sanctioned way to ask, and it is fail-closed:
 * if a check cannot be evaluated, the answer is block.
 *
 * Fail-closed is deliberate. A gate that defaults to allow when the database is
 * unreachable will send to someone who unsubscribed yesterday, which is the exact
 * failure that costs a sending domain its reputation and invites a complaint.
 * Defaulting to block costs one delayed send.
 *
 * What is enforced here, in order:
 *   1. Address suppression. An opt-out, complaint, or hard bounce on the address
 *      itself. Permanent reasons never expire; temporary ones do.
 *   2. Domain suppression. A blanket no-solicitation policy or spam-trap domain.
 *   3. Hard bounce history. An address that bounced hard is dead; continuing to
 *      send damages every other send from the domain.
 *   4. Role and generic addresses. Unless explicitly targeted, postmaster@,
 *      abuse@, noreply@ and similar are not people and must not be mailed.
 *   5. Consent basis. The caller must state a lawful basis. No basis, no send.
 *
 * What this module deliberately does NOT do:
 *   - It does not decide legality. It enforces the mechanical rules it is given
 *     and records every decision. Whether the consent basis is adequate for a
 *     given jurisdiction is a legal question for a human.
 *   - It does not scrape or infer consent. Consent is recorded, never assumed.
 */

import { randomUUID } from "node:crypto";
import { normalizeDomain } from "./b2b-store.mjs";

// Addresses that are mailboxes, not people. Mailing these is both useless and a
// fast route to an abuse report.
const ROLE_ACCOUNTS = new Set([
  "abuse",
  "admin",
  "administrator",
  "billing",
  "compliance",
  "contact",
  "info",
  "legal",
  "mailer-daemon",
  "marketing",
  "noc",
  "no-reply",
  "noreply",
  "postmaster",
  "privacy",
  "registrar",
  "root",
  "sales",
  "security",
  "support",
  "webmaster",
]);

// Reasons that never expire. Everything else is treated as temporary.
const PERMANENT_REASONS = new Set([
  "unsubscribe",
  "spam_complaint",
  "abuse_report",
  "legal",
  "manual",
  "role_account_only",
]);

// Consent bases a caller may assert. Listed explicitly so an unrecognized string
// is rejected rather than silently accepted.
const VALID_CONSENT_BASES = new Set([
  "explicit_opt_in", // person asked to be contacted
  "legitimate_interest", // documented B2B interest, with opt-out honoured
  "contractual", // existing customer or contract
  "existing_customer", // soft opt-in under PECR-style rules
]);

export function normalizeEmail(email) {
  if (typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return null;
  return trimmed;
}

export function isRoleAccount(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const local = normalized.split("@")[0];
  return ROLE_ACCOUNTS.has(local);
}

export function isValidConsentBasis(basis) {
  return VALID_CONSENT_BASES.has(basis);
}

/**
 * The gate.
 *
 * @param {object} options
 * @param {import("./b2b-store.mjs").B2BStore} options.store
 * @param {string} options.email
 * @param {string} [options.domain] inferred from the email when omitted
 * @param {string} options.consentBasis one of VALID_CONSENT_BASES
 * @param {boolean} [options.allowRoleAccounts] explicit opt-in to role mailboxes
 * @param {string} [options.campaignId] recorded on the audit row
 * @param {boolean} [options.audit] write a compliance_events row (default true)
 * @returns {Promise<{allowed: boolean, reason: string, detail?: string, checks: object[]}>}
 */
export async function checkOutreachAllowed(options) {
  const { store, email, consentBasis, campaignId, audit = true } = options;
  const normalized = normalizeEmail(email);
  const checks = [];

  const record = (name, allowed, reason, detail) => {
    checks.push({ name, allowed, reason, detail });
    return { allowed, reason, detail };
  };

  const finish = async (allowed, reason, detail) => {
    if (audit && store && normalized) {
      try {
        await store.recordComplianceEvent({
          subjectType: "email",
          subject: normalized,
          decision: allowed ? "allow" : "block",
          reason,
          detail,
          campaignId,
        });
      } catch {
        // An audit write failure must not turn into a send. Fail closed.
        return { allowed: false, reason: "audit_write_failed", detail: "compliance event could not be recorded", checks };
      }
    }
    return { allowed, reason, detail, checks };
  };

  // 1. Consent basis is checked first: without it nothing else matters.
  if (!consentBasis || !isValidConsentBasis(consentBasis)) {
    return finish(false, "consent:missing", `unrecognized consent basis "${consentBasis}"`);
  }
  record("consent", true, `consent:${consentBasis}`);

  if (!normalized) {
    return finish(false, "email:malformed", "no usable address");
  }

  const domain = options.domain || normalized.split("@")[1];
  const normalizedDomain = normalizeDomain(domain);

  // 2. Address-level suppression.
  const suppressed = await store.getSuppression(normalized);
  if (suppressed) {
    const expired = suppressed.expires_at && new Date(suppressed.expires_at) <= new Date();
    if (!expired) {
      return finish(
        false,
        `suppression:${suppressed.reason}`,
        suppressed.detail || `suppressed by ${suppressed.source || "unknown"}${suppressed.expires_at ? ` until ${suppressed.expires_at}` : " permanently"}`,
      );
    }
    record("address_suppression", true, "suppression:expired");
  } else {
    record("address_suppression", true, "not suppressed");
  }

  // 3. Domain-level suppression.
  if (normalizedDomain) {
    const domainBlock = await store.getDomainSuppression(normalizedDomain);
    if (domainBlock) {
      const expired = domainBlock.expires_at && new Date(domainBlock.expires_at) <= new Date();
      if (!expired) {
        return finish(
          false,
          `domain:${domainBlock.reason}`,
          domainBlock.detail || `domain ${normalizedDomain} suppressed`,
        );
      }
      record("domain_suppression", true, "domain:expired");
    } else {
      record("domain_suppression", true, "domain not suppressed");
    }
  }

  // 4. Role accounts, unless the caller explicitly targets them.
  if (isRoleAccount(normalized) && !options.allowRoleAccounts) {
    return finish(
      false,
      "role_account",
      `${normalized.split("@")[0]}@ is a functional mailbox, not a person`,
    );
  }

  // 5. Hard bounce history on the address.
  const bounceState = await store.getPersonByEmail(normalized);
  if (bounceState?.email_status === "invalid") {
    // An SMTP rejection is not always permanent, so this blocks rather than
    // suppressing: the address can be re-probed and re-allowed.
    return finish(false, "email:hard_bounce", "address previously rejected by the mail server");
  }
  if (bounceState?.email_status === "blocked") {
    return finish(false, "email:verification_blocked", "address could not be verified; not safe to send");
  }

  record("email_state", true, `email_status=${bounceState?.email_status || "unknown"}`);

  return finish(true, `allow:${consentBasis}`);
}

/**
 * Record an opt-out. This is the single entry point for unsubscribe handling, so
 * every channel lands in the same registry instead of each keeping its own list.
 *
 * @param {object} options
 * @param {import("./b2b-store.mjs").B2BStore} options.store
 * @param {string} options.email
 * @param {string} [options.reason] default 'unsubscribe'
 * @param {string} [options.source] e.g. 'link_click', 'reply', 'webhook'
 * @param {string} [options.detail]
 * @param {Date|null} [options.expiresAt] null = permanent
 */
export async function recordSuppression(options) {
  const { store, reason = "unsubscribe", source = null, detail = null, expiresAt = null } = options;
  const normalized = normalizeEmail(options.email);
  if (!normalized) throw new Error("recordSuppression requires a valid email");

  // A complaint or legal block is permanent even if the caller passed an expiry,
  // because honouring an opt-out is not something a timestamp should override.
  const permanent = PERMANENT_REASONS.has(reason);
  const finalExpiry = permanent ? null : expiresAt;

  const entry = await store.upsertSuppression({
    email: normalized,
    reason,
    source,
    detail,
    expiresAt: finalExpiry,
  });

  // Also flip the legacy boolean so existing code paths that read `contacts.dnd`
  // or `complianceStatus` stay consistent with the new registry.
  try {
    await store.markPersonDoNotContact(normalized, reason);
  } catch {
    // The registry is authoritative; a failure to mirror the legacy flag must not
    // lose the opt-out.
  }

  return entry;
}

export { ROLE_ACCOUNTS, PERMANENT_REASONS, VALID_CONSENT_BASES };
