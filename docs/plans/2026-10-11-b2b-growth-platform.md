# B2B Growth Platform — Own Database + Five Modules

**Date:** 2026-10-11
**Status:** Phase 1 and Phase 2 built and verified against live sources. 163 tests passing.

### Progress

**Phase 1 — Owned B2B database: DONE, verified live**

Migration `002_b2b_database.sql` adds `companies`, `people`, `people_dedupe_index`,
`company_sources`, `account_scores`. Migration `003_email_status_blocked.sql` adds the
`blocked` email status. `scripts/migrate.mjs` runs migrations in filename order with
`schema_migrations` tracking and an explicit `--mark-applied` flag.

| Source | Measured result |
|---|---|
| SEC EDGAR (Form 4 filings) | 8 Nvidia officers, 18 Microsoft officers, real titles and seniority |
| Job boards (Greenhouse/Ashby/Workable/SmartRecruiters/Recruitee/Personio) | 728 open roles at Stripe, all role signals detected |
| Team pages | 17 current Linear staff with accurate titles |

Modules: `b2b-store.mjs`, `b2b-ingestion-engine.mjs`, `scrapers/sec-edgar-scout.mjs`,
`scrapers/job-board-scout.mjs`, `scrapers/team-page-scout.mjs`.

**Phase 2 — Email verification: DONE, verified live**

`email-verifier.mjs`, `email-candidates.mjs`. Three findings from live SMTP testing
that changed the design:

1. **This machine's IP is Spamhaus-blocklisted.** Microsoft answered 550 for every
   address. Recording that as `invalid` would mark real mailboxes dead, so a block is
   now a distinct `blocked` status that stays eligible for retry.
2. **Google Workspace and M365 are catch-all.** `linear.app` accepted
   `nobody-real-zzz9@linear.app`, so every address there would score `verified`.
   `isCatchAll()` now probes a random mailbox first and marks the domain `risky`.
3. **Synthetic domains cannot receive mail.** EDGAR companies with no website in the
   filing get a `.local` domain; permuting at one yields guaranteed-dead addresses,
   so permutation skips them.

**Honest limits of the free-source pipeline:** companies and domains at high volume,
people at medium volume, **verified emails at low volume** — for two measured reasons.
SMTP probing is only decisive on non-catch-all domains, and most modern business mail
is catch-all. And probing from a blocklisted IP returns `blocked` for everything,
which this code cannot repair. That makes a licensed list or a paid enrichment API
(Hunter, Dropcontact, Apollo) the right answer for verified-email volume, not a scraper.

**Scope boundary (deliberate):** no LinkedIn scraper, no credential use, no CAPTCHA or
access-control bypass, no rate-limit evasion. Those are illegal under the CFAA and
equivalents, carry GDPR/CAN-SPAM consent obligations, and are self-defeating — a
blocklisted IP returns zero records. Every source here publishes its data on purpose.

### Discovery sources (all free, all public-by-design)

| Scout | Source | What it contributes |
|---|---|---|
| `sec-index` | SEC company ticker index | 10,445 registrants in one request. CIK + ticker + legal name. The discovery layer: no need to know a name up front. Cached 12h. |
| `sec-edgar` | EDGAR Form 4/3 XML | Named officers and directors with statutory titles. Highest-confidence source (0.95). |
| `nonprofit-990` | ProPublica Nonprofit Explorer | Verified mailing address, annual revenue, total assets, NTEE sector. A whole market segment with no SEC filing. |
| `github-org` | GitHub public `/orgs/{login}` | Verified homepage, location, employee band. The only free firmographic source. |
| `job-board` | Lever/Greenhouse/Ashby/Workable +5 | Open roles — the strongest live buying signal. |
| `team-page` | /about, /team, /leadership | Current staff, section-tagged so investors and alumni are dropped. |

`scripts/discover-b2b.mjs` drives the two list-shaped sources in bulk
(`--sec N --officers`, `--nonprofits N`). `scripts/seed-b2b.mjs` seeds the
hand-curated 57 high-value targets. `scripts/verify-senior-emails.mjs`
permutes and SMTP-probes addresses for senior people.

