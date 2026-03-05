#!/usr/bin/env bash
# deploy_safe.sh — Safe, idempotent deploy script for KPSS platform
# Usage:
#   ./deploy_safe.sh dry-run         — Show planned ports, volumes, project name
#   ./deploy_safe.sh check           — Run collision checks
#   ./deploy_safe.sh start --confirm — Actually deploy (requires --confirm)
#   ./deploy_safe.sh stop            — Stop and remove kpss_ resources
#
# SAFETY: This script NEVER starts containers without --confirm flag.
# All containers are created with restart=no by default.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${SCRIPT_DIR}/../../.deploy"
ACTIVE_COMPOSE_FILE="${DEPLOY_DIR}/active_compose"
PLAN_FILE="${DEPLOY_DIR}/plan.json"

PORT_RANGE_START="${PORT_RANGE_START:-30001}"
PORT_RANGE_END="${PORT_RANGE_END:-39999}"

# ─── Helpers ────────────────────────────────────────────────────────────────

log()  { echo "[INFO]  $*"; }
warn() { echo "[WARN]  $*" >&2; }
err()  { echo "[ERROR] $*" >&2; exit 1; }

# Generate a random 6-char alphanumeric suffix
random_suffix() {
  LC_ALL=C tr -dc 'a-z0-9' < /dev/urandom | head -c 6
}

# Check if a port is free (not used by Docker or the host)
is_port_free() {
  local port="$1"
  # Check Docker containers
  if docker ps --format '{{.Ports}}' 2>/dev/null | grep -qE ":${port}->|0\.0\.0\.0:${port}"; then
    return 1
  fi
  # Check host listening sockets
  if ss -ltnn 2>/dev/null | grep -q ":${port} "; then
    return 1
  fi
  return 0
}

# Find the first free port in the given range
find_free_port() {
  local start="$1"
  local end="$2"
  local port
  for ((port=start; port<=end; port++)); do
    if is_port_free "$port"; then
      echo "$port"
      return 0
    fi
  done
  err "No free port found in range ${start}-${end}"
}

# ─── Load or create compose project name ────────────────────────────────────

get_or_create_project_name() {
  mkdir -p "${DEPLOY_DIR}"
  if [[ -f "${ACTIVE_COMPOSE_FILE}" ]]; then
    cat "${ACTIVE_COMPOSE_FILE}"
  else
    local name="kpss_$(random_suffix)"
    echo "${name}" > "${ACTIVE_COMPOSE_FILE}"
    echo "${name}"
  fi
}

# ─── Port Detection ──────────────────────────────────────────────────────────

detect_ports() {
  log "Detecting free ports in range ${PORT_RANGE_START}-${PORT_RANGE_END}..."
  POSTGRES_PORT=$(find_free_port "$PORT_RANGE_START" "$PORT_RANGE_END")
  log "  postgres   → ${POSTGRES_PORT}"
  REDIS_PORT=$(find_free_port "$((POSTGRES_PORT + 1))" "$PORT_RANGE_END")
  log "  redis      → ${REDIS_PORT}"
  BACKEND_PORT=$(find_free_port "$((REDIS_PORT + 1))" "$PORT_RANGE_END")
  log "  backend    → ${BACKEND_PORT}"
  ADMIN_PORT=$(find_free_port "$((BACKEND_PORT + 1))" "$PORT_RANGE_END")
  log "  admin      → ${ADMIN_PORT}"
}

# ─── Sub-commands ────────────────────────────────────────────────────────────

cmd_dry_run() {
  local project_name
  project_name=$(get_or_create_project_name)
  detect_ports

  cat > "${PLAN_FILE}" <<EOF
{
  "compose_project_name": "${project_name}",
  "ports": {
    "postgres": ${POSTGRES_PORT},
    "redis": ${REDIS_PORT},
    "backend": ${BACKEND_PORT},
    "admin": ${ADMIN_PORT}
  },
  "volumes": [
    "${project_name}_pgdata"
  ],
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

  log "Dry-run plan written to ${PLAN_FILE}"
  cat "${PLAN_FILE}"
}

cmd_check() {
  log "Running port collision checks..."
  detect_ports
  log "All required ports appear to be free."

  log "Checking existing Docker containers with kpss_ prefix..."
  local existing
  existing=$(docker ps -a --format '{{.Names}}' 2>/dev/null | grep '^kpss_' || true)
  if [[ -n "${existing}" ]]; then
    warn "Existing kpss_ containers found:"
    echo "${existing}" | while read -r name; do warn "  - ${name}"; done
  else
    log "No existing kpss_ containers found."
  fi
}

cmd_start() {
  if [[ "${1:-}" != "--confirm" ]]; then
    err "SAFETY: You must pass --confirm to actually start containers. Run dry-run first."
  fi

  local project_name
  project_name=$(get_or_create_project_name)

  if [[ ! -f "${PLAN_FILE}" ]]; then
    err "Plan file not found. Run './deploy_safe.sh dry-run' first."
  fi

  # Read ports from plan
  POSTGRES_PORT=$(python3 -c "import json; d=json.load(open('${PLAN_FILE}')); print(d['ports']['postgres'])")
  REDIS_PORT=$(python3 -c "import json; d=json.load(open('${PLAN_FILE}')); print(d['ports']['redis'])")
  BACKEND_PORT=$(python3 -c "import json; d=json.load(open('${PLAN_FILE}')); print(d['ports']['backend'])")
  ADMIN_PORT=$(python3 -c "import json; d=json.load(open('${PLAN_FILE}')); print(d['ports']['admin'])")

  # Source .env
  local env_file="${SCRIPT_DIR}/.env"
  if [[ ! -f "${env_file}" ]]; then
    err ".env file not found at ${env_file}. Copy .env.example and fill in values."
  fi

  log "Starting containers with project name: ${project_name}"
  export COMPOSE_PROJECT_NAME="${project_name}"
  export POSTGRES_PORT REDIS_PORT BACKEND_PORT ADMIN_PORT

  # shellcheck source=/dev/null
  set -a; source "${env_file}"; set +a

  docker compose \
    --project-name "${project_name}" \
    --file "${SCRIPT_DIR}/docker-compose.yml" \
    up -d

  log "Deployment complete. Project: ${project_name}"
  log "  Backend:  http://localhost:${BACKEND_PORT}"
  log "  Admin:    http://localhost:${ADMIN_PORT}"
}

cmd_stop() {
  if [[ ! -f "${ACTIVE_COMPOSE_FILE}" ]]; then
    err "No active compose project found at ${ACTIVE_COMPOSE_FILE}"
  fi

  local project_name
  project_name=$(cat "${ACTIVE_COMPOSE_FILE}")

  if [[ ! "${project_name}" =~ ^kpss_ ]]; then
    err "SAFETY: Project name '${project_name}' does not start with 'kpss_'. Refusing to stop."
  fi

  log "Stopping project: ${project_name}"
  docker compose \
    --project-name "${project_name}" \
    --file "${SCRIPT_DIR}/docker-compose.yml" \
    down -v

  rm -f "${ACTIVE_COMPOSE_FILE}" "${PLAN_FILE}"
  log "Stopped and cleaned up project: ${project_name}"
}

# ─── Main ────────────────────────────────────────────────────────────────────

case "${1:-}" in
  dry-run) cmd_dry_run ;;
  check)   cmd_check ;;
  start)   cmd_start "${2:-}" ;;
  stop)    cmd_stop ;;
  *)
    echo "Usage: $0 {dry-run|check|start --confirm|stop}"
    exit 1
    ;;
esac
