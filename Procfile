web: gunicorn kudos_project.wsgi --log-file - --bind 0.0.0.0:$PORT
release: python manage.py migrate --noinput