### Phase 3 — Account scoring and compliance (DONE, verified live)

**Account scoring** (`account-scoring-engine.mjs`): five weighted components
(dataQuality 0.20, contactability 0.25, decisionMakerReach 0.25, hiringSignal 0.15,
firmographicFit 0.15), weights summing to 1 so the score is a true weighted average.
Persisted to `account_scores` and rankable in SQL via `rankCompanies()`.

Every component records the reason behind its value, so a score is explainable
rather than a number. Missing signals contribute 0, never an assumed default —
that is what stops a data-poor company scoring like an average one.

Verified on three seeded profiles: a senior, verified, hiring company scored 0.760,
a CTO with no address 0.470, a junior with a permuted address 0.310. One deliberate
trade-off is asserted in the tests: the CTO with no email outranks the junior with
one, because seniority and firmographics outweigh contactability at 0.25.

**Compliance gate** (`compliance-gate.mjs`): fail-closed, checked in order —
consent basis, address suppression, domain suppression, role accounts, bounce
state. Migration `004_compliance.sql` adds `suppression_list` (keyed on address),
`domain_suppression` (keyed on domain), and `compliance_events` (append-only audit).

Verified behaviours, all asserted in tests: missing or unrecognized consent basis
blocks; role accounts block unless explicitly allowed; an unsubscribe blocks
case-insensitively; a spam complaint is permanent even when the caller supplies an
expiry; a temporary suppression expires on its own; domain suppression blocks every
address at that domain; and every decision is audited.

One distinction the tests pin down deliberately: a hard bounce **blocks** but does
**not** write a permanent suppression, so the address stays re-probeable. Treating a
bounce as an opt-out would permanently lose addresses that were only temporarily
unreachable.

The gate enforces mechanical rules and records every decision. It does not decide
legality — whether a consent basis is adequate for a given jurisdiction is a legal
question for a human.

**Scope:** Build an owned B2B contact/company database at volume, plus deliverability, account scoring, revenue attribution, LinkedIn outreach, and a compliance gate.

## Context and constraints found in the codebase

Repo: `/home/gnul/audit-squidweave/squidweave`. Backend on `127.0.0.1:4010`, `/health` ok, `DRY_RUN=true`. Test suite: 107 tests, all passing. DB: PostgreSQL at `127.0.0.1:5432/squidweave`, 42 tables, `STATE_BACKEND=relational`.

Current row counts: `contacts` 3, `sourced_contacts` 0, `research_records` 500, `target_profiles` 49, `opportunities` 6.

What already exists that this plan builds on rather than replaces:

- `src/lib/scrapers/` — six scouts: `discovery-scout.mjs` (GitHub recon, careers-page dorking, tech-stack fingerprinting, security headers), `jobpost-scout.mjs` (Lever, Greenhouse, Workable, Ashby job boards), `github-scout.mjs`, `search-scout.mjs`, `whois-scout.mjs`, `email-permutator.mjs` (pattern generation plus MX/domain validation).
- `src/connectors/free-sources.mjs` — Reddit, Hacker News, GitHub search with `sourceReliability` scores (0.58, 0.62, ...).
- `src/lib/scrape-enrichment-engine.mjs` — page fetch, LinkedIn URL normalization, email extraction.
- `src/lib/contact-sourcing-engine.mjs` — plan/build/persist, requires `sourceUrl` or `evidence` per contact (line 268 filter). This is the ingestion gate.
- `src/lib/prospect-activation-engine.mjs` — per-contact channel sequencing.
- `src/adapters/linkedin.mjs` — posting only (UGC + organization posts). No messaging, no connection requests, no profile reads.
- `src/adapters/email.mjs` — raw SMTP send over a socket dialog. No SPF/DKIM/DMARC handling, no bounce processing beyond webhook stubs (`/webhooks/mailgun`, `/webhooks/brevo`, `/webhooks/email`).
- `src/lib/relational-store.mjs` — `TABLE_MAPPINGS` + `COLLECTION_MAPPINGS` arrays at lines 1288+. Every new persisted entity needs a line in one of these or it will not load.
- `src/lib/agent-orchestrator.mjs` — has a `ComplianceSentinel` that checks briefs and a list-hygiene pass that sets `status: "suppressed"`. Concept exists, no enforced pre-send gate.
- `contacts` table already has `dnd boolean default false` and `verification_status`. Unused by any send path.

