# SquidWeave Campaign Orchestration

The campaign lifecycle orchestrated by `AutomationEngine` (`src/lib/automation-engine.mjs`). Each campaign flows through: **Scheduler → Sourcing → Decision → Planner → Execution → Memory**.

## Campaign Lifecycle

1. **Schedule**: `Scheduler` reads campaign cron/config, determines when next run fires. Configurable per-campaign cadence.
2. **Source**: `BaseConnector` subclasses (OpenClaw, MoltBot, ClawdBot, etc.) pull raw leads from social platforms. Each connector has `execute(action, context)` returning structured content packs.
3. **Decide**: `DecisionEngine.run(campaignId)` evaluates campaign state, recent events, policy, and memory context, then produces a `Decision` object with `policyResult`, `plan`, `targeting`, `executions`.
4. **Plan**: `Planner.buildActionPlan(campaign, summary, policyResult, memoryContext)` — async LLM-driven via Hermes. Returns `{ recommendedAction, confidence, reasoning }`.
5. **Execute**: Dispatches via `AgentOrchestrator` — resolves agents from `AGENT_DEFINITIONS`, sends tasks to Hermes, tracks runs in store.
6. **Remember**: `MemoryEngine` tracks per-target outreach history, cadence eligibility, engagement scoring, suppression logic.

## Key Flow Dependencies

- `executePipelineForCampaign()` calls `Scheduler → DecisionEngine → AgentOrchestrator` in sequence
- `DecisionEngine.run()` takes `store`, `planner`, `connectors`, `config`, `targetingEngine`, `memoryEngine`
- Connectors resolve by name: `moltbot → openclaw` alias
- Executions are arrays — one per configured connector per campaign

## Decision Object Shape

```js
{ id, campaignId, createdAt, summary, policyResult, plan, targeting, memoryContext, execution, executions[] }
```

## Memory Engine

`MemoryEngine` calculates per-target:
- **nextEligibleAt**: based on last outreach event type + cadence (reply=7d, click=2d, open=2d, default=3d)
- **targetStatus**: `uncontacted | contacted | responded | engaged | suppressed`
- **suppression**: auto-suppress on unsubscribe/bounce events
- **dedupe by email**: targets with same email resolve to single record
