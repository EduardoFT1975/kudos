# kudos_app/views/art_festival.py

"""
Vista para gestionar el Festival Global de Cápsulas Artísticas en Kudos.
Permite crear, explorar y celebrar cápsulas artísticas en AR/VR.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, Character, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from datetime import datetime
import json

def art_festival(request):
    """
    Vista para gestionar el Festival Global de Cápsulas Artísticas en Kudos.
    """
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Festival Global de Cápsulas Artísticas")
        st.write("Únete a la celebración mundial de la creatividad con cápsulas artísticas inmersivas.")

        user = request.user if request.user.is_authenticated else User.objects.first()  # Simulación con autenticación

        # Configuración desde SettingsConfig
        festival_config = SettingsConfig.objects.get_or_create(key="art_festival_settings")[0]
        festival_themes = festival_config.parameters.get("festival_themes", ["Arte", "Música", "Literatura", "Cine"])
        vr_sky = festival_config.parameters.get("vr_sky", "https://example.com/festival_sky.jpg")
        festival_active = festival_config.parameters.get("festival_active", True)

        # Verificar Estado del Festival
        if not festival_active:
            st.warning("El Festival Global de Cápsulas Artísticas no está activo en este momento.")
            return render(request, 'art_festival.html')

        # Sección: Crear Cápsula Artística
        st.header("Crear Cápsula Artística")
        st.write("Contribuye al festival con tu propia obra de arte.")
        content = st.text_area("Contenido", placeholder="Describe tu obra artística...")
        themes = st.multiselect("Temas Artísticos", festival_themes, default=["Arte"])
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        if st.button("Enviar Cápsula Artística"):
            capsule = Capsule(
                uid=f"art_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                usuario=user,
                contenido=content,
                ubicacion=location,
                modo='artístico',
                fecha=datetime.now().date(),
                privacy='publico',
                time_scale='dia',
                price=0.0,
                temas=themes,
                parameters={'festival_entry': True},
                variables={'visibility_range': user.notification_distance}
            )
            capsule.save()
            Notification.objects.create(
                user=user,
                type='art_submission',
                message=f"Tu cápsula artística '{content[:50]}...' ha sido enviada al festival.",
                priority='media'
            )
            st.success("Cápsula artística enviada al festival.")

        # Sección: Explorar Cápsulas del Festival
        st.header("Explorar Cápsulas del Festival")
        festival_capsules = Capsule.objects.filter(
            modo='artístico',
            parameters__festival_entry=True,
            privacy='publico'
        ).order_by('-timestamp')[:10]

        if festival_capsules.exists():
            selected_capsule = st.selectbox("Selecciona una Cápsula", [c.contenido[:50] for c in festival_capsules])
            capsule = festival_capsules.get(contenido__startswith=selected_capsule[:50])
            st.write(f"**Autor:** {capsule.usuario.alias}")
            st.write(f"**Contenido:** {capsule.contenido}")
            st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
            st.write(f"**Temas:** {', '.join(capsule.temas)}")

            # Mapa
            map_data = [{'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x}]
            st.map(map_data, zoom=10)

            # Guía Histórica
            st.subheader("Guía Histórica")
            character = Character.objects.filter(theme__in=capsule.temas).first()
            if not character:
                character = Character.objects.create(
                    uid=f"char_art_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    nombre="Leonardo da Vinci",
                    rol="guia",
                    theme="Arte",
                    imagen_adultos="https://example.com/leonardo_adults.png",
                    modelo_ar="https://example.com/leonardo_vr.glb"
                )
            st.write(f"**Guía:** {character.nombre} (Experto en {character.theme})")
            st.image(character.imagen_adultos)

            # Visualización en AR/VR
            col1, col2 = st.columns(2)
            with col1:
                if st.button("Ver en AR"):
                    narrative = f"Explora esta obra de arte. Soy {character.nombre}. {capsule.contenido[:50]}..."
                    st.components.v1.html(f"""
                    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                    <a-scene embedded>
                        <a-text value="{narrative}" position="0 1.5 -5" align="center"></a-text>
                        <a-camera position="0 1.6 0"></a-camera>
                    </a-scene>
                    """, height=500)
            with col2:
                if st.button("Ver en VR"):
                    narrative = f"Bienvenido al Festival. Soy {character.nombre}. {capsule.contenido[:50]}..."
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

            # Interacciones
            if st.button("Dar Like"):
                capsule.likes.add(user)  # Asume campo ManyToMany 'likes'
                Notification.objects.create(
                    user=capsule.usuario,
                    type='like',
                    message=f"{user.alias} dio like a tu cápsula artística: {capsule.contenido[:50]}...",
                    priority='baja'
                )
                st.success("Like registrado.")
        else:
            st.info("No hay cápsulas artísticas en el festival en este momento.")

    return render(request, 'art_festival.html')