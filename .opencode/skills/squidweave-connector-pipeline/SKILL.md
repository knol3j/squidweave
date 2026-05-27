# SquidWeave Connector Pipeline

Lead sourcing connectors at `src/connectors/`. Each extends `BaseConnector` and implements `execute(action, context)` which returns structured content packs.

## Active Connectors

| File | Source | Protocol |
|------|--------|----------|
| `openclaw.mjs` | OpenAI API (ChatGPT) | REST + SSE streaming |
| `moltbot.mjs` | Reddit | REST API (alias → openclaw for execution) |
| `clawdbot.mjs` | Twitter/X | REST API v2 |
| `free-sources.mjs` | Google, news, RSS | Web scraping + APIs |
| `base.mjs` | Base class | Defines interface |

## Connector Interface (`BaseConnector`)

```js
class BaseConnector {
  constructor(config)        // receives named config section
  async execute(action, context)  // returns content pack
  async healthCheck()        // returns { ok, latency }
  destroy()                  // cleanup
}
```

The `context` object passed to `execute()`:
```js
{
  campaign,          // full campaign config
  summary,           // CampaignSummary
  targeting,         // TargetingDecision
  memoryContext,     // MemoryEngine decision context
  latestContentPack, // previous content pack
  recentAgentRuns    // last 12 agent executions
}
```

## Content Pack Shape

Each connector returns content as resolved by `applySpec(contentSpec, rawData)` from `src/lib/query-utils.mjs`:
```js
{ id, type, source, items: [], metadata: {}, raw?, errors? }
```

## Resolution Logic

- Connector names resolve in `DecisionEngine`: `moltbot → openclaw` (alias)
- Campaigns specify `connectors[]` array — execution loops over all configured
- Free sources aggregate Google search, news, RSS in single connector
