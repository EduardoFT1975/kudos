```python
# kudos_app/views/innovation.py

"""
Vista para el Módulo 13: Innovación Tecnológica de Kudos.
Implementa cápsulas de innovación, simulaciones AR/VR, y recomendaciones avanzadas de IA.
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
from openai import OpenAI

# Configurar logging
logging.basicConfig(filename='/app/innovation.log', level=logging.INFO)

@login_required
def innovation_view(request):
    """
    Vista principal para explorar cápsulas de innovación tecnológica, simulaciones AR/VR, y colaboración.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    innovation_config = SettingsConfig.objects.get_or_create(key="innovation_settings")[0]
    default_themes = innovation_config.parameters.get("default_themes", ["Tecnología", "IA", "Biotecnología"])
    vr_sky = innovation_config.parameters.get("default_sky", "https://example.com/innovation_sky.jpg")

    # Obtener cápsulas de innovación
    innovation_capsules = Capsule.objects.filter(
        modo='innovación',
        privacy='publico'
    ).order_by('-parameters__innovation_impact')[:10]

    # Si no hay suficientes cápsulas, crear ejemplos
    if innovation_capsules.count() < 5:
        create_sample_innovation_capsules(user, default_themes)
        innovation_capsules = Capsule.objects.filter(
            modo='innovación',
            privacy='publico'
        ).order_by('-parameters__innovation_impact')[:10]

    # Mapa de cápsulas
    map_data = prepare_map_data(innovation_capsules)

    # Progreso del usuario
    completed_innovation_capsules = Capsule.objects.filter(
        usuario=user,
        modo='innovación',
        parameters__completed=True
    ).count()
    badges = Badge.objects.filter(user=user, name__in=['Innovador Tecnológico'])

    # Generar simulación AR/VR
    innovation_scene = generate_innovation_simulation(innovation_capsules[:5], vr_sky)

    # Generar recomendación avanzada de IA
    ai_recommendation = generate_ai_recommendation(user, default_themes, completed_innovation_capsules)

    # Manejar acciones
    if request.method == 'POST':
        action = request.POST.get('action')
        capsule_uid = request.POST.get('capsule_uid')

        try:
            capsule = Capsule.objects.get(uid=capsule_uid, modo='innovación')

            if action == 'complete_capsule':
                capsule.parameters['completed'] = True
                capsule.save()
                Notification.objects.create(
                    user=user,
                    type='capsule_completed',
                    message=f"Has completado la cápsula de innovación '{capsule.contenido[:50]}...'.",
                    priority='media'
                )
                messages.success(request, "Cápsula completada.")

            elif action == 'co_create':
                co_content = request.POST.get('co_content')
                if co_content:
                    co_capsule = Capsule(
                        uid=f"co_innovation_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                        usuario=user,
                        contenido=f"Co-creado: {co_content}",
                        ubicacion=user.ubicacion if user.ubicacion else Point(0, 0),
                        modo='innovación',
                        fecha=timezone.now().date(),
                        privacy='publico',
                        time_scale='año',
                        temas=capsule.temas,
                        parameters={
                            'merits': 5,
                            'innovation_impact': capsule.parameters.get('innovation_impact', 10),
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

        return redirect('innovation')

    context = {
        'user': user,
        'innovation_capsules': innovation_capsules,
        'completed_innovation_capsules': completed_innovation_capsules,
        'badges': badges,
        'map_data': map_data,
        'innovation_scene': innovation_scene,
        'ai_recommendation': ai_recommendation,
        'themes': default_themes
    }

    return render(request, 'innovation.html', context)

def create_sample_innovation_capsules(user, themes):
    """
    Crea cápsulas de innovación tecnológica de ejemplo.
    """
    sample_data = [
        {
            'contenido': 'CRISPR: Revolución en edición genética.',
            'ubicacion': Point(-122.4194, 37.7749),  # San Francisco, CA
            'modo': 'innovación',
            'temas': ['Biotecnología', 'IA'],
            'parameters': {'merits': 25, 'innovation_impact': 20},
            'fecha': timezone.now().date(),
        },
        {
            'contenido': 'Computación Cuántica: El futuro de la informática.',
            'ubicacion': Point(-71.0589, 42.3601),  # Boston, MA
            'modo': 'innovación',
            'temas': ['Tecnología', 'IA'],
            'parameters': {'merits': 20, 'innovation_impact': 15},
            'fecha': timezone.now().date(),
        }
    ]

    for data in sample_data:
        capsule = Capsule(
            uid=f"innovation_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
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
        logging.info(f"Cápsula de innovación tecnológica de ejemplo creada: {capsule.uid}")

def generate_innovation_simulation(capsules, sky_url):
    """
    Genera una simulación AR/VR para explorar innovaciones tecnológicas.
    """
    narrative = "Explora el futuro de la tecnología en este laboratorio virtual."

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

    # Añadir modelo de laboratorio tecnológico
    main_model = add_model_to_scene(
        "https://example.com/tech_lab.glb",
        position="0 0 -10",
        scale="1.5 1.5 1.5",
        rotation_animation=False
    )

    # Añadir luces, partículas y sonido
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 100; velocityValue: 0 0 -5"></a-entity>'
    ambient_sound = '<a-entity sound="src: https://example.com/tech_ambient.mp3; autoplay: true; loop: true; volume: 0.3;"></a-entity>'

    # Escena completa
    innovation_scene = f"""
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
    return innovation_scene

def generate_ai_recommendation(user, themes, completed_capsules):
    """
    Genera una recomendación avanzada usando IA basada en el progreso del usuario.
    """
    try:
        client = OpenAI(api_key=SettingsConfig.objects.get(key="openai_api_key").value)
        prompt = f"""
        Eres un asistente de IA para Kudos, una plataforma de cápsulas multidimensionales. Recomienda una cápsula de innovación tecnológica para un usuario con {completed_capsules} cápsulas tecnológicas completadas, interesado en los temas: {', '.join(themes)}. Proporciona una breve descripción (50-100 palabras) de una cápsula innovadora que sea relevante y atractiva.
        """
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150
        )
        return response.choices[0].message.content
    except Exception as e:
        logging.error(f"Error al generar recomendación de IA: {e}")
        return "Explora cápsulas sobre IA para transformar el futuro."
```