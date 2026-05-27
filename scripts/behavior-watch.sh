#!/usr/bin/env bash
set -euo pipefail
mkdir -p /home/gnul/squidweave/logs
: > /home/gnul/squidweave/logs/behavior-watch.log
for i in $(seq 1 90); do
  ts=$(date --iso-8601=seconds)
  state=$(curl -sS http://127.0.0.1:4010/state || echo '{}')
  line=$(printf '%s' "$state" | python -c 'import json,sys
raw=sys.stdin.read().strip() or "{}"
try:
 s=json.loads(raw)
except Exception as e:
 print(f"parse_error={e}")
 raise SystemExit(0)
keys=["campaigns","researchRecords","prospectCandidates","outreachEvents","decisionSnapshots","automationRuns","fundingRuns"]
parts=[]
for k in keys:
 v=s.get(k,[])
 n=len(v) if isinstance(v,list) else "na"
 parts.append(f"{k}={n}")
sched=s.get("scheduler",{}) if isinstance(s.get("scheduler",{}),dict) else {}
parts.append("scheduler_running=" + str(sched.get("running")))
parts.append("scheduler_lastTickAt=" + str(sched.get("lastTickAt")))
print(" ".join(parts))')
  printf '%s %s\n' "$ts" "$line" >> /home/gnul/squidweave/logs/behavior-watch.log
  sleep 10
done
