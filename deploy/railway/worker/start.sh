#!/usr/bin/env bash
set -euo pipefail

export HERMES_HOME="${HERMES_HOME:-/app/.hermes}"
mkdir -p "$HERMES_HOME"

# Bootstrap gateway config for Telegram-centric hosting
hermes config set gateway.platforms.telegram.enabled true >/dev/null 2>&1 || true
hermes config set gateway.platforms.discord.enabled false >/dev/null 2>&1 || true

# Optional one-time setup hook (safe if already configured)
if [ "${HERMES_SETUP_ON_BOOT:-false}" = "true" ]; then
  hermes config check || true
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

# Start Hermes gateway (Telegram + other configured platforms)
exec hermes gateway run
