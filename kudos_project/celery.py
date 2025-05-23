from celery import Celery
from celery.schedules import crontab
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kudos_project.settings')
app = Celery('kudos_project')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'send-notifications-every-hour': {
        'task': 'kudos_app.tasks.send_user_notifications',
        'schedule': crontab(minute=0, hour='*'),
    },
    'process-expired-capsules-every-day': {
        'task': 'kudos_app.tasks.process_expired_capsules',
        'schedule': crontab(hour=0, minute=0),
    },
    'update-statistics-every-hour': {
        'task': 'kudos_app.tasks.update_global_statistics',
        'schedule': crontab(minute=0, hour='*'),
    },
}