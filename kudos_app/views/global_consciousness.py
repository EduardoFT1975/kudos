# kudos_app/views/global_consciousness.py

"""
Vista para el Congreso de la Conciencia Colectiva Global en Kudos.
Permite debatir y votar temas globales en un espacio virtual con AR/VR.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from datetime import datetime, timedelta
import json

def global_consciousness(request):
    """
    Vista para gestionar el Congreso de la Conciencia Colectiva Global en Kudos.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Congreso de la Conciencia Colectiva Global")
        st.write("Participa en debates y votaciones sobre el futuro de la humanidad.")

        # Configuración desde SettingsConfig
        gc_config = SettingsConfig.objects.get_or_create(key="global_consciousness_settings")[0]
        debate_themes = gc_config.parameters.get("debate_themes", ["Sostenibilidad", "Tecnología", "Igualdad", "Salud"])
        vr_sky = gc_config.parameters.get("vr_sky", "https://example.com/congress_sky.jpg")
        congress_active = gc_config.parameters.get("congress_active", True)
        voting_threshold = gc_config.variables.get("voting_threshold", 1000)  # Votos mínimos para acción

        # Verificar Estado del Congreso
        if not congress_active:
            st.warning("El Congreso de la Conciencia Colectiva no está activo en este momento.")
            return render(request, 'global_consciousness.html')

        # Sección: Proponer Tema de Debate
        st.header("Proponer Tema de Debate")
        st.write("Sugiere un tema global para la discusión colectiva.")
        content = st.text_area("Propuesta", placeholder="Ejemplo: Estrategias para la sostenibilidad global...")
        themes = st.multiselect("Temas", debate_themes, default=["Sostenibilidad"])
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        if st.button("Enviar Propuesta"):
            capsule = Capsule(
                uid=f"congress_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                usuario=user,
                contenido=content,
                ubicacion=location,
                modo='ciudadano',
                fecha=datetime.now().date(),
                privacy='publico',
                time_scale='dia',
                price=0.0,
                temas=themes,
                parameters={'congress_proposal': True},
                variables={'votes': 0}
            )
            capsule.save()
            Notification.objects.create(
                user=user,
                type='congress_proposal',
                message=f"Tu propuesta '{content[:50]}...' ha sido enviada al congreso.",
                priority='media'
            )
            st.success("Propuesta enviada al congreso.")

        # Sección: Debates Activos
        st.header("Debates Activos")
        congress_capsules = Capsule.objects.filter(
            modo='ciudadano',
            parameters__congress_proposal=True,
            privacy='publico'
        ).order_by('-timestamp')[:5]

        if congress_capsules.exists():
            selected_capsule = st.selectbox("Selecciona un Debate", [c.contenido[:50] for c in congress_capsules])
            capsule = congress_capsules.get(contenido__startswith=selected_capsule[:50])
            st.write(f"**Autor:** {capsule.usuario.alias}")
            st.write(f"**Propuesta:** {capsule.contenido}")
            st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
            st.write(f"**Temas:** {', '.join(capsule.temas)}")
            st.write(f"**Votos:** {capsule.variables.get('votes', 0)}")

            # Mapa
            map_data = [{'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x}]
            st.map(map_data, zoom=10)

            # Visualización en VR
            if st.button("Entrar al Debate en VR"):
                narrative = f"Congreso Global: {capsule.contenido[:50]}..."
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

            # Votar
            col1, col2 = st.columns(2)
            with col1:
                if st.button("Votar a Favor"):
                    capsule.variables['votes'] = capsule.variables.get('votes', 0) + 1
                    capsule.save()
                    st.success("Voto a favor registrado.")
                    if capsule.variables['votes'] >= voting_threshold:
                        Notification.objects.create(
                            user=user,
                            type='vote_threshold',
                            message=f"La propuesta '{capsule.contenido[:50]}...' alcanzó el umbral de votos.",
                            priority='alta'
                        )
            with col2:
                if st.button("Votar en Contra"):
                    capsule.variables['votes'] = capsule.variables.get('votes', 0) - 1
                    capsule.save()
                    st.success("Voto en contra registrado.")

        else:
            st.info("No hay debates activos en el congreso en este momento.")

    return render(request, 'global_consciousness.html')