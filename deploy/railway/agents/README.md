# Clawdbot Railway agents

This directory defines one reusable Railway image for autonomous SquidWeave monitoring. Run multiple services from the same Dockerfile with different `CLAWDBOT_ROLE` values.

Recommended services:

| Service | Role | Purpose |
| --- | --- | --- |
| `clawdbot-health` | `health` | Checks SquidWeave API health, source health, and the GitHub Pages site asset path. |
| `clawdbot-automation` | `automation` | Runs `scripts/orchestrate-blueprints.mjs` on a schedule against the production API. |
| `clawdbot-ci` | `ci` | Watches GitHub Actions deploy/CI runs and can rerun failed jobs if enabled. |
| `clawdbot-audit` | `audit` | Audits Pages config, repo metadata, and Dependabot alerts when `GITHUB_TOKEN` is set. |

Required variables:

- `SQUIDWEAVE_API_BASE_URL`: Railway private API URL, for example `http://squidweave-api.railway.internal:4010`
- `SQUIDWEAVE_AUTH_TOKEN`: must match the API service token
- `SQUIDWEAVE_SITE_URL`: usually `https://knol3j.github.io/squidweave/`
- `GITHUB_REPOSITORY`: `knol3j/squidweave`
- `CLAWDBOT_ROLE`: one of `health`, `automation`, `ci`, `audit`, `supervisor`
- `CLAWDBOT_NAME`: stable service/agent name

Optional variables:

- `GITHUB_TOKEN`: enables Dependabot alert checks and authenticated GitHub API limits
- `CLAWDBOT_RERUN_FAILED=true`: allows the CI agent to rerun failed GitHub Actions jobs
- `CLAWDBOT_AUTOMATION_ARGS`: defaults to `--enrich-only`; use `--funding-only` or an empty value for full orchestration
- `CLAWDBOT_INTERVAL_SECONDS`: loop interval

Railway CLI sketch:

```bash
railway link
railway add --service clawdbot-health --variables "SQUIDWEAVE_PROCESS=agent" --variables "CLAWDBOT_ROLE=health" --variables "CLAWDBOT_NAME=clawdbot-health" --variables "CLAWDBOT_INTERVAL_SECONDS=60"
railway up --service clawdbot-health deploy/railway/agents --path-as-root --detach
```

Repeat for `clawdbot-automation`, `clawdbot-ci`, and `clawdbot-audit` with their role-specific variables.

The root Dockerfile is service-selectable via `SQUIDWEAVE_PROCESS=agent`. The agent Dockerfile is intentionally standalone and clones the current repo during the Railway build so CLI uploads stay small.
