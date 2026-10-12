/**
 * B2B ingestion engine.
 *
 * Runs discovery scouts and writes their output into the B2B store through
 * identity-keyed upserts. The contract every scout must satisfy is small: return
 * `{ source, records, sourceReliability }` where each record is a company
 * observation with optional people. Anything that matches that shape plugs in
 * without touching this file.
 *
 * Dedupe is the point of the whole module. Re-running the same scout must not
 * create duplicates, so identity lives in the store's unique indexes and every
 * write is an upsert. Ingest stats report how many rows were new versus already
 * known, so a run that finds nothing new is visible rather than silently
 * "successful".
 */

import { randomUUID } from "node:crypto";
import { normalizeDomain } from "./b2b-store.mjs";
import { enrichWithFallbacks, listEnrichmentConnectors } from "./enrichment/index.mjs";

// Seniority inference from a job title. Ordered most-specific-first so a
// "VP of Engineering" resolves to executive before the generic "of" match.
const SENIORITY_RULES = [
  { seniority: "owner", patterns: [/\bfounder\b/i, /\bco-?founder\b/i, /\bowner\b/i, /\bceo\b/i, /\bchief\b/i] },
  { seniority: "c_level", patterns: [/\bc-?[a-z]o\b/i, /\bchief\b/i, /\bpresident\b/i] },
  { seniority: "vp", patterns: [/\bvp\b/i, /\bvice president\b/i, /\bhead of\b/i, /\bdirector\b/i] },
  { seniority: "manager", patterns: [/\bmanager\b/i, /\blead\b/i, /\bsupervisor\b/i] },
];

const DEPARTMENT_RULES = [
  { department: "engineering", patterns: [/\bengineer/i, /\bdevelop/i, /\bcto\b/i, /\btechnical\b/i, /\bsoftware\b/i] },
  { department: "sales", patterns: [/\bsales\b/i, /\baccount executive\b/i, /\bae\b/i, /\bbusiness development\b/i, /\brevenue\b/i] },
  { department: "marketing", patterns: [/\bmarketing\b/i, /\bgrowth\b/i, /\bbrand\b/i, /\bcmo\b/i] },
  { department: "finance", patterns: [/\bfinance\b/i, /\bcfo\b/i, /\baccounting\b/i, /\bcontroller\b/i] },
  { department: "people", patterns: [/\bhr\b/i, /\bpeople\b/i, /\btalent\b/i, /\brecruit/i] },
  { department: "operations", patterns: [/\boperations\b/i, /\bcoo\b/i, /\bchief of staff\b/i] },
];

export function inferSeniority(title) {
  if (!title) return null;
  for (const rule of SENIORITY_RULES) {
    if (rule.patterns.some(pattern => pattern.test(title))) return rule.seniority;
  }
  return "individual_contributor";
}

