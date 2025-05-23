# kudos_app/views/notifications.py

"""
Vista para gestionar notificaciones y alertas en Kudos.
Muestra mensajes personalizados y permite configurar preferencias de notificación.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from datetime import datetime, timedelta

def notifications(request):
    """
    Vista para gestionar notificaciones y alertas del usuario.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Notificaciones y Alertas en Kudos")
        st.write("Revisa tus mensajes y configura cómo recibir notificaciones.")

        # Configuración genérica desde SettingsConfig
        notif_config = SettingsConfig.objects.get_or_create(key="notifications_settings")[0]
        default_priority_filter = notif_config.parameters.get("default_priority_filter", ["alta", "media", "baja"])
        default_types = notif_config.parameters.get("default_types", ["like", "comment", "share", "support", "geolocation_update"])
        notification_distance = user.notification_distance if user else notif_config.variables.get("default_notification_distance", 500)

        # Mostrar Notificaciones
        st.header("Tus Notificaciones")
        time_range = st.selectbox(
            "Rango Temporal",
            ["Última Hora", "Último Día", "Última Semana", "Último Mes"],
            index=2  # Última Semana por defecto
        )
        time_filters = {
            "Última Hora": timedelta(hours=1),
            "Último Día": timedelta(days=1),
            "Última Semana": timedelta(weeks=1),
            "Último Mes": timedelta(days=30)
        }
        time_delta = time_filters[time_range]

        # Filtros de Notificaciones
        priority_filter = st.multiselect("Filtrar por Prioridad", ["alta", "media", "baja"], default=default_priority_filter)
        type_filter = st.multiselect("Filtrar por Tipo", default_types, default=default_types)

        notifications = Notification.objects.filter(
            user=user,
            priority__in=priority_filter,
            type__in=type_filter,
            timestamp__gte=datetime.now() - time_delta
        ).order_by('-timestamp')

        if notifications.exists():
            for notif in notifications:
                st.subheader(f"{notif.type.capitalize()} - {notif.priority.capitalize()}")
                st.write(f"**Mensaje:** {notif.message}")
                st.write(f"**Fecha:** {notif.timestamp}")
                if notif.location:
                    st.write(f"**Ubicación:** ({notif.location.y}, {notif.location.x})")
                st.write(f"**Estado:** {notif.status}")
                if st.button(f"Marcar como Leída - {notif.id}", key=f"read_{notif.id}") and notif.status != "Leída":
                    notif.status = "Leída"
                    notif.save()
                    st.success("Notificación marcada como leída.")
                st.write("---")
        else:
            st.info("No hay notificaciones para los filtros seleccionados.")

        # Configurar Preferencias de Notificación
        st.header("Configurar Preferencias")
        st.write("Personaliza cómo y cuándo recibir notificaciones.")
        
        notification_privacy = st.selectbox(
            "Privacidad de Notificación",
            ["solo_yo", "familia", "amigos", "publico"],
            index=["solo_yo", "familia", "amigos", "publico"].index(user.notification_privacy)
        )
        notification_distance = st.slider(
            "Distancia de Notificación (metros)",
            min_value=100,
            max_value=5000,
            value=user.notification_distance,
            step=100
        )
        notify_types = st.multiselect(
            "Tipos de Notificaciones a Recibir",
            default_types,
            default=[t for t in default_types if t in user.necesidades] if user.necesidades else default_types
        )

        if st.button("Guardar Preferencias"):
            user.notification_privacy = notification_privacy
            user.notification_distance = notification_distance
            notif_config.parameters["default_types"] = notify_types
            user.save()
            notif_config.save()
            Notification.objects.create(
                user=user,
                type='settings_update',
                message="Tus preferencias de notificación han sido actualizadas.",
                priority='baja'
            )
            st.success("Preferencias guardadas.")

        # Mapa de Notificaciones con Ubicación
        if user.ubicacion:
            st.header("Notificaciones en el Mapa")
            map_data = [
                {'lat': notif.location.y, 'lon': notif.location.x, 'description': f"{notif.type}: {notif.message[:50]}..."}
                for notif in notifications if notif.location
            ]
            if map_data:
                st.map(map_data, zoom=10)
            else:
                st.write("No hay notificaciones con ubicación para mostrar.")

    else:  # Renderizado en Django
        if request.method == "POST":
            notification_privacy = request.POST.get("notification_privacy", "publico")
            notification_distance = int(request.POST.get("notification_distance", 500))
            notify_types = request.POST.getlist("notify_types")

            user.notification_privacy = notification_privacy
            user.notification_distance = notification_distance
            notif_config = SettingsConfig.objects.get_or_create(key="notifications_settings")[0]
            notif_config.parameters["default_types"] = notify_types
            user.save()
            notif_config.save()
            Notification.objects.create(
                user=user,
                type='settings_update',
                message="Tus preferencias de notificación han sido actualizadas.",
                priority='baja'
            )
            messages.success(request, "Preferencias guardadas.")
            return redirect('notifications')

        notifications = Notification.objects.filter(user=user).order_by('-timestamp')
        return render(request, 'notifications.html', {'notifications': notifications})
