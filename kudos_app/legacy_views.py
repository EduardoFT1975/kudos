# kudos_app/views.py

import streamlit as st
from django.shortcuts import render, redirect
from django.http import Http404, HttpRequest
from django.urls import reverse
from django.conf import settings
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from datetime import datetime, timedelta
from openai import OpenAI
import requests
import json
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from django.core.files import File
from django.db.models import Q

def enrich_capsule_content(content, user):
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    prompt = (
        f"Actúa como un experto en creación de contenido. Enriquecer el siguiente texto para una cápsula en Kudos: '{content}'. "
        f"El usuario tiene los siguientes intereses: {user.necesidades}. Proporciona un texto más detallado y atractivo."
    )
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
        enriched_content = response.choices[0].message.content
        return enriched_content
    except Exception as e:
        st.error(f"Error al enriquecer el contenido: {e}")
        return content

def get_weather_data(location):
    try:
        response = requests.get('https://api.openweathermap.org/data/2.5/weather', params={
            'lat': location.y,
            'lon': location.x,
            'appid': settings.OPENWEATHERMAP_API_KEY,
            'units': 'metric'
        })
        if response.status_code == 200:
            data = response.json()
            return {
                'temperature': data['main']['temp'],
                'weather': data['weather'][0]['description'],
                'humidity': data['main']['humidity']
            }
    except Exception as e:
        st.error(f"Error al obtener datos climáticos: {e}")
        return None

def generate_clip(content, duration=30):
    return f"https://example.com/clips/{content[:10].replace(' ', '_')}_{duration}s.mp4"

def create_massive_capsules(user, num_capsules=10):
    from kudos_app.models import Capsule
    capsules = []
    try:
        wiki_response = requests.get("https://en.wikipedia.org/w/api.php", params={
            "action": "query",
            "format": "json",
            "list": "categorymembers",
            "cmtitle": "Category:Historical_events",
            "cmlimit": num_capsules
        })
        wiki_data = wiki_response.json()
        events = wiki_data["query"]["categorymembers"]
    except Exception as e:
        st.error(f"Error al obtener datos de Wikipedia: {e}")
        return []

    for event in events:
        title = event["title"]
        try:
            event_response = requests.get("https://en.wikipedia.org/w/api.php", params={
                "action": "query",
                "format": "json",
                "titles": title,
                "prop": "extracts",
                "exintro": True,
                "explaintext": True
            })
            event_data = event_response.json()
            page = next(iter(event_data["query"]["pages"].values()))
            content = page.get("extract", title)[:200]
        except Exception as e:
            st.error(f"Error al obtener detalles del evento {title}: {e}")
            content = title

        try:
            osm_response = requests.get("https://nominatim.openstreetmap.org/search", params={
                "q": title.split(" ")[0],
                "format": "json",
                "limit": 1
            })
            osm_data = osm_response.json()
            if osm_data:
                lat = float(osm_data[0]["lat"])
                lon = float(osm_data[0]["lon"])
                location = Point(lon, lat)
            else:
                location = Point(12.4964, 41.9028)
        except Exception as e:
            st.error(f"Error al obtener ubicación para {title}: {e}")
            location = Point(12.4964, 41.9028)

        capsule = Capsule(
            uid=f"massive_{user.id}_{title.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            usuario=user,
            contenido=f"Evento Histórico: {title} - {content}",
            ubicacion=location,
            modo='eterno',
            fecha=datetime.now().date(),
            privacy='publico',
            time_scale='dia',
            price=0.0,
            temas=["Historia"],
            parameters={'historical_entry': True, 'massive_creation': True},
            variables={'visibility_range': user.notification_distance}
        )
        capsule.save()
        capsules.append(capsule)
        st.write(f"Cápsula creada: {title}")

    return capsules

