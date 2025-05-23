# kudos_app/views/trending.py

"""
Vista para mostrar contenido y hashtags populares en Kudos.
Permite explorar tendencias basadas en interacciones y actividad reciente.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, Notification, SettingsConfig
from django.contrib.gis.geos import Point
from django.db.models import Count
from datetime import datetime, timedelta
import json

def trending(request):
    """
    Vista para mostrar contenido y hashtags populares en Kudos.
    """
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Tendencias en Kudos")
        st.write("Descubre qué está captando la atención de la comunidad.")

        user = request.user if request.user.is_authenticated else User.objects.first()  # Simulación con autenticación

        # Configuración desde SettingsConfig
        trending_config = SettingsConfig.objects.get_or_create(key="trending_settings")[0]
        default_time_range = trending_config.parameters.get("default_time_range", "Última Semana")
        max_trending_items = trending_config.variables.get("max_trending_items", 10)
        trending_range = trending_config.variables.get("trending_range", 5000)  # Metros

        # Filtro de Rango de Tiempo
        st.header("Filtrar Tendencias")
        time_range = st.selectbox("Rango de Tiempo", ["Última Hora", "Último Día", "Última Semana", "Último Mes"], index=["Última Hora", "Último Día", "Última Semana", "Último Mes"].index(default_time_range))
        time_filters = {
            "Última Hora": timedelta(hours=1),
            "Último Día": timedelta(days=1),
            "Última Semana": timedelta(weeks=1),
            "Último Mes": timedelta(days=30)
        }
        time_delta = time_filters[time_range]
        start_date = datetime.now() - time_delta

        # Contenido Popular (Cápsulas)
        st.header("Contenido Popular")
        st.write("Cápsulas con más interacciones (likes y comentarios).")
        capsules = Capsule.objects.filter(
            privacy='publico',
            timestamp__gte=start_date
        ).annotate(
            interaction_count=Count('likes') + Count('notifications__type', filter=models.Q(notifications__type='comment'))
        ).order_by('-interaction_count')[:max_trending_items]

        if capsules.exists():
            for capsule in capsules:
                st.subheader(f"{capsule.contenido[:50]}...")
                st.write(f"**Autor:** {capsule.usuario.alias}")
                st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
                st.write(f"**Fecha:** {capsule.fecha}")
                st.write(f"**Temas:** {', '.join(capsule.temas)}")
                st.write(f"**Interacciones:** {capsule.interaction_count}")
                st.write("---")
        else:
            st.info("No hay cápsulas populares en este rango de tiempo.")

        # Hashtags Populares
        st.header("Hashtags Populares")
        st.write("Temas más utilizados en cápsulas recientes.")
        all_themes = []
        for capsule in Capsule.objects.filter(timestamp__gte=start_date, privacy='publico'):
            all_themes.extend(capsule.temas)

        theme_counts = {}
        for theme in all_themes:
            theme_counts[theme] = theme_counts.get(theme, 0) + 1

        trending_themes = sorted(theme_counts.items(), key=lambda x: x[1], reverse=True)[:max_trending_items]
        if trending_themes:
            for theme, count in trending_themes:
                st.write(f"**#{theme}:** {count} menciones")
                if st.button(f"Explorar #{theme}", key=f"explore_{theme}"):
                    st.session_state.selected_theme = theme
        else:
            st.info("No hay hashtags populares en este rango de tiempo.")

        # Explorar Tema Seleccionado
        if 'selected_theme' in st.session_state:
            selected_theme = st.session_state.selected_theme
            st.header(f"Cápsulas con #{selected_theme}")
            theme_capsules = Capsule.objects.filter(
                temas__contains=[selected_theme],
                privacy='publico',
                timestamp__gte=start_date
            ).order_by('-timestamp')[:5]
            for capsule in theme_capsules:
                st.subheader(f"{capsule.contenido[:50]}...")
                st.write(f"**Autor:** {capsule.usuario.alias}")
                st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
                st.write(f"**Fecha:** {capsule.fecha}")
                st.write("---")

        # Mapa de Contenido Popular Cercano
        if user.ubicacion:
            st.header("Tendencias Cercanas")
            nearby_capsules = Capsule.objects.filter(
                privacy='publico',
                ubicacion__distance_lte=(user.ubicacion, D(m=trending_range)),
                timestamp__gte=start_date
            ).annotate(
                interaction_count=Count('likes') + Count('notifications__type', filter=models.Q(notifications__type='comment'))
            ).order_by('-interaction_count')[:5]
            if nearby_capsules.exists():
                map_data = [
                    {'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x, 'description': f"{capsule.contenido[:50]}... ({capsule.interaction_count} interacciones)"}
                    for capsule in nearby_capsules
                ]
                st.map(map_data, zoom=10)
            else:
                st.write("No hay tendencias cercanas en este momento.")

    return render(request, 'trending.html')