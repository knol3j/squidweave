# B2B Growth Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn SquidWeave into a competitive B2B prospecting and outreach platform by building the largest possible owned B2B company/contact database, then layering deliverability, account scoring, revenue attribution, LinkedIn outreach, and compliance enforcement on top of it.

**Architecture:** A PostgreSQL-backed B2B store (`companies`, `people`, `company_sources`, `account_scores`) is fed by public-source scouts and identity-keyed upserts. A verification queue classifies emails, a compliance gate blocks bad sends, a deliverability engine protects sender reputation, and a revenue-attribution resolver ties closed opportunities back to outreach events. The frontend reads the same tables through `/b2b/*` endpoints instead of localStorage mock data.

**Tech Stack:** Node.js 18+, PostgreSQL 15+, React/TS/Vite frontend, existing `pg` driver and Express-style HTTP handler in `src/server.mjs`.

**Spec:** Competitive audit six-recommendation brief: (1) own B2B database, (2) email deliverability, (3) account scoring, (4) revenue attribution, (5) LinkedIn outreach steps, (6) compliance/DNC layer.

## Global Constraints

- `DRY_RUN=true` by default; any live send must be explicitly opted into via config.
- All new tables use migration files in `migrations/` and are tracked by `schema_migrations`.
- The B2B store owns `companies`, `people`, `company_sources`, `account_scores`; the relational store owns campaign/CRM tables. Do not blur those boundaries.
- Frontend must read real backend data; localStorage may only cache, never invent, figures.
- No credential scraping, CAPTCHA bypass, or rate-limit evasion for any data source.
- Every outreach send path must call `checkOutreachAllowed` before delivery.
- `npm test` must stay green after every task.

## Review Focus

- A scout returns duplicate records on re-run: upsert must be idempotent and not inflate counts.
- An email probe from a blocklisted IP returns `blocked`, not `invalid`, so real mailboxes are not permanently poisoned.
- A catch-all domain (Google Workspace, M365) must not score every permuted address as `verified`.
- A suppression expires and the same address is reachable again: the gate must allow it.
- A closed opportunity with no outreach events: attribution reports must show `$0` attributed, not divide by zero or invent a touch.

---

## Current state (verified 2026-10-12)

- Backend running at `http://127.0.0.1:4010`, `/health` returns `ok: true`.
- `npm test`: 217 passing, 0 failing.
- PostgreSQL `squidweave` database: 51 tables, relational backend active.
- B2B tables populated: `companies` 57, `people` 275, `company_sources` 333, `account_scores` 57.
- Existing modules: `b2b-store.mjs`, `b2b-ingestion-engine.mjs`, `b2b-routes.mjs`, `account-scoring-engine.mjs`, `compliance-gate.mjs`, `email-verifier.mjs`, `email-candidates.mjs`, `telegram-outreach-engine.mjs`.
- Existing migrations: `001_initial_schema.sql` through `007_telegram_sequences.sql` applied.
- Frontend gaps: `ProspectIntelligence.tsx` builds prospects from `localStorage` and fabricated rows; `RevenueAttribution.tsx` uses hardcoded defaults; `EmailWarming.tsx` is localStorage-only; `CompanyDossier.tsx` is presentational and not wired to `/b2b/companies/:domain`.
- Missing backend: deliverability engine, revenue-attribution resolver, LinkedIn outreach adapter beyond posting.

## User decisions (2026-10-12)

- **Data sources:** Build and run our own public-source scouts as the primary volume engine. Wire in paid enrichment platform modules (Hunter, Snov, Dropcontact, Apollo) as optional fallback/enrichment only, disabled by default until configured.
- **Messaging channel:** Use Telegram for person-to-person outreach sequences now; LinkedIn keeps its existing posting adapter but outbound connection/message steps are deferred until LinkedIn API credentials are available.
- **Consent basis:** Pending region confirmation (see open decisions below).
- **Sending domain:** `squidweave.com` via ProtonMail SMTP (`smtp.protonmail.ch:587`) as a temporary starting domain. The user should rotate the SMTP token after setup and consider a dedicated outbound subdomain once volume grows.

---

## Phase 1 — Own B2B database at volume

The foundation exists. This phase expands sources, hardens dedupe, and wires the frontend to real data.

### Task 1.1: Add high-volume public scouts

**Files:**
- Create: `src/lib/scrapers/opencorporates-scout.mjs`
- Create: `src/lib/scrapers/crunchbase-public-scout.mjs`
- Create: `src/lib/scrapers/github-org-scout.mjs` (if not already present)
- Modify: `src/server.mjs` to register new scouts in the ingestion engine
- Test: `tests/b2b-database.test.mjs`

**Interfaces:**
- Consumes: `B2BIngestionEngine.ingestFromScout(name, query)` contract from `src/lib/b2b-ingestion-engine.mjs`
- Produces: Each scout returns `{ source: string, records: array, sourceReliability: number }` where each record has `{ domain, company, people?: [...] }`

