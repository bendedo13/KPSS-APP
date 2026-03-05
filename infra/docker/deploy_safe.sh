#!/usr/bin/env bash
# deploy_safe.sh — KPSS Platform safe deployment script
# Usage:
#   ./deploy_safe.sh dry-run           — Plan ports, write .deploy/plan.json
#   ./deploy_safe.sh check             — Check port collisions
#   ./deploy_safe.sh start --confirm   — Deploy (requires --confirm)
#   ./deploy_safe.sh stop              — Stop containers (kpss_ prefix only)
#   ./deploy_safe.sh cleanup           — Stop + remove volumes (kpss_ prefix only)
#
# POSIX-compatible. Requires: docker, jq, ss (or lsof as fallback)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$REPO_ROOT/.deploy"
ACTIVE_FILE="$DEPLOY_DIR/.active_compose"
PLAN_FILE="$DEPLOY_DIR/plan.json"

PORT_RANGE_START=30000
PORT_RANGE_END=39999

mkdir -p "$DEPLOY_DIR"

# Generate random 6-char alphanumeric suffix
random_suffix() {
  tr -dc 'a-z0-9' < /dev/urandom | head -c 6
}

# Check if port is in use (docker ports or host TCP)
is_port_used() {
  local port="$1"
  # Check docker
  if docker ps --format '{{.Ports}}' 2>/dev/null | grep -q ":${port}->"; then
    return 0
  fi
  # Check host ss
  if command -v ss &>/dev/null; then
    if ss -ltnn 2>/dev/null | grep -q ":${port} "; then
      return 0
    fi
  elif command -v lsof &>/dev/null; then
    if lsof -iTCP:"${port}" -sTCP:LISTEN &>/dev/null; then
      return 0
    fi
  fi
  return 1
}

# Find first free port in range
find_free_port() {
  local start="$1"
  local end="$2"
  local port="$start"
  while [ "$port" -le "$end" ]; do
    if ! is_port_used "$port"; then
      echo "$port"
      return 0
    fi
    port=$((port + 1))
  done
  echo "ERROR: No free port found in range $start-$end" >&2
  exit 1
}

# Load or generate project name
get_project_name() {
  if [ -f "$ACTIVE_FILE" ]; then
    cat "$ACTIVE_FILE"
  else
    echo "kpss_$(random_suffix)"
  fi
}

cmd="${1:-help}"

case "$cmd" in
  dry-run)
    echo "=== KPSS Deploy Dry-Run ==="
    PROJECT_NAME=$(get_project_name)
    echo "Project name: $PROJECT_NAME"

    POSTGRES_PORT=$(find_free_port $PORT_RANGE_START $PORT_RANGE_END)
    REDIS_PORT=$(find_free_port $((POSTGRES_PORT + 1)) $PORT_RANGE_END)
    BACKEND_PORT=$(find_free_port $((REDIS_PORT + 1)) $PORT_RANGE_END)
    ADMIN_PORT=$(find_free_port $((BACKEND_PORT + 1)) $PORT_RANGE_END)

    echo "Planned ports:"
    echo "  postgres: $POSTGRES_PORT"
    echo "  redis:    $REDIS_PORT"
    echo "  backend:  $BACKEND_PORT"
    echo "  admin:    $ADMIN_PORT"

    echo "Planned volumes:"
    echo "  ${PROJECT_NAME}_pgdata"

    echo "Planned nginx upstreams:"
    echo "  api.example.com -> localhost:$BACKEND_PORT"
    echo "  admin.example.com -> localhost:$ADMIN_PORT"

    cat > "$PLAN_FILE" <<EOF
{
  "project_name": "$PROJECT_NAME",
  "ports": {
    "postgres": $POSTGRES_PORT,
    "redis": $REDIS_PORT,
    "backend": $BACKEND_PORT,
    "admin": $ADMIN_PORT
  },
  "volumes": ["${PROJECT_NAME}_pgdata"],
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    echo ""
    echo "Plan written to: $PLAN_FILE"
    ;;

  check)
    echo "=== KPSS Port Collision Check ==="
    echo "Docker containers:"
    docker ps --format '  {{.Names}} {{.Ports}}' 2>/dev/null || echo "  (docker not available)"
    echo ""
    echo "Listening ports (ss):"
    ss -ltnn 2>/dev/null | grep LISTEN | awk '{print "  " $4}' || echo "  (ss not available)"
    echo ""
    if [ -f "$PLAN_FILE" ]; then
      echo "Checking planned ports from $PLAN_FILE:"
      BACKEND_PORT=$(jq -r '.ports.backend' "$PLAN_FILE")
      ADMIN_PORT=$(jq -r '.ports.admin' "$PLAN_FILE")
      for port in $BACKEND_PORT $ADMIN_PORT; do
        if is_port_used "$port"; then
          echo "  ⚠️  Port $port is IN USE"
        else
          echo "  ✓  Port $port is free"
        fi
      done
    else
      echo "Run dry-run first to generate plan.json"
    fi
    ;;

  start)
    if [ "${2:-}" != "--confirm" ]; then
      echo "ERROR: Safety check — add --confirm to start containers"
      echo "Usage: $0 start --confirm"
      exit 1
    fi

    if [ ! -f "$PLAN_FILE" ]; then
      echo "Run dry-run first: $0 dry-run"
      exit 1
    fi

    PROJECT_NAME=$(jq -r '.project_name' "$PLAN_FILE")
    POSTGRES_PORT=$(jq -r '.ports.postgres' "$PLAN_FILE")
    REDIS_PORT=$(jq -r '.ports.redis' "$PLAN_FILE")
    BACKEND_PORT=$(jq -r '.ports.backend' "$PLAN_FILE")
    ADMIN_PORT=$(jq -r '.ports.admin' "$PLAN_FILE")

    # Save active project name
    echo "$PROJECT_NAME" > "$ACTIVE_FILE"

    # Check .env.example exists
    ENV_EXAMPLE="$SCRIPT_DIR/.env.example"
    ENV_FILE="$REPO_ROOT/.env"
    if [ ! -f "$ENV_FILE" ]; then
      if [ -f "$ENV_EXAMPLE" ]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        sed "s/COMPOSE_PROJECT_NAME=.*/COMPOSE_PROJECT_NAME=$PROJECT_NAME/" "$ENV_FILE" > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"
        echo "Created .env from .env.example — PLEASE FILL IN SECRETS before running again"
        exit 1
      fi
    fi

    # Write override file with chosen ports
    cat > "$SCRIPT_DIR/docker-compose.override.yml" <<EOF
