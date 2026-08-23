import { searchRepos, extractCompanyFromRepo } from './scrapers/github-scout.mjs';
import { searchDuck, extractDomain } from './scrapers/search-scout.mjs';
import { lookupWhois, parseDomain } from './scrapers/whois-scout.mjs';
import { findJobs } from './scrapers/jobpost-scout.mjs';
import { permuteEmail, validateDomain } from './scrapers/email-permutator.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v === undefined || v === null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

export class ProspectingEngine {
  constructor(opts = {}) {
    this.outDir = opts.outDir || 'data/prospects';
    this.maxLeads = opts.maxLeads || 50;
    this.githubToken = opts.githubToken || process.env.GITHUB_TOKEN;
    this.leads = [];
  }

  async run(icp) {
    console.log(`Prospecting for ICP: ${icp.description || 'custom'}`);
    await mkdir(this.outDir, { recursive: true });
    let gh = [], web = [];
    try { gh = await this.scoutGitHub(icp); } catch (e) { console.warn(`GitHub scout failed: ${e.message}`); }
    try { web = await this.scoutWeb(icp); } catch (e) { console.warn(`Web scout failed: ${e.message}`); }
    const combined = this.dedupe([...gh, ...web]);
    console.log(`Found ${combined.length} unique companies, enriching...`);
    const enriched = await this.enrichBatch(combined.slice(0, this.maxLeads));
    this.leads = this.scoreAll(enriched, icp);
    await this.export();
    return this.leads;
  }

  async scoutGitHub(icp) {
    const query = this.buildGitHubQuery(icp);
    console.log(`GitHub query: ${query}`);
    const repos = await searchRepos(query, 30);
    const companies = repos.map(extractCompanyFromRepo).filter(Boolean);
    return companies.map(c => ({
      source: 'github', name: c.name, domain: parseDomain(c.homepage || ''),
      url: c.homepage, github: c.url, stars: c.stars, language: c.language,
      description: c.description, topics: c.topics,
      confidence: Math.min((c.stars || 0) / 100, 10)
    }));
  }

  buildGitHubQuery(icp) {
    const parts = [];
    if (icp.language) parts.push(`language:${icp.language}`);
    if (icp.topic) parts.push(`topic:${icp.topic}`);
    parts.push(`stars:>${icp.minStars || 1}`);
    if (icp.keyword) parts.push(icp.keyword);
    return parts.join(' ') || 'stars:>50';
  }

  async scoutWeb(icp) {
    const query = icp.webQuery || `${icp.keyword || 'startup'} ${icp.industry || ''} company`;
    console.log(`Web search: ${query}`);
    const results = await searchDuck(query, 30);
    return results.map(r => ({
      source: 'web', name: r.title.split(/[-|:]/)[0].trim(),
      domain: extractDomain(r.url), url: r.url, snippet: r.title, confidence: 3
    }));
  }

  dedupe(leads) {
    const seen = new Set();
    return leads.filter(l => {
      const key = (l.domain || l.name || '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async enrichBatch(leads) {
    const enriched = [];
    for (const lead of leads) {
      try { enriched.push(await this.enrich(lead)); }
      catch (err) { enriched.push({ ...lead, enrichError: err.message }); }
      await sleep(800);
    }
    return enriched;
  }

  async enrich(lead) {
    const domain = lead.domain;
    if (!domain) return lead;
    const [whois, jobs, mx] = await Promise.all([
      lookupWhois(domain).catch(() => null),
      findJobs(lead.name).catch(() => []),
      validateDomain(domain).catch(() => false)
    ]);
    const emails = mx ? permuteEmail('founder', 'ceo', domain).slice(0, 5) : [];
    return {
      ...lead, domainValid: mx, emails,
      whois: whois?.created ? { registrar: whois.registrar, created: whois.created, expires: whois.expires } : null,
      jobs: jobs.length > 0 ? { hiring: true, boards: jobs.map(j => j.board), roles: jobs.flatMap(j => j.roles).slice(0, 5) } : { hiring: false },
      enrichedAt: new Date().toISOString()
    };
  }

  scoreAll(leads, icp) {
    return leads.map(l => ({ ...l, score: this.score(l, icp) })).sort((a, b) => b.score - a.score);
  }

  score(lead, icp) {
    let s = lead.confidence || 0;
    if (icp.preferredLanguages?.includes(lead.language)) s += 5;
    if (lead.stars && lead.stars > 100) s += 3;
    if (lead.jobs?.hiring) s += 4;
    if (lead.domainValid) s += 2;
    if (lead.whois) s += 1;
    if (lead.emails?.length) s += 2;
    return Math.min(Math.round(s), 20);
  }

  async export() {
    const ts = Date.now();
    const base = path.join(this.outDir, `prospects-${ts}`);
    await writeFile(`${base}.json`, JSON.stringify({
      generatedAt: new Date().toISOString(), count: this.leads.length, leads: this.leads
    }, null, 2));
    if (this.leads.length) {
      const rows = this.leads.map(l => ({
        name: l.name, domain: l.domain, url: l.url || '', source: l.source,
        score: l.score, emails: (l.emails || []).join('; '),
        hiring: (l.jobs?.hiring || false) ? 'yes' : 'no',
        language: l.language || '', description: (l.description || '').slice(0, 120)
      }));
      await writeFile(`${base}.csv`, toCSV(rows));
    }
    console.log(`Exported: ${base}.json + .csv`);
    return base;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