export function inferDepartment(title) {
  if (!title) return null;
  for (const rule of DEPARTMENT_RULES) {
    if (rule.patterns.some(pattern => pattern.test(title))) return rule.department;
  }
  return null;
}

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export class B2BIngestionEngine {
  /**
   * @param {object} deps
   * @param {import('./b2b-store.mjs').B2BStore} deps.store
   * @param {Array<{name: string, discover: Function, health?: Function}>} deps.scouts
   */
  constructor({ store, scouts = [] }) {
    this.store = store;
    this.scouts = scouts;
    this.runs = [];
  }

  scout(name) {
    return this.scouts.find(scout => scout.name === name) || null;
  }

  listScouts() {
    return this.scouts.map(scout => ({ name: scout.name, hasHealth: typeof scout.health === "function" }));
  }

  async healthCheck() {
    const results = await Promise.all(
      this.scouts.map(async scout => {
        if (typeof scout.health !== "function") {
          return { name: scout.name, ok: null, note: "no health probe" };
        }
        try {
          const result = await scout.health();
          return { name: scout.name, ok: Boolean(result?.ok), note: result?.note || null, endpoint: result?.endpoint || null };
        } catch (err) {
          return { name: scout.name, ok: false, note: err.message };
        }
      }),
    );
    return results;
  }

  /**
   * Run one scout and persist its records. Returns per-run counters so the
   * caller can tell a productive run from a no-op.
   */
  async ingestFromScout(scoutName, query, options = {}) {
    const scout = this.scout(scoutName);
    if (!scout) throw new Error(`Unknown scout: ${scoutName}`);

    const startedAt = new Date().toISOString();
    const result = await scout.discover(query, options);
    const records = Array.isArray(result?.records) ? result.records : [];
    const sourceType = result?.source || scoutName;
    const sourceUrl = result?.sourceUrl || null;

    let companiesNew = 0;
    let companiesSeen = 0;
    let peopleNew = 0;
    let peopleSeen = 0;
    const skipped = [];
    const skippedPeople = [];

    for (const record of records) {
      // A record with named people but no discoverable domain (EDGAR filings for
      // companies that leave the website field blank, for instance) is still
      // worth storing, but a synthetic `edgar.<name>.local` domain would show up in
      // the UI as a company nobody recognises. Prefer a real domain when the
      // caller knows one, and only fall back to the synthetic key so the people are
      // not silently dropped.
      const domain = normalizeDomain(
        record.domain || record.companyWebsite || record.website || options.companyDomain,
      );
      const syntheticDomain = !domain && record.company
        ? `edgar.${String(record.company).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.local`
        : null;
      const effectiveDomain = domain || syntheticDomain;

      if (!effectiveDomain) {
        skipped.push({ reason: "no_domain", record: record.company || record.name || null });
        continue;
      }

      const before = await this.store.getCompanyByDomain(effectiveDomain);
      const company = await this.store.upsertCompany(
        {
          domain: effectiveDomain,
          name: record.company || record.name || null,
          industry: record.industry || null,
          employeeRange: record.employeeRange || null,
          location: record.location || record.city || null,
          description: record.description || null,
          linkedinUrl: record.linkedinUrl || null,
          techStack: record.techStack || [],
          sourceUrls: record.sourceUrl ? [record.sourceUrl] : [],
        },
        { type: sourceType, url: record.sourceUrl || sourceUrl, raw: record },
      );

      if (before) companiesSeen += 1;
      else companiesNew += 1;

      for (const person of record.people || []) {
        // A team-page scout tags each person by the page section they came from.
        // Investors, advisors, and board members are not employees, so they are
        // dropped here rather than stored as staff at the wrong company.
        if (person.section && person.section !== "staff") {
          skippedPeople.push({
            reason: `section:${person.section}`,
            person: person.fullName || person.title || null,
          });
          continue;
        }
        const saved = await this.store.upsertPerson(
          {
            companyId: company.id,
            companyDomain: effectiveDomain,
            ...person,
            title: person.title || person.role || null,
          },
          { type: sourceType, url: person.sourceUrl || record.sourceUrl || sourceUrl, raw: person },
        );
        // Trust the store's own verdict. Counting from a second lookup here
        // double-counts re-ingests, because this object carries companyDomain
        // while the store keys on the resolved company id.
        if (saved.wasNew) peopleNew += 1;
        else peopleSeen += 1;
      }
    }

    const run = {
      id: randomUUID(),
      scout: scoutName,
      sourceType,
      query: query || null,
      startedAt,
      finishedAt: new Date().toISOString(),
      recordsReturned: records.length,
      companiesNew,
      companiesSeen,
      peopleNew,
      peopleSeen,
      skipped,
      skippedPeople,
    };
    this.runs.unshift(run);
    if (this.runs.length > 100) this.runs.length = 100;
    return run;
  }

  /**
   * Run every scout that has a query configured. A scout that throws does not
   * abort the batch; its failure is recorded so one dead source cannot stop the
   * rest of the database from growing.
   */
  async ingestAll(queries = {}, options = {}) {
    const runs = [];
    for (const scout of this.scouts) {
      const query = queries[scout.name];
      if (!query) {
        runs.push({ scout: scout.name, skipped: true, reason: "no_query" });
        continue;
      }
      try {
        runs.push(await this.ingestFromScout(scout.name, query, options));
      } catch (err) {
        runs.push({ scout: scout.name, error: err.message });
      }
    }
    return runs;
  }

  listRuns(limit = 20) {
    return this.runs.slice(0, limit);
  }

  /**
   * Try paid enrichment connectors to fill in a missing or unverified email.
   * This is opt-in per run; the default is to rely on public-source discovery.
   *
   * @param {object} person row from `people`
   * @param {string[]} [connectors] connector names to try
   * @returns {Promise<{enriched: boolean, email?: string, status?: string, source?: string, reason?: string}>}
   */
  async enrichPerson(person, connectors) {
    const company = person.company_id ? await this.store.getCompany(person.company_id) : null;
    const result = await enrichWithFallbacks({
      domain: company?.domain || person.companyDomain,
      firstName: person.first_name || person.firstName,
      lastName: person.last_name || person.lastName,
      company: company?.name,
      email: person.email,
      connectors,
    });

    if (result.status === "verified" && result.email) {
      return {
        enriched: true,
        email: result.email,
        status: result.status,
        source: result.source,
        reason: result.reason,
      };
    }

    return { enriched: false, reason: result.reason || "no verified result" };
  }

  listEnrichmentConnectors() {
    return listEnrichmentConnectors();
  }
}

export { splitName };
