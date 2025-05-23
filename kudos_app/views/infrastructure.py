```python
# kudos_app/views/infrastructure.py

"""
Vista para el Módulo 6: Infraestructura de Kudos.
Gestiona almacenamiento IPFS, transacciones Solana, renderizado WebGPU y monitoreo de recursos.
"""

import logging
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib.gis.geos import Point
from kudos_app.models import Capsule, User, Notification, SettingsConfig
from kudos_app.views.capsule_museum import prepare_map_data
from kudos_app.utils.ar_vr_utils import add_model_to_scene, add_text_to_scene
from kudos_app.utils.blockchain_utils import process_solana_transaction
from django.contrib import messages

# Configurar logging
logging.basicConfig(filename='/app/infrastructure.log', level=logging.INFO)

@login_required
def infrastructure_view(request):
    """
    Vista principal para gestionar y monitorear la infraestructura de Kudos.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    infrastructure_config = SettingsConfig.objects.get_or_create(key="infrastructure_settings")[0]
    ipfs_storage_limit = infrastructure_config.parameters.get('ipfs_storage_limit', 1000)  # MB
    webgpu_enabled = infrastructure_config.parameters.get('webgpu_enabled', False)
    default_themes = ["Infraestructura", "Blockchain", "Renderizado"]
    vr_sky = infrastructure_config.parameters.get("default_sky", "https://example.com/infrastructure_sky.jpg")

    # Obtener cápsulas de infraestructura
    infrastructure_capsules = Capsule.objects.filter(
        modo='infraestructura',
        privacy='publico'
    ).order_by('-parameters__merits')[:10]

    # Si no hay suficientes cápsulas, crear ejemplos
    if infrastructure_capsules.count() < 5:
        create_sample_infrastructure_capsules(user, default_themes)
        infrastructure_capsules = Capsule.objects.filter(
            modo='infraestructura',
            privacy='publico'
        ).order_by('-parameters__merits')[:10]

    # Mapa de cápsulas de infraestructura
    map_data = prepare_map_data(infrastructure_capsules)

    # Progreso del usuario
    completed_infrastructure_capsules = Capsule.objects.filter(
        usuario=user,
        modo='infraestructura',
        parameters__completed=True
    ).count()
    badges = Badge.objects.filter(user=user, name__in=['Arquitecto Digital'])

    # Estadísticas de infraestructura
    infrastructure_stats = {
        'ipfs_storage_used': infrastructure_config.parameters.get('ipfs_storage_used', 0),
        'solana_transactions': infrastructure_config.parameters.get('solana_transactions', 0),
        'webgpu_usage': infrastructure_config.parameters.get('webgpu_usage', 0),
        'last_monitoring': infrastructure_config.parameters.get('last_monitoring', 'N/A')
    }

    # Generar simulación AR/VR
    infrastructure_scene = generate_infrastructure_simulation(infrastructure_capsules[:5], vr_sky, webgpu_enabled)

    # Manejar acciones
    if request.method == 'POST':
        action = request.POST.get('action')

        try:
            if action == 'contribute_capsule':
                capsule_uid = request.POST.get('capsule_uid')
                capsule = Capsule.objects.get(uid=capsule_uid, modo='infraestructura')
                capsule.parameters['completed'] = True
                capsule.save()
                Notification.objects.create(
                    user=user,
                    type='capsule_completed',
                    message=f"Has contribuido a la cápsula de infraestructura '{capsule.contenido[:50]}...'.",
                    priority='media'
                )
                messages.success(request, "Contribución completada.")

            elif action == 'simulate_transaction':
                amount = float(request.POST.get('amount', 0))
                if 0 <= amount <= 100:
                    tx_id = process_solana_transaction(user.id, amount)
                    infrastructure_config.parameters['solana_transactions'] = infrastructure_config.parameters.get('solana_transactions', 0) + 1
                    infrastructure_config.save()
                    Notification.objects.create(
                        user=user,
                        type='transaction_processed',
                        message=f"Transacción simulada por {amount} KMT procesada en Solana (ID: {tx_id}).",
                        priority='media'
                    )
                    messages.success(request, "Transacción simulada procesada.")

        except Capsule.DoesNotExist:
            logging.error(f"Cápsula {capsule_uid} no encontrada.")
            messages.error(request, "Cápsula no encontrada.")
        except Exception as e:
            logging.error(f"Error al procesar acción: {e}")
            messages.error(request, f"Error: {e}")

        return redirect('infrastructure')

    context = {
        'user': user,
        'infrastructure_capsules': infrastructure_capsules,
        'completed_infrastructure_capsules': completed_infrastructure_capsules,
        'badges': badges,
        'map_data': map_data,
        'infrastructure_scene': infrastructure_scene,
        'infrastructure_stats': infrastructure_stats,
        'themes': default_themes
    }

    return render(request, 'infrastructure.html', context)

def create_sample_infrastructure_capsules(user, themes):
    """
    Crea cápsulas de infraestructura de ejemplo.
    """
    sample_data = [
        {
            'contenido': 'Optimización de Almacenamiento IPFS para Cápsulas.',
            'ubicacion': Point(-122.4194, 37.7749),  # San Francisco, CA
            'modo': 'infraestructura',
            'temas': ['Infraestructura', 'IPFS'],
            'parameters': {'merits': 20, 'infrastructure_impact': 15},
            'fecha': timezone.now().date(),
        },
        {
            'contenido': 'Implementación de WebGPU para AR/VR.',
            'ubicacion': Point(139.6917, 35.6895),  # Tokio, Japón
            'modo': 'infraestructura',
            'temas': ['Infraestructura', 'Renderizado'],
            'parameters': {'merits': 15, 'infrastructure_impact': 12},
            'fecha': timezone.now().date(),
        }
    ]

    for data in sample_data:
        capsule = Capsule(
            uid=f"infrastructure_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
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
        logging.info(f"Cápsula de infraestructura de ejemplo creada: {capsule.uid}")

def generate_infrastructure_simulation(capsules, sky_url, webgpu_enabled):
    """
    Genera una simulación AR/VR para explorar infraestructura tecnológica.
    """
    narrative = "Explora la infraestructura tecnológica de Kudos en este centro de datos virtual."

    # Generar posiciones para las cápsulas
    positions = []
    for i in range(len(capsules)):
        x = (i % 3) * 2 - 2
        z = (i // 3) * 2 - 2
        positions.append(f"{x} 1.5 {z}")

    # Construir la escena AR/VR con A-Frame (optimizada para WebGPU si habilitado)
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

    # Añadir modelo de centro de datos
    main_model = add_model_to_scene(
        "https://example.com/data_center.glb",
        position="0 0 -10",
        scale="1.5 1.5 1.5",
        rotation_animation=False
    )

    # Añadir luces, partículas y sonido
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 100; velocityValue: 0 0 -5"></a-entity>'
    ambient_sound = '<a-entity sound="src: https://example.com/tech_ambient.mp3; autoplay: true; loop: true; volume: 0.3;"></a-entity>'

    # Configuración para WebGPU (si habilitado)
    renderer = 'renderer="antialias: true; highRefreshRate: true; physicallyCorrectLights: true;"' if webgpu_enabled else ''

    # Escena completa
    infrastructure_scene = f"""
    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
    <a-scene {renderer} embedded vr-mode-ui="enabled: true">
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
    return infrastructure_scene
```