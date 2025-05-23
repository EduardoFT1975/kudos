```python
# kudos_app/views/space_exploration.py

"""
Vista para el Módulo 12: Exploración Espacial de Kudos.
Implementa cápsulas espaciales, simulaciones AR/VR, y colaboración con agencias espaciales.
"""

import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib.gis.geos import Point
from kudos_app.models import Capsule, User, Notification, SettingsConfig, Badge
from kudos_app.views.capsule_museum import prepare_map_data
from kudos_app.utils.ar_vr_utils import add_model_to_scene, add_text_to_scene
from django.contrib import messages

# Configurar logging
logging.basicConfig(filename='/app/space_exploration.log', level=logging.INFO)

@login_required
def space_exploration_view(request):
    """
    Vista principal para explorar cápsulas espaciales y simulaciones AR/VR.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    space_config = SettingsConfig.objects.get_or_create(key="space_exploration_settings")[0]
    default_themes = space_config.parameters.get("default_themes", ["Espacio", "Astronomía", "Misiones Espaciales"])
    vr_sky = space_config.parameters.get("default_sky", "https://example.com/space_sky.jpg")

    # Obtener cápsulas espaciales
    space_capsules = Capsule.objects.filter(
        modo='espacial',
        privacy='publico'
    ).order_by('-parameters__merits')[:10]

    # Si no hay suficientes cápsulas, crear ejemplos
    if space_capsules.count() < 5:
        create_sample_space_capsules(user, default_themes)
        space_capsules = Capsule.objects.filter(
            modo='espacial',
            privacy='publico'
        ).order_by('-parameters__merits')[:10]

    # Mapa de cápsulas espaciales
    map_data = prepare_map_data(space_capsules)

    # Progreso del usuario en cápsulas espaciales
    completed_space_capsules = Capsule.objects.filter(
        usuario=user,
        modo='espacial',
        parameters__completed=True
    ).count()
    badges = Badge.objects.filter(user=user, name__in=['Explorador Estelar', 'Pionero Cósmico'])

    # Generar simulación AR/VR
    space_scene = generate_space_simulation(space_capsules[:5], vr_sky)

    # Manejar acciones (completar cápsula, listar en mercado)
    if request.method == 'POST':
        action = request.POST.get('action')
        capsule_uid = request.POST.get('capsule_uid')

        try:
            capsule = Capsule.objects.get(uid=capsule_uid, modo='espacial')

            if action == 'complete_capsule':
                capsule.parameters['completed'] = True
                capsule.save()
                Notification.objects.create(
                    user=user,
                    type='capsule_completed',
                    message=f"Has completado la cápsula espacial '{capsule.contenido[:50]}...'.",
                    priority='media'
                )
                messages.success(request, "Cápsula completada.")

            elif action == 'list_market':
                price = float(request.POST.get('price', 0))
                if capsule 0 <= price <= 1000:
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

        return redirect('space_exploration')

    context = {
        'user': user,
        'space_capsules': space_capsules,
        'completed_space_capsules': completed_space_capsules,
        'badges': badges,
        'map_data': map_data,
        'space_scene': space_scene,
        'themes': default_themes
    }

    return render(request, 'space_exploration.html', context)

def create_sample_space_capsules(user, themes):
    """
    Crea cápsulas espaciales de ejemplo.
    """
    sample_data = [
        {
            'contenido': 'Misión Apollo 11: Primer alunizaje, 1969.',
            'ubicacion': Point(0.6741, 23.4730),  # Mar de la Tranquilidad, Luna
            'modo': 'espacial',
            'temas': ['Espacio', 'Apollo 11'],
            'parameters': {'merits': 20, 'space_data': {'body': 'Luna'}},
            'fecha': timezone.datetime(year=1969, month=7, day=20),
        },
        {
            'contenido': 'Exploración de Marte: Rover Perseverance, 2021.',
            'ubicacion': Point(77.4509, 18.4479),  # Cráter Jezero, Marte
            'modo': 'espacial',
            'temas': ['Espacio', 'Marte'],
            'parameters': {'merits': 15, 'space_data': {'body': 'Marte'}},
            'fecha': timezone.datetime(year=2021, month=2, day=18),
        }
    ]

    for data in sample_data:
        capsule = Capsule(
            uid=f"space_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
            usuario=user,
            contenido=data['contenido'],
            ubicacion=data['ubicacion'],
            modo=data['modo'],
            fecha=data['fecha'],
            privacy='publico',
            time_scale='año',
            temas=data['temas'],
            parameters=data['parameters'],
            variables={'visibility_range': 500},
            timestamp=timezone.now()
        )
        capsule.save()
        logging.info(f"Cápsula espacial de ejemplo creada: {capsule.uid}")

def generate_space_simulation(capsules, sky_url):
    """
    Genera una simulación AR/VR para explorar el espacio.
    """
    narrative = "Explora el cosmos en esta simulación espacial inmersiva."

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

    # Añadir modelo espacial (por ejemplo, superficie lunar)
    main_model = add_model_to_scene(
        "https://example.com/lunar_surface.glb",
        position="0 0 -10",
        scale="1.5 1.5 1.5",
        rotation_animation=False
    )

    # Añadir luces, partículas y sonido
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 100; velocityValue: 0 0 -5"></a-entity>'
    ambient_sound = '<a-entity sound="src: https://example.com/space_ambient.mp3; autoplay: true; loop: true; volume: 0.3;"></a-entity>'

    # Escena completa
    space_scene = f"""
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
    return space_scene
```