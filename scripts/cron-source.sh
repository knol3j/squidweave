#!/usr/bin/env bash
set -euo pipefail

echo "[$(date -Iseconds)] Sourcing biweekly tick — starting..."

node /home/gnul/squidweave/src/scripts/generate-pattern-guess.mjs

echo "[$(date -Iseconds)] Sourcing biweekly tick — done"
