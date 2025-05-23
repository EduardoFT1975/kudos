# kudos_app/views/health_monitor.py

"""
Vista para el Monitoreo de Salud y Bienestar Multidimensional en Kudos.
Permite rastrear salud física y mental con alertas y recomendaciones.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, Alert, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from datetime import datetime, timedelta
import json
from openai import OpenAI

def health_monitor(request):
    """
    Vista para monitorear y gestionar la salud y el bienestar del usuario en Kudos.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Monitoreo de Salud y Bienestar")
        st.write("Rastrea tu salud física y mental con datos multidimensionales.")

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        # Configuración desde SettingsConfig
        health_config = SettingsConfig.objects.get_or_create(key="health_monitor_settings")[0]
        health_metrics = health_config.parameters.get("health_metrics", ["Actividad Física", "Sueño", "Estrés", "Nutrición"])
        alert_thresholds = health_config.parameters.get("alert_thresholds", {
            "Actividad Física": {"min": 30},  # Minutos diarios
            "Sueño": {"min": 6},             # Horas diarias
            "Estrés": {"max": 7},            # Escala 1-10
            "Nutrición": {"min": 2000}       # Calorías diarias
        })
        notification_distance = health_config.variables.get("notification_distance", user.notification_distance)

        # Sección: Registrar Datos de Salud
        st.header("Registrar Datos de Salud")
        st.write("Ingresa tus métricas diarias para un monitoreo personalizado.")
        metric = st.selectbox("Métrica de Salud", health_metrics)
        value = st.number_input(f"Valor para {metric}", min_value=0.0, step=0.1)
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        if st.button("Registrar Datos"):
            capsule = Capsule(
                uid=f"health_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                usuario=user,
                contenido=f"Registro de {metric}: {value}",
                ubicacion=location,
                modo='salud',
                fecha=datetime.now().date(),
                privacy='solo_yo',
                time_scale='dia',
                price=0.0,
                temas=['Salud'],
                parameters={'metric': metric, 'value': value},
                variables={'timestamp': datetime.now().isoformat()}
            )
            capsule.save()

            # Verificar umbrales y generar alertas
            thresholds = alert_thresholds.get(metric, {})
            if (thresholds.get("min") and value < thresholds["min"]) or (thresholds.get("max") and value > thresholds["max"]):
                Alert.objects.create(
                    uid=f"alert_{metric}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    type='health',
                    message=f"Alerta: {metric} fuera de rango ({value}).",
                    severity='media',
                    location=location,
                    timestamp=datetime.now(),
                    expiration=datetime.now() + timedelta(hours=24),
                    parameters={'metric': metric, 'value': value},
                    variables={'distance': notification_distance}
                )
                Notification.objects.create(
                    user=user,
                    type='health_alert',
                    message=f"Alerta: {metric} fuera de rango ({value}).",
                    priority='media',
                    location=location
                )
            Notification.objects.create(
                user=user,
                type='health_record',
                message=f"Registraste {metric}: {value}.",
                priority='baja'
            )
            st.success("Datos de salud registrados.")

        # Sección: Monitoreo y Recomendaciones
        st.header("Monitoreo y Recomendaciones")
        health_records = Capsule.objects.filter(
            usuario=user,
            modo='salud',
            timestamp__gte=datetime.now() - timedelta(days=7)
        ).order_by('-timestamp')
        
        if health_records.exists():
            st.subheader("Registros Recientes (Última Semana)")
            for record in health_records[:5]:
                st.write(f"**{record.parameters['metric']}:** {record.parameters['value']} ({record.timestamp.strftime('%Y-%m-%d %H:%M')})")
            st.write("---")

            if st.button("Generar Recomendaciones"):
                context = (
                    f"Usuario: {user.alias}. "
                    f"Registros de salud (última semana): "
                    + ', '.join([r.parameters['metric'] + ': ' + str(r.parameters['value']) for r in health_records]) +
                    (f" Ubicación: ({user.ubicacion.y}, {user.ubicacion.x})" if user.ubicacion else " Sin ubicación.")
                )
                prompt = (
                    f"Actúa como un recomendador de salud para Kudos. "
                    f"Basado en el siguiente contexto: {context}, "
                    f"sugiere 3 recomendaciones personalizadas para mejorar la salud física o mental del usuario. "
                    f"Considera las dimensiones 5D: contenido, geolocalización, tiempo, temas y climatología."
                )
                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "user", "content": prompt}]
                )
                recommendations = response.choices[0].message.content.split('\n\n')
                st.session_state.recommendations = recommendations[:3]
                Notification.objects.create(
                    user=user,
                    type='health_recommendation',
                    message="Se generaron nuevas recomendaciones de salud para ti.",
                    priority='media'
                )

            if 'recommendations' in st.session_state:
                st.subheader("Recomendaciones Personalizadas")
                for i, rec in enumerate(st.session_state.recommendations, 1):
                    st.write(f"**Recomendación {i}:** {rec}")

        else:
            st.info("No hay registros de salud en la última semana.")

        # Sección: Alertas Activas
        st.header("Alertas Activas")
        alerts = Alert.objects.filter(
            usuario=user,
            status='activa',
            expiration__gte=datetime.now()
        )
        if alerts.exists():
            for alert in alerts:
                st.write(f"**{alert.type.capitalize()}:** {alert.message} (Severidad: {alert.severity})")
                if alert.location:
                    st.write(f"**Ubicación:** ({alert.location.y}, {alert.location.x})")
            st.map([{'lat': a.location.y, 'lon': a.location.x} for a in alerts if a.location], zoom=10)
        else:
            st.info("No hay alertas activas en este momento.")

    return render(request, 'health_monitor.html')