```python
# kudos_app/views/education_advanced.py

"""
Vista para el Módulo 7: Educación Avanzada de Kudos.
Implementa aprendizaje adaptativo, gamificación, y colaboración global.
"""

import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib.gis.geos import Point
from kudos_app.models import Capsule, User, Notification, SettingsConfig, Badge
from kudos_app.views.capsule_museum import prepare_map_data
from kudos_app.utils.ar_vr_utils import add_model_to_scene, add_text_to_scene

# Configurar logging
logging.basicConfig(filename='/app/education_advanced.log', level=logging.INFO)

@login_required
def education_advanced_view(request):
    """
    Vista principal para el sistema de educación avanzada.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    education_config = SettingsConfig.objects.get_or_create(key="education_advanced_settings")[0]
    default_themes = education_config.parameters.get("default_themes", ["Cultura", "Historia", "Ciencia", "Filosofía"])
    vr_sky = education_config.parameters.get("default_sky", "https://example.com/education_sky.jpg")

    # Obtener progreso del usuario
    completed_plans = Capsule.objects.filter(
        usuario=user,
        parameters__is_plan=True,
        parameters__completed=True
    ).count()
    completed_capsules = Capsule.objects.filter(
        usuario=user,
        modo__in=['educativo', 'sabiduría'],
        parameters__completed=True
    ).count()
    badges = Badge.objects.filter(user=user)

    # Recomendaciones adaptativas
    recommended_capsules = recommend_adaptive_capsules(user, default_themes, completed_capsules)

    # Mapa de cápsulas recomendadas
    map_data = prepare_map_data(recommended_capsules)

    # Manejar acciones (co-creación, completar cápsula)
    if request.method == 'POST':
        action = request.POST.get('action')
        capsule_uid = request.POST.get('capsule_uid')

        try:
            capsule = Capsule.objects.get(uid=capsule_uid)

            if action == 'complete_capsule':
                capsule.parameters['completed'] = True
                capsule.save()
                Notification.objects.create(
                    user=user,
                    type='capsule_completed',
                    message=f"Has completado la cápsula '{capsule.contenido[:50]}...'.",
                    priority='media'
                )
                messages.success(request, "Cápsula completada.")

            elif action == 'co_create':
                co_content = request.POST.get('co_content')
                if co_content:
                    co_capsule = Capsule(
                        uid=f"co_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                        usuario=user,
                        contenido=f"Co-creado: {co_content}",
                        ubicacion=user.ubicacion if user.ubicacion else Point(0, 0),
                        modo='educativo',
                        fecha=timezone.now().date(),
                        privacy='publico',
                        time_scale='año',
                        temas=capsule.temas,
                        parameters={
                            'merits': 5,
                            'educational_level': capsule.parameters.get('educational_level', 'Adultos'),
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

        except Capsule.DoesNotExist:
            logging.error(f"Cápsula {capsule_uid} no encontrada.")
            messages.error(request, "Cápsula no encontrada.")
        except Exception as e:
            logging.error(f"Error al procesar acción: {e}")
            messages.error(request, f"Error: {e}")

        return redirect('education_advanced')

    # Generar aula virtual colaborativa
    aula_scene = generate_collaborative_aula(recommended_capsules[:5], vr_sky)

    context = {
        'user': user,
        'completed_plans': completed_plans,
        'completed_capsules': completed_capsules,
        'badges': badges,
        'recommended_capsules': recommended_capsules,
        'map_data': map_data,
        'aula_scene': aula_scene,
        'themes': default_themes
    }

    return render(request, 'education_advanced.html', context)

def recommend_adaptive_capsules(user, themes, completed_capsules):
    """
    Recomienda cápsulas basadas en el progreso y preferencias del usuario.
    """
    try:
        # Ajustar nivel educativo según progreso
        educational_level = 'Primaria' if completed_capsules < 5 else 'Secundaria' if completed_capsules < 15 else 'Universitario' if completed_capsules < 30 else 'Adultos'
        capsules = Capsule.objects.filter(
            privacy='publico',
            modo__in=['educativo', 'sabiduría'],
            temas__overlap=themes,
            parameters__educational_level=educational_level
        ).exclude(usuario=user).order_by('-parameters__merits')[:10]

        # Si no hay suficientes cápsulas, generar ejemplos
        if capsules.count() < 5:
            from kudos_app.views.education_plan import create_sample_educational_capsules
            create_sample_educational_capsules(user, themes)
            capsules = Capsule.objects.filter(
                privacy='publico',
                modo__in=['educativo', 'sabiduría'],
                temas__overlap=themes,
                parameters__educational_level=educational_level
            ).exclude(usuario=user).order_by('-parameters__merits')[:10]

        return capsules
    except Exception as e:
        logging.error(f"Error al recomendar cápsulas: {e}")
        return Capsule.objects.none()

def generate_collaborative_aula(capsules, sky_url):
    """
    Genera una aula virtual colaborativa en AR/VR.
    """
    narrative = "Aula Virtual Colaborativa: Co-crea conocimiento global."

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

    # Añadir modelo de aula colaborativa
    main_model = add_model_to_scene(
        "https://example.com/collaborative_classroom.glb",
        position="0 0 -10",
        scale="1.5 1.5 1.5",
        rotation_animation=False
    )

    # Añadir luces, partículas y sonido
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 100; velocityValue: 0 0 -5"></a-entity>'
    ambient_sound = '<a-entity sound="src: https://example.com/collaborative_ambient.mp3; autoplay: true; loop: true; volume: 0.3;"></a-entity>'

    # Escena completa
    aula_scene = f"""
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
    return aula_scene
```