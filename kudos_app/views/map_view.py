# kudos_app/views/map_view.py
import streamlit as st
from streamlit_folium import st_folium
import folium
from .map import prepare_map_data
from datetime import datetime

def map_view(user):
    print("Iniciando map_view...")

    # Título
    print("Mostrando título...")
    st.markdown("### Kudos Vault Lite - Mapa Virtual")

    # Selector de época histórica
    print("Mostrando selector de época histórica...")
    historical_periods = [
        "Contemporánea (1900-Presente)",
        "Edad Media (500-1500)",
        "Renacimiento (1300-1700)",
        "Edad Moderna (1500-1800)",
        "Era Industrial (1800-1900)",
        "Prehistoria (hasta 3000 a.C.)",
        "Antigüedad (3000 a.C.-500 d.C.)"
    ]
    time_period = st.selectbox("Selecciona una época histórica:", historical_periods)
    print(f"Época seleccionada: {time_period}")

    # Preparar datos simulados
    print("Preparando datos simulados...")
    capsules = [
        type('Capsule', (), {
            'ubicacion': type('Point', (), {'x': -3.7038, 'y': 40.4168}),
            'parameters': {'type': 'video', 'merits': 15, 'weather': {'weather': 'Sunny'}, 'themes': ['Historia Local']},
            'fecha': datetime(2020, 1, 1),
            'contenido': 'Cápsula de prueba 1',
            'usuario': type('User', (), {'alias': 'test_user'}),
            'uid': 'test123',
            'price': 0,
            'modo': 'public'
        }),
        type('Capsule', (), {
            'ubicacion': type('Point', (), {'x': -3.6930, 'y': 40.4190}),
            'parameters': {'type': 'video', 'merits': 20, 'weather': {'weather': 'Cloudy'}, 'themes': ['Cultura']},
            'fecha': datetime(2021, 1, 1),
            'contenido': 'Cápsula de prueba 2',
            'usuario': type('User', (), {'alias': 'test_user'}),
            'uid': 'test456',
            'price': 0,
            'modo': 'public'
        })
    ]
    user = type('User', (), {'alias': 'test_user'})
    clip_generation_enabled = False
    capsules_data, streets, historical_markers = prepare_map_data(capsules, user, clip_generation_enabled, time_period)

    # Configurar interacciones
    print("Configurando interacciones...")
    if 'interactions' not in st.session_state:
        st.session_state.interactions = {capsule['capsule_id']: 0 for capsule in capsules_data}
        print(f"Interacciones inicializadas: {st.session_state.interactions}")

    # Crear el mapa con Folium
    print("Renderizando el mapa...")
    center_location = [40.4168, -3.7038]  # Fallback a Madrid
    m = folium.Map(location=center_location, zoom_start=15)

    # Seleccionar tiles según la época histórica
    tile_url = "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
    if time_period == "Edad Media (500-1500)":
        tile_url = "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
    elif time_period == "Renacimiento (1300-1700)":
        tile_url = "https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png"
    folium.TileLayer(tiles=tile_url, attr='© Stadia Maps, © OpenMapTiles', min_zoom=0, max_zoom=20).add_to(m)

    # Añadir marcador de la ubicación del usuario
    print("Añadiendo marcador de ubicación del usuario...")
    folium.Marker(
        location=center_location,
        popup="Tu ubicación actual",
        icon=folium.DivIcon(
            html='<div style="color: blue; font-size: 20px; background: yellow; border-radius: 50%; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;">📍</div>',
            icon_size=(30, 30)
        )
    ).add_to(m)

    # Añadir cápsulas al mapa
    print("Añadiendo cápsulas al mapa...")
    for capsule in capsules_data:
        folium.Marker(
            location=[capsule['lat'], capsule['lon']],
            popup=capsule['popup']
        ).add_to(m)

    # Añadir calles virtuales
    print("Añadiendo calles virtuales...")
    for street in streets:
        folium.PolyLine(locations=[street['start'], street['end']], color="#00FF00", weight=3).add_to(m)

    # Añadir marcadores históricos
    print("Añadiendo marcadores históricos...")
    for marker in historical_markers:
        folium.Marker(location=[marker['lat'], marker['lon']], popup=marker['popup']).add_to(m)

    # Renderizar el mapa
    print("Renderizando mapa en Streamlit...")
    st.markdown("#### Mapa")
    map_data = st_folium(m, width=700, height=500)
    print(f"Mapa renderizado: {map_data}")

    # Mostrar lista de cápsulas con botones de "Like"
    print("Mostrando lista de cápsulas...")
    st.markdown("### Cápsulas")
    for capsule in capsules_data:
        st.write(f"**{capsule['content']}** - Méritos: {capsule['merits']}")
        if st.button("Like", key=f"like_{capsule['capsule_id']}"):
            st.session_state.interactions[capsule['capsule_id']] = st.session_state.interactions.get(capsule['capsule_id'], 0) + 1
            st.rerun()

    print("map_view finalizado.")