#!/usr/bin/env bash
# ── Install/Enable/Start LocaleWeave systemd service ──
# Usage: bash deploy/install-systemd.sh [--user]
#
# --user: install as user service (no sudo needed, starts on login)
#   default: install as system service (requires sudo)

set -euo pipefail

SERVICE_NAME="localeWeave"
SERVICE_SRC="$(cd "$(dirname "$0")/../deploy/systemd" && pwd)/${SERVICE_NAME}.service"

if [ "${1:-}" = "--user" ]; then
  TARGET_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
  mkdir -p "$TARGET_DIR"
  cp "$SERVICE_SRC" "${TARGET_DIR}/${SERVICE_NAME}.service"
  systemctl --user daemon-reload
  systemctl --user enable --now "${SERVICE_NAME}"
  echo "[OK] Installed ${SERVICE_NAME} as USER service — status:"
  systemctl --user status "${SERVICE_NAME}" --no-pager | head -5
else
  if [ "$(id -u)" -ne 0 ]; then
    echo "[INFO] Installing as system service — sudo required"
    exec sudo bash "$0" "$@"
  fi
  cp "$SERVICE_SRC" "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}"
  echo "[OK] Installed ${SERVICE_NAME} as SYSTEM service — status:"
  systemctl status "${SERVICE_NAME}" --no-pager | head -5
fi
