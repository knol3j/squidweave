# Codebase Index (current)

## Scope
- Root runtime: Node API (`src/server.mjs`) + Vite UI (`ui/`) + orchestration scripts (`scripts/`)
- Persistent state: `data/state.json`
- Automation assets: `automation/blueprints/*.json`

## Runtime Surfaces
- `src/server.mjs`: API routes, auth/CORS, scheduler, job stream, connector config
- `src/lib/automation-engine.mjs`: marketing automation run execution
- `src/lib/funding-engine.mjs`: VC pipeline scoring + sequencing + funding run orchestration
- `src/lib/decision-engine.mjs`: policy + targeting + connector execution
- `src/lib/memory-engine.mjs`: memory consolidation and recall
- `src/lib/targeting-engine.mjs`: target ranking/reengagement
- `src/lib/store.mjs`: JSON-backed datastore and collection methods
- `src/lib/agent-orchestrator.mjs`: lifecycle agent execution summaries

## Major API Groups
- Core: `/health`, `/state`, `/setup/requirements`
- Campaign: `/campaigns`
- Marketing ingestion: `/analytics/events`, `/research/records`, `/outreach/events`, `/ingest/outcomes`
- Marketing automation: `/decision/run`, `/content/generate`, `/automation/run`, `/automation/start`, `/automation/stop`
- Prospecting: `/prospecting/*`, `/prospects/*`
- Funding automation:
  - `POST /funding/investors`
  - `GET /funding/investors?campaignId=...`
  - `GET /funding/pipeline?campaignId=...`
  - `POST /funding/sequence`
  - `POST /funding/run`
  - `GET /funding/runs?campaignId=...`
  - `GET /funding/outreach-events?campaignId=...`

## Scripts
- `npm run dev`: cross-platform backend+frontend dev launcher (`scripts/dev.mjs`)
- `npm run automation:orchestrate`: bootstrap + enrich + sequence + funding-run per blueprint
- `npm run automation:enrich`: enrich/sequence/funding run cycle without bootstrap

## Codebase Shape (functional)
- Backend source modules: 26 (`src/**/*.mjs`)
- UI source files: 20 (`ui/src/**/*`)
- Node tests: 11 test files, 27 passing tests

## Incomplete parts found and status
1) VC workflow missing from backend automation
- Status: resolved by adding `funding-engine` and funding endpoints/routes.

2) Orchestrator script failed against API-key protected server
- Status: resolved by injecting `x-api-key` header when `SQUIDWEAVE_API_KEY` is set.

3) Dev script was Windows-only (`powershell dev.ps1`)
- Status: resolved with cross-platform `scripts/dev.mjs` + `package.json` script update.

4) README had stale absolute Windows paths
- Status: resolved with portable relative paths and funding endpoints section.

## Remaining gaps (next pass)
- UI does not yet expose first-class funding dashboard controls (API exists, UI wiring pending).
- No dedicated tests yet for `funding-engine.mjs` and funding routes.
- State growth management is still JSON-file based; DB migration may be needed at scale.
