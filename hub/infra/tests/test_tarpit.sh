#!/usr/bin/env bash
# Reproduzível: mede tempo/bytes do loop-defense com UA de scanner.
set -euo pipefail
HOST="${1:-http://127.0.0.1}"
ENDPOINT="$HOST/loop-defense"

echo "=== Tarpit smoke test ==="
for UA in "python-requests/2.31" "curl/8.5" "GPTBot" "claudebot"; do
  start=$(date +%s%N)
  status=$(curl -s -o /tmp/opencode/tarpit.body -w "%{http_code}" -A "$UA" "$ENDPOINT" || true)
  end=$(date +%s%N)
  elapsed_ms=$(( (end-start)/1000000 ))
  bytes=$(wc -c < /tmp/opencode/tarpit.body)
  echo "$UA → HTTP=$status bytes=$bytes time=${elapsed_ms}ms"
done
echo "=== expected (corrected, gzip off) ==="
echo "retention >= 15000ms, bytes ~ 256KB, log contains 418"
