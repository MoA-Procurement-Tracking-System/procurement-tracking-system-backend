#!/usr/bin/env bash
# Usage: ./scripts/backup-db.sh
# Requires: pg_dump, DATABASE_URL in environment or .env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

: "${DATABASE_URL:?DATABASE_URL is required}"

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/procurement_$TIMESTAMP.sql.gz"

echo "Backing up database to $BACKUP_FILE ..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
echo "Backup complete: $BACKUP_FILE"

# Remove backups older than 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
echo "Old backups pruned (>7 days)."
