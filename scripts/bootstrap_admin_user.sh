#!/usr/bin/env bash
# bootstrap_admin_user.sh — Create an admin user in the KPSS database
# Usage: ./scripts/bootstrap_admin_user.sh <email> <password>
# Requires: DATABASE_URL environment variable and node/npm with bcrypt available

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

# Generate bcrypt hash using Node.js (bcrypt installed in services/backend)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/../services/backend"

if [[ ! -d "${BACKEND_DIR}/node_modules/bcrypt" ]]; then
  echo "[ERROR] bcrypt not found. Run 'npm install' in services/backend first."
  exit 1
fi

echo "[INFO] Generating bcrypt hash (rounds=12)..."
PASSWORD_HASH=$(node -e "
  const bcrypt = require('bcrypt');
  bcrypt.hash(process.argv[1], 12, (err, hash) => {
    if (err) { console.error(err); process.exit(1); }
    console.log(hash);
  });
" "${PASSWORD}" 2>/dev/null)

if [[ -z "${PASSWORD_HASH}" ]]; then
  echo "[ERROR] Failed to generate bcrypt hash"
  exit 1
fi

echo "[INFO] Inserting admin user into database..."

psql "${DATABASE_URL}" -c "
INSERT INTO users (id, email, password_hash, role, created_at)
VALUES (
  gen_random_uuid(),
  '${EMAIL}',
  '${PASSWORD_HASH}',
  'admin',
  NOW()
)
ON CONFLICT (email) DO UPDATE
  SET role = 'admin',
      password_hash = EXCLUDED.password_hash;
SELECT id, email, role FROM users WHERE email = '${EMAIL}';
"

echo "[INFO] Admin user created/updated for: ${EMAIL}"
