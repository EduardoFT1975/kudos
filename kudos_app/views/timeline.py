# kudos_app/views/timeline.py

"""
Vista para mostrar una cronología de las actividades del usuario en Kudos.
Incluye cápsulas, interacciones sociales, transacciones y otros eventos.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, Route, Notification, Alert, Transaction, SocialSpace, SettingsConfig
from django.contrib.gis.geos import Point
from datetime import datetime, timedelta
import json

def timeline(request):
    """
    Vista para mostrar una cronología de las actividades del usuario en Kudos.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title(f"Cronología de {user.alias}")
        st.write("Explora tus actividades en Kudos a lo largo del tiempo.")

        # Configuración desde SettingsConfig
        timeline_config = SettingsConfig.objects.get_or_create(key="timeline_settings")[0]
        default_time_range = timeline_config.parameters.get("default_time_range", "Último Mes")
        event_types = timeline_config.parameters.get("event_types", [
            "Cápsulas", "Rutas", "Notificaciones", "Alertas", "Transacciones", "Espacios Sociales"
        ])

        # Filtro de Rango de Tiempo
        st.header("Filtrar Cronología")
        time_range = st.selectbox("Rango de Tiempo", ["Última Semana", "Último Mes", "Último Año", "Personalizado"], index=["Última Semana", "Último Mes", "Último Año", "Personalizado"].index(default_time_range))
        if time_range == "Personalizado":
            start_date = st.date_input("Fecha de Inicio", value=datetime.now().date() - timedelta(days=30))
            end_date = st.date_input("Fecha de Fin", value=datetime.now().date())
        else:
            end_date = datetime.now().date()
            if time_range == "Última Semana":
                start_date = end_date - timedelta(days=7)
            elif time_range == "Último Mes":
                start_date = end_date - timedelta(days=30)
            else:  # Último Año
                start_date = end_date - timedelta(days=365)

        # Filtro de Tipos de Eventos
        selected_event_types = st.multiselect("Tipos de Eventos", event_types, default=event_types)

        # Recopilar Eventos
        events = []

        if "Cápsulas" in selected_event_types:
            capsules = Capsule.objects.filter(usuario=user, fecha__range=(start_date, end_date))
            for capsule in capsules:
                events.append({
                    'timestamp': capsule.timestamp,
                    'type': 'Cápsula',
                    'description': f"Creada: {capsule.contenido[:50]}... (Modo: {capsule.modo})",
                    'location': capsule.ubicacion
                })

        if "Rutas" in selected_event_types:
            routes = Route.objects.filter(usuario=user, fecha__range=(start_date, end_date))
            for route in routes:
                events.append({
                    'timestamp': route.timestamp,
                    'type': 'Ruta',
                    'description': f"Completada: {route.contenido[:50]}... - {route.distance} km",
                    'location': route.ubicacion
                })

        if "Notificaciones" in selected_event_types:
            notifications = Notification.objects.filter(user=user, timestamp__range=(start_date, end_date))
            for notif in notifications:
                events.append({
                    'timestamp': notif.timestamp,
                    'type': 'Notificación',
                    'description': f"{notif.type.capitalize()}: {notif.message[:50]}...",
                    'location': notif.location
                })

        if "Alertas" in selected_event_types:
            alerts = Alert.objects.filter(
                location__distance_lte=(user.ubicacion, D(m=user.notification_distance)),
                timestamp__range=(start_date, end_date)
            )
            for alert in alerts:
                events.append({
                    'timestamp': alert.timestamp,
                    'type': 'Alerta',
                    'description': f"{alert.type.capitalize()}: {alert.message[:50]}...",
                    'location': alert.location
                })

        if "Transacciones" in selected_event_types:
            transactions = Transaction.objects.filter(user=user, timestamp__range=(start_date, end_date))
            for trans in transactions:
                events.append({
                    'timestamp': trans.timestamp,
                    'type': 'Transacción',
                    'description': f"{trans.content_type}: ${trans.amount} (Comisión: ${trans.commission})",
                    'location': None
                })

        if "Espacios Sociales" in selected_event_types:
            social_spaces = SocialSpace.objects.filter(participants=user, timestamp__range=(start_date, end_date))
            for space in social_spaces:
                events.append({
                    'timestamp': space.timestamp,
                    'type': 'Espacio Social',
                    'description': f"Participaste en: {space.theme}",
                    'location': space.ubicacion
                })

        # Ordenar Eventos por Fecha
        events.sort(key=lambda x: x['timestamp'], reverse=True)

        # Mostrar Cronología
        st.header("Tu Cronología")
        if events:
            for event in events:
                st.subheader(f"{event['type']} - {event['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}")
                st.write(f"**Descripción:** {event['description']}")
                if event['location']:
                    st.write(f"**Ubicación:** ({event['location'].y}, {event['location'].x})")
                st.write("---")
        else:
            st.info("No hay actividades en el rango seleccionado.")

        # Mapa de Eventos con Ubicación
        if any(event['location'] for event in events):
            st.header("Eventos en el Mapa")
            map_data = [
                {'lat': event['location'].y, 'lon': event['location'].x, 'description': event['description']}
                for event in events if event['location']
            ]
            st.map(map_data, zoom=10)

    else:  # Renderizado en Django
        start_date = datetime.now().date() - timedelta(days=30)
        end_date = datetime.now().date()

        events = []
        capsules = Capsule.objects.filter(usuario=user, fecha__range=(start_date, end_date))
        for capsule in capsules:
            events.append({
                'timestamp': capsule.timestamp,
                'type': 'Cápsula',
                'description': f"Creada: {capsule.contenido[:50]}... (Modo: {capsule.modo})",
                'location': capsule.ubicacion
            })

        notifications = Notification.objects.filter(user=user, timestamp__range=(start_date, end_date))
        for notif in notifications:
            events.append({
                'timestamp': notif.timestamp,
                'type': 'Notificación',
                'description': f"{notif.type.capitalize()}: {notif.message[:50]}...",
                'location': notif.location
            })

        events.sort(key=lambda x: x['timestamp'], reverse=True)

        return render(request, 'timeline.html', {'events': events})
