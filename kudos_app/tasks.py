from celery import shared_task
from django.utils import timezone
from kudos_app.models import User, Capsule, Notification
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

@shared_task
def send_user_notifications():
    active_users = User.objects.filter(is_active=True)
    notification_count = 0
    for user in active_users:
        recent_capsules = Capsule.objects.filter(
            usuario=user,
            timestamp__gte=timezone.now() - timedelta(days=1)
        ).count()
        if recent_capsules > 0:
            Notification.objects.create(
                user=user,
                type='activity_summary',
                message=f"Tienes {recent_capsules} cápsulas nuevas en el último día.",
                priority='media'
            )
            notification_count += 1
    logger.info(f"Se enviaron {notification_count} notificaciones a usuarios activos.")

@shared_task
def process_expired_capsules():
    logger.info("Procesando cápsulas expiradas...")
    # Lógica para procesar cápsulas expiradas
    pass

@shared_task
def update_global_statistics():
    logger.info("Actualizando estadísticas globales...")
    # Lógica para actualizar estadísticas
    pass