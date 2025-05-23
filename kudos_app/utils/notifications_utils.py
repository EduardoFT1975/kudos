# kudos_app/utils/notifications_utils.py

"""
Módulo utilitario para gestionar notificaciones en Kudos.
Proporciona funciones para crear, enviar y manejar notificaciones multidimensionales.
"""

from kudos_app.models import User, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from datetime import datetime
import json

def create_notification(user, notification_type, message, priority='media', location=None):
    """
    Crea una notificación para un usuario específico.

    Args:
        user (User): El usuario receptor de la notificación.
        notification_type (str): Tipo de notificación (e.g., 'like', 'purchase').
        message (str): Mensaje de la notificación.
        priority (str): Prioridad ('baja', 'media', 'alta'). Default: 'media'.
        location (Point, optional): Ubicación asociada a la notificación.
    """
    config = SettingsConfig.objects.get_or_create(key="notifications_settings")[0]
    default_priority = config.parameters.get("default_priority", "media")
    notification_distance = config.variables.get("default_notification_distance", 500)

    notification = Notification(
        user=user,
        type=notification_type,
        message=message[:255],  # Limitar longitud para evitar errores en la base de datos
        priority=priority if priority in ['baja', 'media', 'alta'] else default_priority,
        location=location,
        parameters={'timestamp': datetime.now().isoformat()},
        variables={'distance': notification_distance}
    )
    notification.save()
    return notification

def send_global_notification(message, priority='alta', exclude_user=None):
    """
    Envía una notificación a todos los usuarios activos, excluyendo opcionalmente a uno.

    Args:
        message (str): Mensaje de la notificación.
        priority (str): Prioridad ('baja', 'media', 'alta'). Default: 'alta'.
        exclude_user (User, optional): Usuario a excluir del envío.
    """
    users = User.objects.filter(is_active=True)
    if exclude_user:
        users = users.exclude(uid=exclude_user.uid)

    for user in users:
        create_notification(
            user=user,
            notification_type='global',
            message=message,
            priority=priority
        )

def get_user_notifications(user, time_range=None, priority_filter=None, type_filter=None):
    """
    Obtiene las notificaciones de un usuario con filtros opcionales.

    Args:
        user (User): El usuario cuyas notificaciones se recuperan.
        time_range (int, optional): Días atrás para filtrar (e.g., 7 para última semana).
        priority_filter (list, optional): Lista de prioridades a filtrar (e.g., ['alta', 'media']).
        type_filter (list, optional): Lista de tipos a filtrar (e.g., ['like', 'purchase']).

    Returns:
        QuerySet: Notificaciones filtradas.
    """
    notifications = Notification.objects.filter(user=user)
    
    if time_range:
        notifications = notifications.filter(timestamp__gte=datetime.now() - timedelta(days=time_range))
    if priority_filter:
        notifications = notifications.filter(priority__in=priority_filter)
    if type_filter:
        notifications = notifications.filter(type__in=type_filter)
    
    return notifications.order_by('-timestamp')

def mark_notification_as_read(notification_id):
    """
    Marca una notificación como leída.

    Args:
        notification_id (str): ID de la notificación a marcar.
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        if notification.status != 'Leída':
            notification.status = 'Leída'
            notification.save()
            return True
        return False
    except Notification.DoesNotExist:
        return False

def send_location_based_notification(message, location, distance, priority='media'):
    """
    Envía una notificación a usuarios dentro de un rango de distancia de una ubicación.

    Args:
        message (str): Mensaje de la notificación.
        location (Point): Centro del rango de distancia.
        distance (int): Distancia en metros.
        priority (str): Prioridad ('baja', 'media', 'alta'). Default: 'media'.
    """
    from django.contrib.gis.measure import D
    users = User.objects.filter(
        ubicacion__distance_lte=(location, D(m=distance)),
        is_active=True
    )
    for user in users:
        create_notification(
            user=user,
            notification_type='location_based',
            message=message,
            priority=priority,
            location=location
        )