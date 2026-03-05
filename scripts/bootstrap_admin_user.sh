#!/usr/bin/env bash
# bootstrap_admin_user.sh — Create an admin user in the KPSS database
# Usage: ./scripts/bootstrap_admin_user.sh <email> <password>
# Requires: DATABASE_URL environment variable

set -euo pipefail

EMAIL="${1:-}"
PASSWORD="${2:-}"

if [[ -z "${EMAIL}" || -z "${PASSWORD}" ]]; then
  echo "Usage: $0 <email> <password>"
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERROR] DATABASE_URL environment variable not set"
  exit 1
fi

# NOTE: In production, hash the password with bcrypt before storing
# This script uses a placeholder — replace with proper bcrypt hash generation
# Example with Node.js: node -e "const bcrypt = require('bcrypt'); bcrypt.hash('password', 12, (err, hash) => console.log(hash));"

echo "[WARN] In production, replace the password_hash below with a proper bcrypt hash"

psql "${DATABASE_URL}" <<SQL
INSERT INTO users (id, email, password_hash, role, created_at)
VALUES (
  gen_random_uuid(),
  '${EMAIL}',
  -- TODO: Replace with actual bcrypt hash of '${PASSWORD}'
  'PLACEHOLDER_BCRYPT_HASH',
  'admin',
  NOW()
)
ON CONFLICT (email) DO UPDATE
  SET role = 'admin';
SELECT id, email, role FROM users WHERE email = '${EMAIL}';
SQL

echo "[INFO] Admin user created/updated for: ${EMAIL}"
echo "[WARN] Remember to update the password hash with a proper bcrypt hash!"
