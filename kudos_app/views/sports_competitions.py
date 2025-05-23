# kudos_app/views/sports_competitions.py

"""
Vista para las Competiciones Multideporte 5D en Kudos.
Permite organizar, participar y explorar eventos deportivos con AR/VR y transmisiones.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, Route, Transaction, SettingsConfig, Notification
from django.contrib.gis.geos import Point
from datetime import datetime, timedelta
import json

def sports_competitions(request):
    """
    Vista para gestionar Competiciones Multideporte 5D en Kudos.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Competiciones Multideporte 5D")
        st.write("Organiza, participa y disfruta de eventos deportivos multidimensionales.")

        # Configuración desde SettingsConfig
        sports_config = SettingsConfig.objects.get_or_create(key="sports_competitions_settings")[0]
        sport_types = sports_config.parameters.get("sport_types", ["Ciclismo", "Running", "Natación", "Multideporte"])
        max_price = sports_config.variables.get("max_price", 100.0)
        commission_rate = sports_config.variables.get("commission_rate", 5.0)

        # Sección: Crear Competencia Deportiva
        st.header("Crear Competencia Deportiva")
        st.write("Organiza un evento deportivo para la comunidad.")
        title = st.text_input("Título", placeholder="Ejemplo: Maratón de Kudos 2025")
        sport_type = st.selectbox("Tipo de Deporte", sport_types)
        description = st.text_area("Descripción", placeholder="Detalles del evento...")
        entry_fee = st.number_input("Cuota de Inscripción ($)", min_value=0.0, max_value=max_price, step=0.1, value=0.0)
        distance = st.number_input("Distancia (km)", min_value=0.0, step=0.1, value=10.0)
        altitude_gain = st.number_input("Desnivel Acumulado (m)", min_value=0.0, step=1.0, value=0.0)
        event_date = st.date_input("Fecha del Evento", value=datetime.now().date() + timedelta(days=7))
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        if st.button("Crear Competencia"):
            route = Route(
                uid=f"comp_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                usuario=user,
                contenido=f"Competencia: {title}",
                ubicacion=location,
                modo='deporte',
                fecha=event_date,
                privacy='publico',
                time_scale='dia',
                distance=distance,
                altitude_gain=altitude_gain,
                sport_type=sport_type,
                price=entry_fee,
                parameters={'competition': True, 'description': description, 'participants': [user.uid]},
                variables={'visibility_range': user.notification_distance}
            )
            route.save()
            Notification.objects.create(
                user=user,
                type='competition_created',
                message=f"Creaste la competencia '{title}'.",
                priority='media'
            )
            st.success("Competencia deportiva creada.")

        # Sección: Explorar Competencias
        st.header("Explorar Competencias")
        competitions = Route.objects.filter(
            modo='deporte',
            parameters__competition=True,
            privacy='publico'
        ).order_by('-timestamp')

        if competitions.exists():
            selected_competition = st.selectbox("Selecciona una Competencia", [f"{c.contenido[:50]}... (${c.price})" for c in competitions])
            competition = competitions.get(contenido__startswith=selected_competition[:50].rstrip('...'))
            st.write(f"**Organizador:** {competition.usuario.alias}")
            st.write(f"**Descripción:** {competition.parameters.get('description', 'Sin descripción')}")
            st.write(f"**Ubicación:** ({competition.ubicacion.y}, {competition.ubicacion.x})")
            st.write(f"**Fecha:** {competition.fecha}")
            st.write(f"**Tipo:** {competition.sport_type}")
            st.write(f"**Distancia:** {competition.distance} km")
            st.write(f"**Desnivel:** {competition.altitude_gain} m")
            st.write(f"**Participantes:** {len(competition.parameters.get('participants', []))}")
            st.write(f"**Cuota:** ${competition.price}")

            # Mapa
            map_data = [{'lat': competition.ubicacion.y, 'lon': competition.ubicacion.x}]
            st.map(map_data, zoom=10)

            # Participar en la Competencia
            participants = competition.parameters.get('participants', [])
            if user.uid not in participants:
                if st.button(f"Participar - ${competition.price}"):
                    if competition.price > 0:
                        Transaction.objects.create(
                            user=user,
                            content_type='competition_entry',
                            content_id=competition.uid,
                            amount=competition.price,
                            commission=competition.price * (commission_rate / 100)
                        )
                        Notification.objects.create(
                            user=competition.usuario,
                            type='participant_joined',
                            message=f"{user.alias} se unió a tu competencia '{competition.contenido[:50]}...' por ${competition.price}.",
                            priority='media'
                        )
                    participants.append(user.uid)
                    competition.parameters['participants'] = participants
                    competition.save()
                    Notification.objects.create(
                        user=user,
                        type='competition_joined',
                        message=f"Te uniste a la competencia '{competition.contenido[:50]}...'.",
                        priority='media'
                    )
                    st.success("Te has unido a la competencia.")
            else:
                st.write("Ya estás participando en esta competencia.")

            # Visualización en AR/VR
            col1, col2 = st.columns(2)
            with col1:
                if st.button("Ver en AR"):
                    narrative = f"Competencia: {competition.contenido[:50]}..."
                    st.components.v1.html(f"""
                    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                    <a-scene embedded>
                        <a-text value="{narrative}" position="0 1.5 -5" align="center"></a-text>
                        <a-camera position="0 1.6 0"></a-camera>
                    </a-scene>
                    """, height=500)
            with col2:
                if st.button("Ver en VR"):
                    narrative = f"Evento Deportivo: {competition.contenido[:50]}..."
                    st.components.v1.html(f"""
                    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                    <a-scene embedded vr-mode-ui="enabled: true">
                        <a-sky src="https://example.com/sports_sky.jpg"></a-sky>
                        <a-text
                            value="{narrative}"
                            position="0 1.5 -5"
                            align="center"
                            color="white"
                            width="4"
                        ></a-text>
                        <a-camera position="0 1.6 0"></a-camera>
                    </a-scene>
                    """, height=500)

        else:
            st.info("No hay competencias deportivas disponibles en este momento.")

    return render(request, 'sports_competitions.html')