# SquidWeave Chat History Summary

Consolidated from multiple Hermes sessions (May 25-27, 2026).

---

## Session 1 — HashnHedge Fixes + SquidWeave Initial Deploy (May 25)

**Context:** Session started in `/home/gnul/HNH` fixing HashnHedge bugs, then switched to `/home/gnul/squidweave` for initial deployment.

### HashnHedge Work (completed)
- Fixed signup crash caused by missing `VITE_GOOGLE_CLIENT_ID` — decoupled Google OAuth to be optional (conditional `GoogleOAuthProvider` wrapper).
- Fixed coin→miner→wallet→pool flow: added `/wallet/bulk` endpoint, dynamic pool selection by coin, coin switching with algo sync.
- Added XMR manual-import safeguard: UI blocks derived addresses for production, service marks them non-usable, agent rejects them server-side with `XMR_MANUAL_IMPORT_REQUIRED`.
- Fixed legacy `Downloads/server.js` running with wrong defaults (RVN/kawpow + placeholder wallets) — added `COIN_ALGOS` map, wallet guard, runtime path warning banner.
- Commits: `cde9906`, `ad8eb32`, `7d45f65`, `48cb241`, `a742d38`, `98aff5c`.

### SquidWeave Initial Deploy
- Deployed backend to Railway (`railway up --service squidweave-api`) — container started, `LocaleWeave listening on http://0.0.0.0:4010`.
- Started frontend locally: `npm run ui:dev` on port 3000, confirmed HTTP 200.
- Railway deployment had state inconsistency (`BUILDING` + `deploymentStopped: true`), but health endpoint responded 200.

---

## Session 2 — Codebase Index + VC Funding Engine Build (May 25)

**Goal:** Index the codebase and wire end-to-end marketing → VC funding automation.

### What was built
1. **Funding Engine** (`src/lib/funding-engine.mjs`) — investor scoring, prioritized pipeline, outreach sequencing, campaign-level funding runs.
2. **Extended Store** (`src/lib/store.mjs`) — added collections for `investorRecords`, `fundingOutreachEvents`, `fundingRuns`.
3. **Funding API Routes** (`src/server.mjs`) — 7 new endpoints: `POST /funding/investors`, `GET /funding/investors`, `GET /funding/pipeline`, `POST /funding/sequence`, `POST /funding/run`, `GET /funding/runs`, `GET /funding/outreach-events`.
4. **Orchestration Script** (`scripts/orchestrate-blueprints.mjs`) — added API key header support (`SQUIDWEAVE_API_KEY`) and funding run stage per campaign.
5. **Cross-platform Dev Script** (`scripts/dev.mjs`) — replaced Windows-only PowerShell `dev.ps1`.
6. **README + Docs** — fixed stale Windows paths, added funding endpoint docs.
7. **Tests** (`tests/funding-engine.test.mjs`) — 29/29 passing.

### Gaps identified
- No first-class VC funding automation in backend → **resolved** (added funding engine).
- Orchestration script didn't support API-key protected environments → **resolved** (added header).
- Dev script was Windows-only → **resolved** (cross-platform `dev.mjs`).

---

## Session 3 — Full Automation Audit + DNS + CI/CD (May 26)

**Goal:** Audit automation layer, set up production deployment.

### Automation Audit (6 critical gaps found)

| # | Gap | Status |
|---|-----|--------|
| 1 | Data source misalignment — scheduler uses VcSourcingConnector (294 records, no emails) instead of curated seed-investors.json (20 records, has emails) | Partially fixed — data loaded via `/funding/source`, but restart falls back |
| 2 | Email enrichment provider chain bug — `huntWithScrape` short-circuits Hunter/Apollo/guess | Open |
| 3 | Score threshold unreachable — `score >= 0.7` filter but max achievable score is ~0.685 | Open |
| 4 | SMTP not configured (all vars empty) | Fixed — now configured with Gmail SMTP |
| 5 | Duplicate outreach queuing — status never advances from "sourced" | Open |
| 6 | Dual trigger path — scheduler + manual API can cause race conditions | Open |

### Infrastructure Setup
- **DNS migration:** Switched sofish.io nameservers from Porkbun to Cloudflare (christian.ns.cloudflare.com, nia.ns.cloudflare.com). Added CNAMEs pointing to Cloudflare tunnel, MX + SPF records for Porkbun email forwarding.
- **Cloudflare tunnel:** Running as `cloudflared-tunnel-sofish.service` with 3-4 QUIC connections. Tunnel ID: `9471c261-16d4-4d90-8407-bf70c34e436b`. Zone ID: `38cbb488044c21ffbba801eb47cc3603`.
- **Systemd service:** `localeWeave.service` running on port 4010, `Restart=always`.
- **CI/CD:** `.github/workflows/deploy.yml` created — push to master triggers `railway up --service squidweave-api --detach`. `RAILWAY_TOKEN` added as GitHub secret.
- **Root Dockerfile:** Created at `/home/gnul/squidweave/Dockerfile` (Node 22-slim, multi-stage, UI build, port 4010).
- Commit: `65199cc` — Dockerfile + CI/CD workflow.

