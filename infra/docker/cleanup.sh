#!/usr/bin/env bash
# cleanup.sh — Stop and remove ONLY kpss_ prefixed containers and volumes
set -euo pipefail

echo "[INFO] Removing kpss_ containers..."
docker ps -a --format '{{.Names}}' | grep '^kpss_' | xargs -r docker rm -f

echo "[INFO] Removing kpss_ volumes..."
docker volume ls --format '{{.Name}}' | grep '^kpss_' | xargs -r docker volume rm

echo "[INFO] Cleanup complete."
