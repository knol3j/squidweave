# SquidWeave Security Audit

**Date:** 2026-10-11
**Scope:** `knol3j/squidweave` (frontend UI + backend API + worker automation)
**Auditor:** Kimi Code CLI
**Method:** GitHub Dependabot API review, local `npm audit`, lockfile analysis, build/test verification, production deployment verification

## Executive Summary

- **GitHub Dependabot (stale scan):** 121 open alerts (1 critical, 67 high, 43 medium, 10 low)
- **Local `npm audit` after fixes:** 0 vulnerabilities in both root and `ui`
- **Production status:** API online, GitHub Pages site serving, Hermes worker running autonomously via system cron
- **Result:** All patchable npm vulnerabilities in the lockfiles have been resolved. The remaining GitHub count is stale and will drop on the next Dependabot scan.

## Changes Applied

### Root `package-lock.json`
Added `overrides` in `package.json` to force patched versions of transitive dependencies pulled in by `electron-builder` and `node-gyp`:

- `tar` → `^7.5.21` (fixes critical CVE-2026-59873)
- `builder-util-runtime` → `^9.7.0`
- `brace-expansion` → `^5.0.12`
- `@electron/get` → `^4.0.4`

Regenerated the root lockfile. Verified versions:

| Package | Installed | Required |
|---|---|---|
| `@xmldom/xmldom` | 0.8.15 | >= 0.8.15 |
| `brace-expansion` | 5.0.12 | >= 5.0.12 |
| `electron` | 41.10.7 | >= 41.10.6 |
| `fast-uri` | 3.1.8 | >= 3.1.8 |
| `form-data` | 4.0.6 | >= 4.0.6 |
| `js-yaml` | 4.3.2 | >= 4.3.2 |
| `tar` | 7.5.22 | >= 7.5.21 |
| `undici` | 6.29.0 | >= 6.28.1 |

### UI `package-lock.json`
Migrated the UI from Tailwind CSS v3 to v4 to eliminate the `braces` transitive vulnerability chain:

- Removed `tailwindcss-animate`, `autoprefixer`, and `postcss`
- Added `@tailwindcss/vite` and updated `vite.config.ts`
- Replaced `tailwind.config.js` and `postcss.config.js` with CSS-native `@theme` configuration in `src/index.css`
- Added an override for `postcss-selector-parser` → `^7.1.6` before the full migration

Verified versions after migration:

| Package | Installed | Required |
|---|---|---|
| `@babel/core` | 7.29.7 | >= 7.29.6 |
| `@babel/plugin-transform-modules-systemjs` | 7.29.8 | >= 7.29.4 |
| `@humanfs/node` | 0.16.8 | >= 0.16.8 |
| `baseline-browser-mapping` | 2.11.28 | >= 2.11.0 |
| `browserslist` | 4.29.3 | >= 4.28.7 |
| `flatted` | 3.4.4 | >= 3.4.2 |
| `lodash` | 4.18.1 | >= 4.17.23 |
| `minimatch` | 3.1.5 | >= 3.1.3 |
| `nanoid` | 3.3.20 | >= 3.3.12 |
| `picomatch` | 2.3.2 | >= 2.3.2 |
| `postcss` | 8.5.29 | >= 8.5.23 |
| `postcss-selector-parser` | 7.1.6 | >= 7.1.6 |
| `react-router` | 7.18.4 | >= 7.18.2 |
| `rollup` | 4.64.5 | >= 4.59.0 |
| `source-map-js` | 1.2.2 | >= 1.2.2 |
| `vite` | 7.3.7 | >= 7.3.5 |

### Worker Automation
Replaced the unreliable Hermes built-in cron scheduler with the container's system `cron` daemon:

- `deploy/railway/worker/Dockerfile`: installs `cron`
- `deploy/railway/worker/start.sh`: generates per-role wrappers, installs a crontab, starts `cron`, then `exec hermes gateway run`
- Fixed UI dev dependency install with `--include=dev` so the site agent can run `npm run ui:build`

Verified agents are firing on schedule and logging to Railway:

- `hermes-site` builds UI successfully (`exitCode: 0`)
- `hermes-health` reports API healthy and site reachable

## Verification Commands

```bash
# Root dependencies
npm audit --audit-level=low
# found 0 vulnerabilities

# UI dependencies
cd ui && npm audit --audit-level=low
# found 0 vulnerabilities

# Server syntax
node --check src/server.mjs

# Test suite
npm test
# 107 passing

# UI production build
cd ui && npm run build
# builds successfully
```

## GitHub Dependabot Note

GitHub still displays 121 open Dependabot alerts because Dependabot has not rescanned the repository since the lockfile changes were pushed. Dependabot runs on its own schedule; the next scan will close the alerts for packages that are now patched. Local verification (`npm audit`) and lockfile inspection confirm the underlying vulnerabilities are resolved.

## Remaining Risk Items

1. **Hermes Nous OAuth refresh token** is expired in the worker (`invalid_grant`). This only affects Hermes LLM/auxiliary features, not the SquidWeave agents or Telegram gateway. Re-authenticate with `hermes model` if you want LLM features enabled.
2. **One external data source** remains unhealthy (`sources {"total":7,"healthy":6}`). This is a data-source availability issue, not a dependency vulnerability.
3. **Deprecated packages** reported by npm (e.g., `recharts@2.15.4`, `eslint@9.39.5`) are not security vulnerabilities but should be upgraded in future maintenance.

## Deployment Status

| Service | Status | Notes |
|---|---|---|
| `squidweave-api` | Online | https://squidweave-api-production.up.railway.app |
| `hermes-telegram-worker` | Online | System cron firing, Telegram gateway connected |
| GitHub Pages site | Online | https://knol3j.github.io/squidweave/ |
| Legacy `clawdbot-*` services | Offline/Failed | Replaced by Hermes agents |
