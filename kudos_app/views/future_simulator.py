# kudos_app/views/future_simulator.py

"""
Vista para el Simulador de Futuros Posibles 5D en Kudos.
Permite explorar escenarios futuros basados en datos multidimensionales con IA.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, ExternalData, SettingsConfig, Notification
from django.contrib.gis.geos import Point
from datetime import datetime, timedelta
from openai import OpenAI
import json

def future_simulator(request):
    """
    Vista para simular futuros posibles en Kudos.
    """
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Simulador de Futuros Posibles 5D")
        st.write("Explora escenarios futuros basados en tus datos y tendencias globales.")

        user = request.user if request.user.is_authenticated else User.objects.first()  # Simulación con autenticación
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        # Configuración desde SettingsConfig
        sim_config = SettingsConfig.objects.get_or_create(key="future_simulator_settings")[0]
        default_themes = sim_config.parameters.get("default_themes", ["Tecnología", "Clima", "Sociedad", "Economía"])
        time_horizons = sim_config.parameters.get("time_horizons", ["1 año", "5 años", "10 años"])
        max_scenarios = sim_config.variables.get("max_scenarios", 3)

        # Sección: Configurar Simulación
        st.header("Configurar Simulación")
        st.write("Define los parámetros para tu escenario futuro.")
        themes = st.multiselect("Temas de Interés", default_themes, default=user.necesidades if user.necesidades else default_themes[:2])
        time_horizon = st.selectbox("Horizonte Temporal", time_horizons)
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        # Datos Contextuales
        recent_capsules = Capsule.objects.filter(temas__overlap=themes, timestamp__gte=datetime.now() - timedelta(days=30)).count()
        external_data = ExternalData.objects.filter(category__in=themes, timestamp__gte=datetime.now() - timedelta(days=30)).count()

        # Generar Simulación
        if st.button("Generar Escenarios Futuros"):
            context = (
                f"Usuario: {user.alias}. "
                f"Intereses: {', '.join(themes)}. "
                f"Ubicación: ({location.y}, {location.x}). "
                f"Datos recientes: {recent_capsules} cápsulas y {external_data} datos externos en los últimos 30 días."
            )
            prompt = (
                f"Actúa como un simulador de futuros posibles para Kudos. "
                f"Basado en el siguiente contexto: {context}, "
                f"genera {max_scenarios} escenarios futuros para un horizonte de {time_horizon}. "
                f"Considera las dimensiones 5D: contenido, geolocalización, tiempo, temas y climatología. "
                f"Proporciona una breve descripción para cada escenario."
            )
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )
            scenarios = response.choices[0].message.content.split('\n\n')
            st.session_state.scenarios = scenarios[:max_scenarios]
            Notification.objects.create(
                user=user,
                type='future_simulation',
                message=f"Simulación de futuros generada para {time_horizon}.",
                priority='media'
            )

        # Mostrar Escenarios
        if 'scenarios' in st.session_state:
            st.header("Escenarios Futuros")
            for i, scenario in enumerate(st.session_state.scenarios, 1):
                st.subheader(f"Escenario {i}: {scenario.split('.')[0]}")
                st.write(scenario)
                st.write("---")

        # Explorar Cápsulas Relacionadas
        st.header("Cápsulas Relacionadas")
        related_capsules = Capsule.objects.filter(
            temas__overlap=themes,
            privacy='publico'
        ).order_by('-timestamp')[:5]
        if related_capsules.exists():
            for capsule in related_capsules:
                st.subheader(f"{capsule.contenido[:50]}...")
                st.write(f"**Autor:** {capsule.usuario.alias}")
                st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
                st.write(f"**Temas:** {', '.join(capsule.temas)}")
                weather_data = capsule.parameters.get('weather_data', {})
                if weather_data:
                    st.write(f"**Clima:** {weather_data.get('weather', 'No disponible')}")
                st.write("---")

            # Mapa de Cápsulas Relacionadas
            map_data = [
                {'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x, 'description': capsule.contenido[:50]}
                for capsule in related_capsules
            ]
            st.map(map_data, zoom=10)
        else:
            st.info("No hay cápsulas relacionadas disponibles.")

    return render(request, 'future_simulator.html')