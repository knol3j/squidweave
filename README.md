# SquidWeave

Localized marketing automation brain with a LocaleWeave React control surface.

## Full Documentation

- **[skills.md](skills.md)** — Complete technical inventory: all endpoints, architecture decisions, connectors, and notable commits
- **[docs/index.md](docs/index.md)** — Documentation index with links to all docs

## Architecture

- `src/`: local backend "brain" for campaign state, analytics ingestion, decisioning, localization, target ranking, memory recall, and automation scheduling
- `ui/`: extracted LocaleWeave UI/UX, rewired to use the local backend instead of Firebase/Gemini as its control plane
- State backend: file (`data/state.json`) or Postgres via `STATE_BACKEND=postgres` + `DATABASE_URL`
- `docs/market-intelligence-2026-05-07.md`: sourced market analysis currently fed into the brain

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

## Backend Run

```bash
npm start
```

Backend default: `http://127.0.0.1:4010`

The backend now loads `.env` and `.env.local` automatically from the repo root before reading connector or runtime settings.

Useful endpoints:

- `GET /health`
- `POST /campaigns`
- `POST /analytics/events`
- `GET /analytics/events?campaignId=...`
- `POST /research/records`
- `GET /research/records?campaignId=...`
- `POST /outreach/events`
- `GET /outreach/events?campaignId=...`
- `POST /ingest/outcomes`
- `GET /targets?campaignId=...`
- `POST /targets/decide`
- `GET /reengagement?campaignId=...`
- `GET /connectors/status?probe=true`
- `POST /memory/consolidate`
- `GET /memory/recall?campaignId=...`
- `GET /memory/playbooks?campaignId=...`
- `GET /memory/targets?campaignId=...`
- `POST /decision/run`
- `POST /content/generate`
- `POST /automation/run`
- `POST /automation/start`
- `GET /safety/executions`
- `POST /funding/investors`
- `GET /funding/investors?campaignId=...`
- `GET /funding/pipeline?campaignId=...`
- `POST /funding/sequence`
- `POST /funding/run`
- `GET /funding/runs?campaignId=...`
- `GET /funding/runs/:runId`
- `GET /funding/outreach-events?campaignId=...`
- `GET /dlq`
- `DELETE /dlq/:entryId/retry`
- `DELETE /safety/executions/:receiptId`
- `GET /dedupe/check?key=...`
- `GET /state`

## UI Run

Install dependencies once:

```bash
cd ui
npm install
```

Run the UI:

```bash
cd ui
npm run dev
```

UI default: `http://127.0.0.1:3000`

Optional env:

```bash
VITE_BRAIN_API_BASE=http://127.0.0.1:4010
```

## Full Local Launch

Run both the backend and the Vite UI together from the repo root:

```bash
npm run dev
```

Expected local URLs:

- backend: `http://127.0.0.1:4010`
- ui: `http://127.0.0.1:3000`

Before switching connectors out of safe mode:

1. Populate `.env` or `.env.local` with `OPENCLAW_*` and `CLAWDBOT_*`.
2. Set `DRY_RUN=false` only after `GET /connectors/status?probe=true` returns healthy live connector status.
3. If you want runtime overrides without editing files, use `POST /connectors/:name/config`.
4. Keep `REQUIRE_LIVE_APPROVAL=true` if you want live automation and funding side effects to require explicit approval.

## Root Scripts

```bash
npm run dev
npm start
npm test
npm run ui:dev
npm run ui:build
npm run ui:lint
npm run automation:smoke
```

`npm test` runs only the `tests/` suite and excludes operational scripts.

## One-command Automation Validation

Run a realistic end-to-end automation check (health, campaign creation, free-source ingestion, prompt autopilot run, and datastore verification):

```bash
npm run automation:smoke
```

Optional env:

```bash
SQUIDWEAVE_BASE_URL=http://127.0.0.1:4010
SQUIDWEAVE_API_KEY=... # only if your server enforces x-api-key
```

## Setup Files

- Copy `.env.example` into your real environment configuration and populate only the values you actually have.
- Use `docs/integration-blueprint.md` for required env vars, accepted event types, and upstream system mapping.
- Query `GET /setup/requirements` if you want the same setup contract programmatically.

## Example Campaign

```bash
curl -X POST http://127.0.0.1:4010/campaigns \
  -H "content-type: application/json" \
  -d "{\"id\":\"main-campaign\",\"name\":\"Global SaaS Expansion\",\"channel\":\"email\",\"objective\":\"Book more demos in Germany and Brazil\",\"locales\":[\"en-US\",\"de-DE\",\"pt-BR\"],\"audience\":\"Revenue leaders at mid-market SaaS companies\",\"offer\":\"Book a 20 minute pipeline audit\",\"automationEnabled\":true}"
```

Run automation:

```bash
curl -X POST http://127.0.0.1:4010/automation/run \
  -H "content-type: application/json" \
  -d "{\"campaignId\":\"main-campaign\"}"
```

Ingest real outreach and analytics outcomes:

```bash
curl -X POST http://127.0.0.1:4010/ingest/outcomes \
  -H "content-type: application/json" \
  -d "{\"campaignId\":\"main-campaign\",\"outreachEvents\":[{\"targetId\":\"segment-dach-b2b-tech-trust-video\",\"type\":\"sent\",\"channel\":\"linkedin\",\"timestamp\":\"2026-05-07T18:00:00.000Z\"},{\"targetId\":\"segment-dach-b2b-tech-trust-video\",\"type\":\"open\",\"channel\":\"linkedin\",\"timestamp\":\"2026-05-08T09:30:00.000Z\"}],\"analyticsEvents\":[{\"type\":\"impression\",\"value\":1200,\"timestamp\":\"2026-05-08T10:00:00.000Z\"},{\"type\":\"click\",\"value\":41,\"timestamp\":\"2026-05-08T10:00:00.000Z\"}]}"
```

Check connector readiness:

```bash
curl "http://127.0.0.1:4010/connectors/status?probe=true"
```

## Notes

- Connector calls stay safe by default with `DRY_RUN=true`.
- Execution receipts are persisted and exposed via `/safety/executions` for approval, dedupe, and audit visibility.
- Live side effects are gated when `DRY_RUN=false` and `REQUIRE_LIVE_APPROVAL=true`.
- Connector state is explicit: `dry-run`, `ready`, `live`, `error`, or `not-configured`.
- Campaigns now default to dual-rail execution through `openclaw` and `clawdbot`.
- The UI now uses the backend for campaign persistence and generated localized assets.
- The funding dashboard is wired to the active campaign state instead of a fixed demo campaign id.
- The memory layer only promotes playbooks after repeated outcome evidence; research alone seeds target profiles but does not create trusted tactics.
- Firebase and Gemini files remain in the UI tree from the source template, but the active flow is local-first through the autopilot API.