What does not exist: account-level aggregation, revenue attribution on opportunities, any deliverability logic (no warmup, no reputation, no SPF/DKIM checks), LinkedIn as an outreach channel (only posting), and an enforced suppression check before send.

`DESIGN.md` exists and governs UI work: ENERGY 2, RHYTHM 3, MOTION 2, one teal accent, flat cards with 1px borders, no gradients/glow, Inter with `tabular-nums` for figures, and hard bans on fake metrics and gamified framing. Any new UI follows it. Backend/DB work in this plan has no UI surface except where noted.

## The honest problem with "as large as possible as quickly as possible"

Building a verified B2B database from public sources yields names, titles, companies, and domains reliably. It does not yield verified direct emails or mobile numbers at volume. LinkedIn blocks profile scraping and returns auth walls. Job boards give you companies and open roles, not decision-maker contacts. Emails must be permuted and then SMTP-verified, and SMTP verification is slow (roughly 1 to 3 seconds per address) and increasingly blocked by greylisting.

So the realistic output of a from-scratch pipeline is: companies and domains at high volume, people at medium volume, emails at medium volume with a verification cost. That is a usable prospecting database. It is not a ZoomInfo replacement, and it will not be one in any timeframe. Saying this plainly because the plan should not promise what the sources cannot deliver.

## Phase 1 — Own B2B database (foundation)

### 1.1 Migration: new tables

File: `migrations/002_b2b_database.sql`

Tables:

- `companies` — `id`, `domain` (unique), `name`, `industry`, `employee_range`, `location`, `description`, `linkedin_url`, `tech_stack text[]`, `source_urls text[]`, `first_seen_at`, `last_seen_at`, `confidence numeric`. Index on `domain`, on `industry`, on `confidence`.
- `people` — `id`, `company_id` (fk), `full_name`, `first_name`, `last_name`, `title`, `seniority`, `department`, `linkedin_url`, `email`, `email_status` (`unknown|permuted|verified|invalid|risky`), `email_verified_at`, `source_url`, `source_type`, `confidence numeric`, `first_seen_at`, `last_seen_at`. Index on `company_id`, on `email` where not null, on `email_status`.
- `people_dedupe_index` — `id`, `person_id`, `linkedin_key`, `email_key`, `name_company_key`, all unique. Makes upsert-by-identity a single index conflict instead of a scan.
- `company_sources` — `id`, `company_id`, `source_type`, `source_url`, `fetched_at`, `raw jsonb`. Keeps provenance so confidence is explainable.
- `account_scores` — `id`, `company_id` (unique), `score numeric`, `components jsonb`, `scored_at`, `model_version`. Phase 3 writes here.

Add both `companies` and `people` to `TABLE_MAPPINGS` in `src/lib/relational-store.mjs`, mirroring the existing pattern (`jsonb: [...]` arrays named explicitly).

### 1.2 Ingestion: broaden the existing scouts

The scouts already work. Extend rather than rewrite.