def create_capsule(request):
    from kudos_app.models import User, Capsule, SettingsConfig
    is_streamlit = hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit

    if is_streamlit:
        st.title("Crear una Nueva Cápsula")
        user = User.objects.first()

        config = SettingsConfig.objects.get_or_create(key="capsule_settings")[0]
        default_privacy = config.parameters.get("default_privacy", "publico")
        available_themes = config.parameters.get("themes", ["Cultura 🌍", "Viajes y Turismo ✈️", "Historia 🏛️", "Naturaleza 🌳"])
        max_price = config.variables.get("max_price", 1000.0)
        default_notification_range = config.variables.get("default_notification_range", 500)
        eternal_mode_enabled = config.parameters.get("eternal_mode_enabled", True)
        clip_generation_enabled = config.parameters.get("clip_generation_enabled", True)

        st.write("Comparte tus experiencias con el mundo mediante cápsulas personalizadas.")

        capsule_modes = [
            'publico', 'eterno', 'educativo', 'comercio', 'social', 'sabiduría', 'salud', 'ciudadano',
            'deporte', 'benéfico', 'predictivo', 'artístico', 'espacial', 'mental', 'espiritual', 'simulado'
        ] if eternal_mode_enabled else [
            'publico', 'educativo', 'comercio', 'social', 'sabiduría', 'salud', 'ciudadano',
            'deporte', 'benéfico', 'predictivo', 'artístico', 'espacial', 'mental', 'espiritual', 'simulado'
        ]
        mode = st.selectbox("Modo de la Cápsula", capsule_modes, index=capsule_modes.index('publico'))

        content = st.text_area("Contenido", placeholder="Describe tu experiencia (ej. Mi viaje a Roma)")

        if st.checkbox("Enriquecer Contenido con IA", value=False):
            if content:
                enriched_content = enrich_capsule_content(content, user)
                st.write("**Contenido Enriquecido:**")
                st.write(enriched_content)
                content = enriched_content

        st.subheader("Ubicación")
        use_current_location = st.checkbox("Usar mi ubicación actual", value=True)
        if use_current_location and user.ubicacion:
            latitude = user.ubicacion.y
            longitude = user.ubicacion.x
            st.write(f"Ubicación actual: ({latitude}, {longitude})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
        location = Point(longitude, latitude)

        date = st.date_input("Fecha", value=datetime.now().date())

        themes = st.multiselect("Temas", options=available_themes, default=user.necesidades[:2] if user.necesidades else [])

        if mode == 'educativo':
            st.subheader("Configuración Educativa")
            educational_level = st.selectbox("Nivel Educativo", ["Primaria", "Secundaria", "Universidad", "Adultos"], index=0)
            learning_objectives = st.text_area("Objetivos de Aprendizaje", placeholder="Ejemplo: Comprender la Revolución Francesa...")
        else:
            educational_level = None
            learning_objectives = None

        privacy = st.selectbox("Privacidad", ["solo_yo", "familia", "amigos", "publico"],
                              index=["solo_yo", "familia", "amigos", "publico"].index(default_privacy))

        price = st.number_input("Precio ($)", min_value=0.0, max_value=max_price, step=0.01, value=0.0)

        weather_data = None
        if st.checkbox("Incluir Datos Climáticos", value=False):
            weather_data = get_weather_data(location)
            if weather_data:
                st.write("**Datos Climáticos:**")
                st.write(f"Temperatura: {weather_data['temperature']}°C")
                st.write(f"Clima: {weather_data['weather']}")
                st.write(f"Humedad: {weather_data['humidity']}%")

        is_eternal = mode == 'eterno'
        if is_eternal:
            st.write("**Nota:** Las cápsulas eternas se almacenan permanentemente en blockchain (IPFS).")

        generate_clip_option = st.checkbox("Generar Clip Automático", value=clip_generation_enabled)
        clip_duration = st.slider("Duración del Clip (segundos)", min_value=15, max_value=60, value=30) if generate_clip_option else None

        if st.button("Crear Cápsula"):
            capsule = Capsule(
                uid=f"capsule_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                usuario=user,
                contenido=content,
                ubicacion=location,
                modo=mode,
                fecha=date,
                privacy=privacy,
                time_scale='dia',
                price=price,
                temas=themes,
                parameters={"themes": themes},
                variables={"notification_range": default_notification_range}
            )
            if weather_data:
                capsule.parameters["weather_data"] = weather_data
            if is_eternal:
                capsule.parameters["is_eternal"] = True
            if mode == 'educativo':
                capsule.parameters["educational_level"] = educational_level
                capsule.parameters["learning_objectives"] = learning_objectives
            capsule.save()

            if generate_clip_option:
                clip_url = generate_clip(content, duration=clip_duration)
                capsule.parameters["clip_url"] = clip_url
                capsule.save()
                st.write(f"**Clip Generado:** {clip_url}")

            st.success("Cápsula creada correctamente.")
            st.write(f"**Contenido:** {capsule.contenido}")
            st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
            st.write(f"**Temas:** {', '.join(themes)}")
            st.write(f"**Privacidad:** {capsule.privacy}")
            st.write(f"**Precio:** ${capsule.price}")
            st.write(f"**Modo:** {capsule.modo}")
            if is_eternal:
                st.write("**Cápsula Eterna:** Sí")
            if generate_clip_option:
                st.write(f"**Clip Automático:** {clip_url}")

        if st.checkbox("Crear Cápsulas Masivas", value=False):
            num_capsules = st.number_input("Número de Cápsulas a Generar", min_value=1, max_value=100, value=10, step=1)
            if st.button("Generar Cápsulas Masivas"):
                created_capsules = create_massive_capsules(user, num_capsules)
                st.success(f"Se generaron {len(created_capsules)} cápsulas masivas.")
    else:
        return render(request, 'create_capsule.html')


########

def capsule_museum(request):
    from kudos_app.models import User, Capsule, SettingsConfig, Notification, Character
    from django.db.models import Q
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Museo Universal de Cápsulas")
        st.write("Explora un archivo eterno de la memoria humana preservado en blockchain.")

        user = request.user if request.user.is_authenticated else User.objects.first()

        museum_config = SettingsConfig.objects.get_or_create(key="capsule_museum_settings")[0]
        museum_themes = museum_config.parameters.get("museum_themes", ["Historia", "Cultura", "Ciencia", "Arte"])
        vr_sky = museum_config.parameters.get("vr_sky", "https://example.com/museum_sky.jpg")

        st.header("Cápsulas Eternas")
        st.write("Descubre cápsulas preservadas para la posteridad.")

        # Aplicar filtros
        category = st.selectbox("Categoría", [""] + museum_themes, index=0, key="museum_category")
        time_period = st.selectbox("Período de Tiempo", ["", "ancient", "medieval", "modern", "contemporary"], index=0, key="museum_time_period")
        sort_by = st.selectbox("Ordenar Por", ["likes", "date"], index=0, key="museum_sort_by")

        # Consulta base
        eternal_capsules = Capsule.objects.filter(modo='eterno', privacy='publico')

        # Filtrar por categoría
        if category:
            eternal_capsules = eternal_capsules.filter(Q(temas__contains=[category]) | Q(temas=category))

        # Filtrar por período de tiempo
        if time_period:
            if time_period == "ancient":
                eternal_capsules = eternal_capsules.filter(fecha__year__lte=500)
            elif time_period == "medieval":
                eternal_capsules = eternal_capsules.filter(fecha__year__gte=500, fecha__year__lte=1500)
            elif time_period == "modern":
                eternal_capsules = eternal_capsules.filter(fecha__year__gte=1500, fecha__year__lte=1900)
            elif time_period == "contemporary":
                eternal_capsules = eternal_capsules.filter(fecha__year__gte=1900)

        # Crear una lista de cápsulas para el selectbox
        capsule_options = [c.contenido[:50] for c in eternal_capsules]
        if capsule_options:
            selected_capsule = st.selectbox("Selecciona una Cápsula", capsule_options, key="museum_select_capsule")
            # Filtrar la cápsula seleccionada sin tomar un slice previo
            capsule = eternal_capsules.filter(contenido__startswith=selected_capsule[:50]).first()
            if capsule:
                st.write(f"**Autor:** {capsule.usuario.alias}")
                st.write(f"**Contenido:** {capsule.contenido}")
                st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
                st.write(f"**Fecha:** {capsule.fecha}")
                st.write(f"**Temas:** {', '.join(capsule.temas if isinstance(capsule.temas, list) else [capsule.temas])}")
                weather_data = capsule.parameters.get('weather_data', {})
                if weather_data:
                    st.write(f"**Clima:** {weather_data.get('weather', 'No disponible')}")

                map_data = [{'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x}]
                st.map(map_data, zoom=10)

                st.subheader("Guía Histórica")
                character = Character.objects.filter(theme__in=capsule.temas if isinstance(capsule.temas, list) else [capsule.temas]).first()
                if not character:
                    character = Character.objects.create(
                        uid=f"char_museum_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                        nombre="Albert Einstein",
                        rol="guia",
                        theme="Ciencia",
                        imagen_adultos="https://example.com/einstein_adults.png",
                        modelo_ar="https://example.com/einstein_vr.glb"
                    )
                st.write(f"**Guía:** {character.nombre} (Experto en {character.theme})")
                st.image(character.imagen_adultos)

                col1, col2 = st.columns(2)
                with col1:
                    if st.button("Ver en AR", key=f"ar_{capsule.uid}"):
                        narrative = f"Explora esta cápsula eterna. Soy {character.nombre}. {capsule.contenido[:50]}..."
                        st.components.v1.html(f"""
                        <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                        <a-scene embedded>
                            <a-text value="{narrative}" position="0 1.5 -5" align="center"></a-text>
                            <a-camera position="0 1.6 0"></a-camera>
                        </a-scene>
                        """, height=500)
                with col2:
                    if st.button("Ver en VR", key=f"vr_{capsule.uid}"):
                        narrative = f"Bienvenido al Museo. Soy {character.nombre}. {capsule.contenido[:50]}..."
                        model_url = character.modelo_ar if character.modelo_ar else "https://example.com/default_vr_model.glb"
                        st.components.v1.html(f"""
                        <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                        <a-scene embedded vr-mode-ui="enabled: true">
                            <a-sky src="{vr_sky}"></a-sky>
                            <a-entity
                                gltf-model="{model_url}"
                                position="0 0 -5"
                                scale="0.5 0.5 0.5"
                                animation="property: rotation; to: 0 360 0; loop: true; dur: 10000"
                            ></a-entity>
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

                if st.button("Dar Like", key=f"like_museum_{capsule.uid}"):
                    capsule.likes.add(user)
                    Notification.objects.create(
                        user=capsule.usuario,
                        type='like',
                        message=f"{user.alias} dio like a tu cápsula eterna: {capsule.contenido[:50]}...",
                        priority='baja'
                    )
                    st.success("Like registrado.")
            else:
                st.info("No se encontró la cápsula seleccionada.")
        else:
            st.info("No hay cápsulas eternas en el museo que coincidan con los filtros seleccionados.")

        st.header("Contribuir al Museo")
        st.write("Agrega una cápsula eterna para preservar tu legado.")
        content = st.text_area("Contenido", placeholder="Comparte algo para la eternidad...", key="museum_content")
        themes = st.multiselect("Temas", museum_themes, default=["Historia"], key="museum_themes")
        location_enabled = st.checkbox("Incluir Ubicación", value=True, key="museum_location_enabled")
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001, key="museum_latitude")
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001, key="museum_longitude")
            location = Point(longitude, latitude)

        if st.button("Preservar Cápsula Eterna", key="museum_preserve"):
            capsule = Capsule(
                uid=f"eternal_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                usuario=user,
                contenido=content,
                ubicacion=location,
                modo='eterno',
                fecha=datetime.now().date(),
                privacy='publico',
                time_scale='dia',
                price=0.0,
                temas=themes,
                parameters={'preserved_in_blockchain': True},
                variables={'visibility_range': user.notification_distance}
            )
            capsule.save()
            Notification.objects.create(
                user=user,
                type='eternal_submission',
                message=f"Tu cápsula eterna '{content[:50]}...' ha sido preservada en el museo.",
                priority='media'
            )
            st.success("Cápsula preservada en el museo universal.")

    else:
        # Renderizado para Django con filtros
        category = request.GET.get('category', '')
        time_period = request.GET.get('time_period', '')
        sort_by = request.GET.get('sort_by', 'likes')

        # Consulta base
        capsules = Capsule.objects.filter(modo='eterno', privacy='publico')

        # Filtrar por categoría
        if category:
            capsules = capsules.filter(Q(temas__contains=[category]) | Q(temas=category))

        # Filtrar por período de tiempo
        if time_period:
            if time_period == "ancient":
                capsules = capsules.filter(fecha__year__lte=500)
            elif time_period == "medieval":
                capsules = capsules.filter(fecha__year__gte=500, fecha__year__lte=1500)
            elif time_period == "modern":
                capsules = capsules.filter(fecha__year__gte=1500, fecha__year__lte=1900)
            elif time_period == "contemporary":
                capsules = capsules.filter(fecha__year__gte=1900)

        # Ordenar y tomar slice al final
        if sort_by == "likes":
            capsules = capsules.order_by('-likes')[:10]
        else:
            capsules = capsules.order_by('-fecha')[:10]

        return render(request, 'capsule_museum.html', {'capsules': capsules})

#######

def historical_map(request):
    from kudos_app.models import User, Capsule, SettingsConfig
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Mapa Histórico con Máquina del Tiempo")
        st.write("Viaja en el tiempo y explora eventos históricos en un mapa interactivo.")

        user = request.user if request.user.is_authenticated else User.objects.first()

        map_config = SettingsConfig.objects.get_or_create(key="historical_map_settings")[0]
        historical_themes = map_config.parameters.get("historical_themes", ["Historia", "Cultura", "Ciencia", "Arte"])
        default_zoom = map_config.variables.get("default_zoom", 2)
        time_range = map_config.variables.get("time_range", 100)

        st.header("Configurar Máquina del Tiempo")
        st.write("Selecciona un periodo y temas para explorar el pasado.")
        year_start = st.slider("Año de Inicio", min_value=1, max_value=datetime.now().year, value=datetime.now().year - time_range)
        year_end = st.slider("Año de Fin", min_value=year_start, max_value=datetime.now().year, value=datetime.now().year)
        themes = st.multiselect("Temas Históricos", historical_themes, default=historical_themes[:2])

        historical_capsules = Capsule.objects.filter(
            privacy='publico',
            modo__in=['eterno', 'educativo', 'artístico'],
            fecha__year__gte=year_start,
            fecha__year__lte=year_end,
        )

        # Filtrar por temas usando una consulta para jsonb
        if themes:
            theme_conditions = Q()
            for theme in themes:
                theme_conditions |= Q(**{f"temas__contains": theme})
            historical_capsules = historical_capsules.filter(theme_conditions)

        historical_capsules = historical_capsules.order_by('fecha')

        st.header("Mapa Histórico")
        if historical_capsules.exists():
            map_data = [
                {
                    'lat': capsule.ubicacion.y,
                    'lon': capsule.ubicacion.x,
                    'description': f"{capsule.contenido[:50]}... ({capsule.fecha.year})"
                }
                for capsule in historical_capsules
            ]
            st.map(map_data, zoom=default_zoom)

            st.subheader("Línea de Tiempo")
            selected_year = st.slider("Selecciona un Año", min_value=year_start, max_value=year_end, value=year_start)
            year_capsules = historical_capsules.filter(fecha__year=selected_year)
            if year_capsules.exists():
                for capsule in year_capsules:
                    st.subheader(f"{capsule.contenido[:50]}... ({capsule.fecha.year})")
                    st.write(f"**Autor:** {capsule.usuario.alias}")
                    st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
                    st.write(f"**Temas:** {', '.join(capsule.temas)}")
                    weather_data = capsule.parameters.get('weather_data', {})
                    if weather_data:
                        st.write(f"**Clima:** {weather_data.get('weather', 'No disponible')}")
                    st.write("---")
            else:
                st.info(f"No hay cápsulas para el año {selected_year} con los temas seleccionados.")

            if year_capsules.exists() and st.button("Explorar en VR"):
                capsule = year_capsules.first()
                narrative = f"Viaja al {capsule.fecha.year}. {capsule.contenido[:50]}..."
                st.components.v1.html(f"""
                <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                <a-scene embedded vr-mode-ui="enabled: true">
                    <a-sky src="https://example.com/historical_sky.jpg"></a-sky>
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
            st.info("No hay cápsulas históricas disponibles para el periodo y temas seleccionados.")

        st.header("Contribuir al Mapa Histórico")
        st.write("Agrega una cápsula histórica para enriquecer el museo del tiempo.")
        content = st.text_area("Contenido", placeholder="Ejemplo: Batalla de Waterloo...")
        historical_date = st.date_input("Fecha Histórica", value=datetime.now().date() - timedelta(days=365 * 100))
        themes_input = st.multiselect("Temas", historical_themes, default=["Historia"])
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        if st.button("Agregar Cápsula Histórica"):
            capsule = Capsule(
                uid=f"hist_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                usuario=user,
                contenido=content,
                ubicacion=location,
                modo='eterno',
                fecha=historical_date,
                privacy='publico',
                time_scale='dia',
                price=0.0,
                temas=themes_input,
                parameters={'historical_entry': True},
                variables={'visibility_range': user.notification_distance}
            )
            capsule.save()
            Notification.objects.create(
                user=user,
                type='historical_contribution',
                message=f"Tu cápsula histórica '{content[:50]}...' ha sido agregada al mapa.",
                priority='media'
            )
            st.success("Cápsula histórica agregada.")

    else:
        return render(request, 'historical_map.html')


############

def capsule_search(request):
    from kudos_app.models import User, Capsule, Notification
    from django.http import HttpResponse
    from django.contrib.gis.geos import Point
    from django.contrib.gis.measure import D
    from datetime import datetime
    import streamlit as st
    from streamlit_folium import st_folium
    import folium
    from django.db.models import Q

    print("Entrando en capsule_search...")

    # Verificar si estamos en Streamlit o Django
    is_streamlit = hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit

    if is_streamlit:
        print("Ejecutando en modo Streamlit...")
        # Interfaz de Streamlit
        st.title("Buscador Multidimensional de Cápsulas")
        st.write("Explora cápsulas por contenido, ubicación, tiempo, temas, climatología y más.")
        print("Interfaz básica de Streamlit generada.")
    else:
        print("Ejecutando en modo Django...")
        return HttpResponse("Esta vista solo está disponible a través de Streamlit. Por favor, accede a través de http://localhost:8504")

    # Obtener el usuario
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

    # Botón para limpiar la sesión
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
    # Filtrar cápsulas con depuración
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
    # Mostrar resultados
    st.header("Resultados de la Búsqueda")
    if capsules.exists():
        print(f"Total de cápsulas para mostrar: {capsules.count()}")
        for capsule in capsules:
            capsule_key = f"capsule_{capsule.uid}"  # Clave única basada en el UID de la cápsula
            st.markdown(f"""
            <div class="capsule-card">
                <h3>{capsule.contenido[:50]}...</h3>
                <p><strong>Autor:</strong> {capsule.usuario.alias}</p>
                <p><strong>Ubicación:</strong> ({capsule.ubicacion.y}, {capsule.ubicacion.x})</p>
                <p><strong>Fecha:</strong> {capsule.fecha}</p>
                <p><strong>Temas:</strong> {', '.join(capsule.temas if isinstance(capsule.temas, list) else [capsule.temas])}</p>
                <p><strong>Modo:</strong> {capsule.modo.capitalize()}</p>
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

############

def ai_utils_generate_recommendations(context):
    from kudos_app.models import Capsule
    # Filtrar por temas usando una consulta para jsonb
    theme_conditions = Q()
    for theme in context:
        theme_conditions |= Q(**{f"temas__contains": theme})
    return Capsule.objects.filter(
        theme_conditions,
        modo='educativo',
        privacy='publico'
    ).values_list('uid', flat=True)[:5]

def generate_certificate_pdf(user, plan):
    filename = f"certificate_{user.id}_{plan['title'].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    c.drawString(100, 750, "Certificado de Finalización")
    c.drawString(100, 730, f"Usuario: {user.alias}")
    c.drawString(100, 710, f"Plan: {plan['title']}")
    c.drawString(100, 690, f"Fecha: {datetime.now().date()}")
    c.save()
    return filename

def get_recommended_capsules(user, plan_themes):
    from kudos_app.models import Capsule
    recommended_uids = ai_utils_generate_recommendations(context=plan_themes)
    return Capsule.objects.filter(uid__in=recommended_uids, modo='educativo', privacy='publico')[:5]

def education_plan(request):
    from kudos_app.models import User, Capsule, SettingsConfig, Notification, Certificate
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Planes de Aprendizaje 5D en Kudos")
        st.write("Crea y explora itinerarios educativos personalizados en un entorno multidimensional.")

        user = User.objects.first()

        edu_config = SettingsConfig.objects.get_or_create(key="education_plan_settings")[0]
        default_themes = edu_config.parameters.get("default_themes", ["Historia", "Ciencia", "Arte", "Matemáticas"])
        default_duration = edu_config.variables.get("default_duration", 30)

        st.header("Crear un Nuevo Plan de Aprendizaje")
        st.write("Diseña un itinerario educativo personalizado.")
        plan_name = st.text_input("Nombre del Plan", placeholder="Ejemplo: Historia del Arte")
        plan_description = st.text_area("Descripción", placeholder="Describe los objetivos del plan...")
        target_audience = st.selectbox("Audiencia Objetivo", ["Primaria", "Secundaria", "Universidad", "Adultos"], index=0)
        themes = st.multiselect("Temas", default_themes, default=user.necesidades if user.necesidades else default_themes[:2])
        duration = st.number_input("Duración (días)", min_value=1, value=default_duration)
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        st.subheader("Seleccionar Cápsulas")
        capsules = Capsule.objects.filter(
            privacy='publico',
            modo='educativo',
        )
        # Filtrar por temas usando una consulta para jsonb
        if themes:
            theme_conditions = Q()
            for theme in themes:
                theme_conditions |= Q(**{f"temas__contains": theme})
            capsules = capsules.filter(theme_conditions)

        selected_capsules = st.multiselect("Cápsulas para el Plan", [c.contenido[:50] for c in capsules], default=[])

        share_plan = st.checkbox("Compartir el Plan con Otros Usuarios", value=False)
        shared_with = st.multiselect("Compartir con (Usuarios)", [u.alias for u in User.objects.all()], default=[]) if share_plan else []

        if st.button("Crear Plan"):
            if plan_name and selected_capsules:
                capsule_ids = [capsule.uid for capsule in capsules if capsule.contenido[:50] in selected_capsules]
                plan = {
                    "title": plan_name,
                    "description": plan_description,
                    "target_audience": target_audience,
                    "themes": themes,
                    "capsule_ids": capsule_ids,
                    "created_by": user.id,
                    "created_by_alias": user.alias,
                    "created_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "duration": duration,
                    "location": {"lat": location.y, "lon": location.x},
                    "shared": share_plan,
                    "shared_with": shared_with,
                    "progress": 0,
                    "collaborators": [user.alias]
                }
                user.parameters["education_plans"] = user.parameters.get("education_plans", []) + [plan]
                user.save()

                if share_plan:
                    for shared_user_alias in shared_with:
                        shared_user = User.objects.get(alias=shared_user_alias)
                        shared_user.parameters["shared_education_plans"] = shared_user.parameters.get("shared_education_plans", []) + [plan]
                        shared_user.save()
                        Notification.objects.create(
                            user=shared_user,
                            type='plan_shared',
                            message=f"{user.alias} compartió el plan de aprendizaje '{plan_name}' contigo.",
                            priority='media'
                        )

                Notification.objects.create(
                    user=user,
                    type='edu_plan_created',
                    message=f"Tu plan de aprendizaje '{plan_name}' ha sido creado.",
                    priority='media'
                )
                st.success("Plan de aprendizaje creado.")
            else:
                st.error("Por favor, completa todos los campos y selecciona al menos una cápsula.")

        st.header("Explorar Planes de Aprendizaje")
        plans = user.parameters.get("education_plans", [])
        shared_plans = user.parameters.get("shared_education_plans", [])
        all_plans = plans + shared_plans
        if all_plans:
            selected_plan = st.selectbox("Selecciona un Plan", [p["title"] for p in all_plans])
            plan = next(p for p in all_plans if p["title"] == selected_plan)
            st.write(f"**Creador:** {plan['created_by_alias']}")
            st.write(f"**Descripción:** {plan['description']}")
            st.write(f"**Audiencia:** {plan['target_audience']}")
            st.write(f"**Temas:** {', '.join(plan['themes'])}")
            st.write(f"**Duración:** {plan['duration']} días")
            st.write(f"**Progreso:** {plan['progress']}%")
            st.write(f"**Colaboradores:** {', '.join(plan['collaborators'])}")
            st.write(f"**Ubicación:** ({plan['location']['lat']}, {plan['location']['lon']})")

            map_data = [{'lat': plan['location']['lat'], 'lon': plan['location']['lon']}]
            st.map(map_data, zoom=10)

            if user.alias not in plan["collaborators"]:
                if st.button("Unirse al Plan"):
                    plan["collaborators"].append(user.alias)
                    user.parameters["education_plans"] = plans
                    user.parameters["shared_education_plans"] = shared_plans
                    user.save()
                    for shared_user_alias in plan["collaborators"]:
                        shared_user = User.objects.get(alias=shared_user_alias)
                        Notification.objects.create(
                            user=shared_user,
                            type='edu_collab_joined',
                            message=f"{user.alias} se ha unido al plan '{plan['title']}'.",
                            priority='baja'
                        )
                    st.success("Te has unido al plan.")
            else:
                st.info("Ya eres colaborador de este plan.")

            st.subheader("Cápsulas del Plan")
            related_capsules = Capsule.objects.filter(uid__in=plan["capsule_ids"])
            for capsule in related_capsules:
                st.write(f"- {capsule.contenido[:50]}... (Autor: {capsule.usuario.alias})")

            st.subheader("Cápsulas Recomendadas")
            recommended_capsules = get_recommended_capsules(user, plan["themes"])
            for capsule in recommended_capsules:
                st.write(f"- {capsule.contenido[:50]}... (Autor: {capsule.usuario.alias})")

            if st.button("Marcar Progreso"):
                plan["progress"] = min(plan["progress"] + 10, 100)
                user.parameters["education_plans"] = plans
                user.parameters["shared_education_plans"] = shared_plans
                user.save()
                Notification.objects.create(
                    user=user,
                    type='edu_progress',
                    message=f"Progreso actualizado en '{plan['title']}': {plan['progress']}%",
                    priority='baja'
                )
                for shared_user_alias in plan["collaborators"]:
                    if shared_user_alias != user.alias:
                        shared_user = User.objects.get(alias=shared_user_alias)
                        Notification.objects.create(
                            user=shared_user,
                            type='edu_progress_update',
                            message=f"{user.alias} actualizó el progreso de '{plan['title']}' a {plan['progress']}%",
                            priority='baja'
                        )
                st.success(f"Progreso actualizado: {plan['progress']}%")

                if plan["progress"] == 100:
                    certificate_path = generate_certificate_pdf(user, plan)
                    with open(certificate_path, 'rb') as f:
                        certificate = Certificate(
                            user=user,
                            plan=plan,
                            certificate_file=File(f, name=certificate_path)
                        )
                        certificate.save()
                    Notification.objects.create(
                        user=user,
                        type='edu_certificate',
                        message=f"¡Felicidades! Has recibido un certificado por completar '{plan['title']}'.",
                        priority='alta'
                    )
                    st.success("¡Certificado generado! Descárgalo desde tu perfil.")

        else:
            st.info("No hay planes de aprendizaje disponibles.")

        st.header("Tus Planes de Aprendizaje")
        plans = user.parameters.get("education_plans", [])
        if plans:
            for plan in plans:
                st.subheader(plan["title"])
                st.write(f"**Descripción:** {plan['description']}")
                st.write(f"**Audiencia:** {plan['target_audience']}")
                st.write(f"**Temas:** {', '.join(plan['themes'])}")
                st.write(f"**Creado el:** {plan['created_at']}")
                st.write(f"**Progreso:** {plan['progress']}%")
                st.write("**Cápsulas:**")
                for capsule_id in plan["capsule_ids"]:
                    capsule = Capsule.objects.get(uid=capsule_id)
                    st.write(f"- {capsule.contenido[:50]}...")
                st.write(f"**Compartido:** {'Sí' if plan.get('shared', False) else 'No'}")
                if plan.get('shared', False):
                    st.write(f"**Compartido con:** {', '.join(plan['shared_with'])}")
                st.write("---")
        else:
            st.info("Aún no has creado planes de aprendizaje.")

        st.header("Planes de Aprendizaje Compartidos Contigo")
        shared_plans = user.parameters.get("shared_education_plans", [])
        if shared_plans:
            for plan in shared_plans:
                st.subheader(plan["title"])
                st.write(f"**Creado por:** {plan['created_by_alias']}")
                st.write(f"**Descripción:** {plan['description']}")
                st.write(f"**Audiencia:** {plan['target_audience']}")
                st.write(f"**Temas:** {', '.join(plan['themes'])}")
                st.write(f"**Creado el:** {plan['created_at']}")
                st.write("**Cápsulas:**")
                for capsule_id in plan["capsule_ids"]:
                    capsule = Capsule.objects.get(uid=capsule_id)
                    st.write(f"- {capsule.contenido[:50]}...")
                st.write("---")
        else:
            st.info("No hay planes de aprendizaje compartidos contigo.")

    else:
        return render(request, 'education_plan.html')

def education_recommender(request):
    from kudos_app.models import User, Capsule, SettingsConfig, Notification
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')

    user = request.user
    location = user.ubicacion if user and user.ubicacion else Point(-3.7038, 40.4168)

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Recomendador Educativo en Kudos")
        st.write("Descubre cápsulas y planes de aprendizaje personalizados para ti.")

        rec_config = SettingsConfig.objects.get_or_create(key="education_recommender_settings")[0]
        default_themes = rec_config.parameters.get("default_themes", ["Historia", "Ciencia", "Arte", "Matemáticas"])
        recommendation_range = rec_config.variables.get("recommendation_range", 5000)
        max_recommendations = rec_config.variables.get("max_recommendations", 5)

        st.header("Tu Perfil Educativo")
        interests = st.multiselect(
            "Tus Intereses",
            default_themes,
            default=user.necesidades if user.necesidades else default_themes[:2]
        )
        if st.button("Actualizar Intereses"):
            user.necesidades = interests
            user.save()
            Notification.objects.create(
                user=user,
                type='interests_updated',
                message="Tus intereses educativos han sido actualizados.",
                priority='baja'
            )
            st.success("Intereses actualizados.")

        st.header("Recomendaciones Personalizadas")
        if st.button("Obtener Recomendaciones"):
            try:
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                context = (
                    f"Usuario: {user.alias}. "
                    f"Intereses: {', '.join(interests)}. "
                    f"Ubicación: ({location.y}, {location.x})" if user.ubicacion else "Ubicación no especificada. "
                    f"Progreso en planes educativos: {Capsule.objects.filter(usuario=user, modo='educativo', variables__progress__gt=0).count()} planes activos."
                )
                prompt = (
                    f"Actúa como un recomendador educativo para Kudos. "
                    f"Basado en el siguiente contexto: {context}, "
                    f"sugiere {max_recommendations} cápsulas o planes de aprendizaje multidimensionales (contenido, geolocalización, tiempo, temas, climatología). "
                    f"Proporciona una breve descripción para cada recomendación."
                )
                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "user", "content": prompt}]
                )
                recommendations = response.choices[0].message.content.split('\n\n')
                st.session_state.recommendations = recommendations[:max_recommendations]
            except Exception as e:
                st.error(f"Error al generar recomendaciones: {e}")
                st.session_state.recommendations = []

        if 'recommendations' in st.session_state and st.session_state.recommendations:
            for rec in st.session_state.recommendations:
                st.subheader(rec.split('.')[0])
                st.write(rec)
                st.write("---")

        st.header("Cápsulas Educativas Cercanas")
        if user.ubicacion:
            nearby_capsules = Capsule.objects.filter(
                modo='educativo',
                privacy='publico',
                ubicacion__distance_lte=(location, D(m=recommendation_range)),
            )
            # Filtrar por intereses usando una consulta para jsonb
            if interests:
                interest_conditions = Q()
                for interest in interests:
                    interest_conditions |= Q(**{f"temas__contains": interest})
                nearby_capsules = nearby_capsules.filter(interest_conditions)

            nearby_capsules = nearby_capsules.order_by('-timestamp')[:max_recommendations]
            if nearby_capsules.exists():
                for capsule in nearby_capsules:
                    st.subheader(f"{capsule.contenido[:50]}...")
                    st.write(f"**Autor:** {capsule.usuario.alias}")
                    st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
                    st.write(f"**Temas:** {', '.join(capsule.temas)}")
                    st.write(f"**Nivel Educativo:** {capsule.parameters.get('educational_level', 'No especificado')}")
                    st.write(f"**Objetivos de Aprendizaje:** {capsule.parameters.get('learning_objectives', 'No especificado')}")
                    if st.button(f"Explorar Cápsula - {capsule.uid}", key=f"explore_capsule_{capsule.uid}"):
                        st.write(f"Detalles completos: {capsule.contenido}")
                    if st.button(f"Compartir Cápsula - {capsule.uid}", key=f"share_capsule_{capsule.uid}"):
                        share_with = st.selectbox(
                            "Compartir con",
                            [u.alias for u in User.objects.all()],
                            key=f"share_select_{capsule.uid}"
                        )
                        if share_with:
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
                    st.write("---")

                map_data = [
                    {'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x, 'description': capsule.contenido[:50]}
                    for capsule in nearby_capsules
                ]
                st.map(map_data, zoom=10)
            else:
                st.info("No hay cápsulas educativas cercanas en este momento.")
        else:
            st.warning("Por favor, configura tu ubicación en el perfil para ver cápsulas cercanas.")

        st.header("Planes de Aprendizaje Recomendados")
        plans = user.parameters.get("shared_education_plans", []) + user.parameters.get("education_plans", [])
        recommended_plans = [
            plan for plan in plans if any(theme in plan["themes"] for theme in interests)
        ][:max_recommendations]
        if recommended_plans:
            for plan in recommended_plans:
                st.subheader(plan["title"])
                st.write(f"**Creado por:** {plan['created_by_alias']}")
                st.write(f"**Descripción:** {plan['description']}")
                st.write(f"**Audiencia:** {plan['target_audience']}")
                st.write(f"**Temas:** {', '.join(plan['themes'])}")
                st.write(f"**Progreso:** {plan['progress']}%")
                if user.alias not in plan["collaborators"]:
                    if st.button(f"Unirse al Plan - {plan['title']}", key=f"join_plan_{plan['title']}"):
                        plan["collaborators"].append(user.alias)
                        user.parameters["education_plans"] = user.parameters.get("education_plans", [])
                        user.parameters["shared_education_plans"] = user.parameters.get("shared_education_plans", [])
                        user.save()
                        for shared_user_alias in plan["collaborators"]:
                            shared_user = User.objects.get(alias=shared_user_alias)
                            Notification.objects.create(
                                user=shared_user,
                                type='edu_collab_joined',
                                message=f"{user.alias} se ha unido al plan '{plan['title']}'.",
                                priority='baja'
                            )
                        st.success("Te has unido al plan.")
                else:
                    st.info("Ya eres colaborador de este plan.")
                st.write("---")
        else:
            st.info("No hay planes de aprendizaje recomendados según tus intereses.")

    else:
        return render(request, 'education_recommender.html')

def ar_view(request, capsule_id):
    from kudos_app.models import User, Capsule, Character, WisdomSpace, Notification
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        try:
            capsule = Capsule.objects.get(id=capsule_id)
        except Capsule.DoesNotExist:
            raise Http404("Cápsula no encontrada")

        user = request.user

        st.title("Realidad Aumentada en Kudos")
        st.write("Apunta tu cámara para ver esta cápsula en AR. Asegúrate de tener una buena conexión y permisos de geolocalización activados.")

        st.header(f"Cápsula: {capsule.contenido[:50]}...")
        st.write(f"**Autor:** {capsule.usuario.alias}")
        st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
        st.write(f"**Fecha:** {capsule.fecha}")
        st.write(f"**Temas:** {', '.join(capsule.temas)}")
        st.write(f"**Modo:** {capsule.modo.capitalize()}")
        weather_data = capsule.parameters.get('weather_data', {})
        if weather_data:
            st.write(f"**Clima:** {weather_data.get('weather', 'No disponible')}")
        if capsule.modo == 'educativo':
            st.write(f"**Nivel Educativo:** {capsule.parameters.get('educational_level', 'No especificado')}")
            st.write(f"**Objetivos de Aprendizaje:** {capsule.parameters.get('learning_objectives', 'No especificado')}")

        st.header("Guía Histórica")
        character = None
        for theme in capsule.temas:
            character = Character.objects.filter(theme=theme).first()
            if character:
                break
        if not character:
            try:
                character = Character.objects.get(nombre="Albert Einstein")
            except Character.DoesNotExist:
                character = Character.objects.create(
                    uid=f"char_default_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    nombre="Albert Einstein",
                    rol="guia",
                    theme="Ciencia",
                    imagen_adultos="https://example.com/einstein_adults.png",
                    modelo_ar="https://example.com/einstein_vr.glb"
                )

        st.write(f"Tu guía será **{character.nombre}**, un experto en {character.theme}.")
        st.image(character.imagen_adultos)

        st.header("Vista en Realidad Aumentada")
        st.write("Apunta tu cámara a un marcador AR (Hiro) para ver la cápsula en 3D.")

        narrative = f"Érase una vez en {capsule.contenido[:50]}... Bienvenido, soy {character.nombre}, te guiaré en esta experiencia."
        model_url = character.modelo_ar if character.modelo_ar else "https://example.com/default_model.glb"

        try:
            st.components.v1.html(f"""
            <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
            <script src="https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar-nft.js"></script>
            <a-scene embedded arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled: false;">
                <a-marker preset="hiro">
                    <a-entity gltf-model="{model_url}" position="0 0 0" scale="0.1 0.1 0.1" rotation="0 0 0" animation="property: rotation; to: 0 360 0; loop: true; dur: 5000"></a-entity>
                    <a-text value="{narrative}" position="0 0.5 0" align="center" color="white" width="2"></a-text>
                </a-marker>
                <a-entity camera></a-entity>
            </a-scene>
            """, height=500)
        except Exception as e:
            st.error(f"Error al renderizar la vista AR: {e}")

        st.header("Interacciones")
        col1, col2 = st.columns(2)
        with col1:
            if st.button("Dar Like"):
                capsule.likes.add(user)
                Notification.objects.create(
                    user=capsule.usuario,
                    type='like',
                    message=f"{user.alias} dio like a tu cápsula: {capsule.contenido[:50]}...",
                    priority='media',
                    location=capsule.ubicacion
                )
                st.success("Like registrado.")
        with col2:
            share_with = st.selectbox(
                "Compartir con",
                [u.alias for u in User.objects.all()],
                key=f"share_ar_{capsule.id}"
            )
            if st.button("Compartir"):
                shared_user = User.objects.get(alias=share_with)
                shared_user.parameters["shared_capsules"] = shared_user.parameters.get("shared_capsules", []) + [{
                    "uid": capsule.id,
                    "shared_by": user.alias,
                    "shared_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }]
                shared_user.save()
                Notification.objects.create(
                    user=shared_user,
                    type='capsule_shared',
                    message=f"{user.alias} compartió la cápsula '{capsule.contenido[:50]}...' contigo.",
                    priority='media',
                    location=capsule.ubicacion
                )
                st.success(f"Cápsula compartida con {share_with}.")

        related_space = WisdomSpace.objects.filter(subthemes__contains=capsule.temas).first()
        if related_space:
            st.header("Espacio de Sabiduría Relacionado")
            st.write(f"Este contenido está relacionado con el espacio **{related_space.name}**.")
            st.write(f"**Descripción:** {related_space.description}")
            st.write(f"**Subtemas:** {', '.join(related_space.subthemes)}")

    else:
        return render(request, 'ar_view.html')

def vr_view(request, capsule_id):
    from kudos_app.models import User, Capsule, SettingsConfig, Character, WisdomSpace, Notification
    if not request.user.is_authenticated:
        return redirect(reverse('login'))

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Realidad Virtual en Kudos")
        st.write("Explora esta cápsula en un entorno inmersivo de realidad virtual. Usa un visor compatible para la mejor experiencia.")

        try:
            capsule = Capsule.objects.get(id=capsule_id)
        except Capsule.DoesNotExist:
            raise Http404("Cápsula no encontrada")

        user = request.user

        vr_config = SettingsConfig.objects.get_or_create(key="vr_settings")[0]
        vr_sky = vr_config.parameters.get("default_sky", "https://example.com/vr_sky.jpg")

        st.header(f"Cápsula: {capsule.contenido[:50]}...")
        st.write(f"**Autor:** {capsule.usuario.alias}")
        st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
        st.write(f"**Fecha:** {capsule.fecha}")
        st.write(f"**Temas:** {', '.join(capsule.temas)}")
        st.write(f"**Modo:** {capsule.modo.capitalize()}")
        weather_data = capsule.parameters.get('weather_data', {})
        if weather_data:
            st.write(f"**Clima:** {weather_data.get('weather', 'No disponible')}")
        if capsule.modo == 'educativo':
            st.write(f"**Nivel Educativo:** {capsule.parameters.get('educational_level', 'No especificado')}")
            st.write(f"**Objetivos de Aprendizaje:** {capsule.parameters.get('learning_objectives', 'No especificado')}")

        st.subheader("Ubicación de la Cápsula")
        map_data = [{'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x, 'description': capsule.contenido[:50]}]
        st.map(map_data, zoom=10)

        st.subheader("Cambiar Modo de Visualización")
        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f"[Ver en AR]({reverse('ar_view', args=[capsule_id])})")
        with col2:
            st.markdown(f"[Ver en VR]({reverse('vr_view', args=[capsule_id])})")

        st.header("Guía Histórica")
        character = None
        for theme in capsule.temas:
            character = Character.objects.filter(theme=theme).first()
            if character:
                break
        if not character:
            try:
                character = Character.objects.get(nombre="Albert Einstein")
            except Character.DoesNotExist:
                character = Character.objects.create(
                    uid=f"char_default_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    nombre="Albert Einstein",
                    rol="guia",
                    theme="Ciencia",
                    imagen_adultos="https://example.com/einstein_adults.png",
                    modelo_ar="https://example.com/einstein_vr.glb"
                )

        st.write(f"Tu guía será **{character.nombre}**, experto en {character.theme}.")
        st.image(character.imagen_adultos)

        st.header("Vista en Realidad Virtual")
        st.write("Sumérgete en esta cápsula con VR.")

        narrative = f"Bienvenido a esta experiencia inmersiva. Soy {character.nombre}. {capsule.contenido[:100]}..."
        model_url = character.modelo_ar if character.modelo_ar else "https://example.com/default_vr_model.glb"

        try:
            weather_effect = "none"
            if weather_data and weather_data.get('weather'):
                weather = weather_data['weather'].lower()
                if "rain" in weather:
                    weather_effect = """
                    <a-entity particle-system="preset: rain; color: #0000FF; particleCount: 500; velocityValue: 0 -10 0"></a-entity>
                    """
                elif "snow" in weather:
                    weather_effect = """
                    <a-entity particle-system="preset: snow; color: #FFFFFF; particleCount: 500; velocityValue: 0 -5 0"></a-entity>
                    """

            vr_html = f"""
            <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/aframe-particle-system-component@1.1.3/dist/aframe-particle-system-component.min.js"></script>
            <a-scene embedded vr-mode-ui="enabled: true">
                <a-sky src="{vr_sky}"></a-sky>
                <a-entity
                    gltf-model="{model_url}"
                    position="0 0 -5"
                    scale="0.5 0.5 0.5"
                    animation="property: rotation; to: 0 360 0; loop: true; dur: 10000"
                ></a-entity>
                <a-text
                    value="{narrative}"
                    position="0 1.5 -5"
                    align="center"
                    color="white"
                    width="4"
                ></a-text>
                {weather_effect}
                <a-camera position="0 1.6 0"></a-camera>
            </a-scene>
            """
            st.components.v1.html(vr_html, height=500)
        except Exception as e:
            st.error(f"Error al renderizar la vista VR: {e}")

        st.header("Interacciones")
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("Explorar Cápsula"):
                st.write(f"**Contenido Completo:** {capsule.contenido}")
        with col2:
            if st.button("Dar Like"):
                capsule.likes.add(user)
                Notification.objects.create(
                    user=capsule.usuario,
                    type='like',
                    message=f"{user.alias} dio like a tu cápsula '{capsule.contenido[:50]}...' en VR.",
                    priority='media',
                    location=capsule.ubicacion
                )
                st.success("Like registrado.")
        with col3:
            share_with = st.selectbox(
                "Compartir con",
                [u.alias for u in User.objects.all()],
                key=f"share_vr_{capsule.id}"
            )
            if st.button("Compartir"):
                shared_user = User.objects.get(alias=share_with)
                shared_user.parameters["shared_capsules"] = shared_user.parameters.get("shared_capsules", []) + [{
                    "uid": capsule.id,
                    "shared_by": user.alias,
                    "shared_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }]
                shared_user.save()
                Notification.objects.create(
                    user=shared_user,
                    type='capsule_shared',
                    message=f"{user.alias} compartió la cápsula '{capsule.contenido[:50]}...' contigo desde VR.",
                    priority='media',
                    location=capsule.ubicacion
                )
                st.success(f"Cápsula compartida con {share_with}.")

        related_space = WisdomSpace.objects.filter(subthemes__contains=capsule.temas).first()
        if related_space:
            st.header("Espacio de Sabiduría Relacionado")
            st.write(f"Este contenido está relacionado con el espacio **{related_space.name}**.")
            st.write(f"**Descripción:** {related_space.description}")
            st.write(f"**Subtemas:** {', '.join(related_space.subthemes)}")
            if st.button("Explorar Espacio de Sabiduría"):
                st.write(f"Explorando el espacio de sabiduría '{related_space.name}'...")
                st.write(f"**Subtemas Disponibles:** {', '.join(related_space.subthemes)}")

    else:
        return render(request, 'vr_view.html')







def wisdom_repositories(request):
    from kudos_app.models import User, Capsule
    from django.db.models import Q
    import streamlit as st

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Repositorios de Sabiduría Multidimensional")
        st.write("Explora cápsulas educativas para aprender y compartir conocimiento global.")

        user = request.user if request.user.is_authenticated else User.objects.first()

        # Filtrar cápsulas educativas
        capsules = Capsule.objects.filter(modo='educativo', privacy='publico')

        # Filtros básicos
        themes = st.multiselect("Temas", ["Historia", "Cultura", "Ciencia", "Arte"], default=["Historia"], key="wisdom_themes")
        if themes:
            theme_conditions = Q()
            for theme in themes:
                theme_conditions |= Q(temas__contains=[theme])  # Solo usamos contains para arrays
            capsules = capsules.filter(theme_conditions)

        # Mostrar cápsulas
        st.header("Cápsulas Educativas")
        if capsules.exists():
            for capsule in capsules:
                capsule_key = f"capsule_wisdom_{capsule.uid}"
                st.markdown(f"""
                <div class="capsule-card">
                    <h3>{capsule.contenido[:50]}...</h3>
                    <p><strong>Autor:</strong> {capsule.usuario.alias}</p>
                    <p><strong>Ubicación:</strong> ({capsule.ubicacion.y}, {capsule.ubicacion.x})</p>
                    <p><strong>Fecha:</strong> {capsule.fecha}</p>
                    <p><strong>Temas:</strong> {', '.join(capsule.temas if isinstance(capsule.temas, list) else [capsule.temas])}</p>
                    <p><strong>Nivel Educativo:</strong> {capsule.parameters.get('educational_level', 'No especificado')}</p>
                    <p><strong>Objetivos de Aprendizaje:</strong> {capsule.parameters.get('learning_objectives', 'No especificado')}</p>
                </div>
                """, unsafe_allow_html=True)
                st.write("---")
        else:
            st.info("No se encontraron cápsulas educativas con los criterios seleccionados.")
    else:
        return render(request, 'wisdom_repositories.html', {'capsules': Capsule.objects.filter(modo='educativo', privacy='publico')})







# views.py (continuación del archivo existente)

# Importaciones necesarias para las nuevas vistas
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.db.models import Sum, Count
from kudos_app.models import AdminAccess, Transaction, AutomationConfig
import subprocess
import uuid

def admin_assistant(request):
    """
    Vista para un asistente personal basado en IA para administradores en Kudos.
    Ayuda a gestionar tareas administrativas avanzadas con sugerencias proactivas.
    Restringido a roles administrativos.
    """
    import streamlit as st
    from django.shortcuts import render
    from django.http import HttpRequest
    from django.conf import settings
    from kudos_app.models import User, SettingsConfig, Notification, Capsule, Transaction, AdminAccess
    from datetime import datetime, timedelta
    from django.db.models import Sum

    # Respuestas predefinidas como solución temporal
    def query_assistant(prompt):
        predefined_responses = {
            "Revisar estadísticas": "Recomiendo analizar las estadísticas de uso de cápsulas y transacciones para identificar tendencias. Por ejemplo, revisa qué cápsulas tienen más interacciones y ajusta las estrategias de marketing en consecuencia.",
            "Gestionar usuarios": "Sugiero revisar la actividad de los usuarios para identificar patrones de inactividad. Podrías enviar notificaciones personalizadas para reactivar a los usuarios inactivos.",
            "Optimizar costos": "Para optimizar costos, considera reducir el uso de recursos en cápsulas poco populares y enfócate en las que generan más ingresos.",
            "Planificar referendos": "Planifica un referendo para decidir sobre nuevas funcionalidades. Usa notificaciones globales para informar a los usuarios y aumentar la participación.",
            "Analizar tendencias de mercado": "Analiza las tendencias actuales en AR/VR y blockchain. Podrías incorporar nuevas tecnologías populares para atraer a más usuarios.",
        }
        for key in predefined_responses:
            if key.lower() in prompt.lower():
                return predefined_responses[key]
        return "No tengo una respuesta predefinida para esta consulta. Por favor, reformula tu pregunta o selecciona una tarea de la lista."

    if isinstance(request, HttpRequest):
        user = request.user
        is_streamlit = False
    else:
        user = request.user
        is_streamlit = True

    if not user.is_staff:
        if is_streamlit:
            st.error("Acceso denegado. Solo administradores pueden usar este asistente.")
        else:
            return render(request, '403.html')
        return

    if hasattr(user, 'uid'):
        admin_access = AdminAccess.objects.filter(user__uid=user.uid).first()
    else:
        admin_access = None

    if not admin_access or admin_access.access_level < 2:
        if is_streamlit:
            st.error("Acceso denegado. Solo administradores autorizados pueden usar este asistente.")
        else:
            return render(request, '403.html')
        return

    if is_streamlit:
        st.title("Asistente Administrativo de Kudos")
        st.write("Tu compañero IA para gestionar tareas administrativas avanzadas.")

        assistant_config = SettingsConfig.objects.get_or_create(key="admin_assistant_settings")[0]
        default_tasks = assistant_config.parameters.get("default_tasks", [
            "Revisar estadísticas", "Gestionar usuarios", "Optimizar costos", "Planificar referendos",
            "Analizar tendencias de mercado"
        ]) if assistant_config.parameters else [
            "Revisar estadísticas", "Gestionar usuarios", "Optimizar costos", "Planificar referendos",
            "Analizar tendencias de mercado"
        ]
        automation_level = assistant_config.variables.get("automation_level", 0.9) if assistant_config.variables else 0.9

        st.header("Tareas Administrativas")
        st.write("Selecciona una tarea o haz una consulta personalizada.")
        task = st.selectbox("Tarea", default_tasks + ["Consulta Personalizada"], key="admin_assistant_task")
        custom_query = st.text_input("Consulta Personalizada", placeholder="Ejemplo: ¿Cómo aumento los ingresos?", disabled=task != "Consulta Personalizada", key="admin_assistant_query")

        if st.button("Consultar Asistente", key="admin_assistant_consult"):
            if task == "Consulta Personalizada" and not custom_query:
                st.error("Por favor, escribe una consulta personalizada.")
            else:
                query = custom_query if task == "Consulta Personalizada" else task
                context = (
                    f"Usuario: {user.alias}, administrador de Kudos. "
                    f"Contexto: Proyecto multidimensional con IA, blockchain, AR/VR, y {Capsule.objects.count()} cápsulas creadas. "
                    f"Ingresos totales: ${Transaction.objects.aggregate(total=Sum('amount'))['total'] or 0:.2f}. "
                    f"Usuarios activos: {User.objects.filter(is_active=True).count()}."
                )
                prompt = (
                    f"Actúa como un asistente personal para un administrador de Kudos. "
                    f"Proporciona una sugerencia proactiva basada en esta consulta: '{query}'. "
                    f"Contexto: {context}. Responde en un tono profesional y estratégico."
                )
                # Usar respuestas predefinidas
                suggestion = query_assistant(prompt)
                st.write(f"**Asistente:** {suggestion}")

                if st.button("Guardar Sugerencia", key="admin_save_suggestion"):
                    Notification.objects.create(
                        user=user,
                        type='admin_suggestion',
                        message=f"Sugerencia: {suggestion[:50]}...",
                        priority='media'
                    )
                    st.success("Sugerencia guardada como notificación.")

                if "automatizar" in query.lower() and automation_level > 0.8:
                    st.write("**Asistente:** Esta tarea podría automatizarse. ¿Deseas proceder?")
                    if st.button("Automatizar Tarea", key="admin_automate_task"):
                        st.success("Tarea automatizada (simulada). Consulta el panel de control para ajustes.")

        st.header("Estadísticas Rápidas")
        st.write("Resumen de la actividad reciente.")
        time_delta = timedelta(days=7)
        recent_capsules = Capsule.objects.filter(timestamp__gte=datetime.now() - time_delta).count()
        recent_transactions = Transaction.objects.filter(timestamp__gte=datetime.now() - time_delta).aggregate(total=Sum('amount'))['total'] or 0
        active_users = User.objects.filter(is_active=True).count()
        st.write(f"**Cápsulas Creadas (Última Semana):** {recent_capsules}")
        st.write(f"**Ingresos (Última Semana):** ${recent_transactions:.2f}")
        st.write(f"**Usuarios Activos:** {active_users}")

        st.header("Acciones Rápidas")
        if st.button("Enviar Notificación Global", key="admin_global_notification"):
            message = st.text_input("Mensaje Global", placeholder="Ejemplo: Actualización del sistema disponible.", key="admin_global_message")
            if st.button("Confirmar Envío", key="admin_confirm_global"):
                for u in User.objects.filter(is_active=True):
                    Notification.objects.create(
                        user=u,
                        type='global',
                        message=message,
                        priority='alta'
                    )
                st.success("Notificación enviada a todos los usuarios activos.")

        st.header("Notificaciones Automáticas")
        st.write("Configura notificaciones automáticas basadas en eventos clave.")

        last_week_transactions = Transaction.objects.filter(timestamp__gte=datetime.now() - timedelta(days=14)).aggregate(total=Sum('amount'))['total'] or 0
        if recent_transactions < 0.9 * last_week_transactions:
            Notification.objects.create(
                user=user,
                type='alert',
                message="Alerta: Los ingresos han bajado más del 10% esta semana.",
                priority='alta'
            )
            st.warning("Se ha enviado una notificación automática: Ingresos bajos esta semana.")
    else:
        return render(request, 'admin_assistant.html')




def admin_panel(request):
    """
    Vista para el panel de control avanzado de administradores en Kudos.
    Incluye un asistente personal basado en IA, piloto automático para gestionar el proyecto,
    gestión de usuarios, microtransacciones, reglas automáticas y gestión de APIs.
    Restringido a administradores autorizados.
    """
    import streamlit as st
    from django.shortcuts import render
    from django.conf import settings
    from kudos_app.models import User, AdminAccess, Transaction, SettingsConfig, Capsule, Notification  # Agregamos Notification
    import subprocess
    import uuid

    if isinstance(request, HttpRequest):
        user = request.user
        is_streamlit = False
    else:
        user = request.user
        is_streamlit = True

    if not user.is_staff:
        if is_streamlit:
            st.error("Acceso denegado. Solo administradores pueden usar este panel.")
        else:
            return render(request, '403.html')
        return

    if hasattr(user, 'uid'):
        admin_access = AdminAccess.objects.filter(user__uid=user.uid).first()
    else:
        admin_access = None

    if not admin_access or admin_access.access_level < 1:
        if is_streamlit:
            st.error("Acceso denegado. Solo administradores autorizados pueden usar este panel.")
        else:
            return render(request, '403.html')
        return

    if is_streamlit:
        st.title("Panel de Control Avanzado - Kudos")

        # Configuración del cliente OpenAI
        try:
            from openai import OpenAI
            import httpx
            client = OpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url="https://api.openai.com/v1",
                http_client=httpx.Client()
            )
        except AttributeError:
            st.error("La clave API de OpenAI no está configurada. Por favor, configura OPENAI_API_KEY en el archivo .env.")
            return
        except Exception as e:
            st.error(f"Error al inicializar el cliente de OpenAI: {e}")
            return

        # Configuración general
        try:
            # Configuración de control
            control_config, created = SettingsConfig.objects.get_or_create(
                key="control_settings",
                defaults={'value': 0}
            )
        except Exception as e:
            st.error(f"Error al obtener configuraciones de control: {e}")
            return

        try:
            # Configuración de automatización
            automation_config, created = SettingsConfig.objects.get_or_create(
                key="automation_settings",
                defaults={'value': 0}
            )
        except Exception as e:
            st.error(f"Error al obtener configuraciones de automatización: {e}")
            return

        # Verificar permisos
        st.header(f"Bienvenido, {user.alias}")

        # Sección: Asistente Personal
        st.header("Asistente Personal")
        st.write("Interactúa con el asistente para gestionar tareas administrativas.")
        admin_assistant(request)

        # Sección: Gestión de Usuarios
        st.header("Gestión de Usuarios")
        st.write("Administra los usuarios del sistema.")

        # Listar usuarios
        st.subheader("Lista de Usuarios")
        users = User.objects.all()
        for u in users:
            st.write(f"UID: {u.uid}, Alias: {u.alias}, Email: {u.email}, Rol: {u.role}, Activo: {u.is_active}")
            col1, col2 = st.columns(2)
            with col1:
                if st.button(f"Editar {u.alias}", key=f"edit_{u.uid}"):
                    st.session_state['edit_user'] = u.uid
            with col2:
                if st.button(f"Eliminar {u.alias}", key=f"delete_{u.uid}"):
                    u.delete()
                    st.success(f"Usuario {u.alias} eliminado correctamente.")
                    st.rerun()

        # Editar usuario
        if 'edit_user' in st.session_state:
            edit_user = User.objects.get(uid=st.session_state['edit_user'])
            st.subheader(f"Editar Usuario: {edit_user.alias}")
            alias = st.text_input("Alias", value=edit_user.alias, key="edit_alias")
            email = st.text_input("Email", value=edit_user.email or "", key="edit_email")
            role = st.selectbox("Rol", options=['user', 'seller', 'teacher', 'prosumidor', 'founder'], index=['user', 'seller', 'teacher', 'prosumidor', 'founder'].index(edit_user.role), key="edit_role")
            is_active = st.checkbox("Activo", value=edit_user.is_active, key="edit_active")
            if st.button("Guardar Cambios", key="save_user_changes"):
                edit_user.alias = alias
                edit_user.email = email
                edit_user.role = role
                edit_user.is_active = is_active
                edit_user.save()
                st.success("Usuario actualizado correctamente.")
                del st.session_state['edit_user']
                st.rerun()

        # Crear nuevo usuario
        st.subheader("Crear Nuevo Usuario")
        new_uid = st.text_input("UID del nuevo usuario", key="new_uid")
        new_alias = st.text_input("Alias del nuevo usuario", key="new_alias")
        new_email = st.text_input("Email del nuevo usuario", key="new_email")
        new_password = st.text_input("Contraseña del nuevo usuario", type="password", key="new_password")
        new_role = st.selectbox("Rol del nuevo usuario", options=['user', 'seller', 'teacher', 'prosumidor', 'founder'], key="new_role")
        new_is_active = st.checkbox("Activo (nuevo usuario)", value=True, key="new_active")
        if st.button("Crear Usuario", key="create_user"):
            try:
                User.objects.create_user(
                    uid=new_uid,
                    alias=new_alias,
                    email=new_email,
                    password=new_password,
                    role=new_role,
                    is_active=new_is_active
                )
                st.success(f"Usuario {new_alias} creado correctamente.")
                st.rerun()
            except Exception as e:
                st.error(f"Error al crear usuario: {e}")

        # Sección: Gestión de Microtransacciones
        st.header("Gestión de Microtransacciones")
        st.write("Simula transacciones de cápsulas de comercio y gestiona comisiones.")

        # Listar cápsulas de comercio
        st.subheader("Cápsulas de Comercio")
        commerce_capsules = Capsule.objects.filter(modo='comercio')[:10]  # Mostrar solo las primeras 10
        if not commerce_capsules:
            st.warning("No se encontraron cápsulas de comercio.")
        else:
            for capsule in commerce_capsules:
                st.write(f"UID: {capsule.uid}, Contenido: {capsule.contenido}, Precio: ${capsule.price}")
                if st.button(f"Simular Compra - {capsule.uid}", key=f"buy_{capsule.uid}"):
                    try:
                        buyer = User.objects.get(uid='test-user-3')  # Comprador simulado
                        commission = capsule.price * 0.05  # Comisión del 5%
                        Transaction.objects.create(
                            uid=f"trans_{uuid.uuid4()}",
                            user=buyer,
                            content_type="capsule",
                            content_id=capsule.uid,
                            amount=capsule.price,
                            commission=commission,
                            timestamp=timezone.now()
                        )
                        st.success(f"Transacción simulada: Compra de '{capsule.contenido}' por ${capsule.price}. Comisión: ${commission}.")
                    except User.DoesNotExist:
                        st.error("Usuario 'test-user-3' no encontrado. Por favor crea este usuario para simular transacciones.")

        # Sección: Gestión de APIs
        st.header("Gestión de APIs")
        st.write("Configura conexiones con APIs externas para integrar datos.")

        # Lista de APIs simuladas
        st.subheader("Configuración de APIs")
        api_sources = ['Wikipedia', 'OpenStreetMap']  # Ejemplo de APIs
        for api in api_sources:
            st.write(f"API: {api}")
            col1, col2, col3 = st.columns(3)
            with col1:
                active = st.checkbox(f"Activo - {api}", value=False, key=f"active_{api}")
            with col2:
                update_frequency = st.selectbox(f"Frecuencia de Actualización - {api}", options=['Diaria', 'Semanal'], key=f"freq_{api}")
            with col3:
                if st.button(f"Guardar - {api}", key=f"save_{api}"):
                    SettingsConfig.objects.update_or_create(
                        key=f"api_{api.lower()}",
                        defaults={
                            'parameters': {
                                'active': active,
                                'update_frequency': update_frequency
                            }
                        }
                    )
                    st.success(f"Configuración de API '{api}' guardada.")

        # Sección: Piloto Automático
        st.header("Piloto Automático")
        st.write("Configura y monitorea las tareas automatizadas del sistema.")
        try:
            result = subprocess.run(["python", "manage.py", "scheduler", "--dry-run"], capture_output=True, text=True)
            st.write("Estado de las tareas programadas:")
            st.text(result.stdout)
        except Exception as e:
            st.error(f"Error al verificar el estado de las tareas: {e}")

        # Configuración de automatización
        st.subheader("Configuración de Automatización")
        automation_level = st.slider("Nivel de Automatización (%)", min_value=0, max_value=100, value=automation_config.value, key="automation_level")
        support_automation = st.checkbox("Automatización de Soporte", value=True, key="support_automation")
        moderation_automation = st.checkbox("Automatización de Moderación", value=True, key="moderation_automation")
        frequency = st.slider("Frecuencia de Procesamiento (horas)", min_value=1, max_value=24, value=12, key="frequency_automation")

        # Reglas automáticas
        st.subheader("Reglas Automáticas")
        auto_approve_commerce = st.checkbox("Aprobar automáticamente cápsulas de comercio", value=False, key="auto_approve_commerce")
        max_price = st.number_input("Precio máximo para aprobación automática ($)", min_value=0.0, value=500.0, step=10.0, key="max_price")

        if st.button("Guardar Configuración de Automatización", key="save_automation"):
            try:
                automation_config.value = automation_level
                automation_config.parameters = {
                    'auto_approve_commerce': auto_approve_commerce,
                    'max_price': max_price
                }
                automation_config.save()
                st.success("Configuración de automatización guardada con éxito.")
            except Exception as e:
                st.error(f"Error al guardar configuración de automatización: {e}")

        # Aplicar reglas automáticas
        if auto_approve_commerce:
            commerce_capsules = Capsule.objects.filter(modo='comercio')
            approved_count = 0
            for capsule in commerce_capsules:
                if capsule.price <= max_price:
                    capsule_parameters = capsule.parameters or {}
                    capsule_parameters['auto_approved'] = True
                    capsule.parameters = capsule_parameters
                    capsule.save()
                    approved_count += 1
            st.info(f"Se aplicaron reglas automáticas a {approved_count} cápsulas de comercio.")
        else:
            st.info("Reglas automáticas no activadas.")

        # Sección: Control de Frecuencia de Procesamiento
        st.subheader("Control de Frecuencia de Procesamiento")
        frequency = st.slider("Frecuencia de Procesamiento (horas)", min_value=1, max_value=24, value=12, key="frequency_control")
        if st.button("Guardar", key="save_frequency"):
            try:
                config, created = SettingsConfig.objects.get_or_create(
                    key="processing_frequency",
                    defaults={'value': 0}
                )
                config.value = frequency
                config.save()
                st.success("Frecuencia actualizada!")
            except Exception as e:
                st.error(f"Error al guardar frecuencia: {e}")

        # Sección: Estadísticas
        st.subheader("Estadísticas")
        try:
            total_users = User.objects.count()
            total_notifications = Notification.objects.count()
            total_capsules = Capsule.objects.count()
            st.write(f"Total de Usuarios: {total_users}")
            st.write(f"Total de Notificaciones: {total_notifications}")
            st.write(f"Total de Cápsulas: {total_capsules}")
        except Exception as e:
            st.error(f"Error al obtener estadísticas: {e}")
    else:
        return render(request, 'control.html')




def personal_assistant(request):
    """
    Vista para un asistente personal basado en IA exclusivo para el fundador de Kudos.
    Incluye un modo estoico para vivir según la filosofía del estoicismo.
    Restringido al rol 'founder'.
    """
    import streamlit as st
    from django.shortcuts import render
    from django.conf import settings
    from kudos_app.models import User, SettingsConfig, Notification, Capsule, Transaction
    from openai import OpenAI
    from datetime import datetime, timedelta

    user = request.user

    is_streamlit = hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit
    if user.role != 'founder':
        if is_streamlit:
            st.error("Acceso denegado. Este asistente es exclusivo para el fundador.")
            return
        else:
            return render(request, '403.html')

    if is_streamlit:
        st.title(f"Asistente Personal de {user.alias}")
        st.write("Tu compañero IA exclusivo, diseñado para ayudarte a vivir una vida estoica y gestionar Kudos.")
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
        except AttributeError:
            st.error("La clave API de OpenAI no está configurada. Por favor, configura OPENAI_API_KEY en el archivo .env.")
            return
        except Exception as e:
            st.error(f"Error al inicializar el cliente de OpenAI: {e}")
            return

        # Configuración desde SettingsConfig
        assistant_config = SettingsConfig.objects.get_or_create(key="personal_assistant_settings")[0]
        stoic_quotes = assistant_config.parameters.get("stoic_quotes", [
            "No controlas lo que sucede, pero sí cómo respondes. - Epicteto",
            "La felicidad depende de ti mismo. - Marco Aurelio",
            "Acepta lo que no puedes cambiar y cambia lo que puedas. - Séneca"
        ])
        tasks = assistant_config.parameters.get("tasks", ["Reflexión Diaria", "Planificación", "Gestión de Kudos"])

        # Verificar rol de fundador
        st.header(f"Bienvenido, Fundador {user.alias}")

        # Modo Estoico
        st.header("Modo Estoico")
        st.write("Reflexiona y vive según los principios del estoicismo.")
        if st.button("Obtener Reflexión Estoica", key="stoic_reflection"):
            quote = st.session_state.get('current_quote', stoic_quotes[0])
            st.session_state.current_quote = quote
            prompt = (
                f"Actúa como un asistente personal estoico para el fundador de Kudos. "
                f"Basado en esta cita de {quote.split(' - ')[1]}: '{quote.split(' - ')[0]}', "
                f"proporciona una reflexión personalizada para hoy, considerando el contexto de liderar un proyecto multidimensional."
            )
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )
            reflection = response.choices[0].message.content
            st.write(f"**Cita del Día:** {quote}")
            st.write(f"**Reflexión:** {reflection}")
            Notification.objects.create(
                user=user,
                type='stoic_reflection',
                message=f"Reflexión estoica: {reflection[:50]}...",
                priority='media'
            )

        # Sección: Tareas del Fundador
        st.header("Tareas del Fundador")
        task = st.selectbox("Selecciona una Tarea", tasks + ["Consulta Personalizada"], key="founder_task")
        custom_query = st.text_input("Consulta Personalizada", placeholder="Ejemplo: ¿Cómo priorizo mis tareas hoy?", key="founder_query")
        
        if st.button("Consultar Asistente", key="founder_consult"):
            if task == "Consulta Personalizada" and not custom_query:
                st.error("Por favor, escribe una consulta personalizada.")
            else:
                if task == "Reflexión Diaria":
                    prompt = (
                        f"Actúa como un asistente personal estoico para el fundador de Kudos. "
                        f"Proporciona una reflexión diaria basada en los principios del estoicismo, "
                        f"considerando el liderazgo de un proyecto global multidimensional."
                    )
                elif task == "Planificación":
                    prompt = (
                        f"Actúa como un asistente personal estoico para el fundador de Kudos. "
                        f"Sugiere un plan diario basado en los principios del estoicismo, "
                        f"priorizando tareas para liderar un proyecto multidimensional."
                    )
                elif task == "Gestión de Kudos":
                    context = (
                        f"Cápsulas creadas: {Capsule.objects.count()}. "
                        f"Usuarios activos: {User.objects.filter(is_active=True).count()}."
                    )
                    prompt = (
                        f"Actúa como un asistente personal estoico para el fundador de Kudos. "
                        f"Proporciona una recomendación para gestionar Kudos hoy, basado en: {context}, "
                        f"usando principios del estoicismo."
                    )
                else:  # Consulta Personalizada
                    prompt = (
                        f"Actúa como un asistente personal estoico para el fundador de Kudos. "
                        f"Responde a esta consulta: '{custom_query}', "
                        f"aplicando principios del estoicismo en el contexto de liderar un proyecto multidimensional."
                    )

                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "user", "content": prompt}]
                )
                advice = response.choices[0].message.content
                st.write(f"**Asistente Estoico:** {advice}")
                Notification.objects.create(
                    user=user,
                    type='assistant_advice',
                    message=f"Consejo: {advice[:50]}...",
                    priority='media'
                )

        # Sección: Estado de Kudos
        st.header("Estado de Kudos")
        st.write("Resumen rápido de tu proyecto.")
        total_capsules = Capsule.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        recent_transactions = Transaction.objects.filter(timestamp__gte=datetime.now() - timedelta(days=7)).aggregate(total=Sum('amount'))['total'] or 0
        st.write(f"**Cápsulas Totales:** {total_capsules}")
        st.write(f"**Usuarios Activos:** {active_users}")
        st.write(f"**Ingresos (Última Semana):** ${recent_transactions:.2f}")
    else:
        # Modo Django: renderizar la plantilla
        return render(request, 'personal_assistant.html')





def simulate_activity(request):
    """
    Vista para simular actividad en la plataforma generando cápsulas e interacciones.
    Usa datos de Google Places API y genera interacciones simuladas.
    """
    import streamlit as st
    from kudos_app.utils.capsule_generator import generate_capsules
    from kudos_app.utils.notifications_utils import create_notification
    import random

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Simulación de Actividad para el Lanzamiento")
        st.write("Genera cápsulas simuladas e interacciones sociales para poblar la plataforma.")

        user = request.user if request.user.is_authenticated else User.objects.first()

        # Configuración de la simulación
        st.header("Configurar Simulación")
        center_lat = st.number_input("Latitud del Centro", value=40.4168, step=0.0001, key="sim_lat")
        center_lon = st.number_input("Longitud del Centro", value=-3.7038, step=0.0001, key="sim_lon")
        place_type = st.selectbox("Tipo de Lugar", ["tourist_attraction", "museum", "park"], index=0, key="sim_place_type")
        max_places = st.number_input("Número Máximo de Cápsulas", min_value=1, max_value=1000, value=50, step=1, key="sim_max_places")

        if st.button("Generar Actividad Simulada", key="simulate_activity"):
            # Generar cápsulas usando Google Places API
            generate_capsules(center_lat=center_lat, center_lon=center_lon, place_type=place_type, max_places=max_places)

            # Simular interacciones
            capsules = Capsule.objects.filter(contenido__startswith="Evento Histórico")[:100]
            comments = ["¡Increíble experiencia!", "Me encanta esta cápsula.", "Gracias por compartir."]
            for capsule in capsules:
                # Simular likes
                for _ in range(random.randint(1, 5)):
                    capsule.likes.add(user)
                # Simular comentarios
                create_notification(
                    user=capsule.usuario,
                    notification_type='comment',
                    message=f"{user.alias} comentó: {random.choice(comments)}",
                    priority='baja'
                )
            st.success(f"Actividad simulada generada: {max_places} cápsulas y {len(capsules)} interacciones.")
    else:
        return render(request, 'simulate_activity.html', {})