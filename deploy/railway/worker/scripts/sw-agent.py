#!/usr/bin/env python3
"""Hermes-compatible agent that replaces the legacy ClawDBOT roles.

Usage:
    python sw-agent.py <role>

Environment variables mirror the old ClawDBOT_* names so existing Railway
variables keep working without renames.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone
from typing import Any

ROLE = sys.argv[1] if len(sys.argv) > 1 else os.getenv("HERMES_ROLE", os.getenv("CLAWDBOT_ROLE", "supervisor"))
AGENT_NAME = f"hermes-{ROLE}"
API_BASE = (os.getenv("SQUIDWEAVE_API_BASE_URL") or "https://squidweave-api-production.up.railway.app").rstrip("/")
API_KEY = os.getenv("SQUIDWEAVE_AUTH_TOKEN") or os.getenv("SQUIDWEAVE_API_KEY") or ""
SITE_URL = os.getenv("SQUIDWEAVE_SITE_URL") or "https://knol3j.github.io/squidweave/"
GITHUB_REPOSITORY = os.getenv("GITHUB_REPOSITORY") or "knol3j/squidweave"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN") or ""
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN") or ""
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID") or ""
TELEGRAM_ALERT_LEVELS = {lvl.strip().lower() for lvl in (os.getenv("TELEGRAM_ALERT_LEVELS") or "error").split(",") if lvl.strip()}
CAMPAIGN_LIMIT = int(os.getenv("CAMPAIGN_LIMIT") or "8")
SOURCE_LIMIT = int(os.getenv("SOURCE_LIMIT") or "8")
PROSPECT_LIMIT = int(os.getenv("PROSPECT_LIMIT") or "24")
ENRICH_LIMIT = int(os.getenv("ENRICH_LIMIT") or "24")
SEQUENCE_LIMIT = int(os.getenv("SEQUENCE_LIMIT") or "24")
DISPATCH_OUTREACH = os.getenv("DISPATCH_OUTREACH", "false").lower() == "true"
LOCAL_SCRAPE = os.getenv("LOCAL_SCRAPE", "false").lower() == "true"
REPO_DIR = os.getenv("SQUIDWEAVE_REPO_DIR") or "/app/squidweave"
DRY_RUN = os.getenv("DRY_RUN", "false").lower() == "true"
CLAWDBOT_RERUN_FAILED = os.getenv("CLAWDBOT_RERUN_FAILED", "false").lower() == "true"
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT_MS") or "60000") / 1000
COMMAND_TIMEOUT = int(os.getenv("CLAWDBOT_COMMAND_TIMEOUT_MS") or "900000") / 1000


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def log(level: str, event: str, **fields: Any) -> None:
    entry = {"ts": now(), "level": level, "agent": AGENT_NAME, "role": ROLE, "event": event}
    entry.update(fields)
    print(json.dumps(entry), flush=True)
    if should_alert(level, event):
        try:
            send_telegram_alert(entry)
        except Exception as exc:
            print(json.dumps({"ts": now(), "level": "error", "agent": AGENT_NAME, "role": ROLE, "event": "telegram.alert_failed", "error": str(exc)}), flush=True)


def should_alert(level: str, event: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False
    if event == "telegram.alert_failed":
        return False
    return level.lower() in TELEGRAM_ALERT_LEVELS


def send_telegram_alert(entry: dict) -> None:
    text = f"[{entry['level'].upper()}] {entry['agent']}\nrole: {entry['role']}\nevent: {entry['event']}"
    if "error" in entry:
        text += f"\nerror: {entry['error']}"
    if "status" in entry:
        text += f"\nstatus: {entry['status']}"
    text = text[:3500]
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": text, "disable_web_page_preview": True}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
        data=data,
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        resp.read()


def api_request(method: str, path: str, body: dict | None = None) -> dict:
    headers = {"accept": "application/json"}
    if API_KEY:
        headers["x-api-key"] = API_KEY
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["content-type"] = "application/json"
    req = urllib.request.Request(f"{API_BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            text = resp.read().decode()
            return json.loads(text) if text else {"ok": True}
    except urllib.error.HTTPError as exc:
        try:
            text = exc.read().decode()
            return json.loads(text) if text else {"ok": False, "status": exc.code}
        except Exception:
            return {"ok": False, "status": exc.code, "error": str(exc)}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def github_request(path: str, method: str = "GET", body: dict | None = None) -> dict:
    headers = {"user-agent": AGENT_NAME, "accept": "application/json"}
    if GITHUB_TOKEN:
        headers["authorization"] = f"Bearer {GITHUB_TOKEN}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f"https://api.github.com{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            text = resp.read().decode()
            return json.loads(text) if text else {"ok": True}
    except urllib.error.HTTPError as exc:
        try:
            text = exc.read().decode()
            return json.loads(text) if text else {"ok": False, "status": exc.code}
        except Exception:
            return {"ok": False, "status": exc.code, "error": str(exc)}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def fetch_text(url: str, timeout: float = REQUEST_TIMEOUT) -> dict:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return {"ok": True, "status": resp.status, "text": resp.read().decode(errors="replace")}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def get_campaigns() -> list:
    result = api_request("GET", "/campaigns")
    if isinstance(result, list):
        return result[:CAMPAIGN_LIMIT]
    return []


def campaign_query(campaign: dict) -> str:
    parts = [
        campaign.get("clientNeed", ""),
        campaign.get("objective", ""),
        campaign.get("audience", ""),
        campaign.get("offer", ""),
        " ".join(campaign.get("markets") or []),
    ]
    return " ".join(p for p in parts if p).strip()[:280] or "market intelligence buyer intent"


def run_command(cmd: list[str], cwd: str | None = None, extra_env: dict | None = None) -> dict:
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)
    try:
        proc = subprocess.run(
            cmd,
            cwd=cwd,
            env=env,
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT,
        )
        return {
            "exitCode": proc.returncode,
            "stdoutTail": proc.stdout[-4000:],
            "stderrTail": proc.stderr[-4000:],
            "durationMs": 0,
        }
    except subprocess.TimeoutExpired as exc:
        return {"exitCode": -1, "error": "timeout", "stdoutTail": (exc.stdout or "")[-4000:], "stderrTail": (exc.stderr or "")[-4000:]}
    except Exception as exc:
        return {"exitCode": -1, "error": str(exc)}


def heartbeat(status: str, event: str = "agent.tick") -> None:
    payload = {
        "agent": AGENT_NAME,
        "role": ROLE,
        "status": status,
        "lastEvent": event,
        "nextRunAt": None,
        "details": {},
        "deploymentId": os.getenv("RAILWAY_DEPLOYMENT_ID"),
        "serviceName": os.getenv("RAILWAY_SERVICE_NAME"),
    }
    try:
        req = urllib.request.Request(
            f"{API_BASE}/agents/heartbeats",
            data=json.dumps(payload).encode(),
            headers={"content-type": "application/json", **({"x-api-key": API_KEY} if API_KEY else {})},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30):
            pass
    except Exception:
        pass


def check_health() -> None:
    api = api_request("GET", "/health")
    sources = api_request("GET", "/sources/health")
    site = fetch_text(SITE_URL)
    sources_ok = isinstance(sources, dict) and sources.get("healthy", 0) >= sources.get("total", 1)
    ok = isinstance(api, dict) and api.get("ok") and sources_ok and site.get("ok")
    log("info" if ok else "error",
        "health.check",
        api={"ok": isinstance(api, dict) and api.get("ok"), "status": api.get("status") if isinstance(api, dict) else None},
        sources={"ok": sources_ok, "total": sources.get("total") if isinstance(sources, dict) else None, "healthy": sources.get("healthy") if isinstance(sources, dict) else None},
        site={"ok": site.get("ok"), "status": site.get("status"), "error": site.get("error")},
    )


def check_site_function() -> None:
    site = fetch_text(SITE_URL)
    text = site.get("text", "")
    site_summary = {
        "ok": site.get("ok"),
        "status": site.get("status"),
        "bytes": len(text),
        "hasRoot": bool(re.search(r"<div\s+id=[\"']root[\"']", text, re.I)),
        "hasScript": bool(re.search(r"<script[^>]+type=[\"']module[\"']", text, re.I)),
        "title": (re.search(r"<title>([^<]+)</title>", text, re.I) or [None, None])[1],
    }
    build = {"exitCode": 0}
    if os.path.isdir(REPO_DIR):
        build = run_command(["npm", "run", "ui:build"], cwd=REPO_DIR)
    ok = site_summary["ok"] and site_summary["hasRoot"] and site_summary["hasScript"] and build.get("exitCode") == 0
    log("info" if ok else "error", "site.function_check", site=site_summary, build=build)


def check_backend_build() -> None:
    checks = []
    ok = True
    if os.path.isdir(REPO_DIR):
        syntax = run_command(["node", "--check", "src/server.mjs"], cwd=REPO_DIR)
        syntax["event"] = "backend.syntax"
        tests = run_command(
            ["node", "--test", "tests/prospect-activation-engine.test.mjs", "tests/agent-orchestrator.test.mjs", "tests/automation-engine.test.mjs"],
            cwd=REPO_DIR,
        )
        tests["event"] = "backend.tests"
        checks = [syntax, tests]
        ok = all(c.get("exitCode") == 0 for c in checks)
    log("info" if ok else "error", "backend.build_watch", checks=checks)


def check_github_runs() -> None:
    runs = github_request(f"/repos/{GITHUB_REPOSITORY}/actions/runs?per_page=10")
    workflow_runs = runs.get("workflow_runs", []) if isinstance(runs, dict) else []
    interesting = [
        {"id": r["id"], "name": r["name"], "status": r["status"], "conclusion": r.get("conclusion"), "headSha": r["head_sha"], "url": r["html_url"], "createdAt": r["created_at"]}
        for r in workflow_runs
    ]
    failing = [r for r in interesting if r["status"] == "completed" and r["conclusion"] in ("failure", "timed_out")]
    ok = not failing
    log("info" if ok else "error", "github.runs.status", runs=interesting, failing=failing)
    if CLAWDBOT_RERUN_FAILED and GITHUB_TOKEN and failing:
        for run in failing[:3]:
            github_request(f"/repos/{GITHUB_REPOSITORY}/actions/runs/{run['id']}/rerun-failed-jobs", method="POST")


def check_repo_audit() -> None:
    repo = github_request(f"/repos/{GITHUB_REPOSITORY}")
    site = fetch_text(SITE_URL)
    pages = {"skipped": True, "reason": "GITHUB_TOKEN not set"}
    dependabot = {"skipped": True, "reason": "GITHUB_TOKEN not set"}
    if GITHUB_TOKEN:
        pages_raw = github_request(f"/repos/{GITHUB_REPOSITORY}/pages")
        if isinstance(pages_raw, dict):
            pages = {"ok": True, "status": pages_raw.get("status"), "cname": pages_raw.get("cname"), "url": pages_raw.get("html_url"), "buildType": pages_raw.get("build_type")}
        else:
            pages = {"ok": False, "status": pages_raw.get("status") if isinstance(pages_raw, dict) else None}
        dep_raw = github_request(f"/repos/{GITHUB_REPOSITORY}/dependabot/alerts?state=open&per_page=20")
        if isinstance(dep_raw, list):
            dependabot = {"ok": True, "openAlerts": len(dep_raw)}
        else:
            dependabot = {"ok": False, "status": dep_raw.get("status") if isinstance(dep_raw, dict) else None}
    repo_summary = {"defaultBranch": repo.get("default_branch"), "pushedAt": repo.get("pushed_at"), "homepage": repo.get("homepage"), "openIssues": repo.get("open_issues_count")} if isinstance(repo, dict) else {}
    ok = isinstance(repo, dict) and "id" in repo and site.get("ok")
    log("info" if ok else "error", "repo.audit", site={"ok": site.get("ok"), "status": site.get("status")}, pages=pages, repo=repo_summary, dependabot=dependabot)


def run_source_scraping() -> None:
    campaigns = get_campaigns()
    runs = []
    for campaign in campaigns:
        result = api_request("POST", "/sources/ingest", {"campaignId": campaign["id"], "query": campaign_query(campaign), "limit": SOURCE_LIMIT})
        runs.append({
            "campaignId": campaign["id"],
            "ok": isinstance(result, dict) and result.get("ok") is not False,
            "researchRecords": len(result.get("researchRecords", [])) if isinstance(result, dict) else 0,
            "investorRecords": len(result.get("investorRecords", [])) if isinstance(result, dict) else 0,
        })
    ok = all(r["ok"] for r in runs)
    log("info" if ok else "error", "data.scrape", campaigns=runs)


def run_profile_completion() -> None:
    campaigns = get_campaigns()
    runs = []
    for campaign in campaigns:
        generated = api_request("POST", "/prospecting/generate", {"campaignId": campaign["id"], "reason": f"hermes-profile-{AGENT_NAME}", "limit": PROSPECT_LIMIT})
        enriched = api_request("POST", "/prospects/enrich", {"campaignId": campaign["id"], "provider": "profile-completion-waterfall", "limit": ENRICH_LIMIT, "dispatch": False})
        runs.append({
            "campaignId": campaign["id"],
            "generated": {"ok": isinstance(generated, dict) and generated.get("ok") is not False, "status": generated.get("status") if isinstance(generated, dict) else None},
            "enriched": {"ok": isinstance(enriched, dict) and enriched.get("ok") is not False, "status": enriched.get("status") if isinstance(enriched, dict) else None},
        })
    ok = all(r["generated"]["ok"] and r["enriched"]["ok"] for r in runs)
    log("info" if ok else "error", "profiles.complete", campaigns=runs)


def run_data_refinement() -> None:
    campaigns = get_campaigns()
    runs = []
    for campaign in campaigns:
        pipeline = api_request("GET", f"/prospects/pipeline?campaignId={campaign['id']}")
        refinements = api_request("POST", "/analytics/apply-refinements", {"campaignId": campaign["id"]})
        runs.append({
            "campaignId": campaign["id"],
            "pipeline": {"ok": isinstance(pipeline, dict) and pipeline.get("ok") is not False},
            "refinements": {"ok": isinstance(refinements, dict) and refinements.get("ok") is not False},
        })
    migration = api_request("POST", "/migration/migrate-sourced")
    ok = all(r["pipeline"]["ok"] and r["refinements"]["ok"] for r in runs)
    log("info" if ok else "error", "data.refine", campaigns=runs, migration={"ok": isinstance(migration, dict) and migration.get("ok") is not False})


def run_outreach_readiness() -> None:
    campaigns = get_campaigns()
    runs = []
    for campaign in campaigns:
        result = api_request("POST", "/prospects/sequence", {
            "campaignId": campaign["id"],
            "limit": SEQUENCE_LIMIT,
            "dispatch": DISPATCH_OUTREACH,
            "connectors": ["openclaw", "clawdbot"] if DISPATCH_OUTREACH else [],
        })
        runs.append({"campaignId": campaign["id"], "ok": isinstance(result, dict) and result.get("ok") is not False, "dispatched": DISPATCH_OUTREACH})
    ok = all(r["ok"] for r in runs)
    log("info" if ok else "error", "outreach.readiness", campaigns=runs)


def run_reporting() -> None:
    campaigns = get_campaigns()
    heartbeats = api_request("GET", "/agents/heartbeats")
    reports = []
    for campaign in campaigns:
        prospects = api_request("GET", f"/prospects/pipeline?campaignId={campaign['id']}")
        funding = api_request("GET", f"/funding/pipeline?campaignId={campaign['id']}")
        activation = api_request("GET", f"/prospects/activation-runs?campaignId={campaign['id']}")
        reports.append({
            "campaignId": campaign["id"],
            "prospects": {"ok": isinstance(prospects, dict) and prospects.get("ok") is not False},
            "funding": {"ok": isinstance(funding, dict) and funding.get("ok") is not False},
            "activationRuns": {"ok": isinstance(activation, list)},
        })
    ok = isinstance(heartbeats, dict) and heartbeats.get("ok") is not False
    log("info" if ok else "error", "reporting.snapshot", heartbeats={"ok": ok}, campaigns=reports)


def run_funding() -> None:
    campaigns = get_campaigns()
    runs = []
    for campaign in campaigns:
        result = api_request("POST", "/funding/pipeline", {"campaignId": campaign["id"], "reason": "hermes-funding"})
        runs.append({"campaignId": campaign["id"], "ok": isinstance(result, dict) and result.get("ok") is not False})
    ok = all(r["ok"] for r in runs)
    log("info" if ok else "error", "funding.pipeline", campaigns=runs)


def run_automation(extra_args: list[str] | None = None) -> None:
    if not os.path.isdir(REPO_DIR):
        log("error", "automation.run", error="SQUIDWEAVE_REPO_DIR not found")
        return
    cmd = ["node", "scripts/orchestrate-blueprints.mjs", *(extra_args or [])]
    result = run_command(cmd, cwd=REPO_DIR, extra_env={"SQUIDWEAVE_API_BASE": API_BASE, "SQUIDWEAVE_API_KEY": API_KEY})
    ok = result.get("exitCode") == 0
    log("info" if ok else "error", "automation.run", command=" ".join(cmd), **result)


def main() -> None:
    log("info", "agent.start", apiBase=API_BASE, siteUrl=SITE_URL, githubRepository=GITHUB_REPOSITORY, role=ROLE, dryRun=DRY_RUN)
    heartbeat("starting", "agent.start")

    if DRY_RUN:
        log("info", "agent.dry_run", skipped=True)
        return

    role_plan = {
        "supervisor": [check_health, check_site_function, check_backend_build, check_github_runs, check_repo_audit, run_source_scraping, run_profile_completion, run_data_refinement, run_outreach_readiness, run_funding, run_reporting],
        "health": [check_health],
        "site": [check_site_function],
        "backend": [check_backend_build, check_github_runs],
        "automation": [lambda: run_automation()],
        "bootstrap": [lambda: run_automation(["--bootstrap-only"])],
        "enrichment": [lambda: run_automation(["--enrich-only", "--skip-funding"])],
        "funding": [lambda: run_automation(["--funding-only"])],
        "scraper": [run_source_scraping],
        "profile": [run_profile_completion],
        "refine": [run_data_refinement],
        "outreach": [run_outreach_readiness],
        "reporting": [run_reporting],
        "ci": [check_github_runs],
        "audit": [check_repo_audit],
    }

    tasks = role_plan.get(ROLE)
    if not tasks:
        log("error", "agent.unknown_role", role=ROLE)
        sys.exit(1)

    heartbeat("running", "tick.start")
    for task in tasks:
        try:
            task()
        except Exception as exc:
            log("error", "task.failed", task=task.__name__ if hasattr(task, "__name__") else "lambda", error=str(exc))
    heartbeat("idle", "tick.complete")
    log("info", "agent.tick.complete", done=True)


if __name__ == "__main__":
    main()