version: "3.9"
services:
  postgres:
    ports:
      - "${POSTGRES_PORT}:5432"
  redis:
    ports:
      - "${REDIS_PORT}:6379"
  backend:
    ports:
      - "${BACKEND_PORT}:3001"
  admin:
    ports:
      - "${ADMIN_PORT}:3000"
EOF

    echo "=== Starting KPSS Platform (project: $PROJECT_NAME) ==="
    cd "$SCRIPT_DIR"
    COMPOSE_PROJECT_NAME="$PROJECT_NAME" docker compose \
      --project-name "$PROJECT_NAME" \
      --env-file "$ENV_FILE" \
      -f docker-compose.yml -f docker-compose.override.yml \
      up -d
    echo ""
    echo "Started. Access:"
    echo "  Backend API:  http://localhost:$BACKEND_PORT/health"
    echo "  Admin panel:  http://localhost:$ADMIN_PORT"
    ;;

  stop)
    if [ -f "$ACTIVE_FILE" ]; then
      PROJECT_NAME=$(cat "$ACTIVE_FILE")
      echo "Stopping project: $PROJECT_NAME"
      cd "$SCRIPT_DIR"
      COMPOSE_PROJECT_NAME="$PROJECT_NAME" docker compose --project-name "$PROJECT_NAME" down
    else
      echo "No active project found in $ACTIVE_FILE"
      echo "Stopping all kpss_ containers..."
      docker ps --filter "name=kpss_" -q | xargs -r docker stop
    fi
    ;;

  cleanup)
    if [ -f "$ACTIVE_FILE" ]; then
      PROJECT_NAME=$(cat "$ACTIVE_FILE")
      echo "Cleaning up project: $PROJECT_NAME (containers + volumes)"
      cd "$SCRIPT_DIR"
      COMPOSE_PROJECT_NAME="$PROJECT_NAME" docker compose --project-name "$PROJECT_NAME" down -v
      rm -f "$ACTIVE_FILE"
    else
      echo "No active project found. Removing all kpss_ containers and volumes..."
      docker ps -a --filter "name=kpss_" -q | xargs -r docker rm -f
      docker volume ls --filter "name=kpss_" -q | xargs -r docker volume rm
    fi
    echo "Cleanup complete."
    ;;

  help|*)
    echo "Usage: $0 {dry-run|check|start --confirm|stop|cleanup}"
    echo ""
    echo "  dry-run        Plan ports and write .deploy/plan.json"
    echo "  check          Check port collisions"
    echo "  start --confirm  Start containers (requires --confirm)"
    echo "  stop           Stop containers (kpss_ prefix only)"
    echo "  cleanup        Stop + remove containers and volumes"
    ;;
esac
