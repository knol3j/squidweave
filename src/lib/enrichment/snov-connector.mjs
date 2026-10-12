/**
 * Snov.io enrichment connector.
 *
 * Optional paid fallback. Simulated when credentials are absent.
 */

const API_BASE = "https://api.snov.io/v1";
const SOURCE = "snov";

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
    const err = new Error(`Snov API ${response.status}: ${text || "unknown"}`);
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
 * Enrich through Snov.
 *
 * @param {object} params
 * @param {string} [params.domain]
 * @param {string} [params.firstName]
 * @param {string} [params.lastName]
 * @param {string} [params.email]
 * @returns {Promise<{source: string, email: string|null, status: string, confidence: number, reason?: string}>}
 */
export async function snovEnrich(params = {}) {
  const userId = process.env.SNOV_USER_ID || "";
  const secret = process.env.SNOV_SECRET || "";
  if (!userId || !secret) {
    return buildResult({ status: "simulated", reason: "SNOV_USER_ID or SNOV_SECRET not configured" });
  }

  const domain = params.domain ? String(params.domain).trim().toLowerCase() : null;
  const firstName = params.firstName ? String(params.firstName).trim() : null;
  const lastName = params.lastName ? String(params.lastName).trim() : null;
  const email = params.email ? String(params.email).trim().toLowerCase() : null;

  try {
    // Snov requires an access token obtained via OAuth2 client_credentials.
    const tokenRes = await fetchJson(`${API_BASE}/oauth/access_token`, {
      method: "POST",
      body: JSON.stringify({ grant_type: "client_credentials", client_id: userId, client_secret: secret }),
    });
    const accessToken = tokenRes?.access_token;
    if (!accessToken) {
      return buildResult({ status: "error", reason: "could not obtain Snov access token" });
    }

    const headers = { authorization: `Bearer ${accessToken}` };

    if (email) {
      const data = await fetchJson(
        `${API_BASE}/prospect/email-info?email=${encodeURIComponent(email)}`,
        { headers },
      );
      if (data?.email) {
        return buildResult({
          email,
          status: data.status === "valid" ? "verified" : "unknown",
          confidence: data.status === "valid" ? 0.85 : 0.5,
          reason: `snov status ${data.status}`,
        });
      }
      return buildResult({ email, status: "not_found", reason: "snov returned no info" });
    }

    if (domain && firstName && lastName) {
      const data = await fetchJson(`${API_BASE}/prospect/email-finder`, {
        method: "POST",
        headers,
        body: JSON.stringify({ domain, firstName, lastName }),
      });
      if (data?.email) {
        return buildResult({
          email: data.email.toLowerCase(),
          status: "verified",
          confidence: 0.85,
          reason: "snov email-finder",
        });
      }
      return buildResult({ status: "not_found", reason: "snov email-finder returned no email" });
    }

    return buildResult({ status: "unknown", reason: "need domain + firstName + lastName or an email" });
  } catch (err) {
    if (err.status === "rate_limited") {
      return buildResult({ status: "rate_limited", reason: err.message });
    }
    return buildResult({ status: "error", reason: err.message });
  }
}

export { SOURCE as SNOV_SOURCE };
