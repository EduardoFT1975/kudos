```python
# kudos_app/views/education_recommender.py

"""
Vista para recomendar cápsulas educativas en Kudos basado en intereses, ubicación y nivel educativo.
"""

import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.utils import timezone
from kudos_app.models import Capsule, User, SettingsConfig, Notification
from kudos_app.views.capsule_museum import prepare_map_data

# Configurar logging
logging.basicConfig(filename='/app/education_recommender.log', level=logging.INFO)

@login_required
def education_recommender_view(request):
    """
    Vista para recomendar cápsulas educativas basadas en intereses, ubicación y nivel educativo.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    wisdom_config = SettingsConfig.objects.get_or_create(key="wisdom_spaces_settings")[0]
    default_themes = wisdom_config.parameters.get("default_themes", ["Cultura", "Historia", "Filosofía", "Ciencia"])
    educational_levels = ['Primaria', 'Secundaria', 'Universitario', 'Adultos']

    # Obtener preferencias del formulario o usar valores predeterminados
    selected_themes = request.GET.getlist('themes', default_themes)
    selected_level = request.GET.get('educational_level', 'Adultos')
    radius_km = float(request.GET.get('radius', 50))  # Radio en kilómetros

    # Obtener ubicación del usuario (o usar una predeterminada si no está disponible)
    user_location = user.ubicacion if user.ubicacion else Point(12.4924, 41.8902)  # Roma por defecto

    # Recomendar cápsulas
    recommended_capsules = recommend_capsules(user, selected_themes, selected_level, user_location, radius_km)

    # Preparar datos para el mapa interactivo
    map_data = prepare_map_data(recommended_capsules)

    # Generar notificación si hay nuevas recomendaciones
    if recommended_capsules.exists():
        Notification.objects.create(
            user=user,
            type='recommendation',
            message=f"Se encontraron {recommended_capsules.count()} cápsulas educativas recomendadas.",
            priority='baja'
        )

    return render(
        request,
        'education_recommender.html',
        {
            'capsules': recommended_capsules,
            'themes': default_themes,
            'selected_themes': selected_themes,
            'educational_levels': educational_levels,
            'selected_level': selected_level,
            'radius': radius_km,
            'map_data': map_data
        }
    )

def recommend_capsules(user, themes, educational_level, location, radius_km):
    """
    Recomienda cápsulas educativas basadas en temas, nivel educativo y ubicación.
    """
    try:
        # Filtrar cápsulas públicas educativas o de sabiduría
        capsules = Capsule.objects.filter(
            privacy='publico',
            modo__in=['educativo', 'sabiduría'],
            temas__overlap=themes,
            parameters__educational_level=educational_level
        )

        # Filtrar por ubicación si está disponible
        if location:
            capsules = capsules.filter(
                ubicacion__distance_lte=(location, D(km=radius_km))
            )

        # Ordenar por méritos y limitar a 20 cápsulas
        capsules = capsules.order_by('-parameters__merits')[:20]

        # Si hay menos de 5 cápsulas, generar algunas de ejemplo
        if capsules.count() < 5:
            from kudos_app.views.education_plan import create_sample_educational_capsules
            create_sample_educational_capsules(user, themes)
            capsules = Capsule.objects.filter(
                privacy='publico',
                modo__in=['educativo', 'sabiduría'],
                temas__overlap=themes,
                parameters__educational_level=educational_level
            )
            if location:
                capsules = capsules.filter(
                    ubicacion__distance_lte=(location, D(km=radius_km))
                )
            capsules = capsules.order_by('-parameters__merits')[:20]

        return capsules
    except Exception as e:
        logging.error(f"Error al recomendar cápsulas: {e}")
        return Capsule.objects.none()
```