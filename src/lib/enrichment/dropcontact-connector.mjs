/**
 * Dropcontact enrichment connector.
 *
 * Optional paid fallback. Simulated when credentials are absent.
 */

const API_BASE = "https://api.dropcontact.io/batch";
const SOURCE = "dropcontact";

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
    const err = new Error(`Dropcontact API ${response.status}: ${text || "unknown"}`);
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
 * Enrich through Dropcontact.
 *
 * @param {object} params
 * @param {string} [params.domain]
 * @param {string} [params.firstName]
 * @param {string} [params.lastName]
 * @param {string} [params.email]
 * @returns {Promise<{source: string, email: string|null, status: string, confidence: number, reason?: string}>}
 */
export async function dropcontactEnrich(params = {}) {
  const apiKey = process.env.DROPCONTACT_API_KEY || "";
  if (!apiKey) {
    return buildResult({ status: "simulated", reason: "DROPCONTACT_API_KEY not configured" });
  }

  const domain = params.domain ? String(params.domain).trim().toLowerCase() : null;
  const firstName = params.firstName ? String(params.firstName).trim() : null;
  const lastName = params.lastName ? String(params.lastName).trim() : null;
  const email = params.email ? String(params.email).trim().toLowerCase() : null;

  try {
    const body = {
      data: [
        {
          email: email || undefined,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          domain: domain || undefined,
        },
      ],
    };

    const data = await fetchJson(API_BASE, {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: JSON.stringify(body),
    });

    const result = data?.data?.[0] || {};
    if (result.email) {
      return buildResult({
        email: result.email.toLowerCase(),
        status: result.qualification === "valid" ? "verified" : "unknown",
        confidence: result.qualification === "valid" ? 0.9 : 0.5,
        reason: `dropcontact qualification ${result.qualification}`,
      });
    }

    if (email) {
      return buildResult({ email, status: "not_found", reason: "dropcontact returned no email" });
    }
    return buildResult({ status: "not_found", reason: "dropcontact returned no email" });
  } catch (err) {
    if (err.status === "rate_limited") {
      return buildResult({ status: "rate_limited", reason: err.message });
    }
    return buildResult({ status: "error", reason: err.message });
  }
}

export { SOURCE as DROPCONTACT_SOURCE };
