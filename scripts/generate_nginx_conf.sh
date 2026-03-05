#!/usr/bin/env bash
# generate_nginx_conf.sh — Generate nginx config from plan.json
# Usage:
#   ./scripts/generate_nginx_conf.sh              — dry-run (print to stdout)
#   ./scripts/generate_nginx_conf.sh --apply       — write to /etc/nginx/sites-available/kpss.conf

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLAN_FILE="$REPO_ROOT/.deploy/plan.json"
TEMPLATE="$REPO_ROOT/infra/nginx/kpss.conf.template"

if [ ! -f "$PLAN_FILE" ]; then
  echo "ERROR: $PLAN_FILE not found. Run deploy_safe.sh dry-run first." >&2
  exit 1
fi

BACKEND_PORT=$(jq -r '.ports.backend' "$PLAN_FILE")
ADMIN_PORT=$(jq -r '.ports.admin' "$PLAN_FILE")

CONF=$(sed \
  -e "s/{{API_HOST}}/127.0.0.1/g" \
  -e "s/{{API_PORT}}/$BACKEND_PORT/g" \
  -e "s/{{ADMIN_HOST}}/127.0.0.1/g" \
  -e "s/{{ADMIN_PORT}}/$ADMIN_PORT/g" \
  "$TEMPLATE")

if [ "${1:-}" = "--apply" ]; then
  echo "$CONF" | sudo tee /etc/nginx/sites-available/kpss.conf > /dev/null
  sudo nginx -t && sudo systemctl reload nginx
  echo "Nginx config applied and reloaded."
else
  echo "=== DRY RUN — nginx config output ==="
  echo "$CONF"
  echo "=== To apply: $0 --apply ==="
fi
