# kudos_app/views/simulation_engine.py

"""
Vista para el Motor de Simulación de Cápsulas Masivas en Kudos.
Genera y explora cápsulas multidimensionales basadas en datos externos y predicciones.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, ExternalData, SettingsConfig, Notification, Comment, Like
from django.contrib.gis.geos import Point
from datetime import datetime, timedelta
from openai import OpenAI
import json
import random
import requests

def fetch_wikipedia_data(query):
    """Fetch Wikipedia data for a given query."""
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "titles": query,
        "prop": "extracts",
        "exintro": True,
        "explaintext": True
    }
    response = requests.get(url, params=params)
    data = response.json()
    page = next(iter(data["query"]["pages"].values()))
    return page["extract"] if "extract" in page else "No data found"

def fetch_openstreetmap_data(lat, lon):
    """Fetch OpenStreetMap data for a given latitude and longitude."""
    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
    response = requests.get(url)
    data = response.json()
    return data.get("display_name", "No data found")

def generate_social_conversation(capsule, num_comments=3):
    """Generate simulated comments for a capsule using AI."""
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    prompt = f"Generate {num_comments} simulated comments for the following capsule: '{capsule.contenido}'"
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    comments = response.choices[0].message.content.split('\n')
    for comment in comments:
        Comment.objects.create(
            capsule=capsule,
            user=User.objects.order_by('?').first(),  # Random user
            content=comment.strip(),
            timestamp=datetime.now()
        )

def add_automatic_interactions(capsule):
    """Add automatic likes and comments to a capsule."""
    # Add likes
    num_likes = random.randint(1, 10)
    for _ in range(num_likes):
        Like.objects.create(
            capsule=capsule,
            user=User.objects.order_by('?').first(),  # Random user
            timestamp=datetime.now()
        )
    # Add comments
    generate_social_conversation(capsule, num_comments=random.randint(1, 5))

def simulation_engine(request):
    """
    Vista para simular y generar cápsulas masivas en Kudos.
    """
    # Verificar si se ejecuta en Streamlit
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Motor de Simulación de Cápsulas Masivas")
        st.write("Genera cápsulas multidimensionales a gran escala con IA y datos externos.")

        # Obtener usuario autenticado o simularlo
        user = request.user if request.user.is_authenticated else User.objects.first()
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        # Cargar configuración desde SettingsConfig
        sim_config = SettingsConfig.objects.get_or_create(key="simulation_engine_settings")[0]
        sim_themes = sim_config.parameters.get("simulation_themes", ["Historia", "Ciencia", "Cultura", "Futuro"])
        data_sources = sim_config.parameters.get("data_sources", ["Wikipedia", "OpenStreetMap"])
        batch_size = sim_config.variables.get("batch_size", 5)
        simulation_range = sim_config.variables.get("simulation_range", 5000)  # Metros

        # **Sección: Configurar Simulación**
        st.header("Configurar Simulación")
        st.write("Define los parámetros para generar cápsulas masivas.")
        theme = st.selectbox("Tema de Simulación", sim_themes)
        source = st.selectbox("Fuente de Datos", data_sources)
        num_capsules = st.number_input("Número de Cápsulas a Generar", min_value=1, max_value=50, value=batch_size)
        location_enabled = st.checkbox("Basar en mi Ubicación", value=True)
        
        if location_enabled and user.ubicacion:
            base_location = user.ubicacion
            st.write(f"Ubicación Base: ({base_location.y}, {base_location.x})")
        else:
            latitude = st.number_input("Latitud Base", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud Base", value=12.4964, step=0.0001)
            base_location = Point(longitude, latitude)

        # **Generar Cápsulas Simuladas**
        if st.button("Generar Cápsulas"):
            external_data = ExternalData.objects.filter(source=source, category=theme)[:10]
            context = ""
            if external_data.exists():
                context = (
                    f"Tema: {theme}. "
                    f"Ubicación base: ({base_location.y}, {base_location.x}). "
                    f"Datos externos: {', '.join([d.content.get('title', 'Sin título') for d in external_data])}."
                )
            else:
                # Fetch data from Wikipedia or OpenStreetMap
                if source == "Wikipedia":
                    query = theme
                    context = fetch_wikipedia_data(query)
                elif source == "OpenStreetMap":
                    context = fetch_openstreetmap_data(base_location.y, base_location.x)
                context = f"Tema: {theme}. Ubicación base: ({base_location.y}, {base_location.x}). Datos: {context}"

            prompt = (
                f"Actúa como un motor de simulación para Kudos. "
                f"Basado en el siguiente contexto: {context}, "
                f"genera {num_capsules} cápsulas multidimensionales (contenido, geolocalización, tiempo, temas, climatología). "
                f"Proporciona una breve descripción para cada cápsula."
            )
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )
            simulated_capsules = response.choices[0].message.content.split('\n\n')[:num_capsules]

            for i, sim in enumerate(simulated_capsules):
                # Simular ubicación cercana
                lat_offset = random.uniform(-0.05, 0.05)
                lon_offset = random.uniform(-0.05, 0.05)
                sim_location = Point(base_location.x + lon_offset, base_location.y + lat_offset)

                capsule = Capsule(
                    uid=f"sim_{user.id}_{i}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    usuario=user,
                    contenido=sim[:100],  # Limitar longitud
                    ubicacion=sim_location,
                    modo='simulado',
                    fecha=datetime.now().date(),
                    privacy='publico',
                    time_scale='dia',
                    price=0.0,
                    temas=[theme],
                    parameters={'simulated': True, 'source': source},
                    variables={'visibility_range': simulation_range}
                )
                capsule.save()

                # Add automatic interactions
                add_automatic_interactions(capsule)

            Notification.objects.create(
                user=user,
                type='simulation_complete',
                message=f"Generaste {num_capsules} cápsulas simuladas para '{theme}'.",
                priority='media'
            )
            st.success(f"{num_capsules} cápsulas simuladas generadas.")

        # **Sección: Explorar Cápsulas Simuladas**
        st.header("Explorar Cápsulas Simuladas")
        simulated_capsules = Capsule.objects.filter(
            modo='simulado',
            privacy='publico'
        ).order_by('-timestamp')[:10]

        if simulated_capsules.exists():
            selected_capsule = st.selectbox("Selecciona una Cápsula", [c.contenido[:50] for c in simulated_capsules])
            capsule = simulated_capsules.get(contenido__startswith=selected_capsule[:50])
            st.write(f"**Autor:** {capsule.usuario.alias}")
            st.write(f"**Contenido:** {capsule.contenido}")
            st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
            st.write(f"**Temas:** {', '.join(capsule.temas)}")

            # Mapa interactivo
            map_data = [{'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x}]
            st.map(map_data, zoom=10)

            # Visualización en VR
            if st.button("Explorar en VR"):
                narrative = f"Simulación: {capsule.contenido[:50]}..."
                st.components.v1.html(f"""
                <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                <a-scene embedded vr-mode-ui="enabled: true">
                    <a-sky src="https://example.com/sim_sky.jpg"></a-sky>
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
            st.info("No hay cápsulas simuladas disponibles en este momento.")

    # Renderizar plantilla Django si no está en Streamlit
    return render(request, 'simulation_engine.html')