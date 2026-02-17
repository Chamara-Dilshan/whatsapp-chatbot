#!/bin/bash
# PostgreSQL backup script
# Add to crontab: 0 2 * * * bash /path/to/backup-db.sh >> /var/log/db-backup.log 2>&1

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/whatsapp_bot_${TIMESTAMP}.sql.gz"
RETAIN_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Dump and compress
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h postgres \
  -U "${DB_USER:-whatsapp_bot}" \
  -d "${DB_NAME:-whatsapp_bot}" \
  --no-password \
  | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup saved: $BACKUP_FILE"

# Remove backups older than RETAIN_DAYS
find "$BACKUP_DIR" -name "whatsapp_bot_*.sql.gz" -mtime +${RETAIN_DAYS} -delete
echo "[$(date)] Old backups cleaned (>${RETAIN_DAYS} days)"
