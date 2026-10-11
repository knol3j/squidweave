#!/usr/bin/env bash
set -euo pipefail

export HERMES_HOME="${HERMES_HOME:-/app/.hermes}"
export SQUIDWEAVE_REPO_DIR="${SQUIDWEAVE_REPO_DIR:-/app/squidweave}"
mkdir -p "$HERMES_HOME"

# Bootstrap gateway config for Telegram-centric hosting.
hermes config set gateway.platforms.telegram.enabled true >/dev/null 2>&1 || true
hermes config set gateway.platforms.discord.enabled false >/dev/null 2>&1 || true

if [ "${HERMES_SETUP_ON_BOOT:-false}" = "true" ]; then
  hermes config check || true
fi

# Seed Hermes credentials from the local agent so the worker uses the same auth.
if [ -n "${HERMES_AUTH_JSON_B64:-}" ]; then
  echo "$HERMES_AUTH_JSON_B64" | base64 -d > "${HERMES_HOME}/auth.json"
  chmod 600 "${HERMES_HOME}/auth.json"
fi

# Clone SquidWeave at runtime so backend/site/automation agents have the repo.
SQUIDWEAVE_REPO="${SQUIDWEAVE_REPO:-https://github.com/knol3j/squidweave.git}"
SQUIDWEAVE_REF="${SQUIDWEAVE_REF:-main}"
if [ ! -d "$SQUIDWEAVE_REPO_DIR" ]; then
  git clone --depth 1 --branch "$SQUIDWEAVE_REF" "$SQUIDWEAVE_REPO" "$SQUIDWEAVE_REPO_DIR" \
    && cd "$SQUIDWEAVE_REPO_DIR" \
    && npm ci --omit=dev \
    && npm --prefix ui ci --include=dev
fi

# Required environment variables.
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

# Generate per-role wrappers that log to the container's stdout/stderr.
SCRIPTS_DIR="${HERMES_HOME}/scripts"
mkdir -p "$SCRIPTS_DIR"

ENV_FILE="${HERMES_HOME}/agent.env"
{
  declare -p HERMES_HOME SQUIDWEAVE_REPO_DIR SQUIDWEAVE_API_BASE_URL SQUIDWEAVE_AUTH_TOKEN TELEGRAM_BOT_TOKEN
  declare -p TELEGRAM_CHAT_ID GITHUB_TOKEN GITHUB_REPOSITORY RAILWAY_DEPLOYMENT_ID RAILWAY_SERVICE_NAME 2>/dev/null || true
} > "$ENV_FILE"

for role in health site backend ci audit scraper profile refine outreach reporting funding automation bootstrap enrichment; do
  cat > "${SCRIPTS_DIR}/sw-agent-${role}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
set -a
source ${ENV_FILE}
set +a
exec >> /proc/1/fd/1 2>> /proc/1/fd/2
echo "[cron] starting sw-agent-${role} at \$(date -Iseconds)"
exec python3 ${SCRIPTS_DIR}/sw-agent.py ${role}
EOF
  chmod +x "${SCRIPTS_DIR}/sw-agent-${role}"
done

# Build a system crontab that replaces the legacy Hermes cron scheduler.
CRONTAB_FILE="${HERMES_HOME}/crontab"
cat > "$CRONTAB_FILE" <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/root/.local/bin

*/5 * * * * ${SCRIPTS_DIR}/sw-agent-health
*/10 * * * * ${SCRIPTS_DIR}/sw-agent-site
*/30 * * * * ${SCRIPTS_DIR}/sw-agent-backend
*/30 * * * * ${SCRIPTS_DIR}/sw-agent-ci
0 */2 * * * ${SCRIPTS_DIR}/sw-agent-audit
*/30 * * * * ${SCRIPTS_DIR}/sw-agent-scraper
*/15 * * * * ${SCRIPTS_DIR}/sw-agent-profile
*/20 * * * * ${SCRIPTS_DIR}/sw-agent-refine
*/30 * * * * ${SCRIPTS_DIR}/sw-agent-outreach
*/15 * * * * ${SCRIPTS_DIR}/sw-agent-reporting
0 */2 * * * ${SCRIPTS_DIR}/sw-agent-funding
0 * * * * ${SCRIPTS_DIR}/sw-agent-automation
0 */6 * * * ${SCRIPTS_DIR}/sw-agent-bootstrap
0 * * * * ${SCRIPTS_DIR}/sw-agent-enrichment
EOF

crontab "$CRONTAB_FILE"
echo "Installed crontab with $(wc -l < "$CRONTAB_FILE") lines"

# Start the system cron daemon in the background.
cron

# Keep the container alive via the Hermes Telegram gateway.
exec hermes gateway run
