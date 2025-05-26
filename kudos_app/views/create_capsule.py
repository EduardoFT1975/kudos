# kudos_app/views/create_capsule.py

import logging
import uuid
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib.gis.geos import Point
from kudos_app.models import Capsule, User
from kudos_app.utils.weather_utils import get_weather_data
from kudos_app.utils.education_utils import generate_learning_objectives

# Configurar logging
logging.basicConfig(filename='/app/create_capsule.log', level=logging.INFO)

@login_required
def create_capsule_view(request):
    """
    Vista para que los usuarios creen cápsulas educativas, culturales o de otro tipo.
    """
    if request.method == 'POST':
        try:
            # Obtener datos del formulario
            contenido = request.POST.get('contenido')
            modo = request.POST.get('modo')
            temas = request.POST.getlist('temas') or ['General']
            privacy = request.POST.get('privacy', 'publico')
            latitude = float(request.POST.get('latitude', 0))
            longitude = float(request.POST.get('longitude', 0))

            # Crear cápsula
            capsule = Capsule(
                uid=f"capsule_{uuid.uuid4()}",
                usuario=request.user,
                contenido=contenido,
                modo=modo,
                temas=temas,
                privacy=privacy,
                ubicacion=Point(longitude, latitude),
                fecha=timezone.now().date(),
                time_scale='dia',
                parameters={},
                variables={'visibility_range': 500},
                timestamp=timezone.now()
            )

            # Añadir datos específicos según el modo
            if modo == 'educativo':
                educational_level = request.POST.get('educational_level', 'Básico')
                capsule.parameters['educational_level'] = educational_level
                capsule.parameters['learning_objectives'] = generate_learning_objectives(educational_level)
            elif modo in ['salud_mental', 'espacial', 'investigación']:
                weather_data = get_weather_data(latitude, longitude)
                capsule.parameters['weather_data'] = weather_data

            capsule.save()
            logging.info(f"Cápsula creada: {capsule.uid} por usuario {request.user.alias}")

            return render(
                request,
                'capsule_created.html',
                {'capsule': capsule}
            )

        except Exception as e:
            logging.error(f"Error al crear cápsula: {e}")
            return render(
                request,
                'error.html',
                {'message': f'Error al crear cápsula: {str(e)}'}
            )

    # Modos y temas disponibles
    modos = [
        'publico', 'educativo', 'salud_mental', 'artístico',
        'turismo_sostenible', 'innovación', 'social', 'investigación',
        'impacto_social', 'infraestructura', 'espacial', 'sabiduría'
    ]
    temas_disponibles = [
        'Historia', 'Ciencia', 'Arte', 'Tecnología', 'Naturaleza',
        'Educación', 'Salud', 'Cultura', 'Espacio', 'Sostenibilidad'
    ]

    return render(
        request,
        'create_capsule.html',
        {
            'modos': modos,
            'temas': temas_disponibles
        }
    )