### Credentials Provided
- Railway deploy token: `REDACTED_RAILWAY_TOKEN` (added as GitHub secret `RAILWAY_TOKEN`).
- SMTP (Gmail): `knol3j@gmail.com` + app password `REDACTED_SMTP_PASS` — verified working, email sent from `admin@sofish.io`.
- Cloudflare API token from cert.pem: `REDACTED_CF_TOKEN`.
- Porkbun API keys for DNS management.

---

## Session 4 — LLM Provider + SMTP + Investor Emails (May 26-27)

**Goal:** Configure LLM backend, fix SMTP, populate investor emails.

### LLM Configuration
- Set `LLM_BASE_URL=https://api.opencode.ai/v1`, `LLM_API_KEY=sk-H9oTKq...X9p`, `LLM_MODEL=deepseek-v4-flash-free` in `.env.local`.
- Verified `LlmProvider.isConfigured()` returns `true`.
- Restarted server — scheduler producing real content via OpenCode API for the first time.

### SMTP Configuration
- Configured `.env.local` with Gmail SMTP (`smtp.gmail.com:587`, `knol3j@gmail.com`, app password).
- `SMTP_FROM_NAME=LocaleWeave`, `SMTP_FROM_EMAIL=knol3j@gmail.com`.
- `SMTP_FROM_EMAIL` set to `knol3j@gmail.com` (not `admin@sofish.io`) because Porkbun email forwarding is receive-only; Gmail SMTP uses the Gmail account's address.
- Test email sent and verified.

### Investor Email Population
- Researched VC partner emails from SEC filings and public sources for all 20 seed investors.
- Populated `data/seed-investors.json` with pattern-guessed emails (firstname@firm domain) at ~0.3 confidence.
- All 20 records now have firstName, lastName, email, domain fields populated.

### Credential Status After This Session
| Adapter | Status |
|---------|--------|
| Telegram | ✅ LIVE |
| Twitter/X | ✅ LIVE |
| Google Ads | ✅ LIVE |
| Meta Ads | ✅ LIVE |
| Email/SMTP | ✅ CONFIGURED (Gmail SMTP) |
| LinkedIn | ❌ SIMULATED (no creds) |
| Hunter.io | ❌ NOT CONFIGURED |
| Apollo.io | ❌ NOT CONFIGURED |
| Calendly/Cal.com | ❌ SIMULATED |

---

## Session 5 — PostgreSQL Migration + UI Fixes (May 27)

**Commits:**
- `3f9be42` — rename browser tab title from 'My Google AI Studio App' to 'SquidWeave'
- `2df0da8` — feat: zero-cost automation pipeline (SMTP, email enrichment, Cal.com, domain backfill)
- `9231c6f` — feat: VC sourcing engine, pattern-guess generation, funding pipeline, biweekly cron
- `5c5a7c6` — Add UI Basic Auth guard + Dockerfile env vars for STATIC_DIR and UI auth
- `65199cc` — Add root Dockerfile for Railway auto-detect + CI/CD GitHub Actions workflow
- `135b02d` — Preserve funding tab during prompt runs
- `ef0e4a2` — Preserve current tab after prompt submission
- `3f9be42` — Add Postgres state backend and deployment safety

### Key Changes
- PostgreSQL state backend added alongside JSON persistence
- Domain backfill script (`scripts/migrate-domains.mjs`) to populate website domains from investor data
- Zero-cost enrichment pipeline: website scraper → pattern guess fallback
- Cal.com adapter for free meeting scheduling
- Biweekly cron for automated enrichment
- UI auth guard (basic auth: admin/squidweave)
- Funding tab persistence across prompt submissions

---

## Current Architecture (as of latest session)

### Project Stats
- **Server:** 2,586 lines (`src/server.mjs`)
- **Engine modules:** 35 files in `src/lib/`
- **Adapters:** 9 files in `src/adapters/`
- **Campaign blueprints:** 6 JSON files in `automation/blueprints/`
- **UI:** React + TypeScript SPA in `ui/src/`
- **Tests:** 29 passing
- **Config:** 22 env vars in `.env.local`

### Pipeline Flow
```
Blueprint → Bootstrap → Enrich → Decision Engine → Content Gen (LLM) → Social Dispatch → Paid Ads → Funding Pipeline → Analytics
```

### Key Config
- **LLM:** OpenCode API (`https://api.opencode.ai/v1`), model `deepseek-v4-flash-free`
- **SMTP:** Gmail (`smtp.gmail.com:587`, `knol3j@gmail.com`)
- **DRY_RUN:** false (production)
- **Port:** 4010
- **Basic Auth:** admin/squidweave

### Remaining Open Issues
1. **Email enrichment short-circuit bug** — `huntWithScrape` blocks Hunter/Apollo/guess from ever running
2. **Score threshold** — `score >= 0.7` filter unreachable (max ~0.685)
3. **Duplicate outreach** — investor status never advances from "sourced"
4. **Dual trigger race** — no idempotency guard on `runCampaign`
5. **LinkedIn** — simulated (no API credentials)
6. **Hunter.io / Apollo.io** — not configured (enrichment limited to scraping + pattern guess)

---

*This summary was generated from session search queries covering all SquidWeave-related conversations.*

*For the full detailed skill with pipeline internals, fix checklists, and credential setup paths, see: `skill_view('squidweave-automation-audit')`*