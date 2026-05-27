/**
 * EmailEnrichmentEngine
 *
 * Automates finding investor email addresses via multiple providers:
 *  1. Website scraper (free — scrapes /team /about pages for names, titles, LinkedIn)
 *  2. Hunter.io (primary — 25 free/mo, paid tiers up to 500/mo)
 *  3. Apollo.io (secondary — richer firmographic + contact data)
 *  4. SimpleName heuristic (fallback — first.last@fund.com pattern guessing)
 *
 * Each provider is tried in order.  The first non-empty result wins.
 * Providers are configured via env vars; if a provider's key is absent
 * it is silently skipped.
 */

import https from 'node:https';
import http from 'node:http';
import { scrapeFundTeam } from './scrape-enrichment-engine.mjs';

/* ------------------------------------------------------------------ */
/*  Config                                                            */
/* ------------------------------------------------------------------ */

const ENV = {
  HUNTER_API_KEY:     process.env.HUNTER_API_KEY || '',
  APOLLO_API_KEY:     process.env.APOLLO_API_KEY || '',
};

/* ------------------------------------------------------------------ */
/*  Provider: Website Scraper (free)                                   */
/* ------------------------------------------------------------------ */

async function huntWithScrape(domain, _firstName, _lastName) {
  try {
    const result = await scrapeFundTeam(domain);
    if (!result || result.people.length === 0) {
      return { email: null, source: 'scrape-no-data', confidence: null };
    }
    return {
      email: null,
      source: 'scrape',
      confidence: null,
      scrapedPeople: result.people.slice(0, 20),
      scrapedLinkedIn: result.linkedinUrls.slice(0, 20),
      scrapedTwitter: result.twitterUrls.slice(0, 10),
    };
  } catch (err) {
    return { email: null, source: 'scrape-error', confidence: null };
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function jsonFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    lib.get(url, { ...options, signal: controller.signal }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', (err) => {
      clearTimeout(timer);
      if (err.name === 'AbortError') return resolve(null);
      reject(err);
    });
  });
}

/** Guess email from partner name + fund domain using common patterns */
function guessEmail(firstName, lastName, domain) {
  if (!firstName || !lastName || !domain) return null;
  const patterns = [
    `${firstName}.${lastName}@${domain}`,
    `${firstName}@${domain}`,
    `${firstName[0]}.${lastName}@${domain}`,
    `${firstName[0]}${lastName}@${domain}`,
    `${firstName}_${lastName}@${domain}`,
    `${firstName}${lastName}@${domain}`,
  ];
  return patterns[0]; // return the most common pattern, caller can try others
}

/** Extract domain from a fund's website URL */
export function extractDomain(website) {
  if (!website) return null;
  let d = website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split('?')[0];
  return d || null;
}

/* ------------------------------------------------------------------ */
/*  Provider: Hunter.io                                                */
/* ------------------------------------------------------------------ */

async function huntWithHunter(domain, firstName, lastName) {
  if (!ENV.HUNTER_API_KEY) return { email: null, source: null, confidence: null };

  try {
    // Step 1: find the domain's pattern (common email format)
    const patternUrl = `https://api.hunter.io/v2/domain-information?domain=${encodeURIComponent(domain)}&api_key=${ENV.HUNTER_API_KEY}`;
    const patternData = await jsonFetch(patternUrl);
    const pattern = patternData?.data?.pattern || '{first}.{last}';

    // Step 2: if we have a name, try email-finder
    if (firstName && lastName) {
      const finderUrl =
        `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}` +
        `&first_name=${encodeURIComponent(firstName)}` +
        `&last_name=${encodeURIComponent(lastName)}` +
        `&api_key=${ENV.HUNTER_API_KEY}`;
      const finderData = await jsonFetch(finderUrl);
      if (finderData?.data?.email) {
        return {
          email: finderData.data.email,
          source: 'hunter-finder',
          confidence: finderData.data.confidence || null,
        };
      }
    }

    // Step 3: list all emails at the domain
    const listUrl = `https://api.hunter.io/v2/email-list?domain=${encodeURIComponent(domain)}&api_key=${ENV.HUNTER_API_KEY}`;
    const listData = await jsonFetch(listUrl);
    const emails = listData?.data?.emails || [];

    // If we have a name, find the closest match
    if (firstName && lastName) {
      const match = emails.find(e => {
        const fn = (e.first_name || '').toLowerCase();
        const ln = (e.last_name || '').toLowerCase();
        return fn === firstName.toLowerCase() && ln === lastName.toLowerCase();
      });
      if (match?.value) {
        return { email: match.value, source: 'hunter-list', confidence: match.confidence || 90 };
      }
    }

    // Return first email as fallback
    if (emails.length > 0 && emails[0]?.value) {
      return { email: emails[0].value, source: 'hunter-list', confidence: emails[0].confidence || 60 };
    }

    return { email: null, source: 'hunter', confidence: null };
  } catch (err) {
    console.error('[EmailEnrichment] Hunter.io error:', err.message);
    return { email: null, source: 'hunter-error', confidence: null };
  }
}

/* ------------------------------------------------------------------ */
/*  Provider: Apollo.io                                                */
/* ------------------------------------------------------------------ */

async function huntWithApollo(domain, firstName, lastName) {
  if (!ENV.APOLLO_API_KEY) return { email: null, source: null, confidence: null };

  try {
    const payload = JSON.stringify({
      api_key: ENV.APOLLO_API_KEY,
      domain,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      page: 1,
      per_page: 10,
    });

    const response = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.apollo.io',
        path: '/api/v1/people/search',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        timeout: 10_000,
      }, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch { resolve(null); }
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    const people = response?.people || [];
    if (firstName && lastName) {
      const match = people.find(p =>
        (p.first_name || '').toLowerCase() === firstName.toLowerCase() &&
        (p.last_name || '').toLowerCase() === lastName.toLowerCase()
      );
      if (match?.email) {
        return { email: match.email, source: 'apollo', confidence: match.email_status === 'verified' ? 98 : 70 };
      }
    }
    if (people.length > 0 && people[0]?.email) {
      return { email: people[0].email, source: 'apollo', confidence: 65 };
    }

    return { email: null, source: 'apollo', confidence: null };
  } catch (err) {
    console.error('[EmailEnrichment] Apollo.io error:', err.message);
    return { email: null, source: 'apollo-error', confidence: null };
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Resolve the best email address for an investor/partner.
 *
 * @param {object} investor  — { fundName, partnerName, website, domain? }
 * @param {object} [opts]
 * @param {boolean} [opts.fallbackToGuess=true]  — use name+domain pattern guessing as last resort
 * @returns {Promise<{email: string|null, source: string|null, confidence: number|null}>}
 */
export async function enrichInvestorEmail(investor, opts = {}) {
  const { fallbackToGuess = true } = opts;

  const domain = investor.domain || extractDomain(investor.website);
  if (!domain) {
    return { email: null, source: 'no-domain', confidence: null };
  }

  // Parse partner name
  let firstName = null;
  let lastName = null;
  if (investor.partnerName) {
    const parts = investor.partnerName.trim().split(/\s+/);
    firstName = parts[0];
    lastName = parts.length > 1 ? parts[parts.length - 1] : null;
  }

  // Try providers in order
  const providers = [huntWithScrape, huntWithHunter, huntWithApollo];
  for (const provider of providers) {
    const result = await provider(domain, firstName, lastName);
    if (result?.email) {
      return result;
    }
    if (result?.scrapedPeople?.length > 0) {
      return result;
    }
  }

  // Fallback: pattern guessing
  if (fallbackToGuess && firstName && lastName) {
    const guessed = guessEmail(firstName, lastName, domain);
    if (guessed) {
      return { email: guessed, source: 'guess', confidence: 30 };
    }
  }

  return { email: null, source: 'exhausted', confidence: null };
}

/**
 * Batch-enrich multiple investors concurrently (use with caution: API rate limits).
 */
export async function batchEnrichInvestors(investors, opts = {}) {
  const { concurrency = 3 } = opts;
  const results = [];

  for (let i = 0; i < investors.length; i += concurrency) {
    const batch = investors.slice(i, i + concurrency);
    const enriched = await Promise.all(
      batch.map(async (inv) => {
        const result = await enrichInvestorEmail(inv, opts);
        return { ...inv, ...result, enrichedAt: new Date().toISOString() };
      })
    );
    results.push(...enriched);
  }

  return results;
}

/**
 * Check which providers are configured (for dashboard status).
 */
export function getEnrichmentProvidersStatus() {
  return {
    scraper: { configured: true, description: 'free website scraper for /team /about pages' },
    hunter: { configured: !!ENV.HUNTER_API_KEY, keyPrefix: ENV.HUNTER_API_KEY ? ENV.HUNTER_API_KEY.slice(0, 6) + '...' : null },
    apollo: { configured: !!ENV.APOLLO_API_KEY, keyPrefix: ENV.APOLLO_API_KEY ? ENV.APOLLO_API_KEY.slice(0, 6) + '...' : null },
  };
}