- `jobpost-scout.mjs` — add SmartRecruiters, Recruitee, JazzHR, Personio, Breezy. Job boards are the highest-yield free source for company + domain + open-role signal, and they are public JSON.
- `discovery-scout.mjs` — add Clearbit-free signals: `/about`, `/team`, `/leadership`, `/contact` page paths with person extraction. Most SMB leadership pages are plain HTML with names and titles in the markup.
- New `src/lib/scrapers/directory-scout.mjs` — public directories that permit crawling: Crunchbase public pages, AngelList/Wellfound public company pages, Product Hunt, G2/Capterra category listings, GitHub org member lists. Each returns company + domain + sometimes a named founder.
- New `src/lib/scrapers/opencorporates-scout.mjs` — company registries give legal name, domain sometimes, industry, headcount band, location. Highest data quality per record of any free source.
- New `src/lib/scrapers/sec-edgar-scout.mjs` — public-company officer and director filings. Free, complete, structured, and covers the largest B2B accounts exactly.

Each scout returns the existing shape: `{ source, records, sourceReliability }`, so `source-ingestion-engine.mjs` needs no change.

### 1.3 Verification pipeline

`email-permutator.mjs` already generates patterns and validates domains. Add:

- MX record caching per domain (one lookup per domain, not per address).
- SMTP `RCPT TO` verification with a per-domain concurrency cap of 1 and a 5s timeout, results written to `email_status`. Greylisting (450/451) marks `risky`, not `invalid`.
- A `src/lib/verification-queue.mjs` that persists pending verifications so a restart does not redo work. Rate-limited to avoid blocklisting the sending IP.

Verification runs as a background job on the scheduler, never inline in a request.

### 1.4 Dedupe and confidence

`/dedupe/check` already exists. Extend to the new identity keys. Confidence per record = weighted sum of source reliability, count of independent sources agreeing, and verification status. Write the weights as constants at the top of the module, not inline.

## Phase 2 — Deliverability module

New file: `src/lib/deliverability-engine.mjs`

- Domain auth check: SPF, DKIM, DMARC records per sending domain, cached, refreshed daily. Result surfaced as `configured|missing|invalid`.
- Warmup scheduler: per-domain daily send caps that ramp over 4 weeks (50/day week 1 to full by week 4), persisted in a new `sending_domains` table with `warmup_started_at`, `daily_cap`, `sent_today`, `reputation_score`.
- Bounce ingestion: the three webhook stubs already exist. Wire them to classify hard bounce, soft bounce, complaint, and unsubscribe, and to decrement the domain reputation score.
- Pre-send gate: a send is refused when the domain's bounce rate over the last 100 sends exceeds 5%, when the domain is missing SPF, or when the address status is `invalid`. Refusal is explicit in the response, not silent.
- Sending-window logic: business hours in the recipient's timezone, no weekend sends.

This is the highest-leverage item in the list because every other module's output is destroyed by a blocklisted sending domain.

## Phase 3 — Account-level scoring

New file: `src/lib/account-scoring-engine.mjs`

Aggregates per company into `account_scores`:

- Target count and seniority mix in `people`
- `research_records` signal count for the company
- Engagement: opens, clicks, replies from `outreach_events` and `analytics_events`
- Firmographic fit against the campaign's ICP (industry, employee range, location)
- Recency: `last_seen_at` decay

Score is 0 to 100 with the component breakdown stored in `components` so a user can see why an account ranked. `model_version` increments when weights change, so historical scores stay interpretable. The decision engine reads `account_scores` and prioritizes by it.

## Phase 4 — Revenue attribution

Migration `003_revenue_attribution.sql`:

- `opportunities` gains `attributed_campaign_id`, `attributed_sequence_id`, `first_touch_event_id`, `last_touch_event_id`, `attribution_model` (`first|last|linear`), `pipeline_value`, `closed_value`, `closed_at`.
- `outreach_events` gains `opportunity_id` nullable fk, so an event can be tied forward to a deal.
- New `attribution_touches` — `id`, `opportunity_id`, `event_id`, `position`, `weight`, `model`.

On opportunity close, a resolver walks the linked events and writes the touches. Report endpoint `GET /attribution/report?campaignId=` returns pipeline and closed value grouped by campaign and by step, so the user sees which activities produced revenue. UI follows `DESIGN.md`: figures large with `tabular-nums`, deltas only where a real series exists.

## Phase 5 — LinkedIn outreach steps

