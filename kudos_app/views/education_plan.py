```python
# kudos_app/views/education_plan.py

"""
Vista para gestionar planes de aprendizaje multidimensionales en Kudos.
Permite a educadores crear planes basados en cápsulas 1D-5D con aulas virtuales AR/VR.
"""

import logging
from django.shortcuts import render
from django.contrib.gis.geos import Point
from django.utils import timezone
from django.contrib.auth.decorators import login_required
from kudos_app.models import Capsule, User, SettingsConfig, Notification
from kudos_app.utils.ar_vr_utils import add_model_to_scene, add_text_to_scene
from kudos_app.views.capsule_museum import prepare_map_data

# Configurar logging
logging.basicConfig(filename='/app/education_plan.log', level=logging.INFO)

@login_required
def education_plan_view(request):
    """
    Vista para crear y visualizar planes de aprendizaje multidimensionales.
    """
    try:
        user = request.user
        if not user.has_perm('kudos_app.add_education_plan'):
            logging.warning(f"Usuario {user.alias} no tiene permisos para crear planes.")
            return render(request, 'error.html', {'message': 'No tienes permisos para crear planes de aprendizaje.'})
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    wisdom_config = SettingsConfig.objects.get_or_create(key="wisdom_spaces_settings")[0]
    default_themes = wisdom_config.parameters.get("default_themes", ["Cultura", "Historia", "Filosofía", "Ciencia"])
    vr_sky = wisdom_config.parameters.get("default_sky", "https://example.com/wisdom_sky.jpg")

    # Obtener cápsulas disponibles para el plan
    capsules = select_educational_capsules(user, default_themes)

    # Manejar creación de un nuevo plan
    if request.method == 'POST':
        plan_name = request.POST.get('plan_name')
        selected_capsule_ids = request.POST.getlist('capsules')
        themes = request.POST.getlist('themes')
        description = request.POST.get('description', '')

        if plan_name and selected_capsule_ids and themes:
            try:
                # Crear plan de aprendizaje (almacenado como parámetros en una cápsula especial)
                plan_capsule = Capsule(
                    uid=f"edu_plan_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                    usuario=user,
                    contenido=f"Plan de aprendizaje: {plan_name}",
                    ubicacion=user.ubicacion if user.ubicacion else Point(0, 0),
                    modo='educativo',
                    fecha=timezone.now().date(),
                    privacy='publico',
                    time_scale='mes',
                    temas=themes,
                    parameters={
                        'plan_name': plan_name,
                        'description': description,
                        'capsule_ids': selected_capsule_ids,
                        'merits': 10,
                        'learning_objectives': f"Aprender sobre {', '.join(themes)}",
                        'is_plan': True
                    },
                    variables={'visibility_range': 500},
                    timestamp=timezone.now()
                )
                plan_capsule.save()

                # Generar escena AR/VR para el aula virtual
                plan_scene = generate_aula_virtual(capsules.filter(uid__in=selected_capsule_ids), plan_name, vr_sky)

                # Notificar al usuario
                Notification.objects.create(
                    user=user,
                    type='plan_created',
                    message=f"Plan de aprendizaje '{plan_name}' creado con éxito.",
                    priority='media'
                )

                return render(
                    request,
                    'education_plan_success.html',
                    {
                        'plan_name': plan_name,
                        'capsules': capsules.filter(uid__in=selected_capsule_ids),
                        'plan_scene': plan_scene,
                        'map_data': prepare_map_data(capsules.filter(uid__in=selected_capsule_ids))
                    }
                )
            except Exception as e:
                logging.error(f"Error al crear plan de aprendizaje: {e}")
                return render(request, 'error.html', {'message': 'Error al crear el plan'})
        else:
            logging.warning("Formulario incompleto para crear plan.")
            return render(request, 'error.html', {'message': 'Faltan datos en el formulario'})

    # Mostrar formulario para crear un plan
    return render(
        request,
        'education_plan.html',
        {
            'capsules': capsules,
            'themes': default_themes,
            'map_data': prepare_map_data(capsules)
        }
    )

def select_educational_capsules(user, themes):
    """
    Selecciona cápsulas educativas basadas en temas y permisos del usuario.
    """
    capsules = Capsule.objects.filter(
        privacy='publico',
        modo__in=['educativo', 'sabiduría'],
        temas__overlap=themes
    ).order_by('-parameters__merits')[:20]

    # Si no hay suficientes cápsulas, crear algunas de ejemplo
    if capsules.count() < 5:
        create_sample_educational_capsules(user, themes)
        capsules = Capsule.objects.filter(
            privacy='publico',
            modo__in=['educativo', 'sabiduría'],
            temas__overlap=themes
        ).order_by('-parameters__merits')[:20]

    return capsules

def create_sample_educational_capsules(user, themes):
    """
    Crea cápsulas educativas de ejemplo si no hay suficientes.
    """
    sample_data = [
        {
            'contenido': 'Lección sobre la Revolución Francesa, 1789, con clima cálido.',
            'ubicacion': Point(2.3522, 48.8566),  # París, Francia
            'modo': 'educativo',
            'temas': ['Historia', 'Revolución Francesa'],
            'parameters': {'merits': 15, 'weather_data': {'weather': 'Cálido'}, 'educational_level': 'Secundaria'},
            'fecha': timezone.datetime(year=1789, month=7, day=14),
        },
        {
            'contenido': 'Introducción a la teoría de la relatividad, con clima templado.',
            'ubicacion': Point(8.6821, 50.1109),  # Frankfurt, Alemania
            'modo': 'educativo',
            'temas': ['Ciencia', 'Física'],
            'parameters': {'merits': 20, 'weather_data': {'weather': 'Templado'}, 'educational_level': 'Universitario'},
            'fecha': timezone.datetime(year=1905, month=1, day=1),
        },
        {
            'contenido': 'Filosofía de Sócrates en Atenas, con clima seco.',
            'ubicacion': Point(23.7275, 37.9838),  # Atenas, Grecia
            'modo': 'sabiduría',
            'temas': ['Filosofía', 'Grecia Antigua'],
            'parameters': {'merits': 18, 'weather_data': {'weather': 'Seco'}, 'educational_level': 'Adultos'},
            'fecha': timezone.datetime(year=-400, month=1, day=1),
        }
    ]

    for data in sample_data:
        if any(theme in data['temas'] for theme in themes):
            capsule = Capsule(
                uid=f"edu_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                usuario=user,
                contenido=data['contenido'],
                ubicacion=data['ubicacion'],
                modo=data['modo'],
                fecha=data['fecha'],
                privacy='publico',
                time_scale='siglo' if data['fecha'].year < 0 else 'año',
                temas=data['temas'],
                parameters=data['parameters'],
                variables={'visibility_range': 500},
                timestamp=timezone.now()
            )
            capsule.save()
            logging.info(f"Cápsula educativa de ejemplo creada: {capsule.uid}")

def generate_aula_virtual(capsules, plan_name, sky_url):
    """
    Genera una escena AR/VR para el aula virtual del plan de aprendizaje.
    """
    narrative = f"Aula Virtual: {plan_name} - Explora el conocimiento multidimensional."

    # Generar posiciones para las cápsulas en el aula virtual
    positions = []
    for i in range(min(len(capsules), 5)):  # Limitar a 5 cápsulas para optimizar
        x = (i % 3) * 2 - 2
        z = (i // 3) * 2 - 2
        positions.append(f"{x} 1.5 {z}")

    # Construir la escena AR/VR con A-Frame
    capsule_entities = ""
    for capsule, position in zip(capsules[:5], positions):
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

    # Añadir modelo principal del aula (por ejemplo, una biblioteca virtual)
    main_model = add_model_to_scene(
        "https://example.com/classroom_model.glb",
        position="0 0 -10",
        scale="1.5 1.5 1.5",
        rotation_animation=False
    )

    # Añadir luces, partículas y sonido ambiental
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 100; velocityValue: 0 0 -5"></a-entity>'
    ambient_sound = '<a-entity sound="src: https://example.com/classroom_ambient.mp3; autoplay: true; loop: true; volume: 0.3;"></a-entity>'

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