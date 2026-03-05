#!/usr/bin/env bash
# generate_nginx_conf.sh — Generate kpss.conf from template using .deploy/plan.json
# Usage:
#   ./scripts/generate_nginx_conf.sh              — write to /etc/nginx/sites-available/kpss.conf
#   ./scripts/generate_nginx_conf.sh --dry-run    — print to stdout only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAN_FILE="${SCRIPT_DIR}/../.deploy/plan.json"
TEMPLATE="${SCRIPT_DIR}/../infra/nginx/kpss.conf.template"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

if [[ ! -f "${PLAN_FILE}" ]]; then
  echo "[ERROR] Plan file not found: ${PLAN_FILE}" >&2
  echo "        Run './infra/docker/deploy_safe.sh dry-run' first." >&2
  exit 1
fi

API_PORT=$(python3 -c "import json; d=json.load(open('${PLAN_FILE}')); print(d['ports']['backend'])")
ADMIN_PORT=$(python3 -c "import json; d=json.load(open('${PLAN_FILE}')); print(d['ports']['admin'])")

API_HOST="${API_HOST:-127.0.0.1}"
ADMIN_HOST="${ADMIN_HOST:-127.0.0.1}"
API_DOMAIN="${API_DOMAIN:-api.example.com}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.example.com}"

CONF=$(sed \
  -e "s/__API_HOST__/${API_HOST}/g" \
  -e "s/__API_PORT__/${API_PORT}/g" \
  -e "s/__ADMIN_HOST__/${ADMIN_HOST}/g" \
  -e "s/__ADMIN_PORT__/${ADMIN_PORT}/g" \
  -e "s/__API_DOMAIN__/${API_DOMAIN}/g" \
  -e "s/__ADMIN_DOMAIN__/${ADMIN_DOMAIN}/g" \
  "${TEMPLATE}")

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "# [DRY-RUN] Generated Nginx config:"
  echo "${CONF}"
else
  NGINX_DIR="/etc/nginx/sites-available"
  echo "${CONF}" > "${NGINX_DIR}/kpss.conf"
  echo "[INFO] Written to ${NGINX_DIR}/kpss.conf"
  echo "[INFO] Enable with: ln -sf ${NGINX_DIR}/kpss.conf /etc/nginx/sites-enabled/kpss.conf"
  echo "[INFO] Test with:   nginx -t"
  echo "[INFO] Reload with: systemctl reload nginx"
fi
