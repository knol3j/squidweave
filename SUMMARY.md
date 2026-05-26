# SquidWeave — Project Summary

> Last updated: 2026-05-25

## What Is This

A **multi-agent marketing orchestration engine** that finds relevant B2B conversations (Reddit, etc.), analyzes opportunities, generates targeted outreach, and automates the full outreach lifecycle. It speaks to an agent-bridge backend (Hermes) that actually runs the LLM agents.

## Architecture

```
┌──────────────┐     HTTP/JSON      ┌─────────────────────┐
│  Connectors  │ ◄──────────────►   │    SquidWeave       │
│  (OpenClaw,  │                    │  (Node.js server)   │
│   MoltBot,   │                    │                     │
│   Clawdbot)  │                    │  ┌───────────────┐  │
└──────┬───────┘                    │  │  Automation   │  │
       │                            │  │  Engine       │  │
       ▼ scraped leads              │  │  Scheduler    │  │
┌──────────────┐                    │  │  DecisionEng  │  │
│  Store       │                    │  │  Planners     │  │
│  (JSON file) │                    │  │  MemoryEng    │  │
└──────────────┘                    │  │  AgentOrch.   │  │
       │                            │  │  ContactSrc   │  │
       ▼                            │  │  GhlBridge    │  │
┌──────────────┐     HTTP/JSON      │  └───────────────┘  │
│  Hermes      │ ◄──────────────►   └─────────────────────┘
│  Agent API   │
└──────────────┘
```

## Files & Purpose

