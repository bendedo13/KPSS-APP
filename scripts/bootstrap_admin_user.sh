#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Bootstrap an admin user in the KPSS database.

Required:
  --email EMAIL        Admin user email address
  --password PASSWORD  Admin user password

Optional:
  --db-url URL         PostgreSQL connection URL
                       (default: \$DATABASE_URL or postgresql://localhost:5432/kpss)
  --dry-run            Print the SQL statement without executing it

Examples:
  $(basename "$0") --email admin@kpss.dev --password s3cret
  $(basename "$0") --email admin@kpss.dev --password s3cret --db-url postgresql://user:pass@host:5432/kpss
  $(basename "$0") --email admin@kpss.dev --password s3cret --dry-run
EOF
  exit 1
}

EMAIL=""
PASSWORD=""
DB_URL="${DATABASE_URL:-postgresql://localhost:5432/kpss}"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)
      EMAIL="$2"; shift 2 ;;
    --password)
      PASSWORD="$2"; shift 2 ;;
    --db-url)
      DB_URL="$2"; shift 2 ;;
    --dry-run)
      DRY_RUN=true; shift ;;
    -h|--help)
      usage ;;
    *)
      echo "Error: unknown option '$1'" >&2
      usage ;;
  esac
done

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "Error: --email and --password are required." >&2
  usage
fi

# Generate bcrypt hash using Python 3 (with fallback to htpasswd)
generate_hash() {
  if command -v python3 &>/dev/null; then
    python3 -c "
import hashlib, base64, os
try:
    import bcrypt
    print(bcrypt.hashpw('''${PASSWORD}'''.encode(), bcrypt.gensalt()).decode())
except ImportError:
    import crypt
    print(crypt.crypt('''${PASSWORD}''', crypt.mksalt(crypt.METHOD_SHA512)))
"
  else
    echo "Error: python3 is required to generate password hash." >&2
    exit 1
  fi
}

HASH=$(generate_hash)

SQL="INSERT INTO users (email, password_hash, role, created_at, updated_at)
VALUES ('${EMAIL}', '${HASH}', 'admin', NOW(), NOW())
ON CONFLICT (email)
DO UPDATE SET password_hash = EXCLUDED.password_hash,
             role = 'admin',
             updated_at = NOW();"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "-- Dry run: SQL that would be executed --"
  echo "$SQL"
  exit 0
fi

echo "Creating admin user: ${EMAIL} ..."
psql "$DB_URL" -c "$SQL"
echo "Done. Admin user '${EMAIL}' created/updated."
