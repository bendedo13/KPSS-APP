#!/bin/sh
# =============================================================================
# generate_nginx_conf.sh – Generate an nginx site config from the KPSS
#                          deployment plan and the template.
#
# Reads infra/docker/.deploy/plan.json (created by deploy_safe.sh dry-run)
# and replaces __PLACEHOLDER__ tokens in the nginx template.
#
# Usage:  ./scripts/generate_nginx_conf.sh [OPTIONS]
# =============================================================================
set -eu

# ── Paths (relative to repository root) ─────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLAN_FILE="${REPO_ROOT}/infra/docker/.deploy/plan.json"
TEMPLATE="${REPO_ROOT}/infra/nginx/kpss.conf.template"
OUTPUT_DIR="/etc/nginx/sites-available"
OUTPUT_FILE="${OUTPUT_DIR}/kpss.conf"
ENABLED_DIR="/etc/nginx/sites-enabled"

# ── Defaults ─────────────────────────────────────────────────────────────────
DOMAIN="example.com"
MODE="ports"
DRY_RUN=1

# ── Helpers ──────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Generate an nginx config from infra/nginx/kpss.conf.template using values
read from infra/docker/.deploy/plan.json.

Options:
  --domain DOMAIN   Base domain for server_name directives
                    (default: example.com)
  --mode MODE       Upstream mode: "ports" (default) or "socket"
  --dry-run         Print the generated config to stdout (default behaviour)
  --write           Write to ${OUTPUT_FILE} and create symlink in
                    ${ENABLED_DIR} (requires root / sudo)
  -h, --help        Show this help message

Examples:
  # Preview with defaults
  $(basename "$0")

  # Preview with custom domain and socket mode
  $(basename "$0") --domain kpss.dev --mode socket

  # Install to nginx sites directory
  sudo $(basename "$0") --domain kpss.dev --write
EOF
}

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

# ── Parse arguments ──────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --domain)
      [ -n "${2:-}" ] || die "--domain requires a value"
      DOMAIN="$2"; shift 2 ;;
    --mode)
      [ -n "${2:-}" ] || die "--mode requires a value"
      MODE="$2"; shift 2 ;;
    --dry-run)
      DRY_RUN=1; shift ;;
    --write)
      DRY_RUN=0; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      die "Unknown option: $1" ;;
  esac
done

# Validate mode
case "$MODE" in
  ports|socket) ;;
  *) die "Invalid --mode '${MODE}'. Must be 'ports' or 'socket'." ;;
esac

# ── Pre-flight checks ───────────────────────────────────────────────────────
command -v jq >/dev/null 2>&1 || die "jq is required but not found in PATH"
[ -f "$PLAN_FILE" ]  || die "Plan file not found: ${PLAN_FILE} — run 'infra/docker/deploy_safe.sh dry-run' first."
[ -f "$TEMPLATE" ]   || die "Nginx template not found: ${TEMPLATE}"

# ── Read plan.json ───────────────────────────────────────────────────────────
API_PORT="$(jq -r '.ports.api'   "$PLAN_FILE")"
ADMIN_PORT="$(jq -r '.ports.admin' "$PLAN_FILE")"

[ "$API_PORT"   != "null" ] || die "Could not read .ports.api from ${PLAN_FILE}"
[ "$ADMIN_PORT" != "null" ] || die "Could not read .ports.admin from ${PLAN_FILE}"

# ── Build config from template ───────────────────────────────────────────────
generate() {
  local tmpfile
  tmpfile="$(mktemp)"

  # Start with placeholder replacement
  sed \
    -e "s/__DOMAIN__/${DOMAIN}/g" \
    -e "s/__KPSS_API_PORT__/${API_PORT}/g" \
    -e "s/__KPSS_ADMIN_PORT__/${ADMIN_PORT}/g" \
    "$TEMPLATE" > "$tmpfile"

  # Replace the upstream block between BEGIN/END markers based on mode
  if [ "$MODE" = "socket" ]; then
    sed '/^# BEGIN_UPSTREAM$/,/^# END_UPSTREAM$/c\
# BEGIN_UPSTREAM\
upstream kpss_api_upstream {\
    server unix:/run/kpss/api.sock;\
}\
\
upstream kpss_admin_upstream {\
    server unix:/run/kpss/admin.sock;\
}\
# END_UPSTREAM' "$tmpfile" > "${tmpfile}.new" && mv "${tmpfile}.new" "$tmpfile"
  fi

  cat "$tmpfile"
  rm -f "$tmpfile"
}

CONFIG="$(generate)"

# ── Output ───────────────────────────────────────────────────────────────────
if [ "$DRY_RUN" -eq 1 ]; then
  printf '%s\n' "$CONFIG"
  printf '\n# -- dry-run: config printed to stdout (use --write to install) --\n' >&2
else
  mkdir -p "$OUTPUT_DIR"
  printf '%s\n' "$CONFIG" > "$OUTPUT_FILE"
  printf 'Wrote %s\n' "$OUTPUT_FILE" >&2

  # Create symlink in sites-enabled (idempotent)
  ln -sf "$OUTPUT_FILE" "${ENABLED_DIR}/kpss.conf"
  printf 'Symlinked %s -> %s\n' "${ENABLED_DIR}/kpss.conf" "$OUTPUT_FILE" >&2

  printf 'Done. Verify with: nginx -t && systemctl reload nginx\n' >&2
fi
