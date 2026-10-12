/**
 * Hunter.io enrichment connector.
 *
 * Optional paid fallback for discovering verified work emails. Returns a
 * simulated result when no API key is configured, so the module can be wired in
 * without forcing a purchase.
 */

const API_BASE = "https://api.hunter.io/v2";
const SOURCE = "hunter";

function normalizeInput({ domain, firstName, lastName, company, email }) {
  return {
    domain: domain ? String(domain).trim().toLowerCase() : null,
    firstName: firstName ? String(firstName).trim() : null,
    lastName: lastName ? String(lastName).trim() : null,
    company: company ? String(company).trim() : null,
    email: email ? String(email).trim().toLowerCase() : null,
  };
}

function buildResult({ email = null, status = "unknown", confidence = 0, reason = null }) {
  return {
    source: SOURCE,
    email,
    status,
    confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
    reason,
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text().catch(() => null);
  if (!response.ok) {
    if (response.status === 429) {
      const err = new Error("rate limited");
      err.status = "rate_limited";
      throw err;
    }
    const err = new Error(`Hunter API ${response.status}: ${text || "unknown"}`);
    err.status = "error";
    throw err;
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/**
 * Enrich a person or email through Hunter.
 *
 * @param {object} params
 * @param {string} [params.domain]
 * @param {string} [params.firstName]
 * @param {string} [params.lastName]
 * @param {string} [params.company]
 * @param {string} [params.email]
 * @returns {Promise<{source: string, email: string|null, status: string, confidence: number, reason?: string}>}
 */
export async function hunterEnrich(params = {}) {
  const apiKey = process.env.HUNTER_API_KEY || "";
  if (!apiKey) {
    return buildResult({ status: "simulated", reason: "HUNTER_API_KEY not configured" });
  }

  const input = normalizeInput(params);

  // If an email is provided, verify it first.
  if (input.email) {
    try {
      const url = `${API_BASE}/email-verifier?email=${encodeURIComponent(input.email)}&api_key=${encodeURIComponent(apiKey)}`;
      const data = await fetchJson(url);
      const result = data?.data || {};
      if (result.status === "valid") {
        return buildResult({
          email: input.email,
          status: "verified",
          confidence: (result.score || 0) / 100,
          reason: `hunter score ${result.score}`,
        });
      }
      return buildResult({
        email: input.email,
        status: result.status === "invalid" ? "not_found" : "unknown",
        confidence: (result.score || 0) / 100,
        reason: `hunter status ${result.status}`,
      });
    } catch (err) {
      if (err.status === "rate_limited") {
        return buildResult({ status: "rate_limited", reason: err.message });
      }
      return buildResult({ status: "error", reason: err.message });
    }
  }

  // Otherwise try email finder.
  if (input.domain && input.firstName && input.lastName) {
    try {
      const url =
        `${API_BASE}/email-finder?domain=${encodeURIComponent(input.domain)}` +
        `&first_name=${encodeURIComponent(input.firstName)}` +
        `&last_name=${encodeURIComponent(input.lastName)}` +
        `&api_key=${encodeURIComponent(apiKey)}`;
      const data = await fetchJson(url);
      const result = data?.data || {};
      if (result.email) {
        return buildResult({
          email: result.email.toLowerCase(),
          status: result.score >= 80 ? "verified" : "unknown",
          confidence: (result.score || 0) / 100,
          reason: `hunter email-finder score ${result.score}`,
        });
      }
      return buildResult({ status: "not_found", reason: "hunter email-finder returned no email" });
    } catch (err) {
      if (err.status === "rate_limited") {
        return buildResult({ status: "rate_limited", reason: err.message });
      }
      return buildResult({ status: "error", reason: err.message });
    }
  }

  return buildResult({ status: "unknown", reason: "need domain + firstName + lastName or an email" });
}

export { SOURCE as HUNTER_SOURCE };
