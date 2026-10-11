/**
 * Discovery Scout — OSINT + recon module for clawdbot discovery role.
 * Combines search dorking, GitHub recon, DNS/WHOIS, cert transparency,
 * subdomain discovery, and lightweight pentest-style probes.
 */

import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import { searchDuck, searchBing } from './search-scout.mjs';
import { lookupWhois } from './whois-scout.mjs';
import { searchRepos, getOrg } from './github-scout.mjs';
import { permuteEmail, validateDomain } from './email-permutator.mjs';
import { findJobs } from './jobpost-scout.mjs';

const UA = 'Mozilla/5.0 (compatible; SquidWeaveDiscovery/1.0)';

// ── Search Dorking ──────────────────────────────────────────────────────────

const DORK_TEMPLATES = [
  q => `"${q}" site:linkedin.com/company`,
  q => `"${q}" site:crunchbase.com/organization`,
  q => `"${q}" intitle:"about" OR intitle:"team" -site:linkedin.com`,
  q => `"${q}" filetype:pdf`,
  q => `"${q}" inurl:careers OR inurl:jobs OR inurl:hiring`,
  q => `"${q}" "contact us" OR "get in touch"`,
  q => `"${q}" email OR "@" contact`,
  q => `"${q}" site:github.com`,
];

export async function dorkSearch(query, maxResults = 30) {
  const dorks = DORK_TEMPLATES.map(fn => fn(query));
  const all = [];
  for (const dork of dorks.slice(0, 4)) {
    const [duck, bing] = await Promise.allSettled([
      searchDuck(dork, Math.ceil(maxResults / 2)),
      searchBing(dork, Math.ceil(maxResults / 2)),
    ]);
    if (duck.status === 'fulfilled') all.push(...duck.value);
    if (bing.status === 'fulfilled') all.push(...bing.value);
    await sleep(800);
  }
  // Deduplicate by URL
  const seen = new Set();
  return all.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  }).slice(0, maxResults);
}

// ── GitHub Recon ────────────────────────────────────────────────────────────

export async function githubDork(query, token = '', max = 20) {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SquidWeaveDiscovery/1.0',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const results = { repos: [], orgs: [], codeHits: [] };

  // Repo search
  try {
    const repos = await searchRepos(query, max);
    results.repos = repos.map(r => ({
      name: r.full_name,
      url: r.html_url,
      description: r.description,
      stars: r.stargazers_count,
      language: r.language,
      topics: r.topics || [],
      owner: r.owner?.login,
      ownerType: r.owner?.type,
      homepage: r.homepage,
      updated: r.updated_at,
    }));
  } catch { /* skip */ }

  // Org discovery from repo owners
  const orgLogins = [...new Set(
    results.repos.filter(r => r.ownerType === 'Organization').map(r => r.owner)
  )].slice(0, 5);
  for (const login of orgLogins) {
    try {
      const org = await getOrg(login);
      if (org) {
        results.orgs.push({
          login: org.login,
          name: org.name,
          blog: org.blog,
          location: org.location,
          email: org.email,
          publicRepos: org.public_repos,
          followers: org.followers,
          description: org.description,
          twitter: org.twitter_username,
        });
      }
    } catch { /* skip */ }
    await sleep(300);
  }

  // Code search for exposed contact info (needs auth)
  if (token) {
    try {
      const codeQuery = `"${query}" in:file extension:md OR extension:txt OR extension:json`;
      const params = new URLSearchParams({ q: codeQuery, per_page: '10' });
      const r = await fetch(`https://api.github.com/search/code?${params}`, {
        headers, signal: AbortSignal.timeout(10000),
      });
      if (r.ok) {
        const d = await r.json();
        results.codeHits = (d.items || []).map(item => ({
          repo: item.repository?.full_name,
          path: item.path,
          url: item.html_url,
        }));
      }
    } catch { /* skip */ }
  }

  return results;
}

// ── DNS + Domain Intel ──────────────────────────────────────────────────────

