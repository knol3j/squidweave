/**
 * Paid enrichment connector index.
 *
 * Provides a unified fallback chain: try each configured connector until one
 * returns a verified email. Connectors simulate when their API keys are absent,
 * so wiring them in never forces a purchase.
 */

import { hunterEnrich } from "./hunter-connector.mjs";
import { snovEnrich } from "./snov-connector.mjs";
import { dropcontactEnrich } from "./dropcontact-connector.mjs";
import { apolloEnrich } from "./apollo-connector.mjs";

const CONNECTORS = {
  hunter: hunterEnrich,
  snov: snovEnrich,
  dropcontact: dropcontactEnrich,
  apollo: apolloEnrich,
};

const DEFAULT_ORDER = ["hunter", "snov", "dropcontact", "apollo"];

/**
 * List available connector names.
 */
export function listEnrichmentConnectors() {
  return Object.keys(CONNECTORS);
}

/**
 * Try each configured connector in order until a verified email is found.
 *
 * @param {object} params
 * @param {string} [params.domain]
 * @param {string} [params.firstName]
 * @param {string} [params.lastName]
 * @param {string} [params.company]
 * @param {string} [params.email]
 * @param {string[]} [params.connectors] connector names to try
 * @returns {Promise<{email?: string, status: string, confidence: number, source?: string, reason?: string, attempts: object[]}>}
 */
export async function enrichWithFallbacks(params = {}) {
  const order = Array.isArray(params.connectors) && params.connectors.length
    ? params.connectors.filter(name => CONNECTORS[name])
    : DEFAULT_ORDER;

  const attempts = [];

  for (const name of order) {
    const result = await CONNECTORS[name](params);
    attempts.push({ source: name, ...result });
    if (result.status === "verified" && result.email) {
      return {
        email: result.email,
        status: "verified",
        confidence: result.confidence,
        source: name,
        reason: result.reason,
        attempts,
      };
    }
  }

  // If nothing verified, return the best non-error/non-rate-limited attempt.
  const best = attempts.find(a => a.status !== "error" && a.status !== "rate_limited") || attempts[0];
  return {
    email: best?.email || null,
    status: best?.status || "not_found",
    confidence: best?.confidence || 0,
    source: best?.source,
    reason: best?.reason,
    attempts,
  };
}

export { hunterEnrich, snovEnrich, dropcontactEnrich, apolloEnrich };
