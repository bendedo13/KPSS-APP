#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${SCRIPT_DIR}/.deploy"
PORT_RANGE_START=30000
PORT_RANGE_END=39999

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log_info()  { printf '\033[0;32m[INFO]\033[0m  %s\n' "$*"; }
log_warn()  { printf '\033[0;33m[WARN]\033[0m  %s\n' "$*"; }
log_error() { printf '\033[0;31m[ERROR]\033[0m %s\n' "$*" >&2; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    log_error "Required command not found: $1"
    exit 1
  fi
}

ensure_deploy_dir() {
  if [ ! -d "${DEPLOY_DIR}" ]; then
    mkdir -p "${DEPLOY_DIR}"
    log_info "Created deploy state directory: ${DEPLOY_DIR}"
  fi
}

# ---------------------------------------------------------------------------
# Port helpers
# ---------------------------------------------------------------------------
find_free_port() {
  local start="${1:-$PORT_RANGE_START}"
  local end="${2:-$PORT_RANGE_END}"

  # Collect ports in use from ss and docker ps
  local used_ports
  used_ports=$(
    {
      ss -ltnn 2>/dev/null | awk '{print $4}' | grep -oE '[0-9]+$' || true
      docker ps --format '{{.Ports}}' 2>/dev/null \
        | grep -oE '0\.0\.0\.0:[0-9]+' | cut -d: -f2 || true
    } | sort -un
  )

  local port
  for port in $(seq "$start" "$end"); do
    if ! echo "$used_ports" | grep -qx "$port"; then
      echo "$port"
      return 0
    fi
  done

  log_error "No free port found in range ${start}-${end}"
  exit 1
}

# ---------------------------------------------------------------------------
# Project name
# ---------------------------------------------------------------------------
generate_project_name() {
  ensure_deploy_dir
  local suffix
  suffix="$(head -c 3 /dev/urandom | xxd -p | head -c 6)"
  local name="kpss_${suffix}"
  echo "$name" > "${DEPLOY_DIR}/active_compose"
  echo "$name"
}

