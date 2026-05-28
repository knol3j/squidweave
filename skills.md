# SquidWeave — What We've Built

## Overview
SquidWeave is a localized marketing automation "brain" with a LocaleWeave React control surface. The backend runs at `http://127.0.0.1:4010` and persists state to file (`data/state.json`) or Postgres via `STATE_BACKEND=postgres`.

## Architecture

- `src/` — local backend "brain" for campaign state, analytics ingestion, decisioning, localization, target ranking, memory recall, and automation scheduling
- `ui/` — extracted LocaleWeave UI/UX, rewired to use the local backend instead of Firebase/Gemini as its control plane
- `docs/market-intelligence-2026-05-07.md` — sourced market analysis fed into the brain

## What Works Now

- Create and update campaigns with locale-aware fields
- Ingest external market research as structured `researchRecords`
- Ingest analytics events
- Consolidate episodic memory into `targetProfiles`, `tacticObservations`, and `playbooks`
- Recall past memory before target selection and reengagement
- Rank targets and build reengagement queues from live state
- Run guarded decisioning against real campaign summaries
- Generate localized content packs through LM Studio with deterministic fallback
- Trigger automation manually or on a scheduler
- View the system through the LocaleWeave frontend while using the local backend as the brain
- Funding dashboard wired to the active campaign state

---

## Recent Work (2026)

### Funding / VC Automation Pipeline

**`src/lib/funding-engine.mjs`**
- Imports investor records into a campaign
- Scores investors with weighted factors:
  - `thesisMatch` — 35% weight
  - `stageMatch` — 25% weight
  - `checkSizeMatch` — 20% weight
  - `warmPath` — 20% weight
- Enriches investor emails via Hunter.io / Apollo / pattern-guess fallback
- Uses Serper.dev as a secondary enrichment source
- Orchestrates bulk enrichment, sequence generation, and outreach runs

**`src/lib/source-ingestion-engine.mjs`**
- Dispatches to configurable source connectors (Apollo, Crunchbase, etc.)
- Normalizes raw connector output via `targeting-engine.mjs`
- Converts research records to investor records via `toInvestorRecords()` connector method
- Tracks per-connector reliability scores and latency

**Funding features:**
- `POST /funding/investors` — bulk import investors
- `GET /funding/investors?campaignId=...` — list investors for a campaign
- `GET /funding/pipeline?campaignId=...` — view funding pipeline
- `POST /funding/sequence` — generate outreach sequence
- `POST /funding/run` — execute funding automation
- `GET /funding/runs?campaignId=...` — view automation runs
- `GET /funding/outreach-events?campaignId=...` — view outreach outcomes

### Zero-Cost Automation Pipeline

Built a full automation pipeline with no per-seat cost:
- **SMTP email delivery** — direct mail transfer, no SaaS subscription required
- **Email enrichment** — Hunter.io + Apollo.io + pattern-guess fallback
- **Cal.com scheduling** — Calendly-compatible booking links
- **Domain backfill** — Serper.dev Google Search for missing domains
- **Biweekly cron** — automated VC outreach on a schedule

### Safety & Guard Rails

- `DRY_RUN=true` by default — all connector calls stay safe until explicitly switched on
- `REQUIRE_LIVE_APPROVAL=true` — live automation and funding side effects require explicit approval
- Execution receipts persisted and exposed via `/safety/executions` for approval, dedupe, and audit visibility
- Connector state explicit: `dry-run`, `ready`, `live`, `error`, or `not-configured`

### Infrastructure

- **Postgres state backend** — file fallback, switched via `STATE_BACKEND=postgres` + `DATABASE_URL`
- **Root Dockerfile** — Railway auto-detect deployment
- **CI/CD GitHub Actions workflow** — automated build/push
- **UI Basic Auth guard** — protects the control surface
- **HTTP compression** — enabled on the backend

### Funnel / Messaging Routes (`src/modules/funnel/funnel-routes.mjs`)

- Full funnel CRUD — create, read, update, delete funnels
- Funnel step management — ordered steps per funnel
- Funnel submission tracking — form fills, step completions
- Funnel rendering via `funnel-renderer.mjs`

---

## Backend Endpoints

```
GET  /health
POST /campaigns
POST /analytics/events
GET  /analytics/events?campaignId=...
POST /research/records
GET  /research/records?campaignId=...
POST /outreach/events
GET  /outreach/events?campaignId=...
POST /ingest/outcomes
GET  /targets?campaignId=...
POST /targets/decide
GET  /reengagement?campaignId=...
GET  /connectors/status?probe=true
POST /memory/consolidate
GET  /memory/recall?campaignId=...
GET  /memory/playbooks?campaignId=...
GET  /memory/targets?campaignId=...
POST /decision/run
POST /content/generate
POST /automation/run
POST /automation/start
GET  /safety/executions
POST /funding/investors
GET  /funding/investors?campaignId=...
GET  /funding/pipeline?campaignId=...
POST /funding/sequence
POST /funding/run
GET  /funding/runs?campaignId=...
GET  /funding/outreach-events?campaignId=...
GET  /state
GET  /setup/requirements
```

---

## Running the Project

```bash
npm start           # backend only, port 4010
npm run dev         # backend + Vite UI together, ports 4010 and 3000
npm run automation:smoke   # end-to-end smoke test
```

## Environment Setup

Copy `.env.example` to `.env.local` and populate:
- `OPENCLAW_*` — openclaw connector credentials
- `CLAWDBOT_*` — clawdbot connector credentials
- `STATE_BACKEND=postgres` + `DATABASE_URL` for Postgres persistence

Always validate live connector health before switching out of safe mode:
```bash
curl "http://127.0.0.1:4010/connectors/status?probe=true"
```

---

## Notable Commits

| Commit | Description |
|--------|-------------|
| `d5d9fcd` | fix: sofish.io 502 + UI auth + state corruption |
| `d342e3e` | docs: add consolidated chat history summary across all sessions |
| `135b02d` | Preserve funding tab during prompt runs |
| `ef0e4a2` | Preserve current tab after prompt submission |
| `3f9be42` | Add Postgres state backend and deployment safety |
| `9231c6f` | feat: VC sourcing engine, pattern-guess generation, funding pipeline, biweekly cron |
| `298c8b2` | feat: zero-cost automation pipeline — SMTP, email enrichment, Cal.com, domain backfill |
| `720a329` | Close last 5%: full automation pipeline wired |
| `dd24997` | feat: HTTP compression, funnel/messaging route refactor, adapter wiring, and automation pipeline hardening |
| `142ed94` | Add WorkflowEngine with full API routes and store collections |

---

## Notes

- Firebase and Gemini files remain in the UI tree from the source template, but the active flow is local-first through the autopilot API
- The memory layer only promotes playbooks after repeated outcome evidence; research alone seeds target profiles but does not create trusted tactics
- Campaigns default to dual-rail execution through `openclaw` and `clawdbot`
- The funding dashboard is wired to the active campaign state instead of a fixed demo campaign id