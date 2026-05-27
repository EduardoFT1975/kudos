#!/usr/bin/env bash
# KUDOS · dev server con acceso desde red local
# Levanta Next.js en 0.0.0.0:3000 para que iPhone / Android puedan
# acceder vía http://<TU_IP>:3000
#
# Uso:
#   ./scripts/dev-local.sh
#
# La IP a usar desde el móvil es la de tu máquina en la LAN:
#   macOS:    ipconfig getifaddr en0
#   Linux:    hostname -I | awk '{print $1}'
#   Windows:  ipconfig | findstr IPv4
set -e
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3000}"
echo ""
echo "  KUDOS · arrancando dev server en ${HOST}:${PORT}"
echo "  ▸ accede desde tu móvil con  http://<TU_IP>:${PORT}"
echo ""
exec next dev -H "${HOST}" -p "${PORT}"
