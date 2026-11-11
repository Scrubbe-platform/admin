#!/usr/bin/env bash
#
# Probes the Scrubbe API for the admin write endpoints this console needs.
# Nothing in the console calls an unverified path — this script is how those
# paths get verified.
#
#   ./scripts/probe-api.sh                 # unauthenticated: 404 vs 401 only
#   SCRUBBE_TOKEN=eyJ... ./scripts/probe-api.sh
#
# Reading the output:
#   404  route does not exist
#   401  route exists, token missing or rejected
#   403  route exists, role not allowed
#   400  route exists AND validated the empty body — the response body usually
#   422  names the required fields, which is the contract you are looking for
#   405  path exists under a different method
#   2xx  route exists and accepted the request
#
set -uo pipefail

BASE="${SCRUBBE_API_BASE:-https://api.scrubbe.com}"
BASE="${BASE%/}"
[[ "$BASE" == */api/v1 ]] || BASE="$BASE/api/v1"

TOKEN="${SCRUBBE_TOKEN:-}"
AUTH=()
if [[ -n "$TOKEN" ]]; then
  AUTH=(-H "Authorization: Bearer $TOKEN")
  echo "Probing $BASE with a token."
else
  echo "Probing $BASE without a token. 401 and 404 are still distinguishable."
fi
echo

probe() {
  local method="$1" path="$2"
  local args=(-s -o /tmp/probe-body.txt -w '%{http_code}' -X "$method"
              -H 'Content-Type: application/json' "${AUTH[@]}"
              --max-time 15)
  [[ "$method" != "GET" && "$method" != "DELETE" ]] && args+=(-d '{}')

  local code
  code=$(curl "${args[@]}" "$BASE$path" 2>/dev/null || echo "ERR")
  printf '  %-6s %-34s %s\n' "$method" "$path" "$code"

  # A 400/422 body is the most informative result: it usually lists the
  # required fields, which is most of the contract.
  if [[ "$code" == "400" || "$code" == "422" ]]; then
    sed 's/^/        /' /tmp/probe-body.txt | head -c 600
    echo
  fi
}

echo "── service root ──────────────────────────────────────────"
curl -s --max-time 15 "${BASE%/api/v1}/" | head -c 400
echo -e "\n"

echo "── known public reads (expected to work) ─────────────────"
probe GET  /admin/public/blogs
probe GET  /admin/public/jobs

echo
echo "── auth ──────────────────────────────────────────────────"
probe GET  /auth/me

echo
echo "── blog write candidates (UNVERIFIED) ────────────────────"
for p in /admin/blogs /admin/blog /blogs /admin/posts; do
  probe GET  "$p"
  probe POST "$p"
done

echo
echo "── job write candidates (UNVERIFIED) ─────────────────────"
for p in /admin/jobs /admin/job /jobs; do
  probe GET  "$p"
  probe POST "$p"
done

echo
echo "── media upload candidates (UNVERIFIED) ──────────────────"
for p in /admin/media/presign /media/presign /admin/upload /uploads/presign; do
  probe POST "$p"
done

echo
echo "── reference: the presign flow that is known to exist ────"
probe POST /incident-ticket/attachments/presign

echo
echo "Done. The OpenAPI document at ${BASE%/api/v1}/api/docs is the better"
echo "source if you can reach it — this script is the fallback."
