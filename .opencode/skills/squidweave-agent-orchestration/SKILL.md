# SquidWeave Agent Orchestration

The 25-agent system defined in `agent-system.mjs` and orchestrated by `AgentOrchestrator` in `agent-orchestrator.mjs`.

## Agent Catalog (`AGENT_DEFINITIONS`)

25 agents across 10 stages:

| Stage | Agents |
|-------|--------|
| Intake | ClientIntake |
| Strategy | OfferArchitect, BrandStrategist |
| Design | CreativeDirector, LandingPageArchitect |
| Research | AudienceResearch, IntentMiner, DataEnrichment, SegmentScorer |
| Planning | ChannelPlanner, ListHygiene |
| Outreach | Copywriter, Personalization, OutboundOrchestrator |
| Acquisition | SeoMapper, AdOperator, SocialPublisher |
| Sales | SalesHandoff, PipelineManager |
| Retention | OnboardingGuide, RetentionOperator, ExpansionPlanner |
| Measurement | AnalyticsWatch, ExperimentLab |
| Governance | ComplianceSentinel |

## AgentOrchestrator (`src/lib/agent-orchestrator.mjs`)

- **`resolveAgent(agentId)`** — resolves agent ID from `AGENT_DEFINITIONS`, returns agent descriptor with `{ id, stage, outcome }`
- **`dispatchTask(agentId, context)`** — sends task to Hermes (LLM backend), returns `{ agentId, result, tokensUsed, durationMs, timestamp }`
- **`runCampaignAgents(campaignId, stages)`** — runs all agents for given stages in sequence, accumulating context
- **`getAgentRuns(campaignId)`** — queries store for recent agent runs
- **Hermes endpoint** defaults to `http://localhost:3001/api/chat`

## Execution Model

1. Orchestrator receives `campaignId` + optional `stages[]` filter
2. For each stage, iterates matching agents
3. Each agent receives accumulated campaign context (summary, memory, content packs)
4. Agent returns structured result → appended to context for next agent
5. Full run log stored via `store.addAgentRun()`

## Agent Result Shape

```js
{ agentId, tokenCount?, durationMs?, output?, error?, metadata?, timestamp }
```
