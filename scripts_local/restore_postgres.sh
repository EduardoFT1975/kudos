#!/usr/bin/env bash
#
# KUDOS Postgres restore script · T1.5.
#
# Uso:
#   DATABASE_URL=postgresql://... ./scripts_local/restore_postgres.sh backups/kudos_20260529_103000.sql.gz
#
# CUIDADO: --clean --if-exists del backup borra y recrea tablas.

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL no definida"
  exit 1
fi
if [ $# -lt 1 ]; then
  echo "Uso: $0 <backup.sql.gz>"
  exit 1
fi

BACKUP="$1"
if [ ! -f "${BACKUP}" ]; then
  echo "ERROR: ${BACKUP} no existe"
  exit 1
fi

URL="${DATABASE_URL/postgresql+asyncpg:\/\//postgresql:\/\/}"
URL="${URL/postgresql+psycopg2:\/\//postgresql:\/\/}"

echo "[restore] Restoring from ${BACKUP} ..."
echo "[restore] Confirma escribiendo YES y enter:"
read CONFIRM
if [ "${CONFIRM}" != "YES" ]; then
  echo "[restore] Abortado."
  exit 1
fi

gunzip -c "${BACKUP}" | psql "${URL}"
echo "[restore] OK"
