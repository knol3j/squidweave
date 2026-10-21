/**
 * B2B company + person database store.
 *
 * Owns the `companies`, `people`, `people_dedupe_index`, `company_sources`, and
 * `account_scores` tables from migrations/002. Kept separate from
 * relational-store.mjs so the B2B data model can grow without enlarging the
 * campaign store.
 *
 * Identity is the load-bearing idea here. Every write is an upsert keyed on a
 * stable identity (domain for companies; linkedin/email/name+company for
 * people), so re-ingesting the same source is idempotent instead of creating
 * duplicates. Confidence is recomputed from provenance on every write, never
 * asserted by the caller.
 */

import pg from "pg";
import { randomUUID } from "node:crypto";

const { Pool } = pg;

// Weights for the confidence score. A record's confidence is the weighted sum
// of its sources, capped at 1. Declared here so a weight change is a one-line
// edit with a visible blast radius, not a number buried in a query.
const SOURCE_RELIABILITY = {
  "sec-edgar": 0.95,
  "nonprofit-990": 0.9,
  opencorporates: 0.9,
  "sec-index": 0.85,
  "job-board": 0.8,
  "company-website": 0.75,
  directory: 0.65,
  "github-org": 0.6,
  "search-result": 0.5,
  unknown: 0.4,
};

// Diminishing returns per additional independent source: the second source
// agreeing matters more than the fifth.
const AGREEMENT_BONUS = [0, 0.15, 0.08, 0.04, 0.02, 0.01];

const EMAIL_STATUS_BONUS = {
  verified: 0.25,
  permuted: 0.05,
  risky: 0,
  invalid: -0.5,
  unknown: 0,
};

function normalizeDomain(value) {
  if (!value) return null;
  let domain = String(value).trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  domain = domain.split("/")[0].split("?")[0];
  // Strip the root dot from an FQDN ("example.com." and "example.com" are the
  // same host). Leaving it in would make the domain unique key treat them as two
  // different companies and duplicate every row for one.
  domain = domain.replace(/\.$/, "");
  return domain || null;
}

function normalizeLinkedin(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  // Strip protocol, www, trailing slash, and query so two spellings of the same
  // profile collapse to one key.
  return raw
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .split("?")[0];
}

function linkedinKey(url) {
  const normalized = normalizeLinkedin(url);
  if (!normalized) return null;
  const match = normalized.match(/linkedin\.com\/in\/([^/]+)/);
  return match ? `in:${match[1]}` : `url:${normalized}`;
}

