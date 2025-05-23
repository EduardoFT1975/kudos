# kudos_app/views/social_spaces.py

"""
Vista para gestionar Espacios Sociales Multidimensionales en Kudos.
Permite crear y participar en comunidades virtuales con AR/VR y conexión humana.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, SocialSpace, Capsule, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from datetime import datetime, timedelta
import json

def social_spaces(request):
    """
    Vista para gestionar Espacios Sociales Multidimensionales en Kudos.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Espacios Sociales Multidimensionales")
        st.write("Crea y únete a comunidades virtuales para conectar con otros.")

        # Configuración desde SettingsConfig
        social_config = SettingsConfig.objects.get_or_create(key="social_spaces_settings")[0]
        space_themes = social_config.parameters.get("space_themes", ["Amistad", "Cultura", "Deporte", "Tecnología"])
        max_price = social_config.variables.get("max_price", 100.0)
        commission_rate = social_config.variables.get("commission_rate", 5.0)

        # Sección: Crear Espacio Social
        st.header("Crear Espacio Social")
        st.write("Inicia una comunidad virtual para compartir intereses.")
        theme = st.selectbox("Tema del Espacio", space_themes)
        description = st.text_area("Descripción", placeholder="Ejemplo: Club de amantes del arte...")
        price = st.number_input("Precio de Entrada ($)", min_value=0.0, max_value=max_price, step=0.1, value=0.0)
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        if st.button("Crear Espacio"):
            space = SocialSpace(
                uid=f"social_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                creator=user,
                theme=theme,
                description=description,
                timestamp=datetime.now(),
                ubicacion=location,
                price=price,
                parameters={'created_by': user.alias},
                variables={'visibility_range': user.notification_distance}
            )
            space.save()
            space.participants.add(user)  # El creador se une automáticamente
            Notification.objects.create(
                user=user,
                type='space_created',
                message=f"Creaste el espacio social '{theme}'.",
                priority='media'
            )
            st.success("Espacio social creado.")

        # Sección: Explorar Espacios Sociales
        st.header("Explorar Espacios Sociales")
        spaces = SocialSpace.objects.all().order_by('-timestamp')
        if spaces.exists():
            selected_space = st.selectbox("Selecciona un Espacio", [f"{s.theme} (${s.price})" for s in spaces])
            space = spaces.get(theme=selected_space.split(' (')[0])
            st.write(f"**Creador:** {space.creator.alias}")
            st.write(f"**Descripción:** {space.description}")
            st.write(f"**Ubicación:** ({space.ubicacion.y}, {space.ubicacion.x})")
            st.write(f"**Participantes:** {space.participants.count()}")
            st.write(f"**Precio:** ${space.price}")

            # Mapa
            map_data = [{'lat': space.ubicacion.y, 'lon': space.ubicacion.x}]
            st.map(map_data, zoom=10)

            # Cápsulas del Espacio
            st.subheader("Cápsulas del Espacio")
            space_capsules = Capsule.objects.filter(
                modo='social',
                privacy='publico',
                parameters__space_id=space.uid
            )[:5]
            for capsule in space_capsules:
                st.write(f"- {capsule.contenido[:50]}... (Autor: {capsule.usuario.alias})")

            # Unirse al Espacio
            if user not in space.participants.all():
                if st.button(f"Unirse al Espacio - ${space.price}"):
                    if space.price > 0:
                        Transaction.objects.create(
                            user=user,
                            content_type='social_space',
                            content_id=space.uid,
                            amount=space.price,
                            commission=space.price * (commission_rate / 100)
                        )
                        Notification.objects.create(
                            user=space.creator,
                            type='space_joined',
                            message=f"{user.alias} se unió a tu espacio '{space.theme}' por ${space.price}.",
                            priority='media'
                        )
                    space.participants.add(user)
                    Notification.objects.create(
                        user=user,
                        type='space_joined',
                        message=f"Te uniste al espacio '{space.theme}'.",
                        priority='media'
                    )
                    st.success("Te has unido al espacio.")
            else:
                st.write("Ya eres participante de este espacio.")

            # Visualización en VR
            if st.button("Explorar en VR"):
                narrative = f"Espacio Social: {space.theme} - {space.description[:50]}..."
                st.components.v1.html(f"""
                <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                <a-scene embedded vr-mode-ui="enabled: true">
                    <a-sky src="https://example.com/social_sky.jpg"></a-sky>
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
            st.info("No hay espacios sociales disponibles en este momento.")

    return render(request, 'social_spaces.html')