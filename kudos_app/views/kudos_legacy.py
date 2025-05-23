# kudos_app/views/kudos_legacy.py

"""
Vista para gestionar Kudos Legacy en Kudos.
Permite contribuir a un legado perpetuo con cápsulas benéficas preservadas en blockchain.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, Transaction, SettingsConfig, Notification
from django.contrib.gis.geos import Point
from datetime import datetime
import json

def kudos_legacy(request):
    """
    Vista para gestionar Kudos Legacy en Kudos.
    """
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Kudos Legacy")
        st.write("Contribuye a un legado perpetuo que beneficia a la humanidad.")

        user = request.user if request.user.is_authenticated else User.objects.first()  # Simulación con autenticación

        # Configuración desde SettingsConfig
        legacy_config = SettingsConfig.objects.get_or_create(key="kudos_legacy_settings")[0]
        legacy_causes = legacy_config.parameters.get("legacy_causes", ["Reforestación", "Educación", "Salud", "Pobreza"])
        donation_amounts = legacy_config.parameters.get("donation_amounts", [5.0, 10.0, 20.0, 50.0])
        commission_rate = legacy_config.variables.get("commission_rate", 5.0)

        # Sección: Crear Cápsula Benéfica
        st.header("Crear Cápsula Benéfica")
        st.write("Deja una huella eterna con una contribución benéfica.")
        content = st.text_area("Contenido", placeholder="Ejemplo: Mi legado para la reforestación...")
        cause = st.selectbox("Causa Benéfica", legacy_causes)
        donation = st.selectbox("Cantidad a Donar ($)", donation_amounts)
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        if st.button("Crear Cápsula Benéfica"):
            capsule = Capsule(
                uid=f"legacy_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                usuario=user,
                contenido=content,
                ubicacion=location,
                modo='benéfico',
                fecha=datetime.now().date(),
                privacy='publico',
                time_scale='dia',
                price=donation,
                temas=['Kudos Legacy', cause],
                parameters={'preserved_in_blockchain': True, 'cause': cause},
                variables={'visibility_range': user.notification_distance}
            )
            capsule.save()

            # Registrar Transacción
            Transaction.objects.create(
                user=user,
                content_type='legacy_donation',
                content_id=capsule.uid,
                amount=donation,
                commission=donation * (commission_rate / 100)
            )

            Notification.objects.create(
                user=user,
                type='legacy_contribution',
                message=f"Tu cápsula benéfica '{content[:50]}...' ha sido preservada para '{cause}'.",
                priority='media'
            )
            st.success(f"Cápsula benéfica creada y ${donation} donados a {cause}.")

        # Sección: Explorar Legado
        st.header("Explorar Kudos Legacy")
        legacy_capsules = Capsule.objects.filter(
            modo='benéfico',
            privacy='publico'
        ).order_by('-timestamp')[:10]

        if legacy_capsules.exists():
            selected_capsule = st.selectbox("Selecciona una Cápsula", [c.contenido[:50] for c in legacy_capsules])
            capsule = legacy_capsules.get(contenido__startswith=selected_capsule[:50])
            st.write(f"**Autor:** {capsule.usuario.alias}")
            st.write(f"**Contenido:** {capsule.contenido}")
            st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
            st.write(f"**Causa:** {capsule.parameters.get('cause', 'No especificada')}")
            st.write(f"**Donación:** ${capsule.price}")

            # Mapa
            map_data = [{'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x}]
            st.map(map_data, zoom=10)

            # Visualización en VR
            if st.button("Explorar en VR"):
                narrative = f"Kudos Legacy: {capsule.contenido[:50]}... para {capsule.parameters.get('cause')}"
                st.components.v1.html(f"""
                <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                <a-scene embedded vr-mode-ui="enabled: true">
                    <a-sky src="https://example.com/legacy_sky.jpg"></a-sky>
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
                    message=f"{user.alias} dio like a tu cápsula benéfica: {capsule.contenido[:50]}...",
                    priority='baja'
                )
                st.success("Like registrado.")
        else:
            st.info("No hay cápsulas benéficas en Kudos Legacy en este momento.")

    return render(request, 'kudos_legacy.html')