#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROLE = process.env.CLAWDBOT_ROLE || 'supervisor';
const AGENT_NAME = process.env.CLAWDBOT_NAME || `clawdbot-${ROLE}`;
const ONCE = process.env.CLAWDBOT_ONCE === 'true';
const INTERVAL_SECONDS = Number(process.env.CLAWDBOT_INTERVAL_SECONDS || defaultInterval(ROLE));
const API_BASE = normalizeBase(process.env.SQUIDWEAVE_API_BASE_URL || process.env.SQUIDWEAVE_API_BASE || 'http://127.0.0.1:4010');
const API_KEY = process.env.SQUIDWEAVE_API_KEY || process.env.SQUIDWEAVE_AUTH_TOKEN || '';
const SITE_URL = process.env.SQUIDWEAVE_SITE_URL || 'https://knol3j.github.io/squidweave/';
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'knol3j/squidweave';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const TELEGRAM_ALERT_LEVELS = new Set((process.env.TELEGRAM_ALERT_LEVELS || 'error')
  .split(',')
  .map(value => value.trim().toLowerCase())
  .filter(Boolean));
const AUTOMATION_ARGS = normalizeArgs(process.env.CLAWDBOT_AUTOMATION_ARGS || defaultAutomationArgs(ROLE));
const COMMAND_TIMEOUT_MS = Number(process.env.CLAWDBOT_COMMAND_TIMEOUT_MS || 15 * 60 * 1000);
const REQUEST_TIMEOUT_MS = Number(process.env.CLAWDBOT_REQUEST_TIMEOUT_MS || 30000);
const CAMPAIGN_LIMIT = Number(process.env.CLAWDBOT_CAMPAIGN_LIMIT || 8);
const SOURCE_LIMIT = Number(process.env.CLAWDBOT_SOURCE_LIMIT || 8);
const PROSPECT_LIMIT = Number(process.env.CLAWDBOT_PROSPECT_LIMIT || 24);
const ENRICH_LIMIT = Number(process.env.CLAWDBOT_ENRICH_LIMIT || 24);
const SEQUENCE_LIMIT = Number(process.env.CLAWDBOT_SEQUENCE_LIMIT || 24);
const DISPATCH_OUTREACH = process.env.CLAWDBOT_DISPATCH === 'true';
const LOCAL_SCRAPE = process.env.CLAWDBOT_LOCAL_SCRAPE === 'true';
const BACKEND_TEST_ARGS = normalizeArgs(process.env.CLAWDBOT_BACKEND_TEST_ARGS || '--test tests/prospect-activation-engine.test.mjs tests/agent-orchestrator.test.mjs tests/automation-engine.test.mjs');

const rolePlan = {
  supervisor: [checkHealth, checkSiteFunction, checkBackendBuild, checkGithubRuns, checkRepoAudit, runSourceScraping, runProfileCompletion, runDataRefinement, runOutreachReadiness, runFunding, runReporting],
  health: [checkHealth],
  site: [checkSiteFunction],
  backend: [checkBackendBuild, checkGithubRuns],
  automation: [runAutomation],
  bootstrap: [runBootstrap],
  enrichment: [runEnrichment],
  scraper: [runSourceScraping],
  profile: [runProfileCompletion],
  refine: [runDataRefinement],
  outreach: [runOutreachReadiness],
  reporting: [runReporting],
  funding: [runFunding],
  ci: [checkGithubRuns],
  audit: [checkRepoAudit],
};

function defaultInterval(role) {
  return {
    health: 60,
    site: 120,
    backend: 300,
    ci: 180,
    audit: 900,
    automation: 1800,
    bootstrap: 21600,
    enrichment: 1800,
    scraper: 1800,
    profile: 900,
    refine: 1200,
    outreach: 1800,
    reporting: 900,
    funding: 7200,
    supervisor: 300,
  }[role] || 300;
}

function defaultAutomationArgs(role) {
  return {
    automation: '',
    bootstrap: '--bootstrap-only',
    enrichment: '--enrich-only --skip-funding',
    funding: '--funding-only',
  }[role] || '';
}

