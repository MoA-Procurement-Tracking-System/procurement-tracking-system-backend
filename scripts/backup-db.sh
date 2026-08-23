#!/usr/bin/env bash
# Usage: ./scripts/backup-db.sh
# Requires: pg_dump, DATABASE_URL in environment or .env
#
# Backup files are kept locally forever.
# IT: fill in one of the transfer options in the TODO block below
# once the second server access method is confirmed.

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

echo "[backup] Starting pg_dump → $BACKUP_FILE"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
echo "[backup] Local backup complete: $BACKUP_FILE"

# ---------------------------------------------------------------------------
# TODO (IT): Off-server transfer
# ---------------------------------------------------------------------------
# Once IT confirms how the second server is accessible, uncomment ONE block.
#
# Option A — Mounted network share (NFS/SMB already mounted at $BACKUP_REMOTE_PATH):
#
#   REMOTE_PATH="${BACKUP_REMOTE_PATH:-}"
#   if [ -n "$REMOTE_PATH" ]; then
#     cp "$BACKUP_FILE" "$REMOTE_PATH/"
#     echo "[backup] Copied to mounted share: $REMOTE_PATH"
#   else
#     echo "[backup] WARN: BACKUP_REMOTE_PATH not set — skipping remote copy"
#   fi
#
# Option B — rsync over SSH (SSH key auth must already be configured):
#
#   REMOTE_PATH="${BACKUP_REMOTE_PATH:-}"   # e.g. backupuser@192.168.1.50:/backups/procurement
#   if [ -n "$REMOTE_PATH" ]; then
#     rsync -az --no-perms "$BACKUP_FILE" "$REMOTE_PATH/"
#     echo "[backup] Sent via rsync to: $REMOTE_PATH"
#   else
#     echo "[backup] WARN: BACKUP_REMOTE_PATH not set — skipping rsync"
#   fi
#
# ---------------------------------------------------------------------------

echo "[backup] Done."
