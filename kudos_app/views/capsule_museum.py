# kudos_app/views/capsule_museum.py

import logging
import random
from django.shortcuts import render
from django.contrib.gis.geos import Point
from django.utils import timezone
from kudos_app.models import Capsule, User
from kudos_app.utils.ar_vr_utils import generate_ar_vr_scene
from kudos_app.views.ecos import generate_eco

# Configurar logging
logging.basicConfig(filename='/app/capsule_museum.log', level=logging.INFO)

def capsule_museum_view(request):
    """
    Vista para el Museo Universal de Cápsulas, un espacio virtual inmersivo (AR/VR)
    que exhibe cápsulas significativas seleccionadas por IA o votación de usuarios.
    """
    try:
        # Obtener usuario administrador para operaciones
        admin_user = User.objects.get(alias='Administrador')
    except User.DoesNotExist:
        logging.error("Usuario 'Administrador' no encontrado.")
        return render(request, 'error.html', {'message': 'Administrador no encontrado'})

    # Seleccionar cápsulas significativas (simulación de selección por IA/votación)
    capsules = select_significant_capsules(admin_user)

    # Generar clips automáticos para las cápsulas seleccionadas
    for capsule in capsules:
        if 'clip_url' not in capsule.parameters:
            capsule_data = {
                'capsule_id': capsule.uid,
                'content': capsule.contenido,
                'images': capsule.parameters.get('images', []),
            }
            clip_url = generate_eco(capsule_data, clip_duration=random.randint(15, 60))
            if clip_url:
                capsule.parameters['clip_url'] = clip_url
                capsule.save()

    # Generar escena AR/VR para el museo
    museum_scene = generate_museum_scene(capsules)

    # Preparar datos para el mapa interactivo
    map_data = prepare_map_data(capsules)

    return render(
        request,
        'capsule_museum.html',
        {
            'capsules': capsules,
            'museum_scene': museum_scene,
            'map_data': map_data,
        }
    )

def select_significant_capsules(user):
    """
    Selecciona cápsulas significativas basadas en méritos (simulación de IA/votación).
    """
    # Simulación: seleccionar cápsulas públicas con méritos altos
    capsules = Capsule.objects.filter(
        usuario=user,
        privacy='publico',
        modo__in=['educativo', 'sabiduría', 'artístico', 'espacial']
    ).order_by('-parameters__merits')[:10]

    # Si no hay suficientes cápsulas, crear algunas de ejemplo
    if capsules.count() < 5:
        create_sample_capsules(user)
        capsules = Capsule.objects.filter(
            usuario=user,
            privacy='publico',
            modo__in=['educativo', 'sabiduría', 'artístico', 'espacial']
        ).order_by('-parameters__merits')[:10]

    return capsules

def create_sample_capsules(user):
    """
    Crea cápsulas de ejemplo para el museo si no hay suficientes.
    """
    sample_data = [
        {
            'contenido': 'Cápsula histórica: La caída de Tenochtitlán en 1521, con clima cálido.',
            'ubicacion': Point(-99.1332, 19.4326),  # México
            'modo': 'educativo',
            'temas': ['Historia', 'Tenochtitlán'],
            'parameters': {'merits': 10, 'weather_data': {'weather': 'Cálido'}},
        },
        {
            'contenido': 'Exploración espacial: Primer alunizaje en 1969, con datos simulados.',
            'ubicacion': Point(0.6741, 23.4730),  # Mar de la Tranquilidad, Luna
            'modo': 'espacial',
            'temas': ['Espacio', 'Apolo 11'],
            'parameters': {'merits': 15, 'weather_data': {'weather': 'Sin atmósfera'}},
        },
    ]

    for data in sample_data:
        capsule = Capsule(
            uid=f"sample_{user.id}_{random.randint(1000, 9999)}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
            usuario=user,
            contenido=data['contenido'],
            ubicacion=data['ubicacion'],
            modo=data['modo'],
            fecha=timezone.now().date(),
            privacy='publico',
            time_scale='dia',
            temas=data['temas'],
            parameters=data['parameters'],
            variables={'visibility_range': 500},
            timestamp=timezone.now()
        )
        capsule.save()
        logging.info(f"Cápsula de ejemplo creada: {capsule.uid}")

def generate_museum_scene(capsules):
    """
    Genera una escena AR/VR para el Museo Universal de Cápsulas.
    """
    # Crear una narrativa para el museo
    narrative = "Bienvenido al Museo Universal de Cápsulas, un espacio inmersivo para explorar la memoria colectiva de la humanidad."

    # Generar posiciones para las cápsulas en el espacio virtual
    positions = []
    for i in range(len(capsules)):
        x = (i % 5) * 2 - 4  # Posiciones en un grid
        z = (i // 5) * 2 - 2
        positions.append(f"{x} 1.5 {z}")

    # Construir la escena AR/VR con A-Frame
    capsule_entities = ""
    for capsule, position in zip(capsules, positions):
        model_url = "https://example.com/capsule_model.glb"  # Modelo genérico
        capsule_entities += f"""
        <a-entity
            gltf-model="{model_url}"
            position="{position}"
            scale="0.5 0.5 0.5"
            animation="property: rotation; to: 0 360 0; loop: true; dur: 10000"
        >
            <a-text
                value="{capsule.contenido[:50]}..."
                position="0 0.5 0"
                align="center"
                color="white"
                width="2"
            ></a-text>
        </a-entity>
        """

    # Añadir luces y partículas para inmersión
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 200; velocityValue: 0 0 -5"></a-entity>'

    # Escena completa
    museum_scene = f"""
    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
    <a-scene embedded vr-mode-ui="enabled: true">
        <a-sky color="#1a1a1a"></a-sky>
        <a-text
            value="{narrative}"
            position="0 2.5 -5"
            align="center"
            color="white"
            width="4"
        ></a-text>
        {capsule_entities}
        {ambient_light}
        {directional_light}
        {particles}
        <a-camera position="0 1.6 0"></a-camera>
    </a-scene>
    """
    return museum_scene

def prepare_map_data(capsules):
    """
    Prepara datos GeoJSON para mostrar cápsulas en un mapa Leaflet.
    """
    geojson = {
        "type": "FeatureCollection",
        "features": []
    }

    for capsule in capsules:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [capsule.ubicacion.x, capsule.ubicacion.y]
            },
            "properties": {
                "description": capsule.contenido,
                "mode": capsule.modo,
                "themes": capsule.temas,
                "weather": capsule.parameters.get('weather_data', {}).get('weather', 'Desconocido')
            }
        }
        geojson["features"].append(feature)

    return geojson