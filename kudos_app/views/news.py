# kudos_app/views/news.py

"""
Vista para gestionar y mostrar noticias organizadas por categorías en Kudos.
Integra datos de fuentes externas como NewsAPI y permite personalización desde el panel de control.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, ExternalData, SettingsConfig, Notification
from django.contrib.gis.geos import Point
from datetime import datetime, timedelta
import requests
import json

def fetch_news():
    """
    Importa noticias desde NewsAPI según configuraciones en SettingsConfig.
    """
    news_config = SettingsConfig.objects.get_or_create(key="news_settings")[0]
    api_key = settings.NEWSAPI_KEY
    if not api_key:
        st.error("La clave de NewsAPI no está configurada.")
        return

    categories = news_config.parameters.get("categories", ["general", "business", "technology", "sports"])
    fetch_frequency = news_config.variables.get("fetch_frequency", 24)  # Horas

    for category in categories:
        last_updated = ExternalData.objects.filter(
            source="NewsAPI",
            category=category
        ).order_by('-timestamp').first()

        if last_updated and (datetime.now() - last_updated.timestamp).total_seconds() < fetch_frequency * 3600:
            continue

        try:
            response = requests.get(
                'https://newsapi.org/v2/top-headlines',
                params={
                    'category': category,
                    'apiKey': api_key,
                    'country': 'us',  # Personalizable en SettingsConfig
                    'pageSize': 10
                }
            )
            if response.status_code == 200:
                articles = response.json().get('articles', [])
                for article in articles:
                    ExternalData.objects.create(
                        uid=f"news_{category}_{article['publishedAt']}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                        source="NewsAPI",
                        category=category,
                        content={
                            'title': article['title'],
                            'description': article['description'] or "Sin descripción",
                            'url': article['url'],
                            'published_at': article['publishedAt'],
                            'source_name': article['source']['name']
                        },
                        timestamp=datetime.now(),
                        relevance_score=0.8,  # Podría ajustarse con IA
                        parameters={'source': 'NewsAPI', 'category': category},
                        variables={'fetch_frequency': fetch_frequency}
                    )
            else:
                st.error(f"Error al importar noticias de {category}: {response.status_code}")
        except Exception as e:
            st.error(f"Error al importar noticias: {e}")

def news(request):
    """
    Vista para mostrar noticias organizadas por categorías.
    """
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Noticias en Kudos")
        user = User.objects.first()  # Simulación, reemplazar con usuario autenticado en producción

        # Configuración desde SettingsConfig
        news_config = SettingsConfig.objects.get_or_create(key="news_settings")[0]
        categories = news_config.parameters.get("categories", ["general", "business", "technology", "sports"])
        fetch_frequency = news_config.variables.get("fetch_frequency", 24)

        # Actualizar Noticias
        if st.button("Actualizar Noticias"):
            fetch_news()
            st.success("Noticias actualizadas desde NewsAPI.")

        # Configuración de Categorías
        st.header("Configuración de Categorías")
        selected_categories = st.multiselect(
            "Categorías a Mostrar",
            options=categories,
            default=user.necesidades if user and user.necesidades else categories[:2]
        )
        news_config.parameters["categories"] = selected_categories
        if st.button("Guardar Categorías"):
            news_config.save()
            st.success("Categorías guardadas.")

        # Mostrar Noticias
        st.header("Noticias Recientes")
        time_range = st.selectbox(
            "Rango Temporal",
            ["Última Hora", "Último Día", "Última Semana", "Último Mes"],
            index=2  # Última Semana por defecto
        )
        time_filters = {
            "Última Hora": timedelta(hours=1),
            "Último Día": timedelta(days=1),
            "Última Semana": timedelta(weeks=1),
            "Último Mes": timedelta(days=30)
        }
        time_delta = time_filters[time_range]
        news_items = ExternalData.objects.filter(
            source="NewsAPI",
            category__in=selected_categories,
            timestamp__gte=datetime.now() - time_delta
        ).order_by('-timestamp')

        if news_items.exists():
            for item in news_items:
                content = item.content
                st.subheader(content.get('title', 'Sin Título'))
                st.write(f"**Fuente:** {content.get('source_name', item.source)}")
                st.write(f"**Categoría:** {item.category}")
                st.write(f"**Publicado:** {content.get('published_at', item.timestamp)}")
                st.write(f"**Descripción:** {content.get('description', 'Sin descripción')}")
                st.write(f"[Leer más]({content.get('url', '#')})")
                st.write("---")
        else:
            st.info("No hay noticias disponibles para las categorías y el rango temporal seleccionados.")

        # Compartir Noticias
        st.header("Compartir una Noticia")
        selected_news = st.selectbox("Selecciona una Noticia para Compartir", [item.content.get('title', 'Sin Título') for item in news_items])
        if selected_news:
            news_item = news_items.get(content__title=selected_news)
            if st.button("Compartir"):
                Notification.objects.create(
                    user=user,
                    type='share',
                    message=f"{user.alias} compartió una noticia: {selected_news[:50]}...",
                    priority='baja'
                )
                st.success("Noticia compartida con tus seguidores.")

    return render(request, 'news.html')