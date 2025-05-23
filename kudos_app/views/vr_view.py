```python
# kudos_app/views/vr_view.py

"""
Vista para renderizar entornos de Realidad Virtual (VR) en Kudos, enfocada en aulas virtuales educativas.
"""

import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from kudos_app.models import Capsule, SettingsConfig
from kudos_app.utils.ar_vr_utils import add_model_to_scene, add_text_to_scene

# Configurar logging
logging.basicConfig(filename='/app/vr_view.log', level=logging.INFO)

@login_required
def vr_view(request, capsule_uid):
    """
    Vista para renderizar una cápsula en un entorno VR, especialmente para aulas virtuales educativas.
    """
    try:
        capsule = Capsule.objects.get(uid=capsule_uid)
        if capsule.privacy != 'publico' and capsule.usuario != request.user:
            logging.warning(f"Usuario {request.user.alias} intentó acceder a cápsula privada {capsule_uid}.")
            return render(request, 'error.html', {'message': 'No tienes acceso a esta cápsula'})
    except Capsule.DoesNotExist:
        logging.error(f"Cápsula {capsule_uid} no encontrada.")
        return render(request, 'error.html', {'message': 'Cápsula no encontrada'})
    except Exception as e:
        logging.error(f"Error al cargar cápsula {capsule_uid}: {e}")
        return render(request, 'error.html', {'message': 'Error al cargar la cápsula'})

    # Configuración desde SettingsConfig
    wisdom_config = SettingsConfig.objects.get_or_create(key="wisdom_spaces_settings")[0]
    vr_sky = wisdom_config.parameters.get("default_sky", "https://example.com/wisdom_sky.jpg")

    # Generar escena VR
    narrative = f"Aula Virtual: {capsule.contenido[:50]}..."
    capsule_entity = f"""
    <a-entity
        position="0 0 -5"
        scale="0.5 0.5 0.5"
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

    # Añadir modelo educativo (por ejemplo, aula virtual)
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

    # Escena VR completa
    vr_scene = f"""
    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
    <a-scene embedded vr-mode-ui="enabled: true">
        <a-sky src="{vr_sky}"></a-sky>
        <a-text
            value="{narrative}"
            position="0 2.5 -5"
            align="center"
            color="white"
            width="4"
        ></a-text>
        {main_model}
        {capsule_entity}
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
    
    return render(
        request,
        'vr_view.html',
        {'vr_scene': vr_scene, 'capsule': capsule}
    )
```