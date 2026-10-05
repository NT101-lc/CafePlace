#!/usr/bin/env bash
# Backs up the production database and the uploaded images, then deletes backups older than KEEP_DAYS.
#   backups/cms-db-YYYYMMDD-HHMMSS.sql.gz      pg_dump of PostgreSQL
#   backups/cms-media-YYYYMMDD-HHMMSS.tar.gz   RustFS data directory (menu images)
#
# Usage:   ./backup.sh [backup_dir]          (default: ./backups next to this script)
# Cron:    0 3 * * * /opt/cms/deploy/backup.sh >> /var/log/cms-backup.log 2>&1
#
# Restore database:
#   gunzip -c backups/cms-db-XXXX.sql.gz | docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
# Restore images (stops RustFS while copying):
#   docker compose stop rustfs
#   gunzip -c backups/cms-media-XXXX.tar.gz | docker compose run --rm -T --entrypoint tar rustfs -xf - -C /data
#   docker compose up -d --wait rustfs      (wait until healthy before serving images again)
#
# NOTE: backups on the same server are lost with the server. Copy them somewhere else too.
set -euo pipefail

cd "$(dirname "$0")"
BACKUP_DIR="${1:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$BACKUP_DIR"

stamp="$(date +%Y%m%d-%H%M%S)"
db_file="$BACKUP_DIR/cms-db-$stamp.sql.gz"
media_file="$BACKUP_DIR/cms-media-$stamp.tar.gz"
trap 'rm -f "$db_file.tmp" "$media_file.tmp"' ERR

# Credentials come from the postgres container's own environment.
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip > "$db_file.tmp"
mv "$db_file.tmp" "$db_file"

# The RustFS image has tar but no gzip, so compress on the host side.
docker compose exec -T rustfs tar -cf - -C /data . | gzip > "$media_file.tmp"
mv "$media_file.tmp" "$media_file"

find "$BACKUP_DIR" \( -name 'cms-db-*.sql.gz' -o -name 'cms-media-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete
echo "$(date '+%F %T') backup written: $db_file, $media_file"
