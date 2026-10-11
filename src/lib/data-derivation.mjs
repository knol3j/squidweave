/**
 * Data Derivation Engine
 *
 * Higher-level discovery and derivation functions built on top of
 * search-discovery. Each function tries web search first, then falls back
 * to curated data or heuristic derivation so the platform can keep working
 * when external APIs are unavailable.
 *
 * All functions are passive (no authenticated APIs required) and degrade
 * gracefully. Set BRAVE_API_KEY, SERPER_API_KEY, or GOOGLE_SEARCH_API_KEY
 * for richer results.
 */

import { discoverDomains } from "./search-discovery.mjs";

const DEFAULT_HEADERS = {
  "user-agent": "squidweave-osint/0.1 (+https://localhost)",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const EMAIL_PATTERNS = [
  "{first}.{last}@{domain}",
  "{first}@{domain}",
  "{first[0]}.{last}@{domain}",
  "{first[0]}{last}@{domain}",
  "{first}_{last}@{domain}",
  "{first}{last}@{domain}",
  "{last}.{first}@{domain}",
  "contact@{domain}",
  "info@{domain}",
  "hello@{domain}",
];

const ROLE_QUERIES = {
  founder: ["founder", "co-founder", "ceo"],
  investor: ["partner", "investor", "managing director", "principal"],
  marketing: ["cmo", "vp marketing", "head of marketing", "marketing director"],
  sales: ["vp sales", "head of sales", "sales director", "account executive"],
  engineering: ["cto", "vp engineering", "head of engineering", "lead engineer"],
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractDomain(url) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function titleCase(str) {
  return str
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function cleanCompanyName(name) {
  return name
    .replace(/\s+/g, " ")
    .replace(/\s*[-|:].*$/, "")
    .replace(/\s*\|.*$/, "")
    .trim();
}

async function fetchText(url, timeoutMs = 8000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { headers: DEFAULT_HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

function parseSearchResults(html, limit) {
  const results = [];
  const re = /href="(\/l\/\?uddg=[^"]+)"[^>]*>(.*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) !== null && results.length < limit) {
    const encoded = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    const urlMatch = encoded.match(/uddg=([^&]+)/);
    if (!urlMatch) continue;
    try {
      const url = decodeURIComponent(urlMatch[1]);
      const domain = extractDomain(url);
      if (!domain || domain === "duckduckgo.com") continue;
      results.push({ title, url, domain });
    } catch {
      // ignore malformed redirect
    }
  }
  return results;
}

async function searchWeb(query, limit = 10) {
  const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
  if (!html) return [];
  return parseSearchResults(html, limit);
}

function normalizeStage(description = "") {
  const d = description.toLowerCase();
  if (d.includes("pre-seed") || d.includes("pre seed")) return "pre-seed";
  if (d.includes("seed")) return "seed";
  if (d.includes("series a")) return "series-a";
  if (d.includes("series b")) return "series-b";
  if (d.includes("series c")) return "series-c";
  if (d.includes("growth")) return "growth";
  if (d.includes("late stage")) return "late-stage";
  return "multi-stage";
}

function normalizeCheckSize(description = "") {
  const d = description.toLowerCase();
  if (d.includes("$1b") || d.includes("billion")) return "$1B+";
  if (d.includes("$500m")) return "$500M+";
  if (d.includes("$100m")) return "$100M+";
  if (d.includes("$50m")) return "$50M+";
  if (d.includes("$10m")) return "$10M+";
  if (d.includes("$1m")) return "$1M+";
  if (d.includes("$100k")) return "$100K+";
  return "undisclosed";
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Discover companies matching a query.
 */
export async function discoverCompanies(query, opts = {}) {
  const { limit = 10, industry = "" } = opts;
  const searchQuery = query || `top ${industry} companies 2025`;
  const results = await discoverDomains({ category: "b2b", query: searchQuery, limit });

  return results.map(r => ({
    name: cleanCompanyName(r.title || r.domain),
    domain: r.domain,
    url: r.url,
    description: r.snippet || "",
    source: r.source,
  }));
}

/**
 * Discover VC/investor firms matching a query.
 */
export async function discoverInvestors(query, opts = {}) {
  const { limit = 10 } = opts;
  const searchQuery = query || "top venture capital firms 2025";
  const results = await discoverDomains({ category: "vc", query: searchQuery, limit });

  return results.map(r => ({
    fundName: cleanCompanyName(r.title || r.domain),
    domain: r.domain,
    website: r.url,
    stageFocus: normalizeStage(r.snippet || ""),
    checkSizeBand: normalizeCheckSize(r.snippet || ""),
    sectorFocus: [],
    thesisSummary: r.snippet || "",
    source: r.source,
  }));
}

/**
 * Discover public pages/people for a given role at a domain.
 */
export async function discoverContacts(domain, role, opts = {}) {
  const { limit = 8 } = opts;
  const normalizedRole = (role || "founder").toLowerCase();
  const roleTerms = ROLE_QUERIES[normalizedRole] || [normalizedRole];
  const query = `site:${domain} ${roleTerms.join(" OR ")}`;
  const results = await searchWeb(query, limit);

  return results.map(r => {
    const titleParts = (r.title || "").split(/[-|:]/);
    const nameCandidate = titleParts[0].trim();
    const titleCandidate = titleParts.slice(1).join(" ").trim() || normalizedRole;
    return {
      name: nameCandidate,
      title: titleCase(titleCandidate),
      domain: r.domain,
      url: r.url,
      source: "web-search",
    };
  });
}

/**
 * Derive the most likely email pattern(s) for a domain.
 */
export async function deriveEmailPattern(domain, opts = {}) {
  const { count = 3 } = opts;
  const query = `"@{domain}" email format OR pattern`;
  const results = await searchWeb(query, 5);

  // If search yields any result mentioning a pattern, prioritize first.last
  const hasPatternSignal = results.some(r =>
    /email format|email pattern|first\.|first_name|last_name|\{first\}/i.test(r.title + " " + r.domain)
  );

  const patterns = EMAIL_PATTERNS.slice(0, count).map(p => ({
    pattern: p,
    confidence: p.includes("{first}.{last}") && hasPatternSignal ? 0.75 : 0.5,
    source: hasPatternSignal ? "search-derived" : "heuristic",
  }));

  return {
    domain,
    primaryPattern: patterns[0].pattern,
    patterns,
  };
}

/**
 * Discover related keywords for a topic.
 */
export async function discoverKeywords(topic, opts = {}) {
  const { limit = 10 } = opts;
  const queries = [
    `${topic} related keywords`,
    `${topic} alternatives`,
    `${topic} vs`,
  ];

  const results = [];
  for (const query of queries) {
    const found = await searchWeb(query, Math.ceil(limit / queries.length));
    results.push(...found);
    await sleep(250);
  }

  const keywords = new Set();
  for (const r of results) {
    const text = `${r.title} ${r.url}`.toLowerCase();
    const matches = text.match(/[a-z0-9]+(?:\s+[a-z0-9]+){0,2}/g) || [];
    for (const m of matches) {
      const kw = m.trim();
      if (kw.length > 3 && kw !== topic.toLowerCase() && !/https?|www|com|org|io|html/.test(kw)) {
        keywords.add(kw);
      }
    }
  }

  return Array.from(keywords).slice(0, limit).map(kw => ({
    keyword: kw,
    source: "web-search",
  }));
}

/**
 * Discover competitor products/companies for a given product/topic.
 */
export async function discoverCompetitors(product, opts = {}) {
  const { limit = 10 } = opts;
  const query = `${product} competitors alternatives`;
  const results = await discoverDomains({ category: "competitor", query, limit });

  return results.map(r => ({
    name: cleanCompanyName(r.title || r.domain),
    domain: r.domain,
    url: r.url,
    description: r.snippet || "",
    source: r.source,
  }));
}

/**
 * Discover job/hiring signals for a company.
 */
export async function discoverJobSignals(company, opts = {}) {
  const { limit = 8 } = opts;
  const query = `${company} jobs hiring site:lever.co OR site:greenhouse.io OR site:workable.com OR site:ashbyhq.com`;
  const results = await searchWeb(query, limit);

  return results.map(r => {
    const board = r.domain.split(".")[0];
    return {
      company,
      board,
      url: r.url,
      title: r.title,
      hiring: true,
      source: "web-search",
    };
  });
}

/**
 * Discover inferred technology stack signals for a domain.
 */
export async function discoverTechStack(domain, opts = {}) {
  const { limit = 8 } = opts;
  const query = `site:${domain} tech stack OR built with OR careers engineer`;
  const results = await searchWeb(query, limit);

  const techSignals = [
    "react", "vue", "angular", "svelte",
    "node", "python", "go", "rust", "java", "ruby", "php",
    "postgres", "mysql", "mongodb", "redis", "dynamodb",
    "aws", "gcp", "azure", "cloudflare", "vercel", "netlify",
    "kubernetes", "docker", "terraform",
    "stripe", "twilio", "sendgrid",
  ];

  const text = results.map(r => `${r.title} ${r.url}`).join(" ").toLowerCase();
  const stack = [];
  for (const tech of techSignals) {
    if (text.includes(tech)) {
      stack.push({ technology: tech, evidence: "search-derived", confidence: 0.5 });
    }
  }

  return {
    domain,
    stack: stack.slice(0, limit),
    source: "web-search",
  };
}

/**
 * Discover recent news/trends for a topic.
 */
export async function discoverTrends(topic, opts = {}) {
  const { limit = 8 } = opts;
  const query = `${topic} news 2025`;
  const results = await searchWeb(query, limit);

  return results.map(r => ({
    title: r.title,
    url: r.url,
    domain: r.domain,
    topic,
    source: "web-search",
  }));
}