`src/adapters/linkedin.mjs` currently posts only. Add, all gated behind explicit config and dry-run by default:

- `sendConnectionRequest(profileUrn, note)` — 300 char limit, respects the weekly cap.
- `sendMessage(profileUrn, body)` — follow-up after acceptance.
- `readProfile(profileUrn)` — cached profile read for enrichment.
- Connection state machine in a new `linkedin_sequences` table: `pending|accepted|messaged|replied|declined`.

Constraint to state plainly: LinkedIn requires OAuth with the `w_member_social` scope and partner approval for messaging, and unofficial automation violates their ToS and gets accounts restricted. This ships as an official-API path only, dry-run by default, and the account-restriction risk is the user's to accept. If the API scope is not granted, the adapter reports it and skips rather than failing the sequence.

## Phase 6 — Compliance layer

New file: `src/lib/compliance-engine.mjs`, plus migration `004_compliance.sql`:

- `suppression_list` — `id`, `channel`, `identifier` (email or profile), `reason` (`dnd|unsubscribe|bounce|complaint|manual|legal`), `added_at`, `expires_at` nullable. Unique on `(channel, identifier)`.
- `consent_records` — `id`, `identifier`, `channel`, `consent_type`, `source`, `granted_at`, `revoked_at`.
- `dnc_registry_check` — adapter interface for national do-not-call registries, implemented as a stub returning `unchecked` until a real provider is configured. Never claim a check happened when it did not.

The gate: every outreach step calls `complianceEngine.assertAllowed(contact, channel)` before send. It checks suppression, `contacts.dnd`, revoked consent, and per-channel frequency caps. A block returns a structured reason that lands in `outreach_events` so the block is auditable. This is enforced server-side in the send path, not in the UI, so no client can bypass it.

Regions: GDPR (EU), CAN-SPAM (US email, requires physical address and working unsubscribe), CASL (Canada, requires consent). The gate enforces the mechanical parts; legal review of the actual copy and consent basis is the user's responsibility and is stated as such in the README.

## Build order

1. Migration `002` + `companies`/`people` in the store + extended scouts. Nothing else can start without the data model.
2. Verification queue.
3. Compliance layer. Gate before any send path grows.
4. Deliverability module.
5. Account scoring.
6. Revenue attribution.
7. LinkedIn.

Each phase ends with `npm test` green (currently 107 passing) and a new test file per engine, following the existing pattern in `tests/`.

## What needs a decision from the user before Phase 1 starts

1. **Volume target and acceptable sources.** Free public sources are the plan above. They yield companies at high volume and verified emails at low volume. Alternatives, in order of yield per unit of effort:
   - Free public scraping (this plan). No cost, slow verification, no phones.
   - Bulk licensed lists (a purchased B2B list). Fast, immediate volume, costs money, decay roughly 2 to 3 percent per month, and carries GDPR/CAN-SPAM obligations on the consent basis.
   - A paid enrichment API on top of free discovery (Hunter, Snov, Dropcontact, Apollo free tier). Costs money, gives verified emails, keeps discovery free.
   - Partnering with a data provider. Not what you want, listing it so the tradeoff is on the record.
2. **Which sending domains** exist today, for the deliverability module's SPF/DKIM check.
3. **LinkedIn API credentials**: do you have an app with `w_member_social`, or should Phase 5 ship dry-run only?
4. **Legal review of outreach copy** before any real send goes out. I can enforce the mechanical gates; I cannot make the consent basis lawful.

## Verification

Per phase: `npm test` green, plus a live check against the running backend.

Phase 1 acceptance: ingest from at least three scout types, confirm rows land in `companies` and `people`, confirm a second ingest of the same source creates no duplicates, and confirm `email_status` moves off `unknown` after verification runs.

Phase 6 acceptance: attempt a send to an address on the suppression list and confirm the response is a refusal with a structured reason, and that the attempt appears in `outreach_events`.

Full-suite acceptance: 107 existing tests still pass, plus new coverage per engine.
