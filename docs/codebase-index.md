# Codebase Index

## Runtime Surfaces

- `src/server.mjs`: HTTP API, connector bootstrapping, campaign CRUD, ingestion routes, automation routes, scheduler controls
- `src/lib/automation-engine.mjs`: automation orchestration, localized content generation, automation run persistence
- `src/lib/decision-engine.mjs`: policy evaluation, planner call, target selection, connector execution
- `src/lib/memory-engine.mjs`: target profile consolidation, tactic observations, playbook promotion, recall context
- `src/lib/targeting-engine.mjs`: ranking, suppression, reengagement queue construction
- `src/connectors/openclaw.mjs`: primary Open Claw execution rail
- `src/connectors/clawdbot.mjs`: ClawDBot execution rail
- `ui/src/components/BrainDashboard.tsx`: state overview, connector setup, scheduler visibility, run trigger
- `ui/src/components/ChatPanel.tsx`: operator prompt entry that persists campaign state and triggers automation
- `ui/src/components/CampaignPreview.tsx`: output preview driven by persisted messages and backend research records
- `ui/src/components/AudienceInsight.tsx`: persona view derived from backend target profiles
- `ui/src/components/ABTestingPanel.tsx`: variation lab derived from generated content packs and telemetry
- `ui/src/components/Performance.tsx`: analytics and decision summary view derived from persisted metrics

## Automation Flow

1. UI updates `campaignState` through `POST /campaigns`.
2. Operator actions call `POST /automation/run`.
3. `AutomationEngine` consolidates memory and calls `DecisionEngine`.
4. `DecisionEngine` builds plan + targeting and executes across campaign connector rails.
5. Connector responses, decisions, content packs, and automation runs persist into `data/state.json`.
6. UI tabs repoll backend state and render only persisted live data.

## Connector Model

- Primary rails: `openclaw`, `clawdbot`
- Legacy alias: `moltbot` resolves to `openclaw`
- Campaigns can specify `connectors: ["openclaw", "clawdbot"]` for dual-rail execution
