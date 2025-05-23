```python
# kudos_app/views/historical_map.py

"""
Vista para el Mapa con Máquina del Tiempo de Kudos.
Permite visualizar cápsulas en mapas históricos con reconstrucciones 3D en AR/VR.
"""

import logging
import requests
from django.shortcuts import render
from django.contrib.gis.geos import Point
from django.utils import timezone
from kudos_app.models import Capsule, User
from kudos_app.views.capsule_museum import prepare_map_data
from kudos_app.utils.ar_vr_utils import add_model_to_scene, add_text_to_scene

# Configurar logging
logging.basicConfig(filename='/app/historical_map.log', level=logging.INFO)

def historical_map_view(request):
    """
    Vista para el Mapa con Máquina del Tiempo, que muestra cápsulas en mapas históricos
    con reconstrucciones 3D en AR/VR.
    """
    try:
        # Obtener usuario administrador para operaciones
        admin_user = User.objects.get(alias='Administrador')
    except User.DoesNotExist:
        logging.error("Usuario 'Administrador' no encontrado.")
        return render(request, 'error.html', {'message': 'Administrador no encontrado'})

    # Definir épocas históricas disponibles
    historical_periods = [
        "Contemporánea (1900-Presente)",
        "Edad Media (500-1500)",
        "Renacimiento (1300-1700)",
        "Edad Moderna (1500-1800)",
        "Era Industrial (1800-1900)",
        "Prehistoria (hasta 3000 a.C.)",
        "Antigüedad (3000 a.C.-500 d.C.)"
    ]

    # Obtener la época seleccionada (por formulario o default)
    selected_period = request.GET.get('time_period', historical_periods[-1])  # Default: Antigüedad
    if selected_period not in historical_periods:
        selected_period = historical_periods[-1]

    # Seleccionar cápsulas relevantes para la época
    capsules = select_historical_capsules(admin_user, selected_period)

    # Generar escena AR/VR para la reconstrucción histórica
    historical_scene = generate_historical_scene(capsules, selected_period)

    # Preparar datos para el mapa interactivo
    map_data = prepare_historical_map_data(capsules, selected_period)

    return render(
        request,
        'historical_map.html',
        {
            'historical_periods': historical_periods,
            'selected_period': selected_period,
            'capsules': capsules,
            'historical_scene': historical_scene,
            'map_data': map_data,
        }
    )

def select_historical_capsules(user, period):
    """
    Selecciona cápsulas relevantes para una época histórica específica.
    """
    # Definir rangos de fechas para cada período
    period_ranges = {
        "Contemporánea (1900-Presente)": (1900, 2025),
        "Edad Media (500-1500)": (500, 1500),
        "Renacimiento (1300-1700)": (1300, 1700),
        "Edad Moderna (1500-1800)": (1500, 1800),
        "Era Industrial (1800-1900)": (1800, 1900),
        "Prehistoria (hasta 3000 a.C.)": (-10000, -3000),
        "Antigüedad (3000 a.C.-500 d.C.)": (-3000, 500)
    }
    start_year, end_year = period_ranges.get(period, (-3000, 500))

    # Filtrar cápsulas públicas que coincidan con el período
    capsules = Capsule.objects.filter(
        usuario=user,
        privacy='publico',
        fecha__year__gte=start_year,
        fecha__year__lte=end_year
    ).order_by('-parameters__merits')[:10]

    # Si no hay suficientes cápsulas, crear algunas de ejemplo
    if capsules.count() < 5:
        create_sample_historical_capsules(user, period, start_year, end_year)
        capsules = Capsule.objects.filter(
            usuario=user,
            privacy='publico',
            fecha__year__gte=start_year,
            fecha__year__lte=end_year
        ).order_by('-parameters__merits')[:10]

    return capsules

def create_sample_historical_capsules(user, period, start_year, end_year):
    """
    Crea cápsulas de ejemplo para una época histórica si no hay suficientes.
    Incluye simulación de datos históricos externos.
    """
    sample_data = []
    if period == "Antigüedad (3000 a.C.-500 d.C.)":
        sample_data = [
            {
                'contenido': 'Construcción del Coliseo en Roma, año 80 d.C., con clima soleado.',
                'ubicacion': Point(12.4924, 41.8902),  # Roma, Italia
                'modo': 'educativo',
                'temas': ['Historia', 'Roma Antigua'],
                'parameters': {'merits': 20, 'weather_data': {'weather': 'Soleado'}},
                'fecha': timezone.datetime(year=80, month=1, day=1),
            },
            {
                'contenido': 'Debate en el Foro Romano, año 100 d.C., con clima cálido.',
                'ubicacion': Point(12.4853, 41.8925),  # Foro Romano, Italia
                'modo': 'sabiduría',
                'temas': ['Filosofía', 'Roma Antigua'],
                'parameters': {'merits': 15, 'weather_data': {'weather': 'Cálido'}},
                'fecha': timezone.datetime(year=100, month=1, day=1),
            },
            {
                'contenido': 'Construcción de las Pirámides de Giza, 2560 a.C., con clima seco.',
                'ubicacion': Point(31.1342, 29.9792),  # Giza, Egipto
                'modo': 'educativo',
                'temas': ['Historia', 'Egipto Antiguo'],
                'parameters': {'merits': 25, 'weather_data': {'weather': 'Seco'}},
                'fecha': timezone.datetime(year=-2560, month=1, day=1),
            }
        ]
    elif period == "Edad Media (500-1500)":
        sample_data = [
            {
                'contenido': 'Construcción de la Catedral de Notre-Dame, año 1163, con clima frío.',
                'ubicacion': Point(2.3499, 48.8530),  # París, Francia
                'modo': 'educativo',
                'temas': ['Historia', 'Edad Media'],
                'parameters': {'merits': 18, 'weather_data': {'weather': 'Frío'}},
                'fecha': timezone.datetime(year=1163, month=1, day=1),
            },
            {
                'contenido': 'Batalla de Hastings, año 1066, con clima nublado.',
                'ubicacion': Point(0.4877, 50.9115),  # Hastings, Inglaterra
                'modo': 'educativo',
                'temas': ['Historia', 'Edad Media'],
                'parameters': {'merits': 20, 'weather_data': {'weather': 'Nublado'}},
                'fecha': timezone.datetime(year=1066, month=10, day=14),
            },
            {
                'contenido': 'Fundación de la Universidad de Bolonia, año 1088, con clima templado.',
                'ubicacion': Point(11.3426, 44.4949),  # Bolonia, Italia
                'modo': 'educativo',
                'temas': ['Historia', 'Edad Media'],
                'parameters': {'merits': 22, 'weather_data': {'weather': 'Templado'}},
                'fecha': timezone.datetime(year=1088, month=1, day=1),
            }
        ]
    elif period == "Renacimiento (1300-1700)":
        sample_data = [
            {
                'contenido': 'Construcción de la Basílica de San Pedro, año 1506, con clima cálido.',
                'ubicacion': Point(12.4534, 41.9022),  # Vaticano, Roma
                'modo': 'educativo',
                'temas': ['Historia', 'Renacimiento'],
                'parameters': {'merits': 25, 'weather_data': {'weather': 'Cálido'}},
                'fecha': timezone.datetime(year=1506, month=1, day=1),
            }
        ]

    # Simulación de datos históricos externos (por ejemplo, Wikipedia API)
    try:
        # En un entorno real, usaríamos una API como Wikipedia para obtener eventos históricos
        # Ejemplo simulado:
        if period == "Antigüedad (3000 a.C.-500 d.C.)":
            sample_data.append({
                'contenido': 'Fundación de Atenas, 1200 a.C., con clima seco.',
                'ubicacion': Point(23.7275, 37.9838),  # Atenas, Grecia
                'modo': 'educativo',
                'temas': ['Historia', 'Grecia Antigua'],
                'parameters': {'merits': 18, 'weather_data': {'weather': 'Seco'}},
                'fecha': timezone.datetime(year=-1200, month=1, day=1),
            })
    except Exception as e:
        logging.error(f"Error al obtener datos históricos externos: {e}")

    for data in sample_data:
        capsule = Capsule(
            uid=f"historical_{user.id}_{period.replace(' ', '_')}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
            usuario=user,
            contenido=data['contenido'],
            ubicacion=data['ubicacion'],
            modo=data['modo'],
            fecha=data['fecha'],
            privacy='publico',
            time_scale='siglo',
            temas=data['temas'],
            parameters=data['parameters'],
            variables={'visibility_range': 500},
            timestamp=timezone.now()
        )
        capsule.save()
        logging.info(f"Cápsula histórica de ejemplo creada: {capsule.uid}")

def generate_historical_scene(capsules, period):
    """
    Genera una escena AR/VR para la reconstrucción histórica de la época seleccionada.
    """
    narrative = f"Viaja a la {period} y explora la historia de la humanidad."
    sky_url = "https://example.com/historical_sky.jpg"  # Cielo genérico

    # Seleccionar un entorno 3D completo según la época
    historical_environments = {
        "Antigüedad (3000 a.C.-500 d.C.)": {
            "main_model": "https://example.com/roman_city.glb",
            "secondary_models": [
                {"url": "https://example.com/coliseum_model.glb", "position": "5 0 -10", "scale": "1 1 1"},
                {"url": "https://example.com/forum_romanum.glb", "position": "-5 0 -10", "scale": "1 1 1"}
            ],
            "ambient_sound": "https://example.com/roman_city_ambient.mp3"
        },
        "Edad Media (500-1500)": {
            "main_model": "https://example.com/medieval_city.glb",
            "secondary_models": [
                {"url": "https://example.com/notre_dame_model.glb", "position": "0 0 -10", "scale": "1 1 1"}
            ],
            "ambient_sound": "https://example.com/medieval_city_ambient.mp3"
        },
        "Renacimiento (1300-1700)": {
            "main_model": "https://example.com/renaissance_city.glb",
            "secondary_models": [
                {"url": "https://example.com/renaissance_palace.glb", "position": "0 0 -10", "scale": "1 1 1"}
            ],
            "ambient_sound": "https://example.com/renaissance_ambient.mp3"
        },
        "Edad Moderna (1500-1800)": {
            "main_model": "https://example.com/colonial_city.glb",
            "secondary_models": [
                {"url": "https://example.com/colonial_building.glb", "position": "0 0 -10", "scale": "1 1 1"}
            ],
            "ambient_sound": "https://example.com/colonial_ambient.mp3"
        },
        "Era Industrial (1800-1900)": {
            "main_model": "https://example.com/industrial_city.glb",
            "secondary_models": [
                {"url": "https://example.com/factory_model.glb", "position": "0 0 -10", "scale": "1 1 1"}
            ],
            "ambient_sound": "https://example.com/industrial_ambient.mp3"
        },
        "Prehistoria (hasta 3000 a.C.)": {
            "main_model": "https://example.com/prehistoric_landscape.glb",
            "secondary_models": [
                {"url": "https://example.com/cave_model.glb", "position": "0 0 -10", "scale": "1 1 1"}
            ],
            "ambient_sound": "https://example.com/prehistoric_ambient.mp3"
        },
        "Contemporánea (1900-Presente)": {
            "main_model": "https://example.com/modern_city.glb",
            "secondary_models": [
                {"url": "https://example.com/modern_building.glb", "position": "0 0 -10", "scale": "1 1 1"}
            ],
            "ambient_sound": "https://example.com/modern_city_ambient.mp3"
        }
    }
    env_data = historical_environments.get(period, historical_environments["Antigüedad (3000 a.C.-500 d.C.)"])

    # Generar posiciones para las cápsulas en el espacio virtual
    positions = []
    for i in range(min(len(capsules), 5)):  # Limitar a 5 cápsulas para optimizar rendimiento
        x = (i % 3) * 3 - 3
        z = (i // 3) * 3 - 3
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

    # Añadir entorno principal y modelos secundarios
    main_model = add_model_to_scene(env_data["main_model"], position="0 0 -20", scale="2 2 2", rotation_animation=False)
    secondary_models = ""
    for model in env_data["secondary_models"]:
        secondary_models += add_model_to_scene(
            model["url"],
            position=model["position"],
            scale=model["scale"],
            rotation_animation=True
        )

    # Añadir luces, partículas, caminos y sonido ambiental
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 200; velocityValue: 0 0 -5"></a-entity>'
    paths = '<a-entity geometry="primitive: plane; width: 10; height: 1" position="0 0 -10" rotation="-90 0 0" material="color: #8B4513;"></a-entity>'
    ambient_sound = f'<a-entity sound="src: {env_data["ambient_sound"]}; autoplay: true; loop: true; volume: 0.5;"></a-entity>'

    # Escena completa
    historical_scene = f"""
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
        {secondary_models}
        {capsule_entities}
        {ambient_light}
        {directional_light}
        {particles}
        {paths}
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
    return historical_scene

def prepare_historical_map_data(capsules, period):
    """
    Prepara datos GeoJSON para el mapa histórico, incluyendo marcadores históricos.
    """
    geojson = prepare_map_data(capsules)

    # Añadir marcadores históricos representativos según la época
    historical_markers = []
    if period == "Antigüedad (3000 a.C.-500 d.C.)":
        historical_markers = [
            {
                "coordinates": [12.4924, 41.8902],  # Coliseo, Roma
                "description": "Coliseo de Roma, construido en 80 d.C.",
            },
            {
                "coordinates": [12.4853, 41.8925],  # Foro Romano
                "description": "Foro Romano, centro político de la Antigua Roma.",
            },
            {
                "coordinates": [31.1342, 29.9792],  # Pirámides de Giza
                "description": "Pirámides de Giza, construidas alrededor de 2560 a.C.",
            },
            {
                "coordinates": [23.7275, 37.9838],  # Atenas, Grecia
                "description": "Atenas, cuna de la democracia, 1200 a.C.",
            }
        ]
    elif period == "Edad Media (500-1500)":
        historical_markers = [
            {
                "coordinates": [2.3499, 48.8530],  # Notre-Dame, París
                "description": "Catedral de Notre-Dame, construcción iniciada en 1163.",
            },
            {
                "coordinates": [0.4877, 50.9115],  # Hastings, Inglaterra
                "description": "Campo de la Batalla de Hastings, 1066.",
            },
            {
                "coordinates": [11.3426, 44.4949],  # Bolonia, Italia
                "description": "Universidad de Bolonia, fundada en 1088.",
            }
        ]
    elif period == "Renacimiento (1300-1700)":
        historical_markers = [
            {
                "coordinates": [12.4534, 41.9022],  # Vaticano, Roma
                "description": "Basílica de San Pedro, construcción iniciada en 1506.",
            }
        ]

    for marker in historical_markers:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": marker["coordinates"]
            },
            "properties": {
                "description": marker["description"],
                "mode": "historical_marker",
                "themes": ["Historia"],
                "weather": "Desconocido",
                "year": "N/A"
            }
        }
        geojson["features"].append(feature)

    return geojson
```