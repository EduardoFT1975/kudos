# kudos_app/views/wisdom_spaces.py

"""
Vista para gestionar espacios virtuales de sabiduría en Kudos.
Permite explorar y contribuir a repositorios de conocimiento con guías históricas en AR/VR.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, WisdomSpace, Capsule, Character, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from datetime import datetime
import json

def wisdom_spaces(request):
    """
    Vista para gestionar espacios virtuales de sabiduría en Kudos.
    """
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Espacios de Sabiduría en Kudos")
        st.write("Explora y contribuye a repositorios de conocimiento inmersivo.")

        user = request.user if request.user.is_authenticated else User.objects.first()  # Simulación con autenticación

        # Configuración desde SettingsConfig
        wisdom_config = SettingsConfig.objects.get_or_create(key="wisdom_spaces_settings")[0]
        default_themes = wisdom_config.parameters.get("default_themes", ["Cultura", "Historia", "Filosofía", "Ciencia"])
        vr_sky = wisdom_config.parameters.get("default_sky", "https://example.com/wisdom_sky.jpg")

        # Sección: Explorar Espacios de Sabiduría
        st.header("Explorar Espacios de Sabiduría")
        spaces = WisdomSpace.objects.all().order_by('-timestamp')
        if spaces.exists():
            selected_space = st.selectbox("Selecciona un Espacio", [s.name for s in spaces])
            space = WisdomSpace.objects.get(name=selected_space)
            st.write(f"**Tema:** {space.theme}")
            st.write(f"**Subtemas:** {', '.join(space.subthemes)}")
            st.write(f"**Descripción:** {space.description}")
            st.write(f"**Ubicación:** ({space.ubicacion.y}, {space.ubicacion.x})")

            # Mapa
            map_data = [{'lat': space.ubicacion.y, 'lon': space.ubicacion.x}]
            st.map(map_data, zoom=10)

            # Cápsulas Relacionadas
            st.subheader("Cápsulas Relacionadas")
            related_capsules = Capsule.objects.filter(temas__overlap=space.subthemes, privacy='publico')[:5]
            for capsule in related_capsules:
                st.write(f"- {capsule.contenido[:50]}... (Autor: {capsule.usuario.alias})")

            # Guía Histórica
            st.subheader("Guía Histórica")
            character = Character.objects.filter(theme=space.theme).first()
            if not character:
                character = Character.objects.create(
                    uid=f"char_{space.theme}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    nombre="Séneca",
                    rol="guia",
                    theme="Filosofía",
                    imagen_adultos="https://example.com/seneca_adults.png",
                    modelo_ar="https://example.com/seneca_vr.glb"
                )
            st.write(f"**Guía:** {character.nombre} (Experto en {character.theme})")
            st.image(character.imagen_adultos)

            # Visualización en VR
            if st.button("Explorar en VR"):
                narrative = f"Bienvenido al espacio de {space.name}. Soy {character.nombre}. {space.description[:100]}..."
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

        else:
            st.info("No hay espacios de sabiduría disponibles en este momento.")

        # Sección: Contribuir a un Espacio
        st.header("Contribuir a un Espacio de Sabiduría")
        st.write("Agrega una cápsula al repositorio de conocimiento.")
        space_to_contribute = st.selectbox("Espacio", [s.name for s in spaces], index=0 if spaces else None)
        content = st.text_area("Contenido de la Cápsula", placeholder="Comparte tu conocimiento...")
        themes = st.multiselect("Temas", default_themes, default=[space.theme] if space_to_contribute else [])

        if st.button("Contribuir"):
            if space_to_contribute and content:
                space = WisdomSpace.objects.get(name=space_to_contribute)
                capsule = Capsule(
                    uid=f"wisdom_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    usuario=user,
                    contenido=content,
                    ubicacion=user.ubicacion if user.ubicacion else space.ubicacion,
                    modo='sabiduría',
                    fecha=datetime.now().date(),
                    privacy='publico',
                    time_scale='dia',
                    price=0.0,
                    temas=themes,
                    parameters={'space_id': space.uid},
                    variables={'visibility_range': user.notification_distance}
                )
                capsule.save()
                Notification.objects.create(
                    user=user,
                    type='wisdom_contribution',
                    message=f"Contribuiste al espacio '{space.name}' con: {content[:50]}...",
                    priority='media'
                )
                st.success("Contribución agregada al espacio de sabiduría.")
            else:
                st.error("Selecciona un espacio y escribe contenido antes de contribuir.")

    return render(request, 'wisdom_spaces.html')