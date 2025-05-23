# kudos_app/views/capsule_search.py

from kudos_app.models import User, Capsule, Notification
from django.http import HttpResponse
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from datetime import datetime
import streamlit as st
from streamlit_folium import st_folium
import folium
from django.db.models import Q

def capsule_search(request):
    print("Entrando en capsule_search...")
    is_streamlit = hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit

    if is_streamlit:
        print("Ejecutando en modo Streamlit...")
        st.title("Buscador Multidimensional de Cápsulas")
        st.write("Explora cápsulas por contenido, ubicación, tiempo, temas, climatología y más.")
        print("Interfaz básica de Streamlit generada.")
    else:
        print("Ejecutando en modo Django...")
        return HttpResponse("Esta vista solo está disponible a través de Streamlit. Por favor, accede a través de http://localhost:8504")

    print("Obteniendo el usuario...")
    if not getattr(request.user, 'is_authenticated', False):
        user = User.objects.first()
        if not user:
            st.error("No hay usuarios en la base de datos. Crea un usuario primero.")
            print("No se encontró ningún usuario en la base de datos.")
            return
    else:
        user = request.user
    print(f"Usuario obtenido: {user}")

    location = user.ubicacion if user and user.ubicacion else Point(-3.7038, 40.4168)
    print(f"Ubicación del usuario: ({location.y}, {location.x})")

    if st.button("Limpiar Filtros", key="clear_filters_search"):
        st.query_params.clear()
        st.experimental_rerun()

    print("Generando filtros de búsqueda...")
    st.header("Filtros de Búsqueda")
    try:
        print("Creando filtro: Buscar por Contenido...")
        content_query = st.text_input("Buscar por Contenido", placeholder="Ejemplo: Viaje a Roma", key="content_query")
        print("Filtro 'Buscar por Contenido' creado.")

        print("Creando filtro: Año de Inicio...")
        year_start = st.slider("Año de Inicio", min_value=1, max_value=datetime.now().year, value=1, key="year_start")
        print("Filtro 'Año de Inicio' creado.")

        print("Creando filtro: Año de Fin...")
        year_end = st.slider("Año de Fin", min_value=year_start, max_value=datetime.now().year, value=1900, key="year_end")
        print("Filtro 'Año de Fin' creado.")

        print("Creando filtro: Temas...")
        themes = st.multiselect("Temas", ["Cultura", "Historia", "Naturaleza", "Viajes", "Arte"], default=["Historia"], key="themes")
        print("Filtro 'Temas' creado.")

        print("Creando filtro: Distancia Máxima...")
        distance = st.slider("Distancia Máxima (metros)", min_value=100, max_value=10000000, value=10000000, key="distance")
        if distance == 10000000:
            distance = None
        print("Filtro 'Distancia Máxima' creado.")

        print("Creando filtro: Clima...")
        weather = st.selectbox("Clima", ["Cualquier", "Soleado", "Nublado", "Lluvioso", "Nevado"], index=0, key="weather")
        print("Filtro 'Clima' creado.")

        print("Creando filtro: Modo de Cápsula...")
        capsule_mode = st.selectbox("Modo de Cápsula", ["Cualquier", "Eterno", "Educativo", "Comercio", "Social"], index=0, key="capsule_mode")
        print("Filtro 'Modo de Cápsula' creado.")
    except Exception as e:
        print(f"Error al generar los filtros: {e}")
        st.error(f"Error al generar los filtros: {e}")
        raise
    print("Filtros de búsqueda generados.")

    print("Filtrando cápsulas...")
    capsules = Capsule.objects.filter(privacy='publico')
    print(f"Total de cápsulas públicas iniciales: {capsules.count()}")

    try:
        if capsule_mode != "Cualquier":
            capsules = capsules.filter(modo=capsule_mode.lower())
            print(f"Después de filtrar por modo '{capsule_mode.lower()}': {capsules.count()} cápsulas")

        if content_query:
            capsules = capsules.filter(contenido__icontains=content_query)
            print(f"Después de filtrar por contenido '{content_query}': {capsules.count()} cápsulas")

        if themes:
            theme_conditions = Q()
            for theme in themes:
                theme_conditions |= Q(temas__contains=[theme])
            capsules = capsules.filter(theme_conditions)
            print(f"Después de filtrar por temas {themes}: {capsules.count()} cápsulas")

        if year_start and year_end:
            capsules = capsules.filter(fecha__year__gte=year_start, fecha__year__lte=year_end)
            print(f"Después de filtrar por años ({year_start}-{year_end}): {capsules.count()} cápsulas")

        if distance:
            capsules = capsules.filter(ubicacion__distance_lte=(location, D(m=distance)))
            print(f"Después de filtrar por distancia ({distance} metros): {capsules.count()} cápsulas")

        if weather != "Cualquier":
            capsules = capsules.filter(parameters__weather_data__weather__icontains=weather.lower())
            print(f"Después de filtrar por clima '{weather.lower()}': {capsules.count()} cápsulas")

        print("Cápsulas filtradas correctamente.")
    except Exception as e:
        st.error(f"Error al buscar cápsulas: {e}")
        print(f"Error al buscar cápsulas: {e}")
        capsules = Capsule.objects.none()

    print("Mostrando resultados de la búsqueda...")
    st.header("Resultados de la Búsqueda")
    if capsules.exists():
        print(f"Total de cápsulas para mostrar: {capsules.count()}")
        for capsule in capsules:
            capsule_key = f"capsule_{capsule.uid}"
            st.markdown(f"""
            <div class="capsule-card">
                <h3>{capsule.contenido[:50]}...</h3>
                <p><strong>Autor:</strong> {capsule.usuario.alias}</p>
                <p><strong>Ubicación:</strong> ({capsule.ubicacion.y}, {capsule.ubicacion.x})</p>
                <p><strong>Fecha:</strong> {capsule.fecha}</p>
                <p><strong>Temas:</strong> {', '.join(capsule.temas if isinstance(capsule.temas, list) else [capsule.temas])}</p>
                <p><strong>Modo:</strong> {capsule.modo.capitalize()}</p>
            </div>
            """, unsafe_allow_html=True)
            weather_data = capsule.parameters.get('weather_data', {})
            if weather_data:
                st.markdown(f"<p><strong>Clima:</strong> {weather_data.get('weather', 'No disponible')}</p>", unsafe_allow_html=True)
            if capsule.modo == 'educativo':
                st.markdown(f"<p><strong>Nivel Educativo:</strong> {capsule.parameters.get('educational_level', 'No especificado')}</p>", unsafe_allow_html=True)
                st.markdown(f"<p><strong>Objetivos de Aprendizaje:</strong> {capsule.parameters.get('learning_objectives', 'No especificado')}</p>", unsafe_allow_html=True)

            map_data = [{'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x}]
            st.map(map_data, zoom=10)

            col1, col2 = st.columns(2)
            with col1:
                if st.button(f"Dar Like a '{capsule.contenido[:20]}...'", key=f"like_{capsule_key}"):
                    capsule.likes.add(user)
                    Notification.objects.create(
                        user=capsule.usuario,
                        type='like',
                        message=f"{user.alias} dio like a tu cápsula: {capsule.contenido[:50]}...",
                        priority='baja'
                    )
                    st.success("Like registrado.")
            with col2:
                share_with = st.selectbox(
                    f"Compartir '{capsule.contenido[:20]}...' con",
                    [u.alias for u in User.objects.all()],
                    key=f"share_{capsule_key}"
                )
                if st.button(f"Compartir Cápsula '{capsule.contenido[:20]}...'", key=f"share_button_{capsule_key}"):
                    shared_user = User.objects.get(alias=share_with)
                    shared_user.parameters["shared_capsules"] = shared_user.parameters.get("shared_capsules", []) + [{
                        "uid": capsule.uid,
                        "shared_by": user.alias,
                        "shared_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }]
                    shared_user.save()
                    Notification.objects.create(
                        user=shared_user,
                        type='capsule_shared',
                        message=f"{user.alias} compartió la cápsula '{capsule.contenido[:50]}...' contigo.",
                        priority='media'
                    )
                    st.success(f"Cápsula compartida con {share_with}.")
            st.markdown("</div>", unsafe_allow_html=True)
            st.write("---")

        st.header("Cápsulas Compartidas Contigo")
        shared_capsules = user.parameters.get("shared_capsules", [])
        if shared_capsules:
            for shared_capsule in shared_capsules:
                capsule = Capsule.objects.get(uid=shared_capsule["uid"])
                st.subheader(f"{capsule.contenido[:50]}...")
                st.write(f"**Compartido por:** {shared_capsule['shared_by']}")
                st.write(f"**Fecha de Compartición:** {shared_capsule['shared_at']}")
                st.write(f"**Autor:** {capsule.usuario.alias}")
                st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
                st.write(f"**Fecha:** {capsule.fecha}")
                st.write(f"**Temas:** {', '.join(capsule.temas if isinstance(capsule.temas, list) else [capsule.temas])}")
                weather_data = capsule.parameters.get('weather_data', {})
                if weather_data:
                    st.write(f"**Clima:** {weather_data.get('weather', 'No disponible')}")
                st.write("---")
        else:
            st.info("No hay cápsulas compartidas contigo.")
    else:
        st.info("No se encontraron cápsulas con los criterios seleccionados.")