# kudos_app/views/onboarding.py

"""
Vista para gestionar el proceso de incorporación de nuevos usuarios en Kudos.
Guía a los usuarios a través de pasos iniciales para configurar preferencias y explorar el sistema.
"""

import streamlit as st
from django.shortcuts import render, redirect
from django.conf import settings
from django.contrib import messages
from kudos_app.models import User, SettingsConfig, Notification
from django.contrib.gis.geos import Point
from datetime import datetime

def onboarding(request):
    """
    Vista para el proceso de incorporación de nuevos usuarios en Kudos.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Bienvenido a Kudos")
        st.write("¡Comencemos! Configura tu perfil y descubre cómo usar Kudos.")

        # Configuración genérica desde SettingsConfig
        onboarding_config = SettingsConfig.objects.get_or_create(key="onboarding_settings")[0]
        default_themes = onboarding_config.parameters.get("default_themes", ["Cultura", "Viajes", "Deporte", "Tecnología"])
        default_privacy = onboarding_config.parameters.get("default_privacy", "publico")
        default_notification_distance = onboarding_config.variables.get("default_notification_distance", 500)

        # Verificar si el usuario ya completó el onboarding
        if user.necesidades and user.notification_privacy != "solo_yo":
            st.write("Ya has completado el proceso de incorporación.")
            if st.button("Ir al Mapa"):
                st.experimental_rerun()  # Simulación de redirección en Streamlit
            return render(request, 'map.html')

        # Paso 1: Bienvenida
        st.header("Paso 1: Bienvenida")
        st.write("Kudos es una plataforma multidimensional que te permite documentar, compartir y vivir experiencias. Vamos a configurarlo juntos.")
        if st.button("Continuar a Paso 2"):
            st.session_state.onboarding_step = 2

        # Paso 2: Intereses
        if st.session_state.get("onboarding_step", 1) >= 2:
            st.header("Paso 2: Tus Intereses")
            st.write("Selecciona los temas que te interesan para personalizar tu experiencia.")
            interests = st.multiselect("Temas de Interés", default_themes, default=default_themes[:2])
            if st.button("Continuar a Paso 3"):
                user.necesidades = interests
                user.save()
                st.session_state.onboarding_step = 3

        # Paso 3: Geolocalización
        if st.session_state.get("onboarding_step", 1) >= 3:
            st.header("Paso 3: Geolocalización")
            st.write("Configura tu ubicación para conectar con contenido cercano.")
            enable_geolocation = st.checkbox("Activar Geolocalización", value=True)
            if enable_geolocation:
                # Simulación (en producción, usar JavaScript o API del dispositivo)
                latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
                longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
                location = Point(longitude, latitude)
                notification_distance = st.slider("Distancia de Notificación (metros)", min_value=100, max_value=5000, value=default_notification_distance)
            else:
                location = None
                notification_distance = default_notification_distance
            if st.button("Continuar a Paso 4"):
                user.ubicacion = location
                user.notification_distance = notification_distance
                user.save()
                st.session_state.onboarding_step = 4

        # Paso 4: Privacidad y Notificaciones
        if st.session_state.get("onboarding_step", 1) >= 4:
            st.header("Paso 4: Privacidad y Notificaciones")
            st.write("Decide cómo compartir tus datos y recibir notificaciones.")
            notification_privacy = st.selectbox(
                "Privacidad de Notificación",
                ["solo_yo", "familia", "amigos", "publico"],
                index=["solo_yo", "familia", "amigos", "publico"].index(default_privacy)
            )
            share_location = st.checkbox("Compartir Ubicación con Seguidores", value=False)
            if st.button("Finalizar Onboarding"):
                user.notification_privacy = notification_privacy
                user.share_location_with_followers = share_location
                user.save()
                Notification.objects.create(
                    user=user,
                    type='onboarding_complete',
                    message="¡Bienvenido a Kudos! Has completado el proceso de incorporación.",
                    priority='media'
                )
                st.success("¡Onboarding completado! Ahora puedes explorar Kudos.")
                st.session_state.onboarding_step = 5

        # Paso 5: Finalización
        if st.session_state.get("onboarding_step", 1) >= 5:
            st.header("Explora Kudos")
            st.write("Estás listo para comenzar. Aquí hay algunas acciones iniciales:")
            if st.button("Crear una Cápsula"):
                st.experimental_rerun()  # Simulación de redirección
            if st.button("Ver el Mapa"):
                st.experimental_rerun()  # Simulación de redirección

    else:  # Renderizado en Django
        if user.necesidades and user.notification_privacy != "solo_yo":
            return redirect('map')

        if request.method == "POST":
            step = int(request.POST.get("step", 1))
            if step == 1:
                return render(request, 'onboarding.html', {'step': 2})
            elif step == 2:
                interests = request.POST.getlist("interests")
                user.necesidades = interests
                user.save()
                return render(request, 'onboarding.html', {'step': 3})
            elif step == 3:
                enable_geolocation = request.POST.get("enable_geolocation") == "on"
                if enable_geolocation:
                    latitude = float(request.POST.get("latitude", 41.9028))
                    longitude = float(request.POST.get("longitude", 12.4964))
                    user.ubicacion = Point(longitude, latitude)
                    user.notification_distance = int(request.POST.get("notification_distance", 500))
                else:
                    user.ubicacion = None
                user.save()
                return render(request, 'onboarding.html', {'step': 4})
            elif step == 4:
                user.notification_privacy = request.POST.get("notification_privacy", "publico")
                user.share_location_with_followers = request.POST.get("share_location") == "on"
                user.save()
                Notification.objects.create(
                    user=user,
                    type='onboarding_complete',
                    message="¡Bienvenido a Kudos! Has completado el proceso de incorporación.",
                    priority='media'
                )
                messages.success(request, "¡Onboarding completado!")
                return redirect('map')

        return render(request, 'onboarding.html', {'step': 1})
