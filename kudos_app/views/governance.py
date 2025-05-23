```python
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
    'process-expired-auctions-every-minute': {
        'task': 'kudos_app.tasks.process_expired_auctions',
        'schedule': crontab(minute='*/1'),
    },
    'assign-learning-badges-every-day': {
        'task': 'kudos_app.tasks.assign_learning_badges',
        'schedule': crontab(hour=1, minute=0),
    },
    'update-adaptive-recommendations-every-6-hours': {
        'task': 'kudos_app.tasks.update_adaptive_recommendations',
        'schedule': crontab(hour='*/6', minute=0),
    },
    'expire-market-listings-every-day': {
        'task': 'kudos_app.tasks.expire_market_listings',
        'schedule': crontab(hour=2, minute=0),
    },
    'update-seller-reputation-every-day': {
        'task': 'kudos_app.tasks.update_seller_reputation',
        'schedule': crontab(hour=3, minute=0),
    },
    'update-space-data-every-12-hours': {
        'task': 'kudos_app.tasks.update_space_data',
        'schedule': crontab(hour='*/12', minute=0),
    },
    'archive-notifications-every-week': {
        'task': 'kudos_app.tasks.archive_notifications',
        'schedule': crontab(hour=4, minute=0, day_of_week='mon'),
    },
    'send-mental-health-reminders-every-12-hours': {
        'task': 'kudos_app.tasks.send_mental_health_reminders',
        'schedule': crontab(hour='*/12', minute=0),
    },
    'update-mental-health-recommendations-every-6-hours': {
        'task': 'kudos_app.tasks.update_mental_health_recommendations',
        'schedule': crontab(hour='*/6', minute=0),
    },
    'curate-art-capsules-every-day': {
        'task': 'kudos_app.tasks.curate_art_capsules',
        'schedule': crontab(hour=5, minute=0),
    },
    'update-art-recommendations-every-6-hours': {
        'task': 'kudos_app.tasks.update_art_recommendations',
        'schedule': crontab(hour='*/6', minute=0),
    },
    'curate-tourism-capsules-every-day': {
        'task': 'kudos_app.tasks.curate_tourism_capsules',
        'schedule': crontab(hour=6, minute=0),
    },
    'update-tourism-recommendations-every-6-hours': {
        'task': 'kudos_app.tasks.update_tourism_recommendations',
        'schedule': crontab(hour='*/6', minute=0),
    },
    'curate-innovation-capsules-every-day': {
        'task': 'kudos_app.tasks.curate_innovation_capsules',
        'schedule': crontab(hour=7, minute=0),
    },
    'update-innovation-recommendations-every-6-hours': {
        'task': 'kudos_app.tasks.update_innovation_recommendations',
        'schedule': crontab(hour='*/6', minute=0),
    },
    'moderate-social-interactions-every-hour': {
        'task': 'kudos_app.tasks.moderate_social_interactions',
        'schedule': crontab(minute=0, hour='*'),
    },
    'update-social-recommendations-every-6-hours': {
        'task': 'kudos_app.tasks.update_social_recommendations',
        'schedule': crontab(hour='*/6', minute=0),
    },
    'moderate-governance-proposals-every-hour': {
        'task': 'kudos_app.tasks.moderate_governance_proposals',
        'schedule': crontab(minute=0, hour='*'),
    },
    'process-governance-votes-every-day': {
        'task': 'kudos_app.tasks.process_governance_votes',
        'schedule': crontab(hour=8, minute=0),
    },
}
```