- [ ] **Step 1: Write failing test**

```javascript
import { test } from "node:test";
import assert from "node:assert";
import { OpenCorporatesScout } from "../src/lib/scrapers/opencorporates-scout.mjs";

test("OpenCorporatesScout returns records with domain and company", async () => {
  const scout = new OpenCorporatesScout();
  const result = await scout.discover({ jurisdiction: "us_de", query: "stripe" });
  assert.ok(Array.isArray(result.records));
  assert.ok(result.records.length > 0);
  assert.ok(result.records[0].domain || result.records[0].company);
  assert.strictEqual(typeof result.sourceReliability, "number");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/b2b-database.test.mjs`
Expected: FAIL with "OpenCorporatesScout is not defined" or "Cannot find module".

- [ ] **Step 3: Implement `OpenCorporatesScout` in `src/lib/scrapers/opencorporates-scout.mjs`**

Fetch `https://opencorporates.com/reconcile?query={query}&limit=10`, parse JSON, map each result to `{ domain, company, jurisdiction, companyNumber, sourceUrl, sourceReliability: 0.9 }`. Return no `people` (registry data rarely has named contacts). Add a `health()` probe that HEADs the reconcile endpoint and returns `{ ok, note }`.

- [ ] **Step 4: Implement `CrunchbasePublicScout` in `src/lib/scrapers/crunchbase-public-scout.mjs`**

Fetch public Crunchbase company pages via `https://www.crunchbase.com/organization/{slug}` or use the public API if an `CRUNCHBASE_API_KEY` is configured. Extract company name, domain, funding stage, employee count band, and named founders where visible. Return `sourceReliability: 0.75`.

- [ ] **Step 5: Implement or verify `GitHubOrgScout`**

If `src/lib/scrapers/github-org-scout.mjs` is empty or missing, implement it to call `https://api.github.com/orgs/{org}` and `/orgs/{org}/members` (public members only), mapping members to `{ fullName, title, linkedinUrl }` where available from public profiles. Return `sourceReliability: 0.6`.

- [ ] **Step 6: Register scouts in the server boot path**

In `src/server.mjs`, import the new scouts and add them to the `B2BIngestionEngine` constructor where the existing scouts are wired. If no central wiring exists yet, create a `createB2BIngestionEngine(b2bStore)` helper in `src/lib/b2b-ingestion-engine.mjs` and call it from `createApp`.

- [ ] **Step 7: Run tests**

Run: `npm test -- tests/b2b-database.test.mjs`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/scrapers/opencorporates-scout.mjs src/lib/scrapers/crunchbase-public-scout.mjs src/lib/scrapers/github-org-scout.mjs src/lib/b2b-ingestion-engine.mjs src/server.mjs tests/b2b-database.test.mjs
git commit -m "feat(b2b): add opencorporates, crunchbase, and github-org scouts"
```

### Task 1.2: Run a bulk ingest and measure volume

**Files:**
- Create: `scripts/b2b-bulk-ingest.mjs`
- Modify: `src/lib/b2b-ingestion-engine.mjs` if batch orchestration is missing

**Interfaces:**
- Consumes: `B2BIngestionEngine` and all registered scouts
- Produces: A CLI report with company/people counts and per-source breakdown

- [ ] **Step 1: Write the bulk ingest script**

Create `scripts/b2b-bulk-ingest.mjs` that:
1. Reads `DATABASE_URL` from environment.
2. Instantiates `B2BStore` and `B2BIngestionEngine` with all scouts.
3. Runs a curated query list (e.g. SaaS, fintech, healthcare, AI/ML) through `job-board-scout`, `sec-edgar-scout`, `opencorporates-scout`, `crunchbase-public-scout`, `github-org-scout`, `team-page-scout`.
4. Prints final stats and elapsed time.

- [ ] **Step 2: Run it locally**

Run: `node scripts/b2b-bulk-ingest.mjs`
Expected: Script completes without errors and reports new `companies` and `people` rows.

- [ ] **Step 3: Verify dedupe on re-run**

Run the script a second time.
Expected: `companies` count does not double; `company_sources` count may increase but `companies` and `people` remain stable.

- [ ] **Step 4: Commit**

```bash
git add scripts/b2b-bulk-ingest.mjs
git commit -m "feat(b2b): add bulk ingest runner for volume growth"
```

### Task 1.3: Wire the frontend to the B2B database

**Files:**
- Modify: `src/services/dataService.ts`
- Modify: `src/components/funnel/ProspectIntelligence.tsx`
- Modify: `src/components/funnel/CompanyDossier.tsx`
- Test: `tests/integration.test.mjs` (add endpoint smoke tests)

**Interfaces:**
- Consumes: `GET /b2b/companies`, `GET /b2b/companies/:domain`, `GET /b2b/people`, `GET /b2b/rankings`, `POST /b2b/scores/recompute`
- Produces: `dataService.getB2BCompanies`, `dataService.getB2BCompany`, `dataService.getB2BPeople`, `dataService.getB2BRankings`, `dataService.recomputeB2BScores`

- [ ] **Step 1: Add B2B methods to `dataService.ts`**

```typescript
async getB2BCompanies(params?: { industry?: string; limit?: number; offset?: number }): Promise<any[]> {
  const qs = new URLSearchParams();
  if (params?.industry) qs.append("industry", params.industry);
  if (params?.limit != null) qs.append("limit", String(params.limit));
  if (params?.offset != null) qs.append("offset", String(params.offset));
  return api<any[]>(`/b2b/companies?${qs.toString()}`);
}

