# kudos_app/views/spirituality.py

"""
Vista para las Cápsulas Espirituales en Kudos.
Permite explorar y contribuir a contenido espiritual con reflexiones y AR/VR.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from datetime import datetime
import json
from openai import OpenAI

def spirituality(request):
    """
    Vista para gestionar Cápsulas Espirituales en Kudos.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Cápsulas Espirituales")
        st.write("Explora y comparte tu viaje espiritual en un espacio inmersivo.")

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        # Configuración desde SettingsConfig
        spirit_config = SettingsConfig.objects.get_or_create(key="spirituality_settings")[0]
        spirit_themes = spirit_config.parameters.get("spirit_themes", ["Meditación", "Filosofía", "Religión", "Autoconocimiento"])
        vr_sky = spirit_config.parameters.get("vr_sky", "https://example.com/spiritual_sky.jpg")

        # Sección: Crear Cápsula Espiritual
        st.header("Crear Cápsula Espiritual")
        st.write("Comparte una reflexión o experiencia espiritual.")
        content = st.text_area("Contenido", placeholder="Ejemplo: Mi meditación matutina...")
        theme = st.selectbox("Tema Espiritual", spirit_themes)
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        if st.button("Crear Cápsula Espiritual"):
            capsule = Capsule(
                uid=f"spirit_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                usuario=user,
                contenido=content,
                ubicacion=location,
                modo='espiritual',
                fecha=datetime.now().date(),
                privacy='publico',
                time_scale='dia',
                price=0.0,
                temas=[theme],
                parameters={'spiritual_entry': True},
                variables={'visibility_range': user.notification_distance}
            )
            capsule.save()
            Notification.objects.create(
                user=user,
                type='spiritual_contribution',
                message=f"Tu cápsula espiritual '{content[:50]}...' ha sido creada.",
                priority='media'
            )
            st.success("Cápsula espiritual creada.")

        # Sección: Explorar Cápsulas Espirituales
        st.header("Explorar Cápsulas Espirituales")
        spiritual_capsules = Capsule.objects.filter(
            modo='espiritual',
            privacy='publico'
        ).order_by('-timestamp')[:10]

        if spiritual_capsules.exists():
            selected_capsule = st.selectbox("Selecciona una Cápsula", [c.contenido[:50] for c in spiritual_capsules])
            capsule = spiritual_capsules.get(contenido__startswith=selected_capsule[:50])
            st.write(f"**Autor:** {capsule.usuario.alias}")
            st.write(f"**Contenido:** {capsule.contenido}")
            st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
            st.write(f"**Tema:** {', '.join(capsule.temas)}")

            # Mapa
            map_data = [{'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x}]
            st.map(map_data, zoom=10)

            # Reflexión Guiada
            if st.button("Reflexión Guiada"):
                prompt = (
                    f"Actúa como un guía espiritual para Kudos. "
                    f"Basado en esta cápsula espiritual: '{capsule.contenido}', "
                    f"proporciona una reflexión guiada breve para fomentar la calma y el autoconocimiento."
                )
                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "user", "content": prompt}]
                )
                reflection = response.choices[0].message.content
                st.write(f"**Reflexión Guiada:** {reflection}")
                Notification.objects.create(
                    user=user,
                    type='spiritual_reflection',
                    message=f"Reflexión guiada: {reflection[:50]}...",
                    priority='media'
                )

            # Visualización en AR/VR
            col1, col2 = st.columns(2)
            with col1:
                if st.button("Ver en AR"):
                    narrative = f"Espiritualidad: {capsule.contenido[:50]}..."
                    st.components.v1.html(f"""
                    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                    <a-scene embedded>
                        <a-text value="{narrative}" position="0 1.5 -5" align="center"></a-text>
                        <a-camera position="0 1.6 0"></a-camera>
                    </a-scene>
                    """, height=500)
            with col2:
                if st.button("Ver en VR"):
                    narrative = f"Viaje Espiritual: {capsule.contenido[:50]}..."
                    st.components.v1.html(f"""
                    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                    <a-scene embedded vr-mode-ui="enabled: true">
                        <a-sky src="{vr_sky}"></a-sky>
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
                    message=f"{user.alias} dio like a tu cápsula espiritual: {capsule.contenido[:50]}...",
                    priority='baja'
                )
                st.success("Like registrado.")
        else:
            st.info("No hay cápsulas espirituales disponibles en este momento.")

    return render(request, 'spirituality.html')