function normalizeArgs(value) {
  return value
    .split(/\s+/)
    .filter(arg => arg && arg !== '--full');
}

function normalizeBase(value) {
  return value.replace(/\/+$/, '');
}

function log(level, event, fields = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    agent: AGENT_NAME,
    role: ROLE,
    event,
    ...fields,
  };
  console.log(JSON.stringify(entry));
  if (shouldAlert(level, event)) {
    void sendTelegramAlert(entry).catch(error => {
      console.error(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        agent: AGENT_NAME,
        role: ROLE,
        event: 'telegram.alert_failed',
        error: error.message,
      }));
    });
  }
  return entry;
}

function shouldAlert(level, event) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return false;
  }
  if (event === 'telegram.alert_failed') {
    return false;
  }
  return TELEGRAM_ALERT_LEVELS.has(String(level).toLowerCase());
}

async function sendTelegramAlert(entry) {
  const text = [
    `[${entry.level.toUpperCase()}] ${entry.agent}`,
    `role: ${entry.role}`,
    `event: ${entry.event}`,
    entry.error ? `error: ${entry.error}` : '',
    entry.status ? `status: ${entry.status}` : '',
    entry.failing?.length ? `failing: ${entry.failing.length}` : '',
  ].filter(Boolean).join('\n').slice(0, 3500);
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!response.ok) {
    throw new Error(`Telegram alert failed: ${response.status} ${await response.text()}`);
  }
}

async function heartbeat(status, fields = {}) {
  try {
    const details = {
      role: ROLE,
      event: fields.event || null,
      ...fields.details,
    };
    const nextRunAt = fields.nextRunAt || (
      ONCE ? null : new Date(Date.now() + INTERVAL_SECONDS * 1000).toISOString()
    );
    const result = await requestApi('/agents/heartbeats', {
      method: 'POST',
      body: JSON.stringify({
        agent: AGENT_NAME,
        role: ROLE,
        status,
        lastEvent: fields.event || null,
        nextRunAt,
        details,
        deploymentId: process.env.RAILWAY_DEPLOYMENT_ID || null,
        serviceName: process.env.RAILWAY_SERVICE_NAME || null,
      }),
    });
    if (!result.ok) {
      log('error', 'heartbeat.failed', { status: result.status, body: result.body });
    }
  } catch (error) {
    log('error', 'heartbeat.failed', { error: error.message });
  }
}

async function requestJson(url, options = {}) {
  const headers = {
    accept: 'application/json',
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(url, {
    ...options,
    headers,
    signal: options.signal || AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: response.ok, status: response.status, body };
}

async function requestApi(path, options = {}) {
  return requestJson(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
      ...(options.headers || {}),
    },
  });
}

async function requestGithub(path, options = {}) {
  return requestJson(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'user-agent': AGENT_NAME,
      ...(GITHUB_TOKEN ? { authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
      ...(options.headers || {}),
    },
  });
}

async function getCampaigns() {
  const result = await requestApi('/campaigns');
  if (!result.ok || !Array.isArray(result.body)) {
    throw new Error(`campaigns.fetch_failed ${result.status} ${JSON.stringify(result.body)}`);
  }
  return result.body.slice(0, Math.max(1, CAMPAIGN_LIMIT));
}

function campaignQuery(campaign) {
  return [
    campaign.clientNeed,
    campaign.objective,
    campaign.audience,
    campaign.offer,
    Array.isArray(campaign.markets) ? campaign.markets.join(' ') : '',
  ].filter(Boolean).join(' ').slice(0, 280) || 'market intelligence buyer intent';
}

async function checkHealth() {
  const [apiHealth, sourceHealth, site] = await Promise.all([
    requestApi('/health'),
    requestApi('/sources/health'),
    fetch(SITE_URL).then(async response => ({
      ok: response.ok,
      status: response.status,
      hasRepoAssets: (await response.text()).includes('/squidweave/assets/'),
    })).catch(error => ({ ok: false, error: error.message })),
  ]);

  log(apiHealth.ok && site.ok ? 'info' : 'error', 'health.check', {
    api: { ok: apiHealth.ok, status: apiHealth.status, body: apiHealth.body },
    sources: { ok: sourceHealth.ok, status: sourceHealth.status, body: sourceHealth.body },
    site,
  });
}

