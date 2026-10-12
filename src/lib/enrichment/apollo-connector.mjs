/**
 * Apollo.io enrichment connector.
 *
 * Optional paid fallback. Simulated when credentials are absent.
 */

const API_BASE = "https://api.apollo.io/v1";
const SOURCE = "apollo";

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
    const err = new Error(`Apollo API ${response.status}: ${text || "unknown"}`);
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
 * Enrich through Apollo.
 *
 * @param {object} params
 * @param {string} [params.domain]
 * @param {string} [params.firstName]
 * @param {string} [params.lastName]
 * @param {string} [params.company]
 * @param {string} [params.email]
 * @returns {Promise<{source: string, email: string|null, status: string, confidence: number, reason?: string}>}
 */
export async function apolloEnrich(params = {}) {
  const apiKey = process.env.APOLLO_API_KEY || "";
  if (!apiKey) {
    return buildResult({ status: "simulated", reason: "APOLLO_API_KEY not configured" });
  }

  const domain = params.domain ? String(params.domain).trim().toLowerCase() : null;
  const firstName = params.firstName ? String(params.firstName).trim() : null;
  const lastName = params.lastName ? String(params.lastName).trim() : null;
  const company = params.company ? String(params.company).trim() : null;
  const email = params.email ? String(params.email).trim().toLowerCase() : null;

  try {
    const body = {
      api_key: apiKey,
      reveal_personal_emails: false,
      ...(domain && { organization_domains: [domain] }),
      ...(company && { organization_name: company }),
      ...(firstName && { first_name: firstName }),
      ...(lastName && { last_name: lastName }),
      ...(email && { email }),
    };

    const data = await fetchJson(`${API_BASE}/people/match`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const person = data?.person;
    if (person?.email) {
      return buildResult({
        email: person.email.toLowerCase(),
        status: person.email_status === "verified" ? "verified" : "unknown",
        confidence: person.email_status === "verified" ? 0.85 : 0.5,
        reason: `apollo email_status ${person.email_status}`,
      });
    }

    if (email) {
      return buildResult({ email, status: "not_found", reason: "apollo returned no email" });
    }
    return buildResult({ status: "not_found", reason: "apollo returned no email" });
  } catch (err) {
    if (err.status === "rate_limited") {
      return buildResult({ status: "rate_limited", reason: err.message });
    }
    return buildResult({ status: "error", reason: err.message });
  }
}

export { SOURCE as APOLLO_SOURCE };