function nameCompanyKey(person) {
  // Prefer explicit name parts, but fall back to fullName: scouts emit different
  // shapes (EDGAR gives firstName+lastName, the team-page scout gives fullName),
  // and a key that only reads one shape silently disables dedupe for the others.
  const explicit = [person.firstName, person.lastName].filter(Boolean).join(" ").trim().toLowerCase();
  const fromFull = explicit
    ? ""
    : String(person.fullName || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
  const name = explicit || fromFull;
  if (!name) return null;
  const company = person.companyId || person.companyDomain || "";
  // The company part is scoped loosely on purpose: an empty company still yields
  // a usable key, so a person with no known employer is dedupable by name alone.
  return `${name}@${company ? String(company).toLowerCase() : ""}`;
}

function confidenceFromSources(sourceTypes) {
  const unique = [...new Set((sourceTypes || []).filter(Boolean))];
  if (unique.length === 0) return 0;
  const base = Math.max(...unique.map(type => SOURCE_RELIABILITY[type] ?? SOURCE_RELIABILITY.unknown));
  const bonus = unique
    .slice(1)
    .reduce((sum, _, index) => sum + (AGREEMENT_BONUS[index + 1] ?? 0), 0);
  return Math.min(1, Number((base + bonus).toFixed(3)));
}

export class B2BStore {
  constructor(databaseUrl, options = {}) {
    this.databaseUrl = databaseUrl;
    this.poolSize = options.poolSize || 10;
    this.pool = null;
  }

  async _getPool() {
    if (this.pool) return this.pool;
    this.pool = new Pool({
      connectionString: this.databaseUrl,
      max: this.poolSize,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      keepAlive: true,
    });
    this.pool.on("error", err => {
      console.error("[b2b postgres] pool error:", err.message);
    });
    return this.pool;
  }

  async init() {
    const pool = await this._getPool();
    await pool.query("select 1");
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async _query(sql, params = []) {
    const pool = await this._getPool();
    return pool.query(sql, params);
  }

  async _queryAll(sql, params = []) {
    return (await this._query(sql, params)).rows;
  }

  async _queryOne(sql, params = []) {
    const result = await this._query(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Count distinct source types that contributed to a company. Used by the scoring
   * engine so its provenance note reflects `company_sources` rather than a field on
   * the company row that only the first write populates.
   */
  async countCompanySources(companyId) {
    const row = await this._queryOne(
      "select count(*)::int as n from company_sources where company_id = $1",
      [companyId],
    );
    return row?.n || 0;
  }

  // ─── Companies ────────────────────────────────────────────────

  async getCompanyByDomain(domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) return null;
    return this._queryOne("select * from companies where domain = $1", [normalized]);
  }

  async getCompany(id) {
    return this._queryOne("select * from companies where id = $1", [id]);
  }

  /**
   * People whose address has never been verified through SMTP. `blocked` is
   * included on purpose: that status means our probe was refused, not that the
   * address is bad, so it stays eligible for another attempt.
   */
  async listPeopleNeedingVerification(limit = 100) {
    return this._queryAll(
      `select p.id, p.email, p.email_status, c.domain, c.name as company_name,
              p.first_name, p.last_name, p.seniority
       from people p join companies c on c.id = p.company_id
       where p.email is not null
         and p.email_status in ('unknown', 'permuted', 'blocked', 'risky')
       order by p.updated_at desc nulls last
       limit $1`,
      [limit],
    );
  }

  /** Compliance audit trail, newest first, optionally filtered by decision. */
  async listComplianceEvents({ decision = null, limit = 100 } = {}) {
    if (decision) {
      return this._queryAll(
        "select * from compliance_events where decision = $1 order by created_at desc limit $2",
        [decision, limit],
      );
    }
    return this._queryAll(
      "select * from compliance_events order by created_at desc limit $1",
      [limit],
    );
  }

  async listCompanies({ industry, minConfidence, limit = 100, offset = 0 } = {}) {
    const clauses = [];
    const params = [];
    if (industry) {
      params.push(industry);
      clauses.push(`industry = $${params.length}`);
    }
    if (typeof minConfidence === "number") {
      params.push(minConfidence);
      clauses.push(`confidence >= $${params.length}`);
    }
    params.push(limit, offset);
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    return this._queryAll(
      `select * from companies ${where} order by confidence desc, last_seen_at desc limit $${params.length - 1} offset $${params.length}`,
      params,
    );
  }

  async countCompanies() {
    const row = await this._queryOne("select count(*)::int as n from companies");
    return row?.n ?? 0;
  }

  /**
   * Upsert a company by domain. Provenance is recorded, then confidence is
   * recomputed from every source on file, so the score always reflects the
   * stored evidence rather than the caller's claim.
   */
  async upsertCompany(company, source = {}) {
    const domain = normalizeDomain(company.domain);
    if (!domain) throw new Error("upsertCompany requires a domain");

    const existing = await this.getCompanyByDomain(domain);
    const id = existing?.id || company.id || randomUUID();
    const now = new Date().toISOString();

    // The company row must exist before provenance references it, because
    // company_sources.company_id is a foreign key. Writing provenance first
    // fails on any company that is not brand new.
    await this._query(
      `insert into companies (id, domain, name, industry, employee_range, location, description,
                              linkedin_url, tech_stack, source_urls, confidence, first_seen_at, last_seen_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10::text[], $11, $12, $12)
       on conflict (domain) do update set
         name = coalesce(excluded.name, companies.name),
         industry = coalesce(excluded.industry, companies.industry),
         employee_range = coalesce(excluded.employee_range, companies.employee_range),
         location = coalesce(excluded.location, companies.location),
         description = coalesce(excluded.description, companies.description),
         linkedin_url = coalesce(excluded.linkedin_url, companies.linkedin_url),
         tech_stack = case when array_length(excluded.tech_stack, 1) is null
                           then companies.tech_stack else excluded.tech_stack end,
         source_urls = (
           select array(select distinct unnest(companies.source_urls || excluded.source_urls))
         ),
         confidence = excluded.confidence,
         last_seen_at = excluded.last_seen_at`,
      [
        id,
        domain,
        company.name || null,
        company.industry || null,
        company.employeeRange || null,
        company.location || null,
        company.description || null,
        company.linkedinUrl || null,
        company.techStack || [],
        company.sourceUrls || (source.url ? [source.url] : []),
        0,
        existing?.first_seen_at || now,
      ],
    );

    if (source.type) {
      await this._query(
        `insert into company_sources (id, company_id, source_type, source_url, fetched_at, raw)
         values ($1, $2, $3, $4, $5, $6::jsonb)
         on conflict (company_id, source_type, coalesce(source_url, '')) do update set
           fetched_at = excluded.fetched_at, raw = excluded.raw`,
        [randomUUID(), id, source.type, source.url || null, now, JSON.stringify(source.raw || {})],
      );
    }

    // Confidence is recomputed from every source now on file, so the score
    // reflects stored evidence rather than the caller's claim.
    const sourceTypes = (
      await this._queryAll("select distinct source_type from company_sources where company_id = $1", [id])
    ).map(row => row.source_type);
    const confidence = confidenceFromSources(sourceTypes);

    await this._query("update companies set confidence = $2 where id = $1", [id, confidence]);

    return this.getCompanyByDomain(domain);
  }

  // ─── People ───────────────────────────────────────────────────

  /**
   * Resolve a person to an existing row by identity, or null. Checks the dedupe
   * index first (linkedin, then email, then name+company) so the cheapest exact
   * match wins before any fuzzy work.
   */
  async findPerson(person) {
    const emailKey = person.email ? person.email.trim().toLowerCase() : null;
    const liKey = linkedinKey(person.linkedinUrl);
    const ncKey = nameCompanyKey(person);

    const { rows } = await this._query(
      `select p.* from people_dedupe_index d join people p on p.id = d.person_id
       where ($1::text is not null and d.linkedin_key = $1)
          or ($2::text is not null and d.email_key = $2)
          or ($3::text is not null and d.name_company_key = $3)
       order by p.confidence desc
       limit 1`,
      [liKey, emailKey, ncKey],
    );
    return rows[0] || null;
  }

  async getPerson(id) {
    return this._queryOne("select * from people where id = $1", [id]);
  }

  async listPeople({ companyId, emailStatus, seniority, limit = 100, offset = 0 } = {}) {
    const clauses = [];
    const params = [];
    if (companyId) {
      params.push(companyId);
      clauses.push(`company_id = $${params.length}`);
    }
    if (emailStatus) {
      params.push(emailStatus);
      clauses.push(`email_status = $${params.length}`);
    }
    if (seniority) {
      params.push(seniority);
      clauses.push(`seniority = $${params.length}`);
    }
    params.push(limit, offset);
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    return this._queryAll(
      `select * from people ${where} order by confidence desc, last_seen_at desc limit $${params.length - 1} offset $${params.length}`,
      params,
    );
  }

  async countPeople() {
    const row = await this._queryOne("select count(*)::int as n from people");
    return row?.n ?? 0;
  }

  /**
   * Upsert a person by identity and record provenance. Confidence combines the
   * source reliability with the email verification state, so an unverified
   * permuted address never scores like a verified one.
   */
  async upsertPerson(person, source = {}) {
    const company = person.companyId
      ? await this.getCompany(person.companyId)
      : await this.getCompanyByDomain(person.companyDomain);

    const email = person.email ? person.email.trim().toLowerCase() : null;
    // Identity must be computed from the resolved company, not from whatever
    // field the caller happened to populate. `findPerson` and the dedupe-index
    // write further down have to agree on the same company key or the lookup
    // misses and every re-ingest creates a duplicate.
    const identity = {
      ...person,
      email,
      companyId: company?.id || person.companyId || null,
      companyDomain: company?.domain || person.companyDomain || null,
    };
    const existing = await this.findPerson(identity);
    const id = existing?.id || person.id || randomUUID();
    const wasNew = !existing;
    const now = new Date().toISOString();

    if (source.type) {
      await this._query(
        `insert into company_sources (id, company_id, source_type, source_url, fetched_at, raw)
         values ($1, $2, $3, $4, $5, $6::jsonb)
         on conflict do nothing`,
        [randomUUID(), company?.id || null, source.type, source.url || null, now, JSON.stringify(source.raw || {})],
      );
    }

    // A discovered address starts as "unknown". "permuted" means a verifier
    // actually constructed it from a pattern, which is a claim only the
    // verification step may make, not the ingestion step.
    const emailStatus = person.emailStatus || existing?.email_status || "unknown";
    const sourceTypes = (
      await this._queryAll(
        "select distinct source_type from company_sources where company_id = $1",
        [company?.id || null],
      )
    ).map(row => row.source_type);
    const base = confidenceFromSources(sourceTypes.length ? sourceTypes : [source.type]);
    const confidence = Math.max(
      0,
      Math.min(1, Number((base + (EMAIL_STATUS_BONUS[emailStatus] ?? 0)).toFixed(3))),
    );

    await this._query(
      `insert into people (id, company_id, full_name, first_name, last_name, title, seniority,
                           department, linkedin_url, email, email_status, email_verified_at,
                           source_url, source_type, confidence, first_seen_at, last_seen_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
       on conflict (id) do update set
         company_id = coalesce(excluded.company_id, people.company_id),
         full_name = coalesce(excluded.full_name, people.full_name),
         first_name = coalesce(excluded.first_name, people.first_name),
         last_name = coalesce(excluded.last_name, people.last_name),
         title = coalesce(excluded.title, people.title),
         seniority = coalesce(excluded.seniority, people.seniority),
         department = coalesce(excluded.department, people.department),
         linkedin_url = coalesce(excluded.linkedin_url, people.linkedin_url),
         email = coalesce(excluded.email, people.email),
         email_status = excluded.email_status,
         email_verified_at = coalesce(excluded.email_verified_at, people.email_verified_at),
         source_url = coalesce(excluded.source_url, people.source_url),
         source_type = coalesce(excluded.source_type, people.source_type),
         confidence = excluded.confidence,
         last_seen_at = excluded.last_seen_at`,
      [
        id,
        company?.id || null,
        person.fullName || [person.firstName, person.lastName].filter(Boolean).join(" ") || null,
        person.firstName || null,
        person.lastName || null,
        person.title || null,
        person.seniority || null,
        person.department || null,
        person.linkedinUrl || null,
        email,
        emailStatus,
        person.emailVerifiedAt || (emailStatus === "verified" ? now : null),
        source.url || person.sourceUrl || null,
        source.type || person.sourceType || null,
        confidence,
        existing?.first_seen_at || now,
      ],
    );

    // Identity keys, each guarded so a conflicting key never blocks the write.
    // `identity` is the same object `findPerson` used, so the key written here is
    // exactly the key the next lookup will search for.
    const keys = [
      ["linkedin_key", linkedinKey(person.linkedinUrl)],
      ["email_key", email],
      ["name_company_key", nameCompanyKey(identity)],
    ];
    for (const [column, value] of keys) {
      if (!value) continue;
      await this._query(
        `insert into people_dedupe_index (id, person_id, ${column}) values ($1, $2, $3)
         on conflict (${column}) do nothing`,
        [randomUUID(), id, value],
      );
    }

    // `wasNew` lets the caller count accurately. Deriving it from a second
    // lookup is what made the ingestion engine double-count re-ingested people,
    // because the two lookups built their identity key from different fields.
    const saved = await this.getPerson(id);
    return { ...saved, wasNew };
  }

  async updateEmailStatus(personId, status, verifiedAt = null) {
    await this._query(
      "update people set email_status = $2, email_verified_at = $3, last_seen_at = now() where id = $1",
      [personId, status, verifiedAt],
    );
    return this.getPerson(personId);
  }

  /**
   * People whose email still needs verification. Drives the background
   * verification queue so work survives a restart.
   */
  async listPeopleNeedingVerification(limit = 100) {
    return this._queryAll(
      `select * from people
       where email is not null and email_status in ('unknown', 'permuted')
       order by confidence desc
       limit $1`,
      [limit],
    );
  }

  // ─── Account scores ────────────────────────────────────────────

  /**
   * Persist a computed account score. Keyed on company_id so re-scoring updates
   * in place instead of accumulating one row per run.
   */
  async upsertAccountScore({ companyId, score, components, modelVersion = 1 }) {
    if (!companyId) throw new Error("upsertAccountScore requires companyId");
    const id = `score-${companyId}`;
    await this._query(
      `insert into account_scores (id, company_id, score, components, model_version, scored_at)
       values ($1, $2, $3, $4::jsonb, $5, now())
       on conflict (company_id) do update set
         score = excluded.score,
         components = excluded.components,
         model_version = excluded.model_version,
         scored_at = excluded.scored_at`,
      [id, companyId, score, JSON.stringify(components || {}), modelVersion],
    );
    return this.getAccountScore(companyId);
  }

  async getAccountScore(companyId) {
    return this._queryOne("select * from account_scores where company_id = $1", [companyId]);
  }

  /** Find a person by address, for bounce-state checks in the compliance gate. */
  async getPersonByEmail(email) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) return null;
    return this._queryOne("select * from people where email = $1 order by confidence desc limit 1", [normalized]);
  }

  /** Distinct sources on file for a company, for score provenance. */
  async countCompanySources(companyId) {
    const row = await this._queryOne(
      "select count(distinct source_type)::int as n from company_sources where company_id = $1",
      [companyId],
    );
    return row?.n ?? 0;
  }

  // ─── Compliance ────────────────────────────────────────────────

  /**
   * Look up an active suppression for an address. An expired entry is treated as
   * absent, so callers get one answer instead of having to re-check the expiry.
   */
  async getSuppression(email) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) return null;
    return this._queryOne(
      `select * from suppression_list
       where email = $1 and (expires_at is null or expires_at > now())
       limit 1`,
      [normalized],
    );
  }

  async upsertSuppression({ email, reason, source = null, detail = null, expiresAt = null }) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) throw new Error("upsertSuppression requires an email");
    await this._query(
      `insert into suppression_list (email, reason, source, detail, expires_at, created_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (email) do update set
         reason = excluded.reason,
         source = excluded.source,
         detail = excluded.detail,
         expires_at = excluded.expires_at`,
      [normalized, reason, source, detail, expiresAt],
    );
    return this.getSuppression(normalized);
  }

  async getDomainSuppression(domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) return null;
    return this._queryOne(
      `select * from domain_suppression
       where domain = $1 and (expires_at is null or expires_at > now())
       limit 1`,
      [normalized],
    );
  }

  async upsertDomainSuppression({ domain, reason, source = null, detail = null, expiresAt = null }) {
    const normalized = normalizeDomain(domain);
    if (!normalized) throw new Error("upsertDomainSuppression requires a domain");
    await this._query(
      `insert into domain_suppression (domain, reason, source, detail, expires_at, created_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (domain) do update set
         reason = excluded.reason,
         source = excluded.source,
         detail = excluded.detail,
         expires_at = excluded.expires_at`,
      [normalized, reason, source, detail, expiresAt],
    );
    return this.getDomainSuppression(normalized);
  }

  /** Append-only audit row for one compliance decision. */
  async recordComplianceEvent({ subjectType, subject, decision, reason, detail = null, campaignId = null }) {
    await this._query(
      `insert into compliance_events (id, subject_type, subject, decision, reason, detail, campaign_id, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [randomUUID(), subjectType, subject, decision, reason, detail, campaignId],
    );
  }

  async listComplianceEvents({ decision = null, limit = 100 } = {}) {
    if (decision) {
      return this._queryAll(
        `select * from compliance_events where decision = $1 order by created_at desc limit $2`,
        [decision, limit],
      );
    }
    return this._queryAll(`select * from compliance_events order by created_at desc limit $1`, [limit]);
  }

  /**
   * Mirror a suppression onto the legacy `contacts.dnd` flag and the
   * `complianceStatus` field, so code that predates the registry stays
   * consistent with it. Best-effort by design: the registry is authoritative.
   */
  async markPersonDoNotContact(email, reason = "unsubscribe") {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) return;
    await this._query(
      `update contacts
       set dnd = true,
           custom_fields = jsonb_set(
             coalesce(custom_fields, '{}'::jsonb),
             '{suppressionReason}',
             to_jsonb($2::text)
           ),
           updated_at = now()
       where lower(email) = $1`,
      [normalized, reason],
    );
  }

  // ─── Sending domains / deliverability ─────────────────────────

  async upsertSendingDomain({ domain, dailyCap = 50 }) {
    const normalized = normalizeDomain(domain);
    if (!normalized) throw new Error("upsertSendingDomain requires a domain");
    const id = `sd-${normalized}`;
    await this._query(
      `insert into sending_domains (id, domain, daily_cap, created_at, updated_at)
       values ($1, $2, $3, now(), now())
       on conflict (domain) do update set
         daily_cap = coalesce(excluded.daily_cap, sending_domains.daily_cap),
         updated_at = now()
       returning *`,
      [id, normalized, dailyCap],
    );
    return this.getSendingDomain(normalized);
  }

  async getSendingDomain(domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) return null;
    return this._queryOne("select * from sending_domains where domain = $1", [normalized]);
  }

  async recordSendAttempt(domain, { delivered = false, bounced = false, complaint = false } = {}) {
    const normalized = normalizeDomain(domain);
    if (!normalized) throw new Error("recordSendAttempt requires a domain");

    const existing = await this.getSendingDomain(normalized);
    if (!existing) throw new Error(`sending domain not found: ${normalized}`);

    const scoreDelta = bounced ? -5 : complaint ? -10 : 0;
    const newScore = Math.max(-100, Math.min(100, Number(existing.reputation_score || 0) + scoreDelta));

    await this._query(
      `update sending_domains set
         sent_count_100 = least(sent_count_100 + $2, 100),
         bounce_count_100 = bounce_count_100 + $3,
         sent_today = sent_today + $2,
         reputation_score = $4,
         updated_at = now()
       where domain = $1`,
      [normalized, delivered ? 1 : 0, bounced ? 1 : 0, newScore],
    );
    return this.getSendingDomain(normalized);
  }

  async resetDailyCountersIfNeeded(domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) throw new Error("resetDailyCountersIfNeeded requires a domain");
    await this._query(
      `update sending_domains set
         sent_today = 0,
         sent_last_reset_at = now(),
         updated_at = now()
       where domain = $1 and sent_last_reset_at < date_trunc('day', now())`,
      [normalized],
    );
    return this.getSendingDomain(normalized);
  }

  // ─── Stats ────────────────────────────────────────────────────

  async stats() {
    const [companies, people, byStatus, byIndustry, topSources] = await Promise.all([
      this.countCompanies(),
      this.countPeople(),
      this._queryAll(
        "select email_status, count(*)::int as n from people where email is not null group by email_status order by n desc",
      ),
      this._queryAll(
        "select coalesce(industry, 'unknown') as industry, count(*)::int as n from companies group by industry order by n desc limit 10",
      ),
      this._queryAll(
        "select source_type, count(*)::int as n from company_sources group by source_type order by n desc limit 10",
      ),
    ]);
    return { companies, people, byEmailStatus: byStatus, byIndustry, bySource: topSources };
  }
}

export { normalizeDomain, normalizeLinkedin, linkedinKey, nameCompanyKey, confidenceFromSources, SOURCE_RELIABILITY };
