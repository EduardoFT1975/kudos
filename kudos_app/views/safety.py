# kudos_app/views/safety.py

"""
Vista para gestionar la localización de personas, alertas por caídas y SOS en Kudos.
Utiliza campos genéricos para configuraciones y se integra con el modo piloto automático.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Alert, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from datetime import datetime, timedelta
import json

def safety(request):
    """
    Vista para gestionar la localización de personas, alertas por caídas y SOS.
    Utiliza campos genéricos para configuraciones y se integra con el modo piloto automático.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Seguridad en Kudos")
        st.write("Configura y gestiona tu seguridad con localización, detección de caídas y SOS.")

        # Configuración genérica desde SettingsConfig
        safety_config = SettingsConfig.objects.get_or_create(key="safety_settings")[0]
        parameters = safety_config.parameters
        variables = safety_config.variables
        enable_fall_detection = parameters.get('enable_fall_detection', False)
        sos_contacts = parameters.get('sos_contacts', [user.alias])  # Lista por defecto con el usuario
        notification_distance = variables.get('notification_distance', user.notification_distance)

        # Sección: Localización de Personas
        st.header("Localización de Personas")
        st.write("Localiza a tus contactos en tiempo real (solo con consentimiento).")
        followers = User.objects.filter(followers=user).exclude(ubicacion__isnull=True)
        selected_follower = st.selectbox("Selecciona un Contacto", [f.alias for f in followers] + ["Ninguno"])
        if selected_follower != "Ninguno":
            follower = User.objects.get(alias=selected_follower)
            if follower.ubicacion and follower.share_location_with_followers:
                st.write(f"**Ubicación de {follower.alias}:** ({follower.ubicacion.y}, {follower.ubicacion.x})")
                st.map([{'lat': follower.ubicacion.y, 'lon': follower.ubicacion.x}], zoom=10)
            else:
                st.warning("Este contacto no ha compartido su ubicación.")

        # Sección: Alertas por Caídas
        st.header("Alertas por Caídas")
        st.write("Recibe alertas si detectamos una caída (requiere permisos de sensor).")
        enable_fall_detection = st.checkbox("Habilitar Detección de Caídas", value=enable_fall_detection)
        parameters['enable_fall_detection'] = enable_fall_detection

        if enable_fall_detection and user.ubicacion:
            if st.button("Simular Caída"):
                Alert.objects.create(
                    uid=f"fall_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    type='fall',
                    message=f"Se detectó una caída para {user.alias}.",
                    severity='alta',
                    location=user.ubicacion,
                    timestamp=datetime.now(),
                    expiration=datetime.now() + timedelta(hours=1),
                    parameters={'source': 'sensor'},
                    variables={'distance': notification_distance}
                )
                Notification.objects.create(
                    user=user,
                    type='fall',
                    message="Se detectó una caída. ¿Necesitas ayuda?",
                    priority='alta',
                    location=user.ubicacion
                )
                st.warning("Alerta de caída generada.")

        # Sección: SOS
        st.header("SOS")
        st.write("Envía una señal de emergencia a tus contactos.")
        sos_contacts_input = st.text_input("Contactos para SOS (separados por comas)", value=",".join(sos_contacts))
        sos_contacts = [contact.strip() for contact in sos_contacts_input.split(",")]

        if st.button("Enviar SOS"):
            for contact_alias in sos_contacts:
                contact = User.objects.filter(alias=contact_alias).first()
                if contact:
                    Notification.objects.create(
                        user=contact,
                        type='sos',
                        message=f"{user.alias} ha enviado un SOS desde ({user.ubicacion.y}, {user.ubicacion.x}).",
                        priority='alta',
                        location=user.ubicacion,
                        parameters={'source': 'user'},
                        variables={'distance': notification_distance}
                    )
            st.success("SOS enviado a tus contactos.")

        # Guardar Configuración
        if st.button("Guardar Configuración"):
            parameters['sos_contacts'] = sos_contacts
            safety_config.parameters = parameters
            safety_config.variables['notification_distance'] = notification_distance
            safety_config.save()
            Notification.objects.create(
                user=user,
                type='safety_update',
                message="Tus configuraciones de seguridad han sido actualizadas.",
                priority='baja'
            )
            st.success("Configuración de seguridad guardada.")

        # Mapa de Alertas Activas
        st.header("Alertas Activas Cercanas")
        alerts = Alert.objects.filter(
            status='activa',
            location__distance_lte=(user.ubicacion, D(m=notification_distance)),
            expiration__gte=datetime.now()
        )
        if alerts.exists():
            map_data = [{'lat': alert.location.y, 'lon': alert.location.x, 'description': f"{alert.type}: {alert.message[:50]}..."} for alert in alerts]
            st.map(map_data, zoom=10)
        else:
            st.write("No hay alertas activas cercanas.")

    return render(request, 'safety.html')