get_active_project() {
  if [ -f "${DEPLOY_DIR}/active_compose" ]; then
    cat "${DEPLOY_DIR}/active_compose"
  else
    echo ""
  fi
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------
cmd_dry_run() {
  log_info "Running dry-run — scanning for free ports …"
  ensure_deploy_dir

  local pg_port api_port admin_port redis_port project_name

  pg_port="$(find_free_port 30001 39999)"
  redis_port="$(find_free_port $((pg_port + 1)) 39999)"
  api_port="$(find_free_port $((redis_port + 1)) 39999)"
  admin_port="$(find_free_port $((api_port + 1)) 39999)"
  project_name="$(generate_project_name)"

  log_info "Planned configuration:"
  log_info "  Project name : ${project_name}"
  log_info "  PostgreSQL   : ${pg_port}"
  log_info "  Redis        : ${redis_port}"
  log_info "  API          : ${api_port}"
  log_info "  Admin        : ${admin_port}"
  log_info "  Volumes      : kpss_pgdata, kpss_redisdata"

  cat > "${DEPLOY_DIR}/plan.json" <<EOF
{
  "project_name": "${project_name}",
  "ports": {
    "pg": ${pg_port},
    "redis": ${redis_port},
    "api": ${api_port},
    "admin": ${admin_port}
  },
  "volumes": ["kpss_pgdata", "kpss_redisdata"]
}
EOF

  log_info "Plan written to ${DEPLOY_DIR}/plan.json"
}

cmd_check() {
  log_info "Checking port availability …"

  local services=("pg:30001" "redis:30002" "api:30003" "admin:30004")
  local all_ok=true

  for entry in "${services[@]}"; do
    local svc="${entry%%:*}"
    local port="${entry##*:}"
    if ss -ltnn 2>/dev/null | awk '{print $4}' | grep -qE ":${port}$"; then
      log_warn "Port ${port} (${svc}) is in use (ss)"
      all_ok=false
    elif docker ps --format '{{.Ports}}' 2>/dev/null | grep -q "0\.0\.0\.0:${port}"; then
      log_warn "Port ${port} (${svc}) is in use (docker)"
      all_ok=false
    else
      log_info "Port ${port} (${svc}) is free"
    fi
  done

  if $all_ok; then
    log_info "All default ports are available."
  else
    log_warn "Some ports are already in use. Run 'dry-run' to auto-assign free ports."
  fi
}

cmd_start() {
  if [[ "${1:-}" != "--confirm" ]]; then
    log_error "Safety guard: pass --confirm to actually start services."
    log_info  "Run '$0 dry-run' first to review the plan."
    exit 1
  fi

  if [ ! -f "${DEPLOY_DIR}/plan.json" ]; then
    log_error "No plan found. Run '$0 dry-run' first."
    exit 1
  fi

  require_cmd docker

  local plan
  plan="$(cat "${DEPLOY_DIR}/plan.json")"

  local project_name pg_port redis_port api_port admin_port
  project_name="$(echo "$plan" | grep -oP '"project_name"\s*:\s*"\K[^"]+')"
  pg_port="$(echo "$plan"      | grep -oP '"pg"\s*:\s*\K[0-9]+')"
  redis_port="$(echo "$plan"   | grep -oP '"redis"\s*:\s*\K[0-9]+')"
  api_port="$(echo "$plan"     | grep -oP '"api"\s*:\s*\K[0-9]+')"
  admin_port="$(echo "$plan"   | grep -oP '"admin"\s*:\s*\K[0-9]+')"

  log_info "Starting deployment: ${project_name}"

  # Generate .env from .env.example template
  if [ ! -f "${SCRIPT_DIR}/.env.example" ]; then
    log_warn ".env.example not found at ${SCRIPT_DIR}/.env.example — copying from repo root"
    if [ -f "${SCRIPT_DIR}/../../.env.example" ]; then
      cp "${SCRIPT_DIR}/../../.env.example" "${SCRIPT_DIR}/.env.example"
    else
      log_error "Cannot find .env.example anywhere"
      exit 1
    fi
  fi

  sed \
    -e "s|^KPSS_PG_PORT=.*|KPSS_PG_PORT=${pg_port}|" \
    -e "s|^KPSS_REDIS_PORT=.*|KPSS_REDIS_PORT=${redis_port}|" \
    -e "s|^KPSS_API_PORT=.*|KPSS_API_PORT=${api_port}|" \
    -e "s|^KPSS_ADMIN_PORT=.*|KPSS_ADMIN_PORT=${admin_port}|" \
    -e "s|^API_BASE_URL=.*|API_BASE_URL=http://localhost:${api_port}|" \
    "${SCRIPT_DIR}/.env.example" > "${SCRIPT_DIR}/.env"

  log_info ".env written with assigned ports"

  # Create docker-compose.override.yml with the resolved ports
  cat > "${SCRIPT_DIR}/docker-compose.override.yml" <<EOF
version: "3.8"

services:
  kpss-postgres:
    ports:
      - "${pg_port}:5432"
  kpss-redis:
    ports:
      - "${redis_port}:6379"
  kpss-api:
    ports:
      - "${api_port}:3000"
  kpss-admin:
    ports:
      - "${admin_port}:3001"
EOF

  log_info "docker-compose.override.yml written"

  # Persist project name
  echo "${project_name}" > "${DEPLOY_DIR}/active_compose"

  docker compose \
    --project-name "${project_name}" \
    -f "${SCRIPT_DIR}/docker-compose.yml" \
    -f "${SCRIPT_DIR}/docker-compose.override.yml" \
    up -d

  log_info "Deployment started as project '${project_name}'"
}

cmd_stop() {
  local project_name
  project_name="$(get_active_project)"

  if [ -z "$project_name" ]; then
    log_error "No active deployment found in ${DEPLOY_DIR}/active_compose"
    exit 1
  fi

  # Validate project name has kpss_ prefix
  if [[ "$project_name" != kpss_* ]]; then
    log_error "Active project '${project_name}' does not have the kpss_ prefix — refusing to stop."
    exit 1
  fi

  require_cmd docker

  log_info "Stopping deployment: ${project_name}"

  # Only remove containers whose names start with kpss_
  local containers
  containers="$(docker ps -a --filter "name=^${project_name}_" --format '{{.Names}}' 2>/dev/null || true)"

  if [ -n "$containers" ]; then
    log_info "Removing containers:"
    echo "$containers" | while read -r c; do
      log_info "  ${c}"
      docker rm -f "$c" 2>/dev/null || true
    done
  else
    log_warn "No containers found for project '${project_name}'"
  fi

  # Also try docker compose down scoped to the project
  docker compose --project-name "${project_name}" \
    -f "${SCRIPT_DIR}/docker-compose.yml" \
    down --remove-orphans 2>/dev/null || true

  log_info "Deployment '${project_name}' stopped."
}

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<EOF
Usage: $(basename "$0") <command> [options]

Commands:
  dry-run           Scan for free ports, generate a deployment plan, and write
                    it to .deploy/plan.json. No containers are started.
  check             Check whether the default ports (30001-30004) are free.
  start --confirm   Read .deploy/plan.json, generate .env & override files,
                    then start all services via docker compose.
  stop              Stop and remove containers for the active deployment
                    (reads project name from .deploy/active_compose).
  help              Show this help message.

Port range: ${PORT_RANGE_START}-${PORT_RANGE_END}
State dir:  ${DEPLOY_DIR}
EOF
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  require_cmd docker
  require_cmd ss

  ensure_deploy_dir

  local cmd="${1:-help}"
  shift || true

  case "$cmd" in
    dry-run)  cmd_dry_run ;;
    check)    cmd_check ;;
    start)    cmd_start "$@" ;;
    stop)     cmd_stop ;;
    help|-h|--help) usage ;;
    *)
      log_error "Unknown command: ${cmd}"
      usage
      exit 1
      ;;
  esac
}

main "$@"
