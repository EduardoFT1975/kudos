#!/usr/bin/env bash
#
# KUDOS Postgres backup script · T1.5.
#
# Uso:
#   DATABASE_URL=postgresql://... ./scripts_local/backup_postgres.sh
#
# Produce: backups/kudos_YYYYMMDD_HHMMSS.sql.gz
#
# Render incluye backups diarios automaticos (Postgres Standard 7d retention),
# pero esto permite backup manual ad-hoc (antes de migracion riesgosa, etc.).

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL no definida"
  exit 1
fi

# Normaliza URL: pg_dump no entiende +asyncpg
URL="${DATABASE_URL/postgresql+asyncpg:\/\//postgresql:\/\/}"
URL="${URL/postgresql+psycopg2:\/\//postgresql:\/\/}"

mkdir -p backups
TS=$(date -u +%Y%m%d_%H%M%S)
OUT="backups/kudos_${TS}.sql.gz"

echo "[backup] Dumping to ${OUT} ..."
pg_dump --no-owner --no-acl --clean --if-exists "${URL}" | gzip > "${OUT}"
echo "[backup] OK · $(du -h "${OUT}" | cut -f1) · ${OUT}"

# Mantener solo los ultimos 14 backups locales
ls -1t backups/kudos_*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "[backup] cleanup done"
