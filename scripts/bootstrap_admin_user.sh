#!/usr/bin/env bash
# bootstrap_admin_user.sh — Create admin user in database
# Usage: DATABASE_URL=postgres://... ./scripts/bootstrap_admin_user.sh admin@example.com PASSWORD

set -euo pipefail
EMAIL="${1:-admin@example.com}"
PASSWORD="${2:-changeme123}"
DATABASE_URL="${DATABASE_URL:-}"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set" >&2
  exit 1
fi

HASH=$(printf '%s' "$PASSWORD" | sha256sum | cut -d' ' -f1)

# NOTE: SHA-256 is used here for bootstrap compatibility with the server's auth route.
# For production deployments, migrate to bcrypt/argon2 via the application's user management API
# rather than this script.

psql "$DATABASE_URL" \
  -v email="$EMAIL" \
  -v hash="$HASH" \
  <<'SQL'
INSERT INTO users (email, password_hash, role, created_at)
VALUES (:'email', :'hash', 'admin', NOW())
ON CONFLICT (email) DO UPDATE SET password_hash=:'hash', role='admin';
SQL

echo "Admin user '$EMAIL' created/updated."
