```python
# kudos_app/views/social_impact.py

"""
Vista para el Módulo 9: Impacto Social de Kudos.
Implementa cápsulas de impacto social  social, colaboración comunitaria, y simulaciones AR/VR.
"""

import logging
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib.gis.geos import Point
from kudos_app.models import Capsule, User, Notification, SettingsConfig, Community
from kudos_app.views.capsule_museum import prepare_map_data
from kudos_app.utils.ar_vr_utils import add_model_to_scene, add_text_to_scene
from django.contrib import messages

# Configurar logging
logging.basicConfig(filename='/app/social_impact.log', level=logging.INFO)

@login_required
def social_impact_view(request):
    """
    Vista principal para explorar cápsulas de impacto social, proyectos, y simulaciones AR/VR.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    social_impact_config = SettingsConfig.objects.get_or_create(key="social_impact_settings")[0]
    default_themes = social_impact_config.parameters.get("default_themes", ["Sostenibilidad", "Comunidad", "Equidad"])
    vr_sky = social_impact_config.parameters.get("default_sky", "https://example.com/social_impact_sky.jpg")

    # Obtener cápsulas de impacto social
    social_impact_capsules = Capsule.objects.filter(
        modo='impacto_social',
        privacy='publico'
    ).order_by('-parameters__social_impact')[:10]

    # Si no hay suficientes cápsulas, crear ejemplos
    if social_impact_capsules.count() < 5:
        create_sample_social_impact_capsules(user, default_themes)
        social_impact_capsules = Capsule.objects.filter(
            modo='impacto_social',
            privacy='publico'
        ).order_by('-parameters__social_impact')[:10]

    # Obtener comunidades para vincular proyectos
    communities = Community.objects.filter(is_active=True).order_by('-member_count')[:5]

    # Mapa de cápsulas de impacto social
    map_data = prepare_map_data(social_impact_capsules)

    # Progreso del usuario
    completed_social_impact_capsules = Capsule.objects.filter(
        usuario=user,
        modo='impacto_social',
        parameters__completed=True
    ).count()
    badges = Badge.objects.filter(user=user, name__in=['Agente de Cambio'])

    # Generar simulación AR/VR
    social_impact_scene = generate_social_impact_simulation(social_impact_capsules[:5], vr_sky)

    # Manejar acciones
    if request.method == 'POST':
        action = request.POST.get('action')

        try:
            if action == 'complete_capsule':
                capsule_uid = request.POST.get('capsule_uid')
                capsule = Capsule.objects.get(uid=capsule_uid, modo='impacto_social')
                capsule.parameters['completed'] = True
                capsule.save()
                Notification.objects.create(
                    user=user,
                    type='capsule_completed',
                    message=f"Has completado la cápsula de impacto social '{capsule.contenido[:50]}...'.",
                    priority='media'
                )
                messages.success(request, "Cápsula completada.")

            elif action == 'co_create':
                capsule_uid = request.POST.get('capsule_uid')
                co_content = request.POST.get('co_content')
                capsule = Capsule.objects.get(uid=capsule_uid, modo='impacto_social')
                if co_content:
                    co_capsule = Capsule(
                        uid=f"co_social_impact_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                        usuario=user,
                        contenido=f"Co-creado: {co_content}",
                        ubicacion=user.ubicacion if user.ubicacion else Point(0, 0),
                        modo='impacto_social',
                        fecha=timezone.now().date(),
                        privacy='publico',
                        time_scale='año',
                        temas=capsule.temas,
                        parameters={
                            'merits': 5,
                            'social_impact': capsule.parameters.get('social_impact', 10),
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
                capsule_uid = request.POST.get('capsule_uid')
                price = float(request.POST.get('price', 0))
                capsule = Capsule.objects.get(uid=capsule_uid, modo='impacto_social')
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

        return redirect('social_impact')

    context = {
        'user': user,
        'social_impact_capsules': social_impact_capsules,
        'completed_social_impact_capsules': completed_social_impact_capsules,
        'badges': badges,
        'map_data': map_data,
        'social_impact_scene': social_impact_scene,
        'themes': default_themes,
        'communities': communities
    }

    return render(request, 'social_impact.html', context)

def create_sample_social_impact_capsules(user, themes):
    """
    Crea cápsulas de impacto social de ejemplo.
    """
    sample_data = [
        {
            'contenido': 'Campaña de Reforestación en la Amazonía.',
            'ubicacion': Point(-60.0, -3.0),  # Amazonas, Brasil
            'modo': 'impacto_social',
            'temas': ['Sostenibilidad', 'Comunidad'],
            'parameters': {'merits': 20, 'social_impact': 15},
            'fecha': timezone.now().date(),
        },
        {
            'contenido': 'Educación Digital para Comunidades Rurales en África.',
            'ubicacion': Point(36.8219, -1.2864),  # Nairobi, Kenia
            'modo': 'impacto_social',
            'temas': ['Equidad', 'Educación'],
            'parameters': {'merits': 15, 'social_impact': 12},
            'fecha': timezone.now().date(),
        }
    ]

    for data in sample_data:
        capsule = Capsule(
            uid=f"social_impact_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
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
        logging.info(f"Cápsula de impacto social de ejemplo creada: {capsule.uid}")

def generate_social_impact_simulation(capsules, sky_url):
    """
    Genera una simulación AR/VR para explorar cápsulas de impacto social.
    """
    narrative = "Visualiza el impacto de proyectos comunitarios en este entorno virtual."

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

    # Añadir modelo de entorno comunitario
    main_model = add_model_to_scene(
        "https://example.com/community_project.glb",
        position="0 0 -10",
        scale="1.5 1.5 1.5",
        rotation_animation=False
    )

    # Añadir luces, partículas y sonido
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 100; velocityValue: 0 0 -5"></a-entity>'
    ambient_sound = '<a-entity sound="src: https://example.com/community_ambient.mp3; autoplay: true; loop: true; volume: 0.3;"></a-entity>'

    # Escena completa
    social_impact_scene = f"""
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
    return social_impact_scene
```