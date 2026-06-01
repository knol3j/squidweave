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

const rolePlan = {
  supervisor: [checkHealth, checkGithubRuns, checkRepoAudit, runBootstrap, runEnrichment, runFunding],
  health: [checkHealth],
  automation: [runAutomation],
  bootstrap: [runBootstrap],
  enrichment: [runEnrichment],
  funding: [runFunding],
  ci: [checkGithubRuns],
  audit: [checkRepoAudit],
};

function defaultInterval(role) {
  return {
    health: 60,
    ci: 180,
    audit: 900,
    automation: 1800,
    bootstrap: 21600,
    enrichment: 1800,
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
  const response = await fetch(url, { ...options, headers });
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

async function runAutomationCommand(event, args) {
  const result = await runCommand('node', args, {
    SQUIDWEAVE_API_BASE: API_BASE,
    SQUIDWEAVE_API_KEY: API_KEY,
  });
  log(result.exitCode === 0 ? 'info' : 'error', event, {
    command: `node ${args.join(' ')}`,
    exitCode: result.exitCode,
    signal: result.signal,
    durationMs: result.durationMs,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr),
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
