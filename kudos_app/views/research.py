```python
# kudos_app/views/research.py

"""
Vista para el Módulo 8: Investigación de Kudos.
Implementa cápsulas de investigación, colaboración científica, y simulaciones AR/VR.
"""

import logging
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib.gis.geos import Point
from kudos_app.models import Capsule, User, Notification, SettingsConfig, ResearchProject, Community
from kudos_app.views.capsule_museum import prepare_map_data
from kudos_app.utils.ar_vr_utils import add_model_to_scene, add_text_to_scene
from django.contrib import messages

# Configurar logging
logging.basicConfig(filename='/app/research.log', level=logging.INFO)

@login_required
def research_view(request):
    """
    Vista principal para explorar cápsulas de investigación, proyectos, y simulaciones AR/VR.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    research_config = SettingsConfig.objects.get_or_create(key="research_settings")[0]
    default_themes = research_config.parameters.get("default_themes", ["Ciencia", "Investigación", "Datos"])
    vr_sky = research_config.parameters.get("default_sky", "https://example.com/research_sky.jpg")

    # Obtener cápsulas de investigación
    research_capsules = Capsule.objects.filter(
        modo='investigación',
        privacy='publico'
    ).order_by('-parameters__scientific_impact')[:10]

    # Si no hay suficientes cápsulas, crear ejemplos
    if research_capsules.count() < 5:
        create_sample_research_capsules(user, default_themes)
        research_capsules = Capsule.objects.filter(
            modo='investigación',
            privacy='publico'
        ).order_by('-parameters__scientific_impact')[:10]

    # Obtener proyectos de investigación
    research_projects = ResearchProject.objects.filter(is_active=True).order_by('-member_count')[:5]

    # Mapa de cápsulas de investigación
    map_data = prepare_map_data(research_capsules)

    # Progreso del usuario
    completed_research_capsules = Capsule.objects.filter(
        usuario=user,
        modo='investigación',
        parameters__completed=True
    ).count()
    badges = Badge.objects.filter(user=user, name__in=['Pionero Científico'])

    # Generar simulación AR/VR
    research_scene = generate_research_simulation(research_capsules[:5], vr_sky)

    # Manejar acciones
    if request.method == 'POST':
        action = request.POST.get('action')

        try:
            if action == 'complete_capsule':
                capsule_uid = request.POST.get('capsule_uid')
                capsule = Capsule.objects.get(uid=capsule_uid, modo='investigación')
                capsule.parameters['completed'] = True
                capsule.save()
                Notification.objects.create(
                    user=user,
                    type='capsule_completed',
                    message=f"Has completado la cápsula de investigación '{capsule.contenido[:50]}...'.",
                    priority='media'
                )
                messages.success(request, "Cápsula completada.")

            elif action == 'co_create':
                capsule_uid = request.POST.get('capsule_uid')
                co_content = request.POST.get('co_content')
                capsule = Capsule.objects.get(uid=capsule_uid, modo='investigación')
                if co_content:
                    co_capsule = Capsule(
                        uid=f"co_research_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                        usuario=user,
                        contenido=f"Co-creado: {co_content}",
                        ubicacion=user.ubicacion if user.ubicacion else Point(0, 0),
                        modo='investigación',
                        fecha=timezone.now().date(),
                        privacy='publico',
                        time_scale='año',
                        temas=capsule.temas,
                        parameters={
                            'merits': 5,
                            'scientific_impact': capsule.parameters.get('scientific_impact', 10),
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

            elif action == 'join_project':
                project_id = request.POST.get('project_id')
                project = ResearchProject.objects.get(id=project_id)
                project.members.add(user)
                project.member_count = project.members.count()
                project.save()
                Notification.objects.create(
                    user=user,
                    type='project_joined',
                    message=f"Te has unido al proyecto de investigación '{project.title}'.",
                    priority='media'
                )
                messages.success(request, f"Te has unido a {project.title}.")

            elif action == 'create_project':
                title = request.POST.get('project_title')
                themes = request.POST.get('project_themes', '').split(',')
                description = request.POST.get('project_description')
                community_id = request.POST.get('community_id')
                community = Community.objects.get(id=community_id) if community_id else None
                project = ResearchProject(
                    title=title,
                    creator=user,
                    description=description,
                    themes=themes,
                    community=community,
                    is_active=True,
                    member_count=1
                )
                project.save()
                project.members.add(user)
                Notification.objects.create(
                    user=user,
                    type='project_created',
                    message=f"Has creado el proyecto de investigación '{title}'.",
                    priority='alta'
                )
                messages.success(request, f"Proyecto '{title}' creado.")

            elif action == 'list_market':
                capsule_uid = request.POST.get('capsule_uid')
                price = float(request.POST.get('price', 0))
                capsule = Capsule.objects.get(uid=capsule_uid, modo='investigación')
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

        except (Capsule.DoesNotExist, ResearchProject.DoesNotExist, Community.DoesNotExist) as e:
            logging.error(f"Error en acción de investigación: {e}")
            messages.error(request, "Recurso no encontrado.")
        except Exception as e:
            logging.error(f"Error al procesar acción: {e}")
            messages.error(request, f"Error: {e}")

        return redirect('research')

    context = {
        'user': user,
        'research_capsules': research_capsules,
        'research_projects': research_projects,
        'completed_research_capsules': completed_research_capsules,
        'badges': badges,
        'map_data': map_data,
        'research_scene': research_scene,
        'themes': default_themes,
        'communities': Community.objects.filter(is_active=True).order_by('-member_count')[:5]
    }

    return render(request, 'research.html', context)

def create_sample_research_capsules(user, themes):
    """
    Crea cápsulas de investigación de ejemplo.
    """
    sample_data = [
        {
            'contenido': 'Genoma Humano: Mapa completo de la secuencia genética.',
            'ubicacion': Point(-77.0369, 38.9072),  # Washington, D.C.
            'modo': 'investigación',
            'temas': ['Ciencia', 'Biotecnología'],
            'parameters': {'merits': 25, 'scientific_impact': 20},
            'fecha': timezone.now().date(),
        },
        {
            'contenido': 'Datos de Cambio Climático: Modelos globales 2025.',
            'ubicacion': Point(2.3522, 48.8566),  # París, Francia
            'modo': 'investigación',
            'temas': ['Ciencia', 'Medio Ambiente'],
            'parameters': {'merits': 20, 'scientific_impact': 15},
            'fecha': timezone.now().date(),
        }
    ]

    for data in sample_data:
        capsule = Capsule(
            uid=f"research_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
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
        logging.info(f"Cápsula de investigación de ejemplo creada: {capsule.uid}")

def generate_research_simulation(capsules, sky_url):
    """
    Genera una simulación AR/VR para explorar cápsulas de investigación.
    """
    narrative = "Explora el mundo de la investigación científica en este laboratorio virtual."

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

    # Añadir modelo de laboratorio científico
    main_model = add_model_to_scene(
        "https://example.com/science_lab.glb",
        position="0 0 -10",
        scale="1.5 1.5 1.5",
        rotation_animation=False
    )

    # Añadir luces, partículas y sonido
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 100; velocityValue: 0 0 -5"></a-entity>'
    ambient_sound = '<a-entity sound="src: https://example.com/science_ambient.mp3; autoplay: true; loop: true; volume: 0.3;"></a-entity>'

    # Escena completa
    research_scene = f"""
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
    return research_scene
```