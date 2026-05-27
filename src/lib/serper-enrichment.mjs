/**
 * SerperEnrichment
 *
 * Uses Serper.dev Google Search API to enrich investor data:
 * - Look up verified domain from company name/website
 * - Find partner email addresses via search
 *
 * Serper API key must be set in SERPER_API_KEY env var.
 * If unset, this module silently returns null results.
 */

import https from 'node:https';

const SERPER_API_KEY = process.env.SERPER_API_KEY || '';

/**
 * Make a POST request to Serper API.
 */
function serperPost(endpoint, payload) {
  return new Promise((resolve, reject) => {
    if (!SERPER_API_KEY) {
      resolve(null);
      return;
    }
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: 'google.serper.dev',
        path: endpoint,
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 10_000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', (err) => {
      console.error('[SerperEnrichment] Request error:', err.message);
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

/**
 * Extract domain from a search result or knowledge graph.
 */
function extractDomainFromResult(data) {
  // Check knowledge graph first
  if (data?.knowledgeGraph?.description) {
    const match = data.knowledgeGraph.description.match(
      /https?:\/\/(?:www\.)?([^\/\s]+)/
    );
    if (match) return match[1].toLowerCase();
  }

  // Check organic results
  const organic = data?.organic || [];
  for (const result of organic) {
    if (result.link) {
      const domain = result.link
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('/')[0]
        .split('?')[0]
        .toLowerCase();
      // Filter out social media, wikipedia, etc.
      if (
        domain &&
        !domain.includes('wikipedia') &&
        !domain.includes('linkedin') &&
        !domain.includes('crunchbase') &&
        !domain.includes('facebook') &&
        !domain.includes('twitter') &&
        !domain.includes('bloomberg') &&
        !domain.includes('pitchbook')
      ) {
        return domain;
      }
    }
  }
  return null;
}

/**
 * Look up a company's domain via Serper search.
 *
 * @param {string} companyName - Company/fund name
 * @param {string} [knownWebsite] - Optional known website URL
 * @returns {Promise<{domain: string|null, source: string, confidence: number|null}>}
 */
export async function enrichCompanyDomain(companyName, knownWebsite = null) {
  if (!SERPER_API_KEY) {
    return { domain: null, source: 'serper-not-configured', confidence: null };
  }

  try {
    // If we have a known website, use it to confirm/search
    const query = knownWebsite
      ? `${companyName} ${knownWebsite.replace(/^https?:\/\//i, '').split('/')[0]}`
      : `${companyName} venture capital`;

    const data = await serperPost('/search', { q: query });

    if (!data) {
      return { domain: null, source: 'serper-no-data', confidence: null };
    }

    const domain = extractDomainFromResult(data);
    if (domain) {
      return { domain, source: 'serper-search', confidence: 80 };
    }

    return { domain: null, source: 'serper-no-match', confidence: null };
  } catch (err) {
    console.error('[SerperEnrichment] enrichCompanyDomain error:', err.message);
    return { domain: null, source: 'serper-error', confidence: null };
  }
}

/**
 * Search for a person's email at a company using Serper.
 *
 * @param {string} partnerName - Full name of the partner
 * @param {string} companyName - Company/fund name
 * @param {string} domain - Known domain
 * @returns {Promise<{email: string|null, source: string, confidence: number|null}>}
 */
export async function enrichPersonEmail(partnerName, companyName, domain) {
  if (!SERPER_API_KEY) {
    return { email: null, source: 'serper-not-configured', confidence: null };
  }

  try {
    const nameParts = partnerName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const query = domain
      ? `"${partnerName}" email ${domain}`
      : `"${partnerName}" ${companyName} email contact`;

    const data = await serperPost('/search', { q: query });

    if (!data) {
      return { email: null, source: 'serper-no-data', confidence: null };
    }

    // Scan organic results for email addresses
    const organic = data?.organic || [];
    for (const result of organic) {
      if (result.link) {
        // Simple email regex
        const emailMatch = result.link.match(
          /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
        );
        if (emailMatch) return { email: emailMatch[1], source: 'serper-search', confidence: 60 };
      }
      if (result.snippet) {
        const emailMatch = result.snippet.match(
          /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
        );
        if (emailMatch) return { email: emailMatch[1], source: 'serper-snippet', confidence: 50 };
      }
    }

    return { email: null, source: 'serper-no-match', confidence: null };
  } catch (err) {
    console.error('[SerperEnrichment] enrichPersonEmail error:', err.message);
    return { email: null, source: 'serper-error', confidence: null };
  }
}

/**
 * Check if Serper is configured.
 */
export function isSerperConfigured() {
  return !!SERPER_API_KEY;
}