export async function dnsRecon(domain) {
  const results = { domain, records: {} };
  const types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'];
  for (const type of types) {
    try {
      const resolver = new dns.Resolver();
      resolver.setServers(['8.8.8.8', '1.1.1.1']);
      const records = await resolver.resolve(domain, type);
      results.records[type] = records.map(r => {
        if (typeof r === 'string') return r;
        return {
          value: r.exchange || r.address || r.data || r.nsname || r.target || r.hostname || JSON.stringify(r),
          priority: r.priority || undefined,
          ttl: r.ttl || undefined,
        };
      });
    } catch {
      results.records[type] = [];
    }
  }
  // Extract mail providers from MX
  const mx = results.records.MX || [];
  results.mailProvider = mx.length > 0
    ? mx.map(m => {
        const v = typeof m === 'string' ? m : m.value || '';
        if (/google|gmail/i.test(v)) return 'Google Workspace';
        if (/outlook|microsoft/i.test(v)) return 'Microsoft 365';
        if (/zoho/i.test(v)) return 'Zoho Mail';
        if (/protonmail/i.test(v)) return 'ProtonMail';
        return v.split('.')[0];
      }).filter((v, i, a) => a.indexOf(v) === i)
    : [];
  return results;
}

export async function whoisIntel(domain) {
  try {
    const w = await lookupWhois(domain);
    if (!w) return null;
    return {
      domain,
      registrar: w.registrar,
      created: w.created,
      updated: w.updated,
      expires: w.expires,
    };
  } catch { return null; }
}

// ── Certificate Transparency ────────────────────────────────────────────────

export async function certTransparency(domain, max = 50) {
  try {
    const r = await fetch(`https://crt.sh/?q=%.${domain}&output=json`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return [];
    const certs = await r.json();
    const subdomains = new Set();
    for (const cert of certs) {
      for (const name of (cert.name_value || '').split('\n')) {
        const clean = name.trim().toLowerCase();
        if (clean && clean.endsWith(domain) && !clean.startsWith('*')) {
          subdomains.add(clean);
        }
      }
    }
    return [...subdomains].slice(0, max);
  } catch { return []; }
}

// ── Lightweight Pentest Probes ──────────────────────────────────────────────

const COMMON_PORTS = [21, 22, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995, 3306, 3389, 5432, 6379, 8080, 8443, 8888, 9200, 27017];

export async function portScan(host, ports = COMMON_PORTS, timeoutMs = 2000) {
  const open = [];
  const checks = ports.map(port => new Promise(resolve => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(null);
    }, timeoutMs);
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(port);
    });
    socket.once('timeout', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(null);
    });
    socket.once('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    socket.connect(port, host);
  }));
  const results = await Promise.allSettled(checks);
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value !== null) open.push(r.value);
  }
  return open;
}

export async function httpProbe(host, path = '/') {
  const url = `https://${host}${path}`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
      redirect: 'manual',
    });
    const headers = {};
    r.headers.forEach((v, k) => { headers[k] = v; });
    return {
      url,
      status: r.status,
      headers,
      redirect: r.headers.get('location') || null,
      server: r.headers.get('server') || null,
      poweredBy: r.headers.get('x-powered-by') || null,
      contentType: r.headers.get('content-type') || null,
    };
  } catch (e) {
    // Try HTTP
    try {
      const r = await fetch(`http://${host}${path}`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(5000),
        redirect: 'manual',
      });
      const headers = {};
      r.headers.forEach((v, k) => { headers[k] = v; });
      return {
        url: `http://${host}${path}`,
        status: r.status,
        headers,
        redirect: r.headers.get('location') || null,
        server: r.headers.get('server') || null,
        poweredBy: r.headers.get('x-powered-by') || null,
        contentType: r.headers.get('content-type') || null,
      };
    } catch { return { url, status: null, error: e.message }; }
  }
}

const SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'x-xss-protection',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
];

export function auditSecurityHeaders(probe) {
  if (!probe?.headers) return { present: [], missing: SECURITY_HEADERS, score: 0 };
  const present = SECURITY_HEADERS.filter(h => probe.headers[h]);
  const missing = SECURITY_HEADERS.filter(h => !probe.headers[h]);
  return {
    present,
    missing,
    score: Math.round((present.length / SECURITY_HEADERS.length) * 100),
  };
}

