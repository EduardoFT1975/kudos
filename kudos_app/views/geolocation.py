# kudos_app/views/geolocation.py

"""
Vista para gestionar la geolocalización en Kudos.
Permite activar la geolocalización, configurar la privacidad y compartir la ubicación con seguidores.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from datetime import datetime

def geolocation(request):
    """
    Vista para gestionar la geolocalización del usuario en Kudos.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Gestión de Geolocalización en Kudos")
        st.write("Configura tu ubicación y decide cómo compartirla.")

        # Configuración genérica desde SettingsConfig
        geo_config = SettingsConfig.objects.get_or_create(key="geolocation_settings")[0]
        default_notification_distance = geo_config.variables.get("default_notification_distance", 500)
        default_privacy = geo_config.parameters.get("default_privacy", "publico")

        # Estado actual de la geolocalización
        st.header("Estado Actual")
        if user.ubicacion:
            st.write(f"**Ubicación Actual:** ({user.ubicacion.y}, {user.ubicacion.x})")
            st.write(f"**Distancia de Notificación:** {user.notification_distance} metros")
            st.write(f"**Privacidad de Notificación:** {user.notification_privacy}")
            st.write(f"**Compartir con Seguidores:** {'Sí' if user.share_location_with_followers else 'No'}")
        else:
            st.write("No se ha establecido una ubicación aún.")

        # Configurar Geolocalización
        st.header("Configurar Geolocalización")
        enable_geolocation = st.checkbox("Activar Geolocalización", value=user.ubicacion is not None)
        if enable_geolocation:
            # Simulación de geolocalización (en producción, usar JavaScript o API del dispositivo)
            latitude = st.number_input("Latitud", value=user.ubicacion.y if user.ubicacion else 41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=user.ubicacion.x if user.ubicacion else 12.4964, step=0.0001)
            notification_distance = st.slider("Distancia de Notificación (metros)", min_value=100, max_value=5000, value=user.notification_distance, step=100)
            notification_privacy = st.selectbox(
                "Privacidad de Notificación",
                ["solo_yo", "familia", "amigos", "publico"],
                index=["solo_yo", "familia", "amigos", "publico"].index(user.notification_privacy)
            )
            share_with_followers = st.checkbox("Compartir Ubicación con Seguidores", value=user.share_location_with_followers)
        else:
            latitude = longitude = None
            notification_distance = default_notification_distance
            notification_privacy = default_privacy
            share_with_followers = False

        # Guardar Cambios
        if st.button("Guardar Configuración"):
            if enable_geolocation:
                user.ubicacion = Point(longitude, latitude)
            else:
                user.ubicacion = None
            user.notification_distance = notification_distance
            user.notification_privacy = notification_privacy
            user.share_location_with_followers = share_with_followers
            user.save()
            Notification.objects.create(
                user=user,
                type='geolocation_update',
                message="Tu configuración de geolocalización ha sido actualizada.",
                priority='baja'
            )
            st.success("Configuración de geolocalización guardada.")

        # Mapa de Ubicación
        if user.ubicacion:
            st.header("Tu Ubicación en el Mapa")
            map_data = [{'lat': user.ubicacion.y, 'lon': user.ubicacion.x}]
            st.map(map_data, zoom=10)

        # Seguidores Cercanos (si aplica)
        if user.share_location_with_followers and user.ubicacion:
            st.header("Seguidores Cercanos")
            nearby_followers = User.objects.filter(
                followers=user,
                ubicacion__distance_lte=(user.ubicacion, D(m=user.notification_distance)),
                share_location_with_followers=True
            )
            for follower in nearby_followers:
                st.write(f"- {follower.alias} ({follower.ubicacion.y}, {follower.ubicacion.x})")

    else:  # Renderizado en Django
        if request.method == "POST":
            enable_geolocation = request.POST.get("enable_geolocation") == "on"
            if enable_geolocation:
                latitude = float(request.POST.get("latitude", 41.9028))
                longitude = float(request.POST.get("longitude", 12.4964))
                user.ubicacion = Point(longitude, latitude)
            else:
                user.ubicacion = None
            user.notification_distance = int(request.POST.get("notification_distance", 500))
            user.notification_privacy = request.POST.get("notification_privacy", "publico")
            user.share_location_with_followers = request.POST.get("share_with_followers") == "on"
            user.save()
            Notification.objects.create(
                user=user,
                type='geolocation_update',
                message="Tu configuración de geolocalización ha sido actualizada.",
                priority='baja'
            )
            messages.success(request, "Configuración de geolocalización guardada.")
            return redirect('geolocation')

        return render(request, 'geolocation.html', {
            'user': user,
            'default_notification_distance': 500,
            'default_privacy': 'publico'
        })