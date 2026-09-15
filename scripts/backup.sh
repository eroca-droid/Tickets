#!/usr/bin/env bash
set -euo pipefail

BACKUP_OUTPUT_DIR="${BACKUP_OUTPUT_DIR:-./backups}"
BACKUP_TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_OUTPUT_DIR"
docker compose exec -T database sh -c \
  'pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom' \
  > "$BACKUP_OUTPUT_DIR/database-$BACKUP_TIMESTAMP.dump"

tar -czf "$BACKUP_OUTPUT_DIR/evidence-$BACKUP_TIMESTAMP.tar.gz" storage/evidence
echo "Backup creado en $BACKUP_OUTPUT_DIR ($BACKUP_TIMESTAMP)."