async function checkSiteFunction() {
  const site = await fetch(SITE_URL).then(async response => {
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      bytes: text.length,
      hasRoot: /<div\s+id=["']root["']/i.test(text),
      hasRepoAssets: text.includes('/squidweave/assets/'),
      hasScript: /<script[^>]+type=["']module["']/i.test(text),
      title: text.match(/<title>([^<]+)<\/title>/i)?.[1] || null,
    };
  }).catch(error => ({ ok: false, error: error.message }));

  const build = await runCommand('npm', ['run', 'ui:build']);
  const ok = site.ok && site.hasRoot && site.hasScript && build.exitCode === 0;
  log(ok ? 'info' : 'error', 'site.function_check', {
    site,
    build: summarizeCommand(build),
  });
}

async function checkBackendBuild() {
  const checks = [
    ['backend.syntax', 'node', ['--check', 'src/server.mjs']],
    ['backend.tests', 'node', BACKEND_TEST_ARGS],
  ];
  const results = [];
  for (const [event, command, args] of checks) {
    const result = await runCommand(command, args);
    results.push({ event, ...summarizeCommand(result) });
    log(result.exitCode === 0 ? 'info' : 'error', event, summarizeCommand(result));
  }
  log(results.every(result => result.exitCode === 0) ? 'info' : 'error', 'backend.build_watch', { checks: results });
}

async function runAutomation() {
  const args = ['scripts/orchestrate-blueprints.mjs', ...AUTOMATION_ARGS];
  return runAutomationCommand('automation.run', args);
}

async function runBootstrap() {
  return runAutomationCommand('automation.bootstrap', ['scripts/orchestrate-blueprints.mjs', '--bootstrap-only']);
}

async function runEnrichment() {
  return runAutomationCommand('automation.enrichment', ['scripts/orchestrate-blueprints.mjs', '--enrich-only', '--skip-funding']);
}

async function runFunding() {
  return runAutomationCommand('automation.funding', ['scripts/orchestrate-blueprints.mjs', '--funding-only']);
}

async function runSourceScraping() {
  const campaigns = await getCampaigns();
  const runs = [];
  for (const campaign of campaigns) {
    const result = await requestApi('/sources/ingest', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: campaign.id,
        query: campaignQuery(campaign),
        limit: SOURCE_LIMIT,
      }),
    });
    runs.push({
      campaignId: campaign.id,
      ok: result.ok,
      status: result.status,
      researchRecords: result.body?.researchRecords?.length || 0,
      investorRecords: result.body?.investorRecords?.length || 0,
      sourceRuns: result.body?.sourceRuns || [],
      error: result.ok ? null : result.body,
    });
  }

  let localScrape = null;
  if (LOCAL_SCRAPE) {
    localScrape = summarizeCommand(await runCommand('node', ['src/lib/scrape-enrichment-engine.mjs']));
  }

  log(runs.every(run => run.ok) && (!localScrape || localScrape.exitCode === 0) ? 'info' : 'error', 'data.scrape', {
    campaigns: runs,
    localScrape,
  });
}

async function runProfileCompletion() {
  const campaigns = await getCampaigns();
  const runs = [];
  for (const campaign of campaigns) {
    const generated = await requestApi('/prospecting/generate', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: campaign.id,
        reason: `clawdbot-profile-${AGENT_NAME}`,
        limit: PROSPECT_LIMIT,
      }),
    });
    const enriched = await requestApi('/prospects/enrich', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: campaign.id,
        provider: 'profile-completion-waterfall',
        limit: ENRICH_LIMIT,
        dispatch: false,
      }),
    });
    runs.push({
      campaignId: campaign.id,
      generated: {
        ok: generated.ok,
        status: generated.status,
        candidates: generated.body?.candidates?.length || 0,
      },
      enriched: {
        ok: enriched.ok,
        status: enriched.status,
        processedContacts: enriched.body?.run?.processedContacts || 0,
        connectorIssues: enriched.body?.run?.connectorIssues || [],
        counts: enriched.body?.pipeline?.counts || null,
      },
    });
  }
  log(runs.every(run => run.generated.ok && run.enriched.ok) ? 'info' : 'error', 'profiles.complete', { campaigns: runs });
}