const TECH_FINGERPRINTS = [
  { name: 'React', patterns: ['react', '__next', '_next/static'] },
  { name: 'Vue.js', patterns: ['vue', '__vue', '_nuxt'] },
  { name: 'Angular', patterns: ['ng-', 'angular'] },
  { name: 'Next.js', patterns: ['_next/static', '__NEXT_DATA__'] },
  { name: 'WordPress', patterns: ['wp-content', 'wp-includes', 'wp-json'] },
  { name: 'Shopify', patterns: ['cdn.shopify.com', 'shopify'] },
  { name: 'Squarespace', patterns: ['squarespace'] },
  { name: 'Wix', patterns: ['wix.com', 'wixstatic'] },
  { name: 'Webflow', patterns: ['webflow'] },
  { name: 'Framer', patterns: ['framer'] },
  { name: 'Ghost', patterns: ['ghost.io', 'ghost-'] },
  { name: 'HubSpot', patterns: ['hubspot', 'hs-scripts'] },
  { name: 'Segment', patterns: ['segment.com', 'analytics.js'] },
  { name: 'Google Analytics', patterns: ['google-analytics', 'gtag', 'googletagmanager'] },
  { name: 'Stripe', patterns: ['stripe.com', 'js.stripe'] },
  { name: 'Intercom', patterns: ['intercom'] },
  { name: 'Cloudflare', patterns: ['cloudflare'] },
  { name: 'AWS', patterns: ['amazonaws.com'] },
  { name: 'Vercel', patterns: ['vercel'] },
  { name: 'Netlify', patterns: ['netlify'] },
];

export function fingerprintTech(probe, bodySnippet = '') {
  const haystack = [
    probe?.server || '',
    probe?.poweredBy || '',
    probe?.contentType || '',
    JSON.stringify(probe?.headers || {}),
    bodySnippet.slice(0, 5000),
  ].join(' ').toLowerCase();
  return TECH_FINGERPRINTS
    .filter(tech => tech.patterns.some(p => haystack.includes(p.toLowerCase())))
    .map(t => t.name);
}

const SENSITIVE_PATHS = [
  '/robots.txt',
  '/sitemap.xml',
  '/.env',
  '/.git/config',
  '/.git/HEAD',
  '/wp-config.php.bak',
  '/backup/',
  '/admin/',
  '/api/',
  '/graphql',
  '/.well-known/security.txt',
  '/crossdomain.xml',
  '/clientaccesspolicy.xml',
  '/server-status',
  '/server-info',
  '/.DS_Store',
  '/debug/',
  '/swagger.json',
  '/openapi.json',
  '/api-docs',
  '/elmah.axd',
  '/trace.axd',
];

export async function probeSensitivePaths(host, maxPaths = 15) {
  const results = [];
  for (const path of SENSITIVE_PATHS.slice(0, maxPaths)) {
    try {
      const probe = await httpProbe(host, path);
      if (probe.status && probe.status < 404) {
        results.push({ path, status: probe.status, url: probe.url });
      }
    } catch { /* skip */ }
    await sleep(500);
  }
  return results;
}

export async function extractRobotsAndSitemap(host) {
  const results = { robots: null, sitemap: null };
  try {
    const robots = await fetch(`https://${host}/robots.txt`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000),
    });
    if (robots.ok) {
      const text = await robots.text();
      results.robots = {
        disallowed: [...text.matchAll(/^Disallow:\s*(.+)$/gm)].map(m => m[1].trim()),
        sitemaps: [...text.matchAll(/^Sitemap:\s*(.+)$/gm)].map(m => m[1].trim()),
        raw: text.slice(0, 2000),
      };
    }
  } catch { /* skip */ }

  try {
    const sitemap = await fetch(`https://${host}/sitemap.xml`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000),
    });
    if (sitemap.ok) {
      const text = await sitemap.text();
      const urls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
      results.sitemap = { urlCount: urls.length, sample: urls.slice(0, 20) };
    }
  } catch { /* skip */ }

  return results;
}

// ── Email Discovery ─────────────────────────────────────────────────────────

