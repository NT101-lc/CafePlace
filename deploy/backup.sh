#!/usr/bin/env bash
# Dump the production database to a gzip file and delete dumps older than KEEP_DAYS.
#
# Usage:   ./backup.sh [backup_dir]          (default: ./backups next to this script)
# Cron:    0 3 * * * /opt/cms/deploy/backup.sh >> /var/log/cms-backup.log 2>&1
# Restore: gunzip -c backups/cms-XXXX.sql.gz | docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
#
# NOTE: backups on the same server are lost with the server. Copy them somewhere else too.
set -euo pipefail

cd "$(dirname "$0")"
BACKUP_DIR="${1:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$BACKUP_DIR"

file="$BACKUP_DIR/cms-$(date +%Y%m%d-%H%M%S).sql.gz"
trap 'rm -f "$file.tmp"' ERR

# Credentials come from the postgres container's own environment.
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip > "$file.tmp"
mv "$file.tmp" "$file"

find "$BACKUP_DIR" -name 'cms-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date '+%F %T') backup written: $file"
