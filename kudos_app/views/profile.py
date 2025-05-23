# kudos_app/views/profile.py

"""
Vista para gestionar el perfil del usuario en Kudos.
Permite ver y editar información personal, preferencias y configuraciones.
"""

import streamlit as st
from django.shortcuts import render, redirect
from django.conf import settings
from django.contrib import messages
from kudos_app.models import User, Capsule, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from datetime import datetime

def profile(request):
    """
    Vista para gestionar el perfil del usuario en Kudos.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title(f"Perfil de {user.alias}")
        st.write("Administra tu información y preferencias en Kudos.")

        # Configuración genérica desde SettingsConfig
        profile_config = SettingsConfig.objects.get_or_create(key="profile_settings")[0]
        default_themes = profile_config.parameters.get("default_themes", ["Cultura", "Viajes", "Deporte", "Tecnología"])
        default_privacy = profile_config.parameters.get("default_privacy", "publico")

        # Sección: Información Personal
        st.header("Información Personal")
        alias = st.text_input("Alias", value=user.alias)
        email = st.text_input("Correo Electrónico", value=user.email or "")
        interests = st.multiselect("Temas de Interés", default_themes, default=user.necesidades if user.necesidades else default_themes[:2])

        # Geolocalización
        st.subheader("Geolocalización")
        enable_geolocation = st.checkbox("Activar Geolocalización", value=user.ubicacion is not None)
        if enable_geolocation:
            latitude = st.number_input("Latitud", value=user.ubicacion.y if user.ubicacion else 41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=user.ubicacion.x if user.ubicacion else 12.4964, step=0.0001)
            location = Point(longitude, latitude)
            notification_distance = st.slider("Distancia de Notificación (metros)", min_value=100, max_value=5000, value=user.notification_distance)
        else:
            location = None
            notification_distance = user.notification_distance

        # Privacidad
        st.subheader("Privacidad")
        notification_privacy = st.selectbox(
            "Privacidad de Notificación",
            ["solo_yo", "familia", "amigos", "publico"],
            index=["solo_yo", "familia", "amigos", "publico"].index(user.notification_privacy)
        )
        share_location = st.checkbox("Compartir Ubicación con Seguidores", value=user.share_location_with_followers)

        # Guardar Cambios
        if st.button("Guardar Cambios"):
            user.alias = alias
            user.email = email if email else None
            user.necesidades = interests
            user.ubicacion = location
            user.notification_distance = notification_distance
            user.notification_privacy = notification_privacy
            user.share_location_with_followers = share_location
            user.save()
            Notification.objects.create(
                user=user,
                type='profile_update',
                message="Tu perfil ha sido actualizado.",
                priority='baja'
            )
            st.success("Perfil actualizado correctamente.")

        # Sección: Contribuciones
        st.header("Tus Contribuciones")
        capsules = Capsule.objects.filter(usuario=user).order_by('-timestamp')[:5]
        if capsules.exists():
            st.write("**Cápsulas Recientes:**")
            for capsule in capsules:
                st.write(f"- {capsule.contenido[:50]}... (Fecha: {capsule.fecha})")
        else:
            st.write("Aún no has creado cápsulas.")

        # Mapa de Ubicación
        if user.ubicacion:
            st.header("Tu Ubicación en el Mapa")
            map_data = [{'lat': user.ubicacion.y, 'lon': user.ubicacion.x}]
            st.map(map_data, zoom=10)

        # Sección: Estadísticas
        st.header("Estadísticas")
        total_capsules = Capsule.objects.filter(usuario=user).count()
        total_notifications = Notification.objects.filter(user=user).count()
        st.write(f"**Cápsulas Creadas:** {total_capsules}")
        st.write(f"**Notificaciones Recibidas:** {total_notifications}")

    else:  # Renderizado en Django
        if request.method == "POST":
            user.alias = request.POST.get("alias", user.alias)
            user.email = request.POST.get("email", user.email) or None
            user.necesidades = request.POST.getlist("interests")
            enable_geolocation = request.POST.get("enable_geolocation") == "on"
            if enable_geolocation:
                latitude = float(request.POST.get("latitude", 41.9028))
                longitude = float(request.POST.get("longitude", 12.4964))
                user.ubicacion = Point(longitude, latitude)
                user.notification_distance = int(request.POST.get("notification_distance", 500))
            else:
                user.ubicacion = None
            user.notification_privacy = request.POST.get("notification_privacy", "publico")
            user.share_location_with_followers = request.POST.get("share_location") == "on"
            user.save()
            Notification.objects.create(
                user=user,
                type='profile_update',
                message="Tu perfil ha sido actualizado.",
                priority='baja'
            )
            messages.success(request, "Perfil actualizado correctamente.")
            return redirect('profile')

        capsules = Capsule.objects.filter(usuario=user).order_by('-timestamp')[:5]
        total_capsules = Capsule.objects.filter(usuario=user).count()
        total_notifications = Notification.objects.filter(user=user).count()
        return render(request, 'profile.html', {
            'user': user,
            'capsules': capsules,
            'total_capsules': total_capsules,
            'total_notifications': total_notifications
        })