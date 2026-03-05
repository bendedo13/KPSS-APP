#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${SCRIPT_DIR}/.deploy"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log_info()  { printf '\033[0;32m[INFO]\033[0m  %s\n' "$*"; }
log_warn()  { printf '\033[0;33m[WARN]\033[0m  %s\n' "$*"; }
log_error() { printf '\033[0;31m[ERROR]\033[0m %s\n' "$*" >&2; }

# ---------------------------------------------------------------------------
# Flags
# ---------------------------------------------------------------------------
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      cat <<EOF
Usage: $(basename "$0") [--dry-run]

Cleans up containers and volumes for the active KPSS deployment.

Options:
  --dry-run   Show what would be removed without actually removing anything.
  -h, --help  Show this help message.

The active project name is read from .deploy/active_compose.
Only resources with the kpss_ prefix matching that project are affected.
EOF
      exit 0
      ;;
    *)
      log_error "Unknown option: ${arg}"
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Read active project
# ---------------------------------------------------------------------------
if [ ! -f "${DEPLOY_DIR}/active_compose" ]; then
  log_error "No active deployment found (${DEPLOY_DIR}/active_compose missing)."
  exit 1
fi

PROJECT_NAME="$(cat "${DEPLOY_DIR}/active_compose")"

if [[ "$PROJECT_NAME" != kpss_* ]]; then
  log_error "Project name '${PROJECT_NAME}' does not have the kpss_ prefix — aborting."
  exit 1
fi

log_info "Active project: ${PROJECT_NAME}"

# ---------------------------------------------------------------------------
# Discover resources
# ---------------------------------------------------------------------------
CONTAINERS="$(docker ps -a --filter "name=^${PROJECT_NAME}_" --format '{{.Names}}' 2>/dev/null || true)"
VOLUMES="$(docker volume ls --filter "name=^${PROJECT_NAME}_" --format '{{.Name}}' 2>/dev/null || true)"

# ---------------------------------------------------------------------------
# Stop / remove containers
# ---------------------------------------------------------------------------
if [ -n "$CONTAINERS" ]; then
  log_info "Containers to remove:"
  echo "$CONTAINERS" | while read -r c; do echo "  - ${c}"; done

  if $DRY_RUN; then
    log_info "(dry-run) Skipping container removal."
  else
    echo "$CONTAINERS" | while read -r c; do
      log_info "Stopping and removing ${c} …"
      docker rm -f "$c" 2>/dev/null || true
    done
  fi
else
  log_info "No containers found for project '${PROJECT_NAME}'."
fi

# Also run docker compose down scoped to the project
if ! $DRY_RUN; then
  docker compose --project-name "${PROJECT_NAME}" \
    -f "${SCRIPT_DIR}/docker-compose.yml" \
    down --remove-orphans 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# Remove volumes (with confirmation)
# ---------------------------------------------------------------------------
if [ -n "$VOLUMES" ]; then
  log_info "Volumes to remove:"
  echo "$VOLUMES" | while read -r v; do echo "  - ${v}"; done

  if $DRY_RUN; then
    log_info "(dry-run) Skipping volume removal."
  else
    printf '\033[0;33mRemove these volumes? Data will be lost! [y/N]: \033[0m'
    read -r confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      echo "$VOLUMES" | while read -r v; do
        log_info "Removing volume ${v} …"
        docker volume rm "$v" 2>/dev/null || true
      done
    else
      log_info "Volume removal skipped."
    fi
  fi
else
  log_info "No volumes found for project '${PROJECT_NAME}'."
fi

# ---------------------------------------------------------------------------
# Clean up state files
# ---------------------------------------------------------------------------
if ! $DRY_RUN; then
  rm -f "${DEPLOY_DIR}/active_compose" "${DEPLOY_DIR}/plan.json"
  rm -f "${SCRIPT_DIR}/.env" "${SCRIPT_DIR}/docker-compose.override.yml"
  log_info "Cleaned up state files."
fi

log_info "Cleanup complete."
