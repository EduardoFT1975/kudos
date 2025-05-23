# kudos_app/views/connect.py

"""
Vista para gestionar conexiones entre usuarios en Kudos.
Permite seguir a usuarios, negocios, noticias, grupos o espacios, y recomienda conexiones basadas en intereses y geolocalización.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, SocialSpace, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from openai import OpenAI
from datetime import datetime

def connect(request):
    """
    Vista para gestionar conexiones y recomendaciones en Kudos.
    """
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Conexiones en Kudos")
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        user = User.objects.first()  # Simulación, reemplazar con usuario autenticado en producción

        # Configuración desde SettingsConfig
        connect_config = SettingsConfig.objects.get_or_create(key="connect_settings")[0]
        max_distance = connect_config.variables.get("max_distance", 5000)  # Metros
        recommendation_threshold = connect_config.variables.get("recommendation_threshold", 0.7)

        # Sección de Seguimiento
        st.header("Seguir a Otros")
        st.write("Encuentra y sigue a usuarios, negocios, grupos o espacios.")

        # Tipos de entidades a seguir
        entity_type = st.selectbox("Tipo de Entidad", ["Usuarios", "Negocios", "Espacios Sociales"])
        
        if entity_type == "Usuarios":
            users = User.objects.exclude(uid=user.uid).filter(ubicacion__distance_lte=(user.ubicacion, D(m=max_distance)))
            selected_user = st.selectbox("Seleccionar Usuario", [u.alias for u in users])
            if st.button("Seguir Usuario"):
                target_user = User.objects.get(alias=selected_user)
                user.followers.add(target_user)  # Asume un campo ManyToMany 'followers' en User
                Notification.objects.create(
                    user=target_user,
                    type='follow',
                    message=f"{user.alias} comenzó a seguirte.",
                    priority='baja'
                )
                st.success(f"Ahora sigues a {selected_user}.")

        elif entity_type == "Negocios":
            businesses = Capsule.objects.filter(modo='comercio', ubicacion__distance_lte=(user.ubicacion, D(m=max_distance)))
            selected_business = st.selectbox("Seleccionar Negocio", [b.contenido[:50] for b in businesses])
            if st.button("Seguir Negocio"):
                business = Capsule.objects.get(contenido__startswith=selected_business[:50])
                user.followed_capsules.add(business)  # Asume un campo ManyToMany 'followed_capsules' en User
                Notification.objects.create(
                    user=business.usuario,
                    type='follow',
                    message=f"{user.alias} comenzó a seguir tu negocio: {business.contenido[:50]}...",
                    priority='baja'
                )
                st.success(f"Ahora sigues el negocio: {selected_business}.")

        elif entity_type == "Espacios Sociales":
            spaces = SocialSpace.objects.filter(ubicacion__distance_lte=(user.ubicacion, D(m=max_distance)))
            selected_space = st.selectbox("Seleccionar Espacio", [s.theme for s in spaces])
            if st.button("Unirse al Espacio"):
                space = SocialSpace.objects.get(theme=selected_space)
                space.participants.add(user)
                Notification.objects.create(
                    user=space.creator,
                    type='join',
                    message=f"{user.alias} se unió a tu espacio: {space.theme}.",
                    priority='baja'
                )
                st.success(f"Te has unido al espacio: {selected_space}.")

        # Sección de Recomendaciones
        st.header("Recomendaciones de Conexiones")
        st.write("Descubre conexiones basadas en tus intereses y ubicación.")

        if st.button("Obtener Recomendaciones"):
            # Simulación de intereses del usuario desde 'necesidades'
            user_interests = user.necesidades if user.necesidades else ["Cultura", "Deporte"]
            prompt = (
                f"Actúa como un recomendador de conexiones para Kudos. "
                f"Basado en los intereses del usuario: {user_interests}, "
                f"y su ubicación: ({user.ubicacion.y}, {user.ubicacion.x}), "
                f"sugiere 3 usuarios, negocios o espacios sociales cercanos para conectar. "
                f"Proporciona una breve descripción para cada recomendación."
            )
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )
            recommendations = response.choices[0].message.content.split('\n\n')
            
            for rec in recommendations[:3]:  # Limitar a 3 recomendaciones
                st.write(rec)
                st.write("---")

        # Lista de Seguidores y Seguidos
        st.header("Tus Conexiones")
        followers = user.followers.all()  # Asume 'followers' como ManyToMany
        following = user.followed_capsules.all()  # Asume 'followed_capsules'
        spaces = user.social_spaces.all()

        st.subheader("Seguidores")
        for follower in followers:
            st.write(f"- {follower.alias}")

        st.subheader("Siguiendo")
        for followed in following:
            st.write(f"- {followed.contenido[:50]}... (Negocio)")

        st.subheader("Espacios Sociales")
        for space in spaces:
            st.write(f"- {space.theme}")

    return render(request, 'connect.html')