async getB2BCompany(domainOrId: string): Promise<any> {
  return api<any>(`/b2b/companies/${encodeURIComponent(domainOrId)}`);
}

async getB2BPeople(params?: { companyId?: string; emailStatus?: string; seniority?: string; limit?: number; offset?: number }): Promise<any[]> {
  const qs = new URLSearchParams();
  if (params?.companyId) qs.append("companyId", params.companyId);
  if (params?.emailStatus) qs.append("emailStatus", params.emailStatus);
  if (params?.seniority) qs.append("seniority", params.seniority);
  if (params?.limit != null) qs.append("limit", String(params.limit));
  if (params?.offset != null) qs.append("offset", String(params.offset));
  return api<any[]>(`/b2b/people?${qs.toString()}`);
}

async getB2BRankings(params?: { limit?: number; minScore?: number }): Promise<any[]> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.append("limit", String(params.limit));
  if (params?.minScore != null) qs.append("minScore", String(params.minScore));
  return api<any[]>(`/b2b/rankings?${qs.toString()}`);
}

async recomputeB2BScores(): Promise<{ scored: number; top: any[] }> {
  return api<{ scored: number; top: any[] }>("/b2b/scores/recompute", { method: "POST" });
}
```

- [ ] **Step 2: Rewrite `ProspectIntelligence.tsx` to use real data**

Replace the fabricated `prospectingRuns` loop and `targetMarkets` fallback with:
1. On mount, call `dataService.getB2BRankings({ limit: 100 })`.
2. Map each ranking to a `Prospect` using the company's people from `dataService.getB2BPeople({ companyId })`.
3. Keep search/filter local, but base results on real rows.
4. Remove deterministic fake phone numbers and LinkedIn URLs; show only what the database actually has.

- [ ] **Step 3: Wire `CompanyDossier.tsx` to `/b2b/companies/:domain`**

Where `CompanyDossier` is used, pass a real domain prop and fetch `dataService.getB2BCompany(domain)` on mount. Map backend fields to the `CompanyDossierData` interface. If data is missing, render the honest empty state from `DESIGN.md` (no fabricated metrics).

- [ ] **Step 4: Add integration smoke tests**

In `tests/integration.test.mjs`, add tests that hit `GET /b2b/stats`, `GET /b2b/companies`, `GET /b2b/rankings` and assert 200 + array responses.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: 189 existing + new tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/dataService.ts src/components/funnel/ProspectIntelligence.tsx src/components/funnel/CompanyDossier.tsx tests/integration.test.mjs
git commit -m "feat(b2b): wire frontend to real B2B database endpoints"
```

### Task 1.4: Wire paid enrichment connector modules (fallback only)

**Files:**
- Create: `src/lib/enrichment/hunter-connector.mjs`
- Create: `src/lib/enrichment/snov-connector.mjs`
- Create: `src/lib/enrichment/dropcontact-connector.mjs`
- Create: `src/lib/enrichment/apollo-connector.mjs`
- Modify: `src/lib/b2b-ingestion-engine.mjs`
- Modify: `src/lib/b2b-routes.mjs`
- Test: `tests/b2b-enrichment.test.mjs`

**Interfaces:**
- Consumes: `HUNTER_API_KEY`, `SNOV_API_KEY`, `DROPCONTACT_API_KEY`, `APOLLO_API_KEY` env vars
- Produces: Enrichment result shape `{ email, status, source: 'hunter'|'snov'|'dropcontact'|'apollo', confidence }`; optional POST `/b2b/enrich` route

- [ ] **Step 1: Write failing test**

```javascript
test("Hunter connector simulates without API key", async () => {
  const result = await hunterEnrich({ domain: "stripe.com", firstName: "Jane", lastName: "Doe" });
  assert.strictEqual(result.status, "simulated");
});
```

- [ ] **Step 2: Implement each connector**

