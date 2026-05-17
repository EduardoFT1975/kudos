#!/usr/bin/env bash
# build.sh — Script ejecutado por Render durante el despliegue.
set -o errexit  # Sale si algo falla

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --noinput
