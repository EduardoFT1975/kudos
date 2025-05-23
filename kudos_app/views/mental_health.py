```python
# kudos_app/views/mental_health.py

"""
Vista para el Módulo 10: Salud Mental de Kudos.
Implementa cápsulas de bienestar mental, simulaciones AR/VR, y seguimiento emocional.
"""

import logging
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib.gis.geos import Point
from kudos_app.models import Capsule, User, Notification, SettingsConfig, Badge
from kudos_app.views.capsule_museum import prepare_map_data
from kudos_app.utils.ar_vr_utils import add_model_to_scene, add_text_to_scene
from django.contrib import messages

# Configurar logging
logging.basicConfig(filename='/app/mental_health.log', level=logging.INFO)

@login_required
def mental_health_view(request):
    """
    Vista principal para explorar cápsulas de salud mental, simulaciones AR/VR, y seguimiento emocional.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    mental_config = SettingsConfig.objects.get_or_create(key="mental_health_settings")[0]
    default_themes = mental_config.parameters.get("default_themes", ["Mindfulness", "Relajación", "Resiliencia"])
    vr_sky = mental_config.parameters.get("default_sky", "https://example.com/mental_sky.jpg")

    # Obtener cápsulas de salud mental
    mental_capsules = Capsule.objects.filter(
        modo='salud_mental',
        privacy='publico'
    ).order_by('-parameters__merits')[:10]

    # Si no hay suficientes cápsulas, crear ejemplos
    if mental_capsules.count() < 5:
        create_sample_mental_capsules(user, default_themes)
        mental_capsules = Capsule.objects.filter(
            modo='salud_mental',
            privacy='publico'
        ).order_by('-parameters__merits')[:10]

    # Mapa de cápsulas
    map_data = prepare_map_data(mental_capsules)

    # Progreso del usuario
    completed_mental_capsules = Capsule.objects.filter(
        usuario=user,
        modo='salud_mental',
        parameters__completed=True
    ).count()
    badges = Badge.objects.filter(user=user, name__in=['Guardián de la Paz'])

    # Estado emocional del usuario
    emotional_state = user.parameters.get('emotional_state', 'neutral')

    # Generar simulación AR/VR
    mental_scene = generate_mental_simulation(mental_capsules[:5], vr_sky)

    # Manejar acciones
    if request.method == 'POST':
        action = request.POST.get('action')
        capsule_uid = request.POST.get('capsule_uid')

        try:
            if action == 'complete_capsule':
                capsule = Capsule.objects.get(uid=capsule_uid, modo='salud_mental')
                capsule.parameters['completed'] = True
                capsule.save()
                Notification.objects.create(
                    user=user,
                    type='capsule_completed',
                    message=f"Has completado la cápsula de salud mental '{capsule.contenido[:50]}...'.",
                    priority='media'
                )
                messages.success(request, "Cápsula completada.")

            elif action == 'update_emotional_state':
                new_state = request.POST.get('emotional_state')
                if new_state in ['positivo', 'neutral', 'negativo']:
                    user.parameters['emotional_state'] = new_state
                    user.parameters['last_emotional_update'] = timezone.now().isoformat()
                    user.save()
                    messages.success(request, "Estado emocional actualizado.")
                else:
                    messages.error(request, "Estado emocional inválido.")

            elif action == 'list_market':
                capsule = Capsule.objects.get(uid=capsule_uid, modo='salud_mental')
                price = float(request.POST.get('price', 0))
                if 0 <= price <= 1000:
                    capsule.parameters['market_entry'] = True
                    capsule.parameters['price'] = price
                    capsule.parameters['sold'] = False
                    capsule.save()
                    Notification.objects.create(
                        user=user,
                        type='market_listed',
                        message=f"Cápsula '{capsule.contenido[:50]}...' listada en el mercado por {price} KMT.",
                        priority='media'
                    )
                    messages.success(request, "Cápsula listada en el mercado.")
                else:
                    messages.error(request, "El precio debe estar entre 0 y 1000 KMT.")

        except Capsule.DoesNotExist:
            logging.error(f"Cápsula {capsule_uid} no encontrada.")
            messages.error(request, "Cápsula no encontrada.")
        except Exception as e:
            logging.error(f"Error al procesar acción: {e}")
            messages.error(request, f"Error: {e}")

        return redirect('mental_health')

    context = {
        'user': user,
        'mental_capsules': mental_capsules,
        'completed_mental_capsules': completed_mental_capsules,
        'badges': badges,
        'map_data': map_data,
        'mental_scene': mental_scene,
        'themes': default_themes,
        'emotional_state': emotional_state
    }

    return render(request, 'mental_health.html', context)

def create_sample_mental_capsules(user, themes):
    """
    Crea cápsulas de salud mental de ejemplo.
    """
    sample_data = [
        {
            'contenido': 'Meditación guiada: Paz interior en 10 minutos.',
            'ubicacion': Point(0, 0),  # Ubicación genérica
            'modo': 'salud_mental',
            'temas': ['Mindfulness', 'Relajación'],
            'parameters': {'merits': 15, 'emotional_target': 'neutral'},
            'fecha': timezone.now().date(),
        },
        {
            'contenido': 'Ejercicio de respiración para reducir el estrés.',
            'ubicacion': Point(0, 0),
            'modo': 'salud_mental',
            'temas': ['Relajación', 'Resiliencia'],
            'parameters': {'merits': 10, 'emotional_target': 'negativo'},
            'fecha': timezone.now().date(),
        }
    ]

    for data in sample_data:
        capsule = Capsule(
            uid=f"mental_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
            usuario=user,
            contenido=data['contenido'],
            ubicacion=data['ubicacion'],
            modo=data['modo'],
            fecha=data['fecha'],
            privacy='publico',
            time_scale='día',
            temas=data['temas'],
            parameters=data['parameters'],
            variables={'visibility_range': 500},
            timestamp=timezone.now()
        )
        capsule.save()
        logging.info(f"Cápsula de salud mental de ejemplo creada: {capsule.uid}")

def generate_mental_simulation(capsules, sky_url):
    """
    Genera una simulación AR/VR para actividades de salud mental.
    """
    narrative = "Encuentra paz y equilibrio en este espacio de bienestar."

    # Generar posiciones para las cápsulas
    positions = []
    for i in range(len(capsules)):
        x = (i % 3) * 2 - 2
        z = (i // 3) * 2 - 2
        positions.append(f"{x} 1.5 {z}")

    # Construir la escena AR/VR con A-Frame
    capsule_entities = ""
    for capsule, position in zip(capsules, positions):
        capsule_entities += f"""
        <a-entity
            position="{position}"
            scale="0.3 0.3 0.3"
            class="clickable"
            data-info="{capsule.contenido}"
        >
            <a-text
                value="{capsule.contenido[:30]}..."
                position="0 0.5 0"
                align="center"
                color="white"
                width="2"
            ></a-text>
        </a-entity>
        """

    # Añadir modelo de entorno relajante (por ejemplo, bosque)
    main_model = add_model_to_scene(
        "https://example.com/forest_environment.glb",
        position="0 0 -10",
        scale="1.5 1.5 1.5",
        rotation_animation=False
    )

    # Añadir luces, partículas y sonido
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 100; velocityValue: 0 0 -5"></a-entity>'
    ambient_sound = '<a-entity sound="src: https://example.com/relaxation_ambient.mp3; autoplay: true; loop: true; volume: 0.3;"></a-entity>'

    # Escena completa
    mental_scene = f"""
    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
    <a-scene embedded vr-mode-ui="enabled: true">
        <a-sky src="{sky_url}"></a-sky>
        <a-text
            value="{narrative}"
            position="0 2.5 -5"
            align="center"
            color="white"
            width="4"
        ></a-text>
        {main_model}
        {capsule_entities}
        {ambient_light}
        {directional_light}
        {particles}
        {ambient_sound}
        <a-camera position="0 1.6 0"></a-camera>
    </a-scene>
    <script>
        document.querySelectorAll('.clickable').forEach(function(entity) {{
            entity.addEventListener('click', function() {{
                alert(this.getAttribute('data-info'));
            }});
        }});
    </script>
    """
    return mental_scene
```