Each connector exposes `enrich({ domain, firstName, lastName, company })` and:
- Returns `{ status: "simulated", reason: "no-api-key" }` when the key is absent.
- Calls the provider's documented endpoint when the key is present.
- Maps responses to a common shape: `{ email, status: 'verified'|'unknown'|'not_found', confidence, source }`.
- Handles rate limits gracefully (returns `status: "rate_limited"`).

- [ ] **Step 3: Add optional enrichment step to ingestion engine**

In `src/lib/b2b-ingestion-engine.mjs`, add an `enrichPerson(store, person, connectors)` helper that tries each configured connector only when the person's email is missing or unverified. Do not run enrichment by default in bulk ingest; make it opt-in via `options.enrich: true`.

- [ ] **Step 4: Add `/b2b/enrich` route**

In `src/lib/b2b-routes.mjs`, add `POST /b2b/enrich` accepting `{ personId, connectors? }`. It loads the person, runs the requested connectors, and updates `people.email` + `email_status` if a verified address is found.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/b2b-enrichment.test.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/enrichment/*.mjs src/lib/b2b-ingestion-engine.mjs src/lib/b2b-routes.mjs tests/b2b-enrichment.test.mjs
git commit -m "feat(b2b): optional Hunter/Snov/Dropcontact/Apollo enrichment connectors"
```

---

## Phase 2 — Email deliverability backend

The frontend `EmailWarming.tsx` already has UI for reputation, auth records, warmup, and blacklists, but it stores everything in `localStorage`. This phase builds the backend that feeds it.

### Task 2.1: Schema for sending domains and warmup state

**Files:**
- Create: `migrations/008_sending_domains.sql`
- Modify: `src/lib/b2b-store.mjs`
- Test: `tests/email-deliverability.test.mjs`

**Interfaces:**
- Consumes: PostgreSQL connection from `B2BStore`
- Produces: `sending_domains` table; store methods `upsertSendingDomain`, `getSendingDomain`, `recordSendAttempt`

- [ ] **Step 1: Write failing test**

```javascript
test("B2BStore records a sending domain", async () => {
  const store = await createTestStore();
  const domain = await store.upsertSendingDomain({ domain: "example.com", dailyCap: 50 });
  assert.strictEqual(domain.domain, "example.com");
  assert.strictEqual(domain.daily_cap, 50);
  const found = await store.getSendingDomain("example.com");
  assert.ok(found);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/email-deliverability.test.mjs`
Expected: FAIL because `upsertSendingDomain` does not exist.

- [ ] **Step 3: Add migration `migrations/008_sending_domains.sql`**

```sql
create table if not exists sending_domains (
  id text primary key,
  domain text not null unique,
  spf_status text default 'unknown',
  dkim_status text default 'unknown',
  dmarc_status text default 'unknown',
  dmarc_policy text,
  reputation_score numeric(5,2) default 0,
  warmup_started_at timestamptz,
  daily_cap integer default 50,
  sent_today integer default 0,
  sent_last_reset_at timestamptz default now(),
  bounce_count_100 integer default 0,
  sent_count_100 integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sending_domains_reputation on sending_domains (reputation_score desc);
```

- [ ] **Step 4: Implement store methods in `src/lib/b2b-store.mjs`**

Add `upsertSendingDomain`, `getSendingDomain`, `recordSendAttempt(domain, { delivered, bounced, complaint })`, and `resetDailyCountersIfNeeded()`. The record method updates the rolling 100-send window and decrements `reputation_score` on bounces/complaints.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/email-deliverability.test.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add migrations/008_sending_domains.sql src/lib/b2b-store.mjs tests/email-deliverability.test.mjs
git commit -m "feat(deliverability): sending_domains schema and store methods"
```

### Task 2.2: Deliverability engine

**Files:**
- Create: `src/lib/deliverability-engine.mjs`
- Modify: `src/lib/b2b-routes.mjs`
- Test: `tests/email-deliverability.test.mjs`

**Interfaces:**
- Consumes: `B2BStore` methods for `sending_domains`; Node.js `dns/promises`
- Produces: `checkDomainAuth(domain)`, `getWarmupCap(domain)`, `canSendTo(email, domain)`, `recordSendOutcome(domain, outcome)`

- [ ] **Step 1: Write failing test**

```javascript
test("checkDomainAuth returns SPF/DKIM/DMARC status", async () => {
  const result = await checkDomainAuth("google.com");
  assert.ok(["configured", "missing", "invalid"].includes(result.spf));
  assert.ok(["configured", "missing", "invalid"].includes(result.dkim));
  assert.ok(["configured", "missing", "invalid"].includes(result.dmarc));
});
```

- [ ] **Step 2: Implement `src/lib/deliverability-engine.mjs`**

Functions:
- `checkDomainAuth(domain)`: resolve `_dmarc.{domain}`, `_domainkey.{domain}`, and `TXT` records for SPF; return `{ spf, dkim, dmarc, dmarcPolicy }`.
- `getWarmupCap(store, domain)`: compute cap from `warmup_started_at` (50/day week 1, 100 week 2, 200 week 3, 400 week 4, unlimited after). Return `{ cap, phase }`.
- `canSendTo(store, email, sendingDomain)`: check suppression, domain auth, bounce rate under 5%, daily cap not exceeded, and business-hours window. Return `{ allowed, reason }`.
- `recordSendOutcome(store, sendingDomain, { delivered, bounced, complaint })`: update rolling window and reputation.

- [ ] **Step 3: Add deliverability routes to `src/lib/b2b-routes.mjs`**

- `GET /b2b/deliverability/:domain` returns auth status, reputation, warmup cap, and volume history.
- `POST /b2b/deliverability/check` accepts `{ email, sendingDomain }` and returns `{ allowed, reason }`.
- `POST /b2b/deliverability/outcome` accepts `{ sendingDomain, delivered, bounced, complaint }` and records it.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/email-deliverability.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/deliverability-engine.mjs src/lib/b2b-routes.mjs tests/email-deliverability.test.mjs
git commit -m "feat(deliverability): auth checks, warmup caps, and send gating"
```

### Task 2.3: Wire `EmailWarming.tsx` to the deliverability API

**Files:**
- Modify: `src/services/dataService.ts`
- Modify: `src/components/funnel/EmailWarming.tsx`

**Interfaces:**
- Consumes: `GET /b2b/deliverability/:domain`, `POST /b2b/deliverability/check`, `POST /b2b/deliverability/outcome`
- Produces: UI state driven by backend, with `localStorage` only as an offline cache

- [ ] **Step 1: Add deliverability methods to `dataService.ts`**

```typescript
async getDeliverability(domain: string): Promise<any> { return api<any>(`/b2b/deliverability/${encodeURIComponent(domain)}`); }
async checkDeliverability(email: string, sendingDomain: string): Promise<any> { return api<any>("/b2b/deliverability/check", { method: "POST", body: JSON.stringify({ email, sendingDomain }) }); }
async recordDeliverabilityOutcome(sendingDomain: string, outcome: any): Promise<any> { return api<any>("/b2b/deliverability/outcome", { method: "POST", body: JSON.stringify({ sendingDomain, ...outcome }) }); }
```

- [ ] **Step 2: Replace localStorage-first state in `EmailWarming.tsx`**

On mount, if `data.reputation.domain` is set, call `dataService.getDeliverability(domain)` and merge into state. Keep `localStorage` as a fallback cache when the backend is unreachable. Remove hardcoded "Cisco Talos: trusted" defaults when backend returns `unknown`.

- [ ] **Step 3: Run UI dev build**

Run: `npm run ui:build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/dataService.ts src/components/funnel/EmailWarming.tsx
git commit -m "feat(deliverability): wire EmailWarming UI to backend"
```

---

## Phase 3 — Account scoring (backend done, frontend to surface)

The scoring engine exists and `account_scores` is populated. This phase exposes it in the UI.

### Task 3.1: Surface account scores in the frontend

**Files:**
- Modify: `src/components/funnel/ProspectIntelligence.tsx`
- Modify: `src/components/funnel/CompanyDossier.tsx`
- Test: existing `tests/scoring-compliance.test.mjs`

**Interfaces:**
- Consumes: `GET /b2b/rankings`, `GET /b2b/companies/:domain` (already wired)
- Produces: Score badge and component breakdown rendered from `accountScore`

- [ ] **Step 1: Add score display to prospect cards**

In `ProspectIntelligence.tsx`, use `accountScore.score` and `accountScore.band` from the rankings response. Replace the fabricated `intentScore` with the real score (0–1 displayed as 0–100). Show `hot/warm/cold` badges from `bandForScore`.

- [ ] **Step 2: Add component breakdown in `CompanyDossier.tsx`**

Render the `accountScore.components` object: dataQuality, contactability, decisionMakerReach, hiringSignal, firmographicFit. Use `tablar-nums` for figures per `DESIGN.md`.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/funnel/ProspectIntelligence.tsx src/components/funnel/CompanyDossier.tsx
git commit -m "feat(scoring): surface real account scores and bands in UI"
```

---

## Phase 4 — Revenue attribution

Backend has `opportunities` and `outreach_events` but no attribution resolver. Frontend `RevenueAttribution.tsx` is hardcoded.

### Task 4.1: Schema for attribution touches

**Files:**
- Create: `migrations/009_revenue_attribution.sql`
- Modify: `src/lib/b2b-store.mjs`
- Test: `tests/revenue-attribution.test.mjs`

**Interfaces:**
- Consumes: `opportunities` and `outreach_events` tables
- Produces: `attribution_touches` table and store methods `resolveAttribution`, `getAttributionReport`

- [ ] **Step 1: Write failing test**

```javascript
test("resolveAttribution writes touches for a closed opportunity", async () => {
  const store = await createTestStore();
  // seed opportunity + events via existing store methods
  await store.resolveAttribution({ opportunityId: "opp-1", model: "first" });
  const touches = await store.getAttributionTouches("opp-1");
  assert.ok(touches.length > 0);
});
```

- [ ] **Step 2: Add migration `migrations/009_revenue_attribution.sql`**

```sql
alter table opportunities add column if not exists attributed_campaign_id text;
alter table opportunities add column if not exists attributed_sequence_id text;
alter table opportunities add column if not exists first_touch_event_id text;
alter table opportunities add column if not exists last_touch_event_id text;
alter table opportunities add column if not exists attribution_model text default 'first';
alter table opportunities add column if not exists pipeline_value bigint default 0;
alter table opportunities add column if not exists closed_value bigint default 0;
alter table opportunities add column if not exists closed_at timestamptz;

alter table outreach_events add column if not exists opportunity_id text;

create table if not exists attribution_touches (
  id text primary key,
  opportunity_id text not null,
  event_id text not null,
  position integer not null,
  weight numeric(4,3) not null,
  model text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_attribution_opportunity on attribution_touches (opportunity_id);
create index if not exists idx_attribution_event on attribution_touches (event_id);
```

- [ ] **Step 3: Implement store methods in `src/lib/b2b-store.mjs`**

- `getOutreachEventsForContact(contactId, beforeDate)`: fetch events linked to the opportunity's contact.
- `resolveAttribution({ opportunityId, model })`: support `first`, `last`, `linear`. Write touches with weights summing to 1 and update `opportunities` attribution columns.
- `getAttributionReport({ campaignId })`: aggregate `closed_value * weight` by campaign and by sequence step.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/revenue-attribution.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add migrations/009_revenue_attribution.sql src/lib/b2b-store.mjs tests/revenue-attribution.test.mjs
git commit -m "feat(attribution): opportunities attribution schema and resolver"
```

### Task 4.2: Revenue attribution engine and routes

**Files:**
- Create: `src/lib/revenue-attribution-engine.mjs`
- Modify: `src/lib/b2b-routes.mjs`
- Test: `tests/revenue-attribution.test.mjs`

**Interfaces:**
- Consumes: `B2BStore` attribution methods
- Produces: `POST /b2b/attribution/resolve`, `GET /b2b/attribution/report`

- [ ] **Step 1: Implement `src/lib/revenue-attribution-engine.mjs`**

Export:
- `resolveOpportunityAttribution(store, opportunityId, model)`
- `resolveAllClosedOpportunities(store, options)`
- `getCampaignAttributionReport(store, campaignId)`

- [ ] **Step 2: Add routes to `src/lib/b2b-routes.mjs`**

- `POST /b2b/attribution/resolve` body `{ opportunityId, model }`.
- `GET /b2b/attribution/report?campaignId=` returns `{ totalClosedValue, attributedBySource, attributedByStep }`.

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/revenue-attribution.test.mjs`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/revenue-attribution-engine.mjs src/lib/b2b-routes.mjs tests/revenue-attribution.test.mjs
git commit -m "feat(attribution): engine and HTTP routes"
```

### Task 4.3: Wire `RevenueAttribution.tsx` to real data

**Files:**
- Modify: `src/services/dataService.ts`
- Modify: `src/components/funnel/RevenueAttribution.tsx`

**Interfaces:**
- Consumes: `GET /b2b/attribution/report`, `GET /opportunities`
- Produces: KPI cards and source breakdown from real opportunities

- [ ] **Step 1: Add attribution methods to `dataService.ts`**

```typescript
async resolveAttribution(opportunityId: string, model?: string): Promise<any> { return api<any>("/b2b/attribution/resolve", { method: "POST", body: JSON.stringify({ opportunityId, model }) }); }
async getAttributionReport(campaignId?: string): Promise<any> { const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : ""; return api<any>(`/b2b/attribution/report${qs}`); }
```

- [ ] **Step 2: Replace hardcoded defaults in `RevenueAttribution.tsx`**

On mount, fetch opportunities and attribution report. Compute pipeline value, weighted forecast, average deal size, win rate, and sales cycle from real rows. Remove `defaultRevenueSources` and `defaultMonthlyForecast`; derive monthly forecast from closed dates. Show empty/honest states when no opportunities exist.

- [ ] **Step 3: Run UI build**

Run: `npm run ui:build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/services/dataService.ts src/components/funnel/RevenueAttribution.tsx
git commit -m "feat(attribution): wire RevenueAttribution UI to real data"
```

---

## Phase 5 — Telegram outreach sequences

LinkedIn outbound connection/message steps are deferred until official LinkedIn API credentials are available. For now, person-to-person messaging runs through Telegram, which has an open bot API and is suitable for opted-in contacts.

### Task 5.1: Schema and engine for Telegram sequences

**Files:**
- Create: `migrations/007_telegram_sequences.sql`
- Modify: `src/adapters/telegram.mjs`
- Create: `src/lib/telegram-outreach-engine.mjs`
- Test: `tests/telegram-outreach.test.mjs`

**Interfaces:**
- Consumes: `TELEGRAM_BOT_TOKEN` env var; `people.telegram_handle` or contact's phone
- Produces: `telegram_sequences` table; adapter function `sendTelegramMessage`

- [ ] **Step 1: Write failing test**

```javascript
test("Telegram adapter simulates without token", async () => {
  const result = await sendTelegramMessage({ chatId: "123", body: "Hi" });
  assert.strictEqual(result.status, "simulated");
});
```

- [ ] **Step 2: Add migration `migrations/007_telegram_sequences.sql`**

```sql
create table if not exists telegram_sequences (
  id text primary key,
  person_id text references people(id) on delete cascade,
  telegram_handle text,
  chat_id text,
  state text not null default 'pending' check (state in ('pending','messaged','replied','stopped')),
  message_sent_at timestamptz,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_telegram_sequences_person on telegram_sequences (person_id);
create index if not exists idx_telegram_sequences_state on telegram_sequences (state);
```

- [ ] **Step 3: Extend `src/adapters/telegram.mjs`**

Add `sendTelegramMessage({ chatId, body })`. Without `TELEGRAM_BOT_TOKEN` return `{ status: "simulated" }`. With token, call `https://api.telegram.org/bot{token}/sendMessage` and return `{ status, externalId, error }`.

- [ ] **Step 4: Implement `src/lib/telegram-outreach-engine.mjs`**

Export:
- `queueTelegramMessage(store, { personId, chatId, body })`: writes `telegram_sequences` row in `pending`.
- `sendNextPendingMessages(store, adapter, limit)`: sends pending messages through the adapter and updates state to `messaged`.
- `handleTelegramUpdate(store, update)`: maps incoming Telegram webhook updates to `replied` or `stopped` states.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/telegram-outreach.test.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add migrations/007_telegram_sequences.sql src/adapters/telegram.mjs src/lib/telegram-outreach-engine.mjs tests/telegram-outreach.test.mjs
git commit -m "feat(telegram): outreach message sequences and state machine"
```

### Task 5.2: Add Telegram outreach routes

**Files:**
- Modify: `src/lib/b2b-routes.mjs`
- Test: `tests/telegram-outreach.test.mjs`

**Interfaces:**
- Consumes: `telegram-outreach-engine.mjs`, `adapters/telegram.mjs`
- Produces: `POST /b2b/telegram/message`, `POST /b2b/telegram/webhook`, `GET /b2b/telegram/sequences`

- [ ] **Step 1: Add routes to `src/lib/b2b-routes.mjs`**

- `POST /b2b/telegram/message` body `{ personId, chatId, body }`.
- `POST /b2b/telegram/webhook` receives Telegram bot updates.
- `GET /b2b/telegram/sequences?personId=&state=`.

All routes check dry-run; without `TELEGRAM_BOT_TOKEN`, sends return `status: "simulated"`.

- [ ] **Step 2: Run tests**

Run: `npm test -- tests/telegram-outreach.test.mjs`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/b2b-routes.mjs tests/telegram-outreach.test.mjs
git commit -m "feat(telegram): HTTP routes for outreach and webhooks"
```

---

## Phase 6 — Compliance / DNC enforcement

The compliance gate exists but is not yet called from the live send paths.

### Task 6.1: Enforce compliance gate before every send

**Files:**
- Modify: `src/lib/prospect-activation-engine.mjs`
- Modify: `src/lib/funding-engine.mjs` (if it sends email)
- Modify: `src/adapters/email.mjs`
- Modify: `src/lib/workflow-engine.mjs` (email step execution)
- Test: `tests/scoring-compliance.test.mjs`

**Interfaces:**
- Consumes: `checkOutreachAllowed({ store, email, consentBasis, campaignId })` from `src/lib/compliance-gate.mjs`
- Produces: Sends blocked when suppression/consent/role-account checks fail

- [ ] **Step 1: Write failing test**

```javascript
test("email send is blocked for suppressed address", async () => {
  const store = await createTestStore();
  await store.upsertSuppression({ email: "bad@example.com", reason: "unsubscribe" });
  const result = await sendEmail({ to: "bad@example.com", store, consentBasis: "legitimate_interest" });
  assert.strictEqual(result.status, "blocked");
});
```

- [ ] **Step 2: Modify `src/adapters/email.mjs`**

At the top of the send function, if a `store` and `consentBasis` are provided, call `checkOutreachAllowed`. On block, return `{ status: "blocked", reason }` and do not open the SMTP socket.

- [ ] **Step 3: Modify `src/lib/prospect-activation-engine.mjs`**

Before activating any email channel, call `checkOutreachAllowed` with `consentBasis: "legitimate_interest"` (or the campaign's configured basis). On block, record an `outreach_events` row with `status: "blocked"` and `reason`.

- [ ] **Step 4: Modify workflow email step**

In `src/lib/workflow-engine.mjs`, when executing an email step, pass the B2B store and consent basis to the email adapter. Blocked emails surface as step failures with the compliance reason.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/scoring-compliance.test.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/adapters/email.mjs src/lib/prospect-activation-engine.mjs src/lib/workflow-engine.mjs tests/scoring-compliance.test.mjs
git commit -m "feat(compliance): enforce compliance gate in all email send paths"
```

### Task 6.2: Add domain suppression and bounce handling to webhooks

**Files:**
- Modify: `src/lib/tracking-engine.mjs`
- Modify: `src/lib/b2b-store.mjs`
- Test: `tests/tracking-engine.test.mjs`

**Interfaces:**
- Consumes: Brevo/Mailgun bounce webhook payloads
- Produces: `people.email_status` updated to `invalid`; domain suppression on spam-trap or abuse reports

- [ ] **Step 1: Handle hard bounces in `TrackingEngine`**

When a `bounce` event arrives, call `store.updateEmailStatus(personId, "invalid")` if the person exists. If the bounce reason indicates a spam trap or abuse report, also call `store.upsertDomainSuppression`.

- [ ] **Step 2: Add unsubscribe webhook endpoint**

In `src/lib/b2b-routes.mjs` or `src/server.mjs`, add `POST /webhooks/unsubscribe` that records a suppression for the address and mirrors it to `contacts.dnd`.

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/tracking-engine.test.mjs`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/tracking-engine.mjs src/lib/b2b-store.mjs src/lib/b2b-routes.mjs tests/tracking-engine.test.mjs
git commit -m "feat(compliance): bounce and unsubscribe handlers write suppressions"
```

---

## Build order and acceptance

1. Phase 1.1 — scouts
2. Phase 1.2 — bulk ingest runner
3. Phase 1.3 — frontend wiring
4. Phase 1.4 — paid enrichment connectors (wired in, optional)
5. Phase 2.1 — `sending_domains` schema
6. Phase 2.2 — deliverability engine
7. Phase 2.3 — EmailWarming backend wiring
8. Phase 3.1 — score UI surfacing
9. Phase 4.1 — attribution schema
10. Phase 4.2 — attribution engine/routes
11. Phase 4.3 — RevenueAttribution UI wiring
12. Phase 5.1 — Telegram schema/adapter/engine
13. Phase 5.2 — Telegram routes
14. Phase 6.1 — compliance enforcement in send paths
15. Phase 6.2 — bounce/unsubscribe handlers

**Per-phase acceptance:** `npm test` green.

**Full acceptance:**
- `companies` count grows by at least 2x after bulk ingest.
- Re-running bulk ingest does not duplicate `companies` or `people`.
- `ProspectIntelligence` renders real companies/people from `/b2b/rankings`.
- `EmailWarming` shows auth records from `/b2b/deliverability/:domain`.
- `RevenueAttribution` derives figures from `opportunities` and `attribution_touches`.
- A send to a suppressed address returns `blocked` and creates a `compliance_events` row.

## Open decisions for the user

1. **Sending domain.** Using `squidweave.com` as the temporary outbound domain via ProtonMail (`smtp.protonmail.ch:587`).
   - Recommended: move to a dedicated subdomain (`mail.squidweave.com` or `outreach.squidweave.com`) or a separate domain once daily volume exceeds ~50.
   - The ProtonMail SMTP token shared in chat should be rotated after setup.
2. **Consent region.** What country/region are you sending from, and where are your recipients? This determines the lawful basis:
   - **US / most B2B:** CAN-SPAM allows cold B2B email with truthful headers, physical address, and a working unsubscribe. Consent basis: `legitimate_interest` (US-style) with unsubscribe honoured.
   - **EU / UK / EEA:** GDPR/PECR generally requires consent for B2C and allows legitimate interest for B2B only with a clear opt-out. Consent basis: `legitimate_interest` (B2B) with easy opt-out; avoid personal email addresses.
   - **Canada:** CASL requires express or implied consent. Consent basis: `explicit_opt_in` unless you have a prior business relationship.
   - **Australia:** Spam Act requires consent. Consent basis: `legitimate_interest` for B2B with opt-out is commonly used, but document the basis.
   Tell me your region and I will set the default consent basis and required copy (unsubscribe link, physical address, etc.).
3. **Telegram bot token.** Do you have a Telegram bot token for messaging? If not, Phase 5 will run simulated.
4. **Paid enrichment API keys.** Hunter/Snov/Dropcontact/Apollo modules will be wired in but stay simulated until you add their API keys. Let me know which keys you have or want to enable first.