async function runDataRefinement() {
  const campaigns = await getCampaigns();
  const runs = [];
  for (const campaign of campaigns) {
    const [pipeline, refinements] = await Promise.all([
      requestApi(`/prospects/pipeline?campaignId=${encodeURIComponent(campaign.id)}`),
      requestApi('/analytics/apply-refinements', {
        method: 'POST',
        body: JSON.stringify({ campaignId: campaign.id }),
      }),
    ]);
    runs.push({
      campaignId: campaign.id,
      pipeline: pipeline.ok ? pipeline.body?.counts || null : { status: pipeline.status, body: pipeline.body },
      refinements: refinements.ok ? {
        applied: refinements.body?.applied || 0,
        recommendations: refinements.body?.refinements?.recommendations?.length || 0,
      } : { status: refinements.status, body: refinements.body },
    });
  }

  const migration = await requestApi('/migration/migrate-sourced');
  log(migration.ok ? 'info' : 'error', 'data.refine', {
    campaigns: runs,
    migration: migration.ok ? migration.body : { status: migration.status, body: migration.body },
  });
}

async function runOutreachReadiness() {
  const campaigns = await getCampaigns();
  const runs = [];
  for (const campaign of campaigns) {
    const sequence = await requestApi('/prospects/sequence', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: campaign.id,
        limit: SEQUENCE_LIMIT,
        dispatch: DISPATCH_OUTREACH,
        connectors: DISPATCH_OUTREACH ? ['openclaw', 'clawdbot'] : [],
      }),
    });
    runs.push({
      campaignId: campaign.id,
      ok: sequence.ok,
      status: sequence.status,
      dispatched: DISPATCH_OUTREACH,
      processedContacts: sequence.body?.run?.processedContacts || 0,
      connectorIssues: sequence.body?.run?.connectorIssues || [],
      counts: sequence.body?.pipeline?.counts || null,
    });
  }
  log(runs.every(run => run.ok && !run.connectorIssues.length) ? 'info' : 'error', 'outreach.readiness', { campaigns: runs });
}

async function runReporting() {
  const campaigns = await getCampaigns();
  const heartbeats = await requestApi('/agents/heartbeats');
  const campaignReports = [];
  for (const campaign of campaigns) {
    const [prospects, funding, activationRuns] = await Promise.all([
      requestApi(`/prospects/pipeline?campaignId=${encodeURIComponent(campaign.id)}`),
      requestApi(`/funding/pipeline?campaignId=${encodeURIComponent(campaign.id)}`),
      requestApi(`/prospects/activation-runs?campaignId=${encodeURIComponent(campaign.id)}`),
    ]);
    campaignReports.push({
      campaignId: campaign.id,
      prospects: prospects.ok ? prospects.body?.counts || null : { status: prospects.status },
      funding: funding.ok ? funding.body?.counts || funding.body?.summary || null : { status: funding.status },
      activationRuns: Array.isArray(activationRuns.body) ? activationRuns.body.slice(-3) : [],
    });
  }
  log(heartbeats.ok ? 'info' : 'error', 'reporting.snapshot', {
    heartbeats: heartbeats.ok ? heartbeats.body : { status: heartbeats.status, body: heartbeats.body },
    campaigns: campaignReports,
  });
}

async function runAutomationCommand(event, args) {
  const result = await runCommand('node', args, {
    SQUIDWEAVE_API_BASE: API_BASE,
    SQUIDWEAVE_API_KEY: API_KEY,
  });
  log(result.exitCode === 0 ? 'info' : 'error', event, {
    command: `node ${args.join(' ')}`,
    ...summarizeCommand(result),
  });
}

