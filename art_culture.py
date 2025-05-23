```python
# kudos_app/views/art_culture.py

"""
Vista para el Módulo 14: Arte y Cultura de Kudos.
Implementa cápsulas artísticas y culturales, exposiciones AR/VR, y colaboración artística.
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
logging.basicConfig(filename='/app/art_culture.log', level=logging.INFO)

@login_required
def art_culture_view(request):
    """
    Vista principal para explorar cápsulas artísticas/culturales, exposiciones AR/VR, y colaboración.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    art_config = SettingsConfig.objects.get_or_create(key="art_culture_settings")[0]
    default_themes = art_config.parameters.get("default_themes", ["Arte", "Cultura", "Historia"])
    vr_sky = art_config.parameters.get("default_sky", "https://example.com/art_sky.jpg")

    # Obtener cápsulas artísticas
    art_capsules = Capsule.objects.filter(
        modo='artístico',
        privacy='publico'
    ).order_by('-parameters__merits')[:10]

    # Si no hay suficientes cápsulas, crear ejemplos
    if art_capsules.count() < 5:
        create_sample_art_capsules(user, default_themes)
        art_capsules = Capsule.objects.filter(
            modo='artístico',
            privacy='publico'
        ).order_by('-parameters__merits')[:10]

    # Mapa de cápsulas
    map_data = prepare_map_data(art_capsules)

    # Progreso del usuario
    completed_art_capsules = Capsule.objects.filter(
        usuario=user,
        modo='artístico',
        parameters__completed=True
    ).count()
    badges = Badge.objects.filter(user=user, name__in=['Mecenas Cultural'])

    # Generar exposición AR/VR
    art_scene = generate_art_exhibition(art_capsules[:5], vr_sky)

    # Manejar acciones
    if request.method == 'POST':
        action = request.POST.get('action')
        capsule_uid = request.POST.get('capsule_uid')

        try:
            capsule = Capsule.objects.get(uid=capsule_uid, modo='artístico')

            if action == 'complete_capsule':
                capsule.parameters['completed'] = True
                capsule.save()
                Notification.objects.create(
                    user=user,
                    type='capsule_completed',
                    message=f"Has completado la cápsula artística '{capsule.contenido[:50]}...'.",
                    priority='media'
                )
                messages.success(request, "Cápsula completada.")

            elif action == 'co_create':
                co_content = request.POST.get('co_content')
                if co_content:
                    co_capsule = Capsule(
                        uid=f"co_art_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                        usuario=user,
                        contenido=f"Co-creado: {co_content}",
                        ubicacion=user.ubicacion if user.ubicacion else Point(0, 0),
                        modo='artístico',
                        fecha=timezone.now().date(),
                        privacy='publico',
                        time_scale='año',
                        temas=capsule.temas,
                        parameters={
                            'merits': 5,
                            'art_type': capsule.parameters.get('art_type', 'visual'),
                            'co_creators': [user.id, capsule.usuario.id]
                        },
                        variables={'visibility_range': 500},
                        timestamp=timezone.now()
                    )
                    co_capsule.save()
                    Notification.objects.create(
                        user=user,
                        type='co_creation',
                        message=f"Has co-creado una cápsula con '{capsule.contenido[:50]}...'.",
                        priority='alta'
                    )
                    messages.success(request, "Cápsula co-creada.")

            elif action == 'list_market':
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

        return redirect('art_culture')

    context = {
        'user': user,
        'art_capsules': art_capsules,
        'completed_art_capsules': completed_art_capsules,
        'badges': badges,
        'map_data': map_data,
        'art_scene': art_scene,
        'themes': default_themes
    }

    return render(request, 'art_culture.html', context)

def create_sample_art_capsules(user, themes):
    """
    Crea cápsulas artísticas de ejemplo.
    """
    sample_data = [
        {
            'contenido': 'Mona Lisa: Obra maestra de Leonardo da Vinci, 1503.',
            'ubicacion': Point(2.2945, 48.8606),  # Louvre, París
            'modo': 'artístico',
            'temas': ['Arte', 'Renacimiento'],
            'parameters': {'merits': 25, 'art_type': 'pintura'},
            'fecha': timezone.datetime(year=1503, month=1, day=1),
        },
        {
            'contenido': 'Día de los Muertos: Tradición mexicana vibrante.',
            'ubicacion': Point(-99.1332, 19.4326),  # Ciudad de México
            'modo': 'artístico',
            'temas': ['Cultura', 'Tradición'],
            'parameters': {'merits': 15, 'art_type': 'cultural'},
            'fecha': timezone.now().date(),
        }
    ]

    for data in sample_data:
        capsule = Capsule(
            uid=f"art_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
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
        logging.info(f"Cápsula artística de ejemplo creada: {capsule.uid}")

def generate_art_exhibition(capsules, sky_url):
    """
    Genera una exposición virtual AR/VR para cápsulas artísticas.
    """
    narrative = "Explora el arte y la cultura en esta galería virtual."

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

    # Añadir modelo de galería
    main_model = add_model_to_scene(
        "https://example.com/art_gallery.glb",
        position="0 0 -10",
        scale="1.5 1.5 1.5",
        rotation_animation=False
    )

    # Añadir luces, partículas y sonido
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 100; velocityValue: 0 0 -5"></a-entity>'
    ambient_sound = '<a-entity sound="src: https://example.com/art_ambient.mp3; autoplay: true; loop: true; volume: 0.3;"></a-entity>'

    # Escena completa
    art_scene = f"""
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
    return art_scene
```