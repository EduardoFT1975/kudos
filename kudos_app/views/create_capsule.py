```python
# kudos_app/views/create_capsule.py

"""
Vista para crear cápsulas multidimensionales en Kudos, con soporte para modo educativo.
"""

import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.gis.geos import Point
from django.utils import timezone
from kudos_app.models import Capsule, User, Notification, SettingsConfig
from kudos_app.utils.ai_utils import generate_content

# Configurar logging
logging.basicConfig(filename='/app/create_capsule.log', level=logging.INFO)

@login_required
def create_capsule_view(request):
    """
    Vista para crear una cápsula multidimensional, incluyendo modo educativo.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    wisdom_config = SettingsConfig.objects.get_or_create(key="wisdom_spaces_settings")[0]
    default_themes = wisdom_config.parameters.get("default_themes", ["Cultura", "Historia", "Filosofía", "Ciencia"])

    modes = ['educativo', 'sabiduría', 'artístico', 'comercio', 'social']
    educational_levels = ['Primaria', 'Secundaria', 'Universitario', 'Adultos']

    if request.method == 'POST':
        content = request.POST.get('content')
        mode = request.POST.get('mode')
        themes = request.POST.getlist('themes')
        lat = float(request.POST.get('latitude', 0))
        lon = float(request.POST.get('longitude', 0))
        educational_level = request.POST.get('educational_level') if mode == 'educativo' else None
        learning_objectives = request.POST.get('learning_objectives') if mode == 'educativo' else None

        if content and mode in modes and themes:
            try:
                # Generar descripción con IA si está vacía
                if not content.strip():
                    ai_prompt = f"Describe un contenido {mode} sobre {', '.join(themes)}."
                    content = generate_content(
                        prompt=ai_prompt,
                        max_tokens=200,
                        tone="informative" if mode in ['educativo', 'sabiduría'] else "engaging"
                    )

                # Crear cápsula
                capsule = Capsule(
                    uid=f"capsule_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                    usuario=user,
                    contenido=content,
                    ubicacion=Point(lon, lat) if lat and lon else user.ubicacion if user.ubicacion else Point(0, 0),
                    modo=mode,
                    fecha=timezone.now().date(),
                    privacy='publico',
                    time_scale='año',
                    temas=themes,
                    parameters={
                        'merits': 5,
                        'weather_data': {'weather': 'Desconocido'},
                        'educational_level': educational_level,
                        'learning_objectives': learning_objectives
                    } if mode == 'educativo' else {'merits': 5, 'weather_data': {'weather': 'Desconocido'}},
                    variables={'visibility_range': 500},
                    timestamp=timezone.now()
                )
                capsule.save()

                # Notificar al usuario
                Notification.objects.create(
                    user=user,
                    type='capsule_created',
                    message=f"Cápsula '{content[:50]}...' creada con éxito.",
                    priority='media'
                )

                return render(
                    request,
                    'capsule_created.html',
                    {'capsule': capsule}
                )
            except Exception as e:
                logging.error(f"Error al crear cápsula: {e}")
                return render(request, 'error.html', {'message': 'Error al crear la cápsula'})
        else:
            logging.warning("Formulario incompleto para crear cápsula.")
            return render(request, 'error.html', {'message': 'Faltan datos en el formulario'})

    return render(
        request,
        'create_capsule.html',
        {
            'modes': modes,
            'themes': default_themes,
            'educational_levels': educational_levels
        }
    )
```