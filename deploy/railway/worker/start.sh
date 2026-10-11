#!/usr/bin/env bash
set -euo pipefail

export HERMES_HOME="${HERMES_HOME:-/app/.hermes}"
export SQUIDWEAVE_REPO_DIR="${SQUIDWEAVE_REPO_DIR:-/app/squidweave}"
mkdir -p "$HERMES_HOME"

# Bootstrap gateway config for Telegram-centric hosting
hermes config set gateway.platforms.telegram.enabled true >/dev/null 2>&1 || true
hermes config set gateway.platforms.discord.enabled false >/dev/null 2>&1 || true

# Optional one-time setup hook (safe if already configured)
if [ "${HERMES_SETUP_ON_BOOT:-false}" = "true" ]; then
  hermes config check || true
fi

# Seed Hermes credentials from the local agent so the worker uses the same auth.
if [ -n "${HERMES_AUTH_JSON_B64:-}" ]; then
  mkdir -p "$HERMES_HOME"
  echo "$HERMES_AUTH_JSON_B64" | base64 -d > "${HERMES_HOME}/auth.json"
  chmod 600 "${HERMES_HOME}/auth.json"
fi

# Ensure API base/token are present for SquidWeave integration
if [ -z "${SQUIDWEAVE_API_BASE_URL:-}" ]; then
  echo "SQUIDWEAVE_API_BASE_URL is required"
  exit 1
fi

if [ -z "${SQUIDWEAVE_AUTH_TOKEN:-}" ]; then
  echo "SQUIDWEAVE_AUTH_TOKEN is required"
  exit 1
fi

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "TELEGRAM_BOT_TOKEN is required for Telegram gateway"
  exit 1
fi

# Generate per-role wrappers so Hermes cron can run each agent with the right role.
SCRIPTS_DIR="${HERMES_HOME}/scripts"
mkdir -p "$SCRIPTS_DIR"
for role in health site backend ci audit scraper profile refine outreach reporting funding automation bootstrap enrichment; do
  cat > "${SCRIPTS_DIR}/sw-agent-${role}" <<EOF
#!/usr/bin/env bash
exec python3 /app/.hermes/scripts/sw-agent.py ${role}
EOF
  chmod +x "${SCRIPTS_DIR}/sw-agent-${role}"
done

# Schedule Hermes cron agents that replace the legacy clawdbot-* roles.
schedule_agent() {
  local role="$1"
  local schedule="$2"
  local name="hermes-${role}"
  # Remove existing job with the same name to make the script idempotent
  hermes cron remove "$name" >/dev/null 2>&1 || true
  hermes cron create "$schedule" \
    --name "$name" \
    --no-agent \
    --script "sw-agent-${role}" \
    "Run SquidWeave ${role} agent"
}

schedule_agent health     "5m"
schedule_agent site       "10m"
schedule_agent backend    "30m"
schedule_agent ci         "30m"
schedule_agent audit      "2h"
schedule_agent scraper    "30m"
schedule_agent profile    "15m"
schedule_agent refine     "20m"
schedule_agent outreach   "30m"
schedule_agent reporting  "15m"
schedule_agent funding    "2h"
schedule_agent automation "1h"
schedule_agent bootstrap  "6h"
schedule_agent enrichment "1h"

# Start Hermes gateway (Telegram + cron scheduler)
exec hermes gateway run