async function checkGithubRuns() {
  const runs = await requestGithub(`/repos/${GITHUB_REPOSITORY}/actions/runs?per_page=10`);
  if (!runs.ok) {
    log('error', 'github.runs.fetch_failed', { status: runs.status, body: runs.body });
    return;
  }

  const interestingRuns = (runs.body.workflow_runs || []).map(run => ({
    id: run.id,
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
    headSha: run.head_sha,
    url: run.html_url,
    createdAt: run.created_at,
  }));
  const failing = interestingRuns.filter(run => run.status === 'completed' && ['failure', 'timed_out'].includes(run.conclusion));
  log(failing.length ? 'error' : 'info', 'github.runs.status', { runs: interestingRuns, failing });

  if (process.env.CLAWDBOT_RERUN_FAILED === 'true' && GITHUB_TOKEN && failing.length) {
    for (const run of failing.slice(0, 3)) {
      const rerun = await requestGithub(`/repos/${GITHUB_REPOSITORY}/actions/runs/${run.id}/rerun-failed-jobs`, { method: 'POST' });
      log(rerun.ok ? 'info' : 'error', 'github.runs.rerun_failed_jobs', { runId: run.id, status: rerun.status, body: rerun.body });
    }
  }
}

async function checkRepoAudit() {
  const [repo, site] = await Promise.all([
    requestGithub(`/repos/${GITHUB_REPOSITORY}`),
    fetch(SITE_URL).then(async response => ({
      ok: response.ok,
      status: response.status,
      hasRepoAssets: (await response.text()).includes('/squidweave/assets/'),
    })).catch(error => ({ ok: false, error: error.message })),
  ]);

  let pages = { ok: false, skipped: true, reason: 'GITHUB_TOKEN not set' };
  if (GITHUB_TOKEN) {
    pages = await requestGithub(`/repos/${GITHUB_REPOSITORY}/pages`);
  }
  let dependabot = { ok: false, skipped: true, reason: 'GITHUB_TOKEN not set' };
  if (GITHUB_TOKEN) {
    dependabot = await requestGithub(`/repos/${GITHUB_REPOSITORY}/dependabot/alerts?state=open&per_page=20`);
  }

  log(repo.ok && site.ok ? 'info' : 'error', 'repo.audit', {
    site,
    pages: pages.skipped ? pages : pages.ok ? {
      status: pages.body.status,
      cname: pages.body.cname,
      url: pages.body.html_url,
      buildType: pages.body.build_type,
    } : { status: pages.status, body: pages.body },
    repo: repo.ok ? {
      defaultBranch: repo.body.default_branch,
      pushedAt: repo.body.pushed_at,
      homepage: repo.body.homepage,
      openIssues: repo.body.open_issues_count,
    } : { status: repo.status, body: repo.body },
    dependabot: dependabot.skipped ? dependabot : {
      ok: dependabot.ok,
      status: dependabot.status,
      openAlerts: Array.isArray(dependabot.body) ? dependabot.body.length : null,
    },
  });
}

async function runCommand(command, args, env = {}) {
  const startedAt = Date.now();
  return new Promise(resolve => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), COMMAND_TIMEOUT_MS);
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      resolve({ exitCode, signal, stdout, stderr, durationMs: Date.now() - startedAt });
    });
  });
}

function tail(value, max = 4000) {
  return value.length > max ? value.slice(-max) : value;
}

function summarizeCommand(result) {
  return {
    exitCode: result.exitCode,
    signal: result.signal,
    durationMs: result.durationMs,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr),
  };
}

async function tick() {
  const tasks = rolePlan[ROLE];
  if (!tasks) {
    throw new Error(`Unknown CLAWDBOT_ROLE "${ROLE}". Expected one of: ${Object.keys(rolePlan).join(', ')}`);
  }
  await heartbeat('running', { event: 'tick.start' });
  for (const task of tasks) {
    try {
      await task();
    } catch (error) {
      log('error', 'task.failed', { task: task.name, error: error.message, stack: error.stack });
    }
  }
  await heartbeat('idle', { event: 'tick.complete' });
}

log('info', 'agent.start', {
  apiBase: API_BASE,
  siteUrl: SITE_URL,
  githubRepository: GITHUB_REPOSITORY,
  intervalSeconds: INTERVAL_SECONDS,
  once: ONCE,
});
await heartbeat('starting', { event: 'agent.start' });

do {
  await tick();
  if (!ONCE) {
    await sleep(INTERVAL_SECONDS * 1000);
  }
} while (!ONCE);
