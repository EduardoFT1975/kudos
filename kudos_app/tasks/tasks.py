# kudos_app/task.py

# kudos_app/task.py

import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

# Configurar el logger para el módulo
logger = logging.getLogger(__name__)

@shared_task
def process_expired_capsules():
    """Procesa cápsulas expiradas cambiando su privacidad a 'solo_yo' si ha pasado el tiempo definido por la frecuencia."""
    # Importar los modelos dentro de la función para evitar carga prematura
    from kudos_app.models import Capsule, SettingsConfig

    logger.info("Iniciando procesamiento de cápsulas expiradas...")
    try:
        # Obtener la configuración de frecuencia
        config = SettingsConfig.objects.get(key="processing_frequency")
        frequency_hours = config.value  # e.g., 24 para diario
        last_run = config.last_run

        # Verificar si es momento de procesar según la frecuencia
        if last_run is None or (timezone.now() - last_run) >= timedelta(hours=frequency_hours):
            # Encuentra cápsulas cuya fecha sea anterior a hace 7 días
            expired = Capsule.objects.filter(fecha__lt=timezone.now() - timedelta(days=7))
            count = expired.count()  # Contar cuántas cápsulas se procesarán
            # Actualiza la privacidad de todas las cápsulas expiradas
            expired.update(privacy='solo_yo')
            logger.info(f"Procesadas {count} cápsulas expiradas.")
            # Actualizar la última ejecución
            config.last_run = timezone.now()
            config.save()
    except SettingsConfig.DoesNotExist:
        logger.error("Configuración 'processing_frequency' no encontrada. No se procesaron cápsulas.")
    except Exception as e:
        logger.error(f"Error al procesar cápsulas expiradas: {str(e)}")

@shared_task
def send_notifications():
    """Envía notificaciones pendientes y marca como enviadas si ha pasado el tiempo definido por la frecuencia."""
    # Importar los modelos dentro de la función para evitar carga prematura
    from kudos_app.models import Notification, SettingsConfig

    logger.info("Iniciando envío de notificaciones...")
    try:
        # Obtener la configuración de frecuencia
        config = SettingsConfig.objects.get(key="processing_frequency")
        frequency_hours = config.value  # e.g., 24 para diario
        last_run = config.last_run

        # Verificar si es momento de enviar según la frecuencia
        if last_run is None or (timezone.now() - last_run) >= timedelta(hours=frequency_hours):
            # Encuentra notificaciones pendientes
            pending = Notification.objects.filter(sent=False)
            for notification in pending:
                # Aquí iría la lógica específica para enviar notificaciones
                # Ejemplo: send_email(notification.user.email, notification.message)
                notification.sent = True
                notification.save()
            logger.info(f"Enviadas {pending.count()} notificaciones.")
            # Actualizar la última ejecución
            config.last_run = timezone.now()
            config.save()
    except SettingsConfig.DoesNotExist:
        logger.error("Configuración 'processing_frequency' no encontrada. No se enviaron notificaciones.")
    except Exception as e:
        logger.error(f"Error al enviar notificaciones: {str(e)}")