| File | Purpose |
|---|---|
| `src/server.mjs` | HTTP server, routes, request dispatch |
| `src/config.mjs` | All config merged from `.env` defaults |
| `src/store.mjs` | In-memory + JSON file persistence (leads, targets, campaigns, etc.) |
| `src/automation/engine.mjs` | Orchestrator — selects tactic, picks targets, hands to planner |
| `src/automation/scheduler.mjs` | Interval-based tick engine (every 120s by default) |
| `src/automation/decision.mjs` | Scores tactics per campaign, decides what to execute |
| `src/automation/planner.mjs` | Builds outreach plans from tactic+target |
| `src/automation/memory.mjs` | Per-campaign long-term context (observations, playbooks, consolidations) |
| `src/automation/orchestrator.mjs` | Dispatches agent calls to Hermes |
| `src/automation/contact-sourcing.mjs` | Pipeline: fetch leads → enrich across connectors → qualify → produce targets |
| `src/connectors/*.mjs` | Connector wrappers (OpenClaw, MoltBot, Clawdbot) for fetching leads/threads |
| `src/integrations/ghl-bridge.mjs` | GHL (GoHighLevel) webhook ingestion & API sync for contacts/opportunities/notes |
| `data/` | JSON files: store, seed data |
| `static/` | Served at `/` |

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/state` | Full system state snapshot |
| GET | `/campaigns` | List all campaigns |
| POST | `/campaigns` | Create campaign |
| GET | `/campaigns/:id` | Campaign detail |
| PATCH | `/campaigns/:id` | Update campaign |
| POST | `/campaigns/:id/activate` | Start automation loop |
| POST | `/campaigns/:id/stop` | Stop automation loop |
| GET | `/campaigns/:id/tactic-scores` | Decision engine scores per tactic |
| POST | `/campaigns/:id/decide` | Force re-decision |
| POST | `/campaigns/:id/plan` | Build outreach plan |
| POST | `/campaigns/:id/execute` | Execute next step in plan |
| POST | `/campaigns/:id/run-contact-pipeline` | Run contact sourcing pipeline |
| POST | `/campaigns/:id/analyze-threads` | Feed threads → Hermes for signal extraction |
| GET | `/campaigns/:id/targets` | List targets |
| GET | `/campaigns/:id/outreach` | List outreach records |
| POST | `/campaigns/:id/outreach/:step/approve` | Approve draft outreach |
| POST | `/campaigns/:id/outreach/:step/send` | Send approved outreach |
| GET | `/campaigns/:id/memory` | Campaign memory |
| POST | `/campaigns/:id/memory/consolidate` | Force memory consolidation |
| GET | `/campaigns/:id/memory/tactic-observations` | Tactic observations |
| POST | `/campaigns/:id/memory/reflect` | Trigger tactical reflection |
| POST | `/jobs/:id/status` | Job status (Hermes delegation) |
| POST | `/jobs/:id/stream` | Job stream (SSE) |
| GET | `/connectors` | List configured connectors |
| POST | `/connectors/:name/pull` | Pull threads from a connector |
| POST | `/integrations/ghl/webhook` | GHL webhook receiver (ContactCreate/Update, Opportunity, Conversation, CampaignLog) |
| POST | `/integrations/ghl/sync/contacts` | Pull contacts from GHL API |
| POST | `/integrations/ghl/sync/opportunities` | Pull opportunities from GHL API |

## What's New (2026-05-25)

### GHL Bridge (`src/integrations/ghl-bridge.mjs`)

A full integration with GoHighLevel that:

**Webhook ingestion:**
- `ContactCreate` / `ContactUpdate` — upserts targets, optionally syncs notes
- `OpportunityCreate` / `OpportunityUpdate` — tracks deal-stage, attaches as campaign memory
- `ConversationCreate` / `ConversationUpdate` — logs messages into campaign memory as observations
- `CampaignLog` — generic campaign log events

**API pull (for backfill / initial sync):**
- `pullContacts()` — fetches from `GET /contacts/lookup` or `GET /contacts/search`
- `pullOpportunities()` — fetches from `GET /opportunities/search`
- Both upsert results as targets / memory

**Routing logic:**
- New contacts go through the **contact sourcing pipeline** (dedup, enrichment, qualification)
- Known contacts bypass sourcing and are directly upserted as targets
- Notes from GHL are optionally synced to the SquidWeave target
- Opportunities are stored as structured memory observations
- Conversations are stored as tactic observations

**Configuration (`.env`):**
```
GHL_API_KEY=                 # Required for API pull
GHL_LOCATION_ID=             # Required for API pull
GHL_WEBHOOK_SECRET=          # Optional — HMAC-SHA256 signature verification
GHL_DEFAULT_CAMPAIGN_ID=     # Default campaign for new GHL contacts
```

**Why this matters:** SquidWeave can now ingest leads directly from GHL via webhooks (zero latency) or API pull (batch), bi-directionally syncing deal stages, messages, and notes. This replaces the need for a separate sync service.

## Connectors

| Connector | What it does |
|---|---|
| `openclaw` | Scrapes Reddit (targeted subreddits, keyword search, Google search → Reddit) |
| `clawdbot` | Scrapes Twitter/X (keyword search, author search) |
| `moltbot` | Google search → scrape blog/comment sections for mentions |

## Automation Flow (per campaign)

```
                 ┌─────────────────────┐
                 │  Scheduler ticks    │
                 │  (every 120s)       │
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │ 1. Fetch new leads  │◄── connectors pull threads
                 │    from connectors  │
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │ 2. Contact Sourcing │── enrich across connectors
                 │    (dedup/score)    │── qualify → produce targets
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │ 3. Decision Engine  │── score each tactic
                 │    picks tactic     │── pick best tactic
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │ 4. Planner builds   │── pick targets
                 │    outreach plan    │── generate messages via Hermes
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │ 5. Execute plan     │── send outreach
                 │    (via agent)      │── track responses
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │ 6. Memory update    │── store results
                 │    + consolidation  │── tactic reflection
                 └─────────────────────┘
```

GHL bridge can inject contacts at step 2 (webhooks go through sourcing pipeline for new contacts or directly upsert for known ones, bypassing the connector fetch step).