export async function discoverEmails(domain, knownNames = []) {
  const emails = new Set();

  // Try scraping the website for emails
  try {
    const r = await fetch(`https://${domain}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const html = await r.text();
      const found = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      found.forEach(e => {
        if (e.toLowerCase().endsWith(domain.toLowerCase())) emails.add(e.toLowerCase());
      });
      // Also check /contact, /about, /team pages
      for (const page of ['/contact', '/about', '/team', '/about-us']) {
        try {
          const pr = await fetch(`https://${domain}${page}`, {
            headers: { 'User-Agent': UA },
            signal: AbortSignal.timeout(5000),
          });
          if (pr.ok) {
            const phtml = await pr.text();
            const pemails = phtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
            pemails.forEach(e => {
              if (e.toLowerCase().endsWith(domain.toLowerCase())) emails.add(e.toLowerCase());
            });
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }

  // Generate permutations for known names
  for (const { first, last } of knownNames) {
    if (first && last) {
      const perms = permuteEmail(first, last, domain);
      perms.forEach(e => emails.add(e));
    }
  }

  return [...emails];
}

// ── Job Board Discovery ─────────────────────────────────────────────────────

export async function discoverJobs(company) {
  try {
    return await findJobs(company);
  } catch { return []; }
}

// ── Full Discovery Pipeline ─────────────────────────────────────────────────

export async function runFullDiscovery(query, { githubToken = '', maxResults = 20 } = {}) {
  const report = {
    query,
    timestamp: new Date().toISOString(),
    searchResults: [],
    github: { repos: [], orgs: [], codeHits: [] },
    domains: [],
    emails: [],
    jobs: [],
  };

  // 1. Search dorking
  report.searchResults = await dorkSearch(query, maxResults);

  // 2. Extract domains from search results
  const domains = new Set();
  for (const r of report.searchResults) {
    try {
      const d = new URL(r.url).hostname.replace(/^www\./, '');
      if (d && !d.includes('duckduckgo') && !d.includes('bing.com')) domains.add(d);
    } catch { /* skip */ }
  }
  report.domains = [...domains].slice(0, 10);

  // 3. GitHub recon
  report.github = await githubDork(query, githubToken, maxResults);

  // 4. For top 3 domains: DNS, WHOIS, cert transparency, pentest probes
  const domainIntel = [];
  for (const domain of report.domains.slice(0, 3)) {
    const intel = { domain };

    intel.dns = await dnsRecon(domain).catch(() => null);
    intel.whois = await whoisIntel(domain).catch(() => null);
    intel.subdomains = await certTransparency(domain, 20).catch(() => []);
    intel.httpProbe = await httpProbe(domain).catch(() => null);

    if (intel.httpProbe) {
      intel.securityHeaders = auditSecurityHeaders(intel.httpProbe);
      intel.tech = fingerprintTech(intel.httpProbe);
    }

    intel.sensitivePaths = await probeSensitivePaths(domain, 8).catch(() => []);
    intel.robotsSitemap = await extractRobotsAndSitemap(domain).catch(() => null);
    intel.openPorts = await portScan(domain, [80, 443, 8080, 8443], 1500).catch(() => []);
    intel.emails = await discoverEmails(domain).catch(() => []);

    domainIntel.push(intel);
    await sleep(1000);
  }
  report.domainIntel = domainIntel;

  // 5. Job discovery for company names found
  const companies = [
    ...report.github.orgs.map(o => o.name || o.login),
    ...domainIntel.map(d => d.domain.split('.')[0]),
  ].filter(Boolean).slice(0, 3);
  for (const company of companies) {
    const jobs = await discoverJobs(company).catch(() => []);
    if (jobs.length) report.jobs.push({ company, boards: jobs });
    await sleep(500);
  }

  report.summary = {
    totalSearchResults: report.searchResults.length,
    totalDomains: report.domains.length,
    totalSubdomains: domainIntel.reduce((sum, d) => sum + (d.subdomains?.length || 0), 0),
    totalEmails: domainIntel.reduce((sum, d) => sum + (d.emails?.length || 0), 0),
    totalRepos: report.github.repos.length,
    totalOrgs: report.github.orgs.length,
    techStacks: [...new Set(domainIntel.flatMap(d => d.tech || []))],
    mailProviders: [...new Set(domainIntel.map(d => d.dns?.mailProvider || []).flat())],
    sensitivePathsFound: domainIntel.reduce((sum, d) => sum + (d.sensitivePaths?.length || 0), 0),
    openPortsFound: [...new Set(domainIntel.flatMap(d => d.openPorts || []))],
  };

  return report;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
