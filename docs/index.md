# SquidWeave Documentation

## Index

| Document | Description |
|----------|-------------|
| [README](README.md) | Project overview, setup, and quick start |
| [skills.md](../skills.md) | Complete technical inventory — what we've built, endpoints, architecture decisions, and notable commits |
| [automation-design-playbook.md](automation-design-playbook.md) | Automation engine design, scheduling, and safety rails |
| [codebase-index.md](codebase-index.md) | Full source file map and responsibilities |
| [integration-blueprint.md](integration-blueprint.md) | Connector wiring and adapter reference |
| [market-intelligence-2026-05-07.md](market-intelligence-2026-05-07.md) | Market research fed into the brain |
| [squid-fork-notes.md](squid-fork-notes.md) | LocaleWeave → SquidWeave fork history |
| [chat-history-summary.md](chat-history-summary.md) | Cross-session development narrative |

## Quick Links

- **Backend**: `http://127.0.0.1:4010`
- **UI**: `http://127.0.0.1:3000`
- **Full local run**: `npm run dev`
- **Smoke test**: `npm run automation:smoke`

## Key Capabilities

| Domain | File | Notes |
|--------|------|-------|
| Funding / VC automation | `src/lib/funding-engine.mjs` | Investor scoring, enrichment, sequence generation |
| Postgres state backend | `src/lib/state-backend.mjs` | Advisory locks, WAL semantics, pool config |
| Automation scheduler | `src/lib/scheduler.mjs` | Biweekly cron, execution guard, phase sequencing |
| Memory engine | `src/lib/memory-engine.mjs` | Episodic consolidation, playbook promotion |
| DLQ support | `src/lib/store.mjs` | `addDlqEntry`, `listDlqEntries`, `popDlqEntry` |
| Execution guard | `src/lib/execution-guard.mjs` | Idempotency, batch limits, concurrent limits |
| Retry policy | `src/lib/retry-policy.mjs` | Exponential backoff + jitter |
| Funding deck engine | `src/lib/funding-deck-engine.mjs` | Shareable deck URLs, outreach dispatch |
| Source ingestion | `src/lib/source-ingestion-engine.mjs` | Multi-connector dispatch, reliability tracking |