# kudos_app/views/search.py

"""
Vista para la búsqueda multidimensional de cápsulas en Kudos.
Permite buscar por contenido (1D), geolocalización (2D), tiempo (3D), temas (4D) y climatología (5D).
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, SettingsConfig
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from datetime import datetime, timedelta

def search(request):
    """
    Vista para buscar cápsulas multidimensionales en Kudos.
    """
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Búsqueda Multidimensional en Kudos")
        st.write("Encuentra cápsulas usando filtros avanzados basados en las 5 dimensiones.")

        user = request.user if request.user.is_authenticated else User.objects.first()  # Simulación con autenticación

        # Configuración desde SettingsConfig
        search_config = SettingsConfig.objects.get_or_create(key="search_settings")[0]
        default_themes = search_config.parameters.get("default_themes", ["Cultura", "Viajes", "Deporte", "Tecnología"])
        default_range = search_config.variables.get("default_range", 5000)  # Metros

        # Filtros de Búsqueda
        st.header("Filtros de Búsqueda")

        # 1D: Contenido
        content_query = st.text_input("Contenido (1D)", placeholder="Ejemplo: Viaje a Roma")

        # 2D: Geolocalización
        st.subheader("Geolocalización (2D)")
        use_current_location = st.checkbox("Usar mi ubicación actual", value=user.ubicacion is not None)
        if use_current_location and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)
        range_distance = st.slider("Rango de Búsqueda (metros)", min_value=100, max_value=10000, value=default_range)

        # 3D: Tiempo
        st.subheader("Tiempo (3D)")
        time_filter = st.selectbox("Rango Temporal", ["Cualquier Fecha", "Última Semana", "Último Mes", "Personalizado"])
        if time_filter == "Personalizado":
            start_date = st.date_input("Fecha de Inicio", value=datetime.now().date() - timedelta(days=30))
            end_date = st.date_input("Fecha de Fin", value=datetime.now().date())
        elif time_filter == "Última Semana":
            start_date = datetime.now().date() - timedelta(days=7)
            end_date = datetime.now().date()
        elif time_filter == "Último Mes":
            start_date = datetime.now().date() - timedelta(days=30)
            end_date = datetime.now().date()
        else:
            start_date = None
            end_date = None

        # 4D: Temas
        st.subheader("Temas (4D)")
        themes = st.multiselect("Temas", default_themes, default=user.necesidades if user and user.necesidades else default_themes[:2])

        # 5D: Climatología
        st.subheader("Climatología (5D)")
        weather_filter = st.selectbox("Condición Climática", ["Cualquier Clima", "Soleado", "Lluvioso", "Nublado"])
        weather_conditions = {
            "Cualquier Clima": None,
            "Soleado": "Sunny",
            "Lluvioso": "Rain",
            "Nublado": "Cloudy"
        }
        selected_weather = weather_conditions[weather_filter]

        # Ejecutar Búsqueda
        if st.button("Buscar Cápsulas"):
            query = Capsule.objects.filter(privacy='publico')
            
            # Filtro por Contenido (1D)
            if content_query:
                query = query.filter(contenido__icontains=content_query)

            # Filtro por Geolocalización (2D)
            if location:
                query = query.filter(ubicacion__distance_lte=(location, D(m=range_distance)))

            # Filtro por Tiempo (3D)
            if start_date and end_date:
                query = query.filter(fecha__range=(start_date, end_date))

            # Filtro por Temas (4D)
            if themes:
                query = query.filter(temas__contains=themes)

            # Filtro por Climatología (5D)
            if selected_weather:
                query = query.filter(parameters__weather_data__weather__icontains=selected_weather)

            # Mostrar Resultados
            st.header("Resultados de la Búsqueda")
            if query.exists():
                for capsule in query:
                    st.subheader(f"{capsule.contenido[:50]}...")
                    st.write(f"**Autor:** {capsule.usuario.alias}")
                    st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
                    st.write(f"**Fecha:** {capsule.fecha}")
                    st.write(f"**Temas:** {', '.join(capsule.temas)}")
                    weather_data = capsule.parameters.get('weather_data', {})
                    if weather_data:
                        st.write(f"**Clima:** {weather_data.get('weather', 'No disponible')}")
                    st.write(f"**Modo:** {capsule.modo}")
                    st.write(f"**Precio:** ${capsule.price}")
                    st.write("---")
            else:
                st.info("No se encontraron cápsulas con los filtros seleccionados.")

        # Mapa de Resultados
        if query.exists():
            st.header("Cápsulas en el Mapa")
            map_data = [{'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x, 'description': capsule.contenido[:50]} for capsule in query]
            st.map(map_data, zoom=10)

    return render(request, 'search.html')