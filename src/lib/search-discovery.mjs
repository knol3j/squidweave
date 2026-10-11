/**
 * Search-driven website discovery.
 *
 * Uses free and key-based search sources to find domains that are likely to
 * yield good OSINT data. Results are deduplicated and ranked by source quality.
 *
 * Sources (in order of preference):
 *   1. DuckDuckGo HTML search (free, no key, passive)
 *   2. Brave Search API (free tier available, requires BRAVE_API_KEY)
 *   3. Serper / Google Search (requires SERPER_API_KEY or GOOGLE_SEARCH_API_KEY)
 *   4. Curated fallback directory lists (always available)
 */

const DEFAULT_HEADERS = {
  "user-agent": "squidweave-osint/0.1 (+https://localhost)",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractDomain(url) {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function dedupeDomains(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const domain = item.domain || extractDomain(item.url);
    if (!domain) continue;
    if (seen.has(domain)) continue;
    seen.add(domain);
    out.push({ ...item, domain });
  }
  return out;
}

function normalizeUrl(maybeEncoded) {
  if (!maybeEncoded) return "";
  // DuckDuckGo HTML wraps results in /l/?uddg=<urlencoded>
  if (maybeEncoded.startsWith("/l/?uddg=")) {
    const match = maybeEncoded.match(/uddg=([^&]+)/);
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return "";
      }
    }
  }
  if (maybeEncoded.startsWith("http")) return maybeEncoded;
  return "";
}

async function fetchDuckDuckGo(query, limit = 10) {
  const results = [];
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!response.ok) return results;
    const html = await response.text();

    // Extract redirect URLs
    const matches = html.matchAll(/href="(\/l\/\?uddg=[^"]+)"/g);
    for (const match of matches) {
      const raw = match[1];
      const resolved = normalizeUrl(raw);
      if (!resolved) continue;
      const domain = extractDomain(resolved);
      if (!domain || domain === "duckduckgo.com") continue;
      results.push({ url: resolved, domain, source: "duckduckgo" });
      if (results.length >= limit) break;
    }
  } catch (error) {
    results.push({ error: error.message, source: "duckduckgo" });
  }
  return results;
}

async function fetchBrave(query, limit = 10) {
  const key = process.env.BRAVE_API_KEY;
  if (!key) return [];
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${Math.min(limit, 20)}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": key,
      },
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return (payload.web?.results || [])
      .map(r => ({ url: r.url, title: r.title, snippet: r.description, source: "brave" }))
      .filter(r => r.url);
  } catch (error) {
    return [{ error: error.message, source: "brave" }];
  }
}

async function fetchSerper(query, limit = 10) {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];
  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({ q: query, num: Math.min(limit, 20) }),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return (payload.organic || [])
      .map(r => ({ url: r.link, title: r.title, snippet: r.snippet, source: "serper" }))
      .filter(r => r.url);
  } catch (error) {
    return [{ error: error.message, source: "serper" }];
  }
}

async function fetchGoogleCustomSearch(query, limit = 10) {
  const key = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  if (!key || !cx) return [];
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(query)}&num=${Math.min(limit, 10)}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const payload = await response.json();
    return (payload.items || [])
      .map(r => ({ url: r.link, title: r.title, snippet: r.snippet, source: "google-custom" }))
      .filter(r => r.url);
  } catch (error) {
    return [{ error: error.message, source: "google-custom" }];
  }
}

const DIRECTORY_LISTS = {
  vc: [
    { url: "https://www.openvc.app", domain: "openvc.app", note: "VC directory with filters" },
    { url: "https://www.sequoiacap.com", domain: "sequoiacap.com" },
    { url: "https://a16z.com", domain: "a16z.com" },
    { url: "https://www.accel.com", domain: "accel.com" },
    { url: "https://www.benchmark.com", domain: "benchmark.com" },
    { url: "https://www.greylock.com", domain: "greylock.com" },
    { url: "https://www.kleinerperkins.com", domain: "kleinerperkins.com" },
    { url: "https://www.lsvp.com", domain: "lsvp.com" },
    { url: "https://www.indexventures.com", domain: "indexventures.com" },
    { url: "https://www.bvp.com", domain: "bvp.com" },
  ],
  b2b: [
    { url: "https://builtin.com/articles/top-b2b-saas-companies", domain: "builtin.com", note: "Top B2B SaaS companies list" },
    { url: "https://www.g2.com", domain: "g2.com", note: "Software reviews and directories" },
    { url: "https://www.capterra.com", domain: "capterra.com", note: "Software directory" },
    { url: "https://www.getapp.com", domain: "getapp.com", note: "B2B software directory" },
    { url: "https://www.softwareadvice.com", domain: "softwareadvice.com", note: "Software advisor directory" },
    { url: "https://martechdo.com", domain: "martechdo.com", note: "Marketing automation lists" },
    { url: "https://www.blueatlasmarketing.com", domain: "blueatlasmarketing.com", note: "B2B marketing automation guides" },
    { url: "https://www.hubspot.com", domain: "hubspot.com" },
    { url: "https://www.salesforce.com", domain: "salesforce.com" },
    { url: "https://www.marketo.com", domain: "marketo.com" },
    { url: "https://www.mailchimp.com", domain: "mailchimp.com" },
  ],
  competitor: [
    { url: "https://www.g2.com/products/clay-com-clay/competitors/alternatives", domain: "g2.com", note: "Clay competitors on G2" },
    { url: "https://www.saleshandy.com/blog/apollo-io-alternatives/", domain: "saleshandy.com", note: "Apollo.io alternatives" },
    { url: "https://learn.g2.com/best-sales-engagement-software", domain: "g2.com", note: "Best sales engagement software" },
    { url: "https://www.apollo.io", domain: "apollo.io" },
    { url: "https://www.clay.com", domain: "clay.com" },
    { url: "https://www.instantly.ai", domain: "instantly.ai" },
    { url: "https://www.lemlist.com", domain: "lemlist.com" },
    { url: "https://www.zoominfo.com", domain: "zoominfo.com" },
    { url: "https://www.outreach.io", domain: "outreach.io" },
    { url: "https://www.salesloft.com", domain: "salesloft.com" },
  ],
};

function getFallbackDomains(category) {
  const list = DIRECTORY_LISTS[category] || [];
  return list.map(item => ({ ...item, source: "directory" }));
}

/**
 * Discover domains for a given category/query.
 *
 * @param {Object} options
 * @param {string} options.category - 'vc', 'b2b', or 'competitor'
 * @param {string} options.query - search query
 * @param {number} options.limit - max results per source
 * @returns {Promise<Array<{url:string,domain:string,source:string,title?:string,snippet?:string}>>}
 */
function toSourceCategory(category) {
  if (["vc", "investment"].includes(category)) return "vc";
  if (["b2b", "marketing"].includes(category)) return "b2b";
  if (["competitor", "competitive", "research"].includes(category)) return "competitor";
  return category;
}

export async function discoverDomains({ category = "b2b", query, limit = 10 } = {}) {
  const sourceCategory = toSourceCategory(category);
  const searchQuery = query || categoryQuery(sourceCategory);

  const [ddg, brave, serper, google] = await Promise.all([
    fetchDuckDuckGo(searchQuery, limit),
    fetchBrave(searchQuery, limit),
    fetchSerper(searchQuery, limit),
    fetchGoogleCustomSearch(searchQuery, limit),
  ]);

  const combined = [...ddg, ...brave, ...serper, ...google, ...getFallbackDomains(sourceCategory)];
  return dedupeDomains(combined).slice(0, limit);
}

function categoryQuery(category) {
  switch (category) {
    case "vc":
      return "top venture capital firms 2025 seed series A";
    case "b2b":
      return "top B2B SaaS companies 2025 marketing automation CRM";
    case "competitor":
      return "best sales engagement platforms 2025 Apollo Clay alternatives";
    default:
      return "top companies 2025";
  }
}

/**
 * Map a category name to the campaign/seed categories used by the pipeline.
 */
export function mapCategory(category) {
  if (["vc", "investment"].includes(category)) return "investment";
  if (["competitor", "competitive", "research"].includes(category)) return "research";
  return "marketing";
}
