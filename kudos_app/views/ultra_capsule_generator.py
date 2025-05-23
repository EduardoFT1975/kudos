# kudos_app/views/ultra_capsule_generator.py

```python
import os
import sys
import django
import requests
import logging
import json
import random
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.gis.geos import Point
from django.utils import timezone
from django.contrib.gis.measure import D
from kudos_app.models import Capsule, User, Notification, SettingsConfig, Transaction, Alert, PromotionSpace, SocialSpace, Route, VirtualOperation, WisdomSpace, Character
from kudos_app.utils.unesco_utils import get_unesco_sites
from kudos_app.utils.museum_utils import get_met_artworks
from kudos_app.utils.google_maps_utils import get_elevation, get_time_zone, get_street_view
from kudos_app.utils.ai_utils import generate_content
from kudos_app.utils.blockchain_utils import preserve_capsule
from kudos_app.utils.ar_vr_utils import generate_ar_vr_scene
from kudos_app.utils.notifications_utils import send_location_based_notification
from kudos_app.utils.data_utils import fetch_and_store_external_data
from kudos_app.wisdom_search import search_wisdom_capsules
from kudos_app.views.ecos import generate_eco
from kudos_app.views.mining import calculate_kmt, mint_kmt
from kudos_app.views.moderation import moderate_capsule
from celery import shared_task
from ipfshttpclient import Client as IPFSClient
from solana.rpc.api import Client as SolanaClient
from solana.keypair import Keypair
from moviepy.editor import ImageClip, AudioFileClip
from gtts import gTTS
import shutil

# Configurar logging
logging.basicConfig(filename='/app/super_capsule_generation.log', level=logging.INFO)

# Configurar Django
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kudos_project.settings')
django.setup()

# Directorio para clips e imágenes
CLIP_DIR = "/app/clips"
IMAGE_DIR = "/app/images"
if not os.path.exists(CLIP_DIR):
    os.makedirs(CLIP_DIR)
if not os.path.exists(IMAGE_DIR):
    os.makedirs(IMAGE_DIR)

@shared_task
def generate_capsules_with_nft_arvr_clips_eco_health_market_legacy_safety_social_sports_subscriptions_vr_wisdom(
    center_lat=40.4168, center_lon=-3.7038, place_type="tourist_attraction", max_places=50
):
    """
    Genera cápsulas multidimensionales (educativas, comerciales, artísticas, ciudadanas, salud, benéficas, seguridad,
    sociales, espirituales, espaciales, streaming, simuladas, deportivas, operaciones virtuales, sabiduría), crea NFTs,
    almacena en IPFS, genera AR/VR con mejoras (luces, partículas), clips Eco, notificaciones, modera, mina KMT, y soporta
    suscripciones, VR, espacios de sabiduría, y mapas interactivos personalizados con Leaflet.
    """
    logging.info("Iniciando generación de cápsulas con NFTs, AR/VR mejorado, clips Eco, salud, mercado, legado, seguridad, sociales, deportes, suscripciones, VR, sabiduría, y mapas personalizados...")

    # Obtener usuario administrador
    try:
        admin_user = User.objects.get(alias='Administrador')
    except User.DoesNotExist:
        logging.error("Usuario 'Administrador' no encontrado.")
        return

    # Configurar clientes IPFS y Solana
    try:
        ipfs_client = IPFSClient('/ip4/127.0.0.1/tcp/5001')
        solana_client = SolanaClient("https://api.devnet.solana.com")
        keypair = Keypair.from_seed(bytes.fromhex(os.getenv("SOLANA_PRIVATE_KEY")))
    except Exception as e:
        logging.error(f"Error al configurar IPFS/Solana: {e}")
        return

    # Cargar Program ID del contrato CapsuleNFT
    try:
        with open(os.path.join(settings.BASE_DIR, 'build/deployments.json'), 'r') as f:
            deployments = json.load(f)
        capsule_nft_program_id = deployments.get('CapsuleNFT.sol', {}).get('program_id')
        if not capsule_nft_program_id:
            logging.error("Program ID de CapsuleNFT no encontrado.")
            return
    except Exception as e:
        logging.error(f"Error al cargar deployments.json: {e}")
        return

    # Configuraciones
    commerce_config = SettingsConfig.objects.get_or_create(key="commerce_apis_settings")[0]
    festival_config = SettingsConfig.objects.get_or_create(key="art_festival_settings")[0]
    citizen_config = SettingsConfig.objects.get_or_create(key="citizen_participation_settings")[0]
    gc_config = SettingsConfig.objects.get_or_create(key="global_consciousness_settings")[0]
    geo_config = SettingsConfig.objects.get_or_create(key="geolocation_settings")[0]
    health_config = SettingsConfig.objects.get_or_create(key="health_monitor_settings")[0]
    mh_config = SettingsConfig.objects.get_or_create(key="mental_health_settings")[0]
    legacy_config = SettingsConfig.objects.get_or_create(key="kudos_legacy_settings")[0]
    safety_config = SettingsConfig.objects.get_or_create(key="safety_settings")[0]
    promo_config = SettingsConfig.objects.get_or_create(key="promotion_spaces_settings")[0]
    social_config = SettingsConfig.objects.get_or_create(key="social_spaces_settings")[0]
    spirit_config = SettingsConfig.objects.get_or_create(key="spirituality_settings")[0]
    space_config = SettingsConfig.objects.get_or_create(key="space_exploration_settings")[0]
    stream_config = SettingsConfig.objects.get_or_create(key="streaming_settings")[0]
    sim_config = SettingsConfig.objects.get_or_create(key="simulation_engine_settings")[0]
    sports_config = SettingsConfig.objects.get_or_create(key="sports_competitions_settings")[0]
    timeline_config = SettingsConfig.objects.get_or_create(key="timeline_settings")[0]
    trending_config = SettingsConfig.objects.get_or_create(key="trending_settings")[0]
    vr_config = SettingsConfig.objects.get_or_create(key="virtual_operations_settings")[0]
    wisdom_config = SettingsConfig.objects.get_or_create(key="wisdom_spaces_settings")[0]
    
    commission_rate = commerce_config.variables.get("commission_rate", 5.0)
    festival_themes = festival_config.parameters.get("festival_themes", ["Arte", "Música", "Literatura", "Cine"])
    citizen_themes = citizen_config.parameters.get("themes", ["Educación", "Sostenibilidad", "Cultura", "Salud"])
    debate_themes = gc_config.parameters.get("debate_themes", ["Sostenibilidad", "Tecnología", "Igualdad", "Salud"])
    notification_distance = geo_config.variables.get("default_notification_distance", 500)
    health_metrics = health_config.parameters.get("health_metrics", ["Actividad Física", "Sueño", "Estrés", "Nutrición"])
    mood_options = mh_config.parameters.get("mood_options", ["Feliz", "Triste", "Ansioso", "Estresado", "Calmado"])
    legacy_causes = legacy_config.parameters.get("legacy_causes", ["Reforestación", "Educación", "Salud", "Pobreza"])
    promo_categories = promo_config.parameters.get("categories", ["General", "Comercio", "Servicios", "Eventos"])
    social_themes = social_config.parameters.get("space_themes", ["Amistad", "Cultura", "Deporte", "Tecnología"])
    spirit_themes = spirit_config.parameters.get("spirit_themes", ["Meditación", "Filosofía", "Religión", "Autoconocimiento"])
    space_themes = space_config.parameters.get("space_themes", ["Astronomía", "Misiones Espaciales", "Vida Extraterrestre", "Cosmología"])
    stream_ad_frequency = stream_config.variables.get("ad_frequency", 300)
    sim_themes = sim_config.parameters.get("simulation_themes", ["Historia", "Ciencia", "Cultura", "Futuro"])
    sport_types = sports_config.parameters.get("sport_types", ["Ciclismo", "Running", "Natación", "Multideporte"])
    vr_operation_types = vr_config.parameters.get("operation_types", ["Tour Virtual", "Clase", "Evento", "Simulación"])
    wisdom_themes = wisdom_config.parameters.get("default_themes", ["Cultura", "Historia", "Filosofía", "Ciencia"])
    wisdom_sky = wisdom_config.parameters.get("default_sky", "https://example.com/wisdom_sky.jpg")

    # Obtener lugares desde Google Places
    places = get_places_from_google(center_lat, center_lon, place_type=place_type)
    places = places[:max_places]

    # Analizar datos externos
    data_config = SettingsConfig.objects.get_or_create(key="data_sources")[0]
    for source_name, source_config in data_config.data_sources.items():
        if source_config.get('enabled', False):
            fetch_and_store_external_data(source_name, source_config.get('url'), source_config.get('category', 'General'), source_config.get('params', {}))

    for index, place in enumerate(places):
        try:
            lat = place['lat']
            lon = place['lon']
            place_name = place['name']
            description = place['description']

            # Generar descripciones con IA para diferentes modos
            modes = ['educativo', 'comercio', 'artístico', 'ciudadano', 'conciencia', 'salud', 'mental', 'benéfico', 'seguridad',
                     'promoción', 'social', 'espiritual', 'espacial', 'streaming', 'simulado', 'deporte', 'virtual', 'sabiduría']
            mode = modes[index % len(modes)]
            if mode == 'educativo':
                ai_prompt = f"Describe {place_name} en un estilo educativo para estudiantes."
                themes = [place_name, "Educación"]
                parameters = {'educational_level': 'Adultos', 'learning_objectives': f"Comprender la importancia de {place_name}."}
            elif mode == 'comercio':
                ai_prompt = f"Describe una oferta comercial para {place_name}, como una experiencia turística."
                themes = [place_name, "Comercio"]
                parameters = {'market_entry': True, 'sold': False, 'api_platform': 'Stripe', 'api_key_field': 'stripe_api_key'}
            elif mode == 'artístico':
                ai_prompt = f"Describe {place_name} como inspiración para una obra artística."
                themes = [place_name, festival_themes[0]]
                parameters = {'festival_entry': True}
            elif mode == 'ciudadano':
                ai_prompt = f"Propón una iniciativa ciudadana para mejorar {place_name}."
                themes = [place_name, citizen_themes[0]]
                parameters = {'initiative': True, 'votes': 0}
            elif mode == 'conciencia':
                ai_prompt = f"Propón un tema de debate global relacionado con {place_name}."
                themes = [place_name, debate_themes[0]]
                parameters = {'congress_proposal': True, 'votes': 0}
            elif mode == 'salud':
                metric = random.choice(health_metrics)
                value = random.uniform(10, 100)
                ai_prompt = f"Describe un registro de {metric} en {place_name}."
                themes = [place_name, "Salud"]
                parameters = {'metric': metric, 'value': value}
            elif mode == 'mental':
                mood = random.choice(mood_options)
                intensity = random.randint(1, 10)
                ai_prompt = f"Describe un estado emocional de {mood} en {place_name}."
                themes = [place_name, "Salud Mental"]
                parameters = {'mood': mood, 'intensity': intensity, 'notes': f"Sentimiento en {place_name}."}
            elif mode == 'benéfico':
                cause = random.choice(legacy_causes)
                ai_prompt = f"Describe una contribución benéfica para {cause} en {place_name}."
                themes = [place_name, "Kudos Legacy", cause]
                parameters = {'preserved_in_blockchain': True, 'cause': cause}
            elif mode == 'seguridad':
                ai_prompt = f"Describe una alerta de seguridad en {place_name}."
                themes = [place_name, "Seguridad"]
                parameters = {'type': 'sos', 'source': 'user'}
            elif mode == 'promoción':
                category = random.choice(promo_categories)
                ai_prompt = f"Describe una promoción para {category} en {place_name}."
                themes = [place_name, category]
                parameters = {'category': category, 'subcategory': category.lower()}
            elif mode == 'social':
                ai_prompt = f"Describe una publicación social sobre {place_name}."
                themes = [place_name, social_themes[0]]
                parameters = {'created_via': 'social'}
            elif mode == 'espiritual':
                ai_prompt = f"Describe una reflexión espiritual en {place_name}."
                themes = [place_name, spirit_themes[0]]
                parameters = {'spiritual_entry': True}
            elif mode == 'espacial':
                ai_prompt = f"Describe una observación astronómica en {place_name}."
                themes = [place_name, space_themes[0]]
                parameters = {'space_entry': True}
            elif mode == 'streaming':
                ai_prompt = f"Describe una transmisión en vivo desde {place_name}."
                themes = [place_name, "Streaming"]
                parameters = {'is_live': True, 'ad_frequency': stream_ad_frequency}
            elif mode == 'simulado':
                ai_prompt = f"Describe una cápsula simulada sobre {place_name}."
                themes = [place_name, sim_themes[0]]
                parameters = {'simulated': True, 'source': 'SimulationEngine'}
            elif mode == 'deporte':
                sport = random.choice(sport_types)
                ai_prompt = f"Describe una competencia de {sport} en {place_name}."
                themes = [place_name, sport]
                parameters = {'competition': True, 'sport_type': sport, 'participants': [admin_user.uid]}
            elif mode == 'virtual':
                operation_type = random.choice(vr_operation_types)
                ai_prompt = f"Describe una operación virtual de tipo {operation_type} en {place_name}."
                themes = [place_name, operation_type]
                parameters = {'operation_type': operation_type}
            else:  # sabiduría
                ai_prompt = f"Describe un repositorio de sabiduría sobre {place_name}."
                themes = [place_name, wisdom_themes[0]]
                parameters = {'space_id': None}  # Se asignará después

            ai_description = generate_content(
                prompt=ai_prompt,
                max_tokens=200,
                tone="informative" if mode in ['educativo', 'ciudadano', 'conciencia', 'salud', 'mental', 'seguridad', 'espiritual', 'espacial', 'simulado', 'sabiduría'] else "engaging",
                focus="cultural" if mode == 'artístico' else "practical"
            )

            # Obtener datos adicionales
            elevation = get_elevation(lat, lon)
            time_zone = get_time_zone(lat, lon)
            street_view_url = get_street_view(lat, lon)
            unesco_site = enrich_capsule_with_unesco(lat, lon)
            artwork_title, artwork_image = get_met_artworks(place_name)

            # Obtener datos climáticos
            weather_data = get_weather_data(lat, lon)
            climatology = f"{weather_data['condition']}, {weather_data['temperature']}°C" if weather_data else "Unknown"
            parameters['weather_data'] = {'weather': weather_data['condition'] if weather_data else 'Unknown'}

            # Configurar privacidad
            privacy = 'solo_yo' if mode in ['salud', 'mental', 'seguridad'] else 'publico'

            # Crear WisdomSpace si es modo 'sabiduría' y no existe
            if mode == 'sabiduría':
                space_name = f"Espacio de {themes[1]} en {place_name}"
                space, created = WisdomSpace.objects.get_or_create(
                    name=space_name,
                    defaults={
                        'uid': f"wisdom_space_{admin_user.id}_{index}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                        'theme': themes[1],
                        'subthemes': [themes[1]],
                        'description': f"Espacio de sabiduría sobre {themes[1]} en {place_name}.",
                        'ubicacion': Point(lon, lat),
                        'timestamp': timezone.now(),
                    }
                )
                if created:
                    # Crear un Character para el espacio
                    Character.objects.create(
                        uid=f"char_{space.theme}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                        nombre="Séneca",
                        rol="guia",
                        theme=space.theme,
                        imagen_adultos="https://example.com/seneca_adults.png",
                        modelo_ar="https://example.com/seneca_vr.glb"
                    )
                parameters['space_id'] = space.uid

            # Crear cápsula, espacio, ruta, operación virtual, o WisdomSpace según el modo
            if mode == 'promoción':
                promotion = PromotionSpace(
                    uid=f"promo_{admin_user.id}_{index}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    user=admin_user,
                    category=parameters['category'],
                    subcategory=parameters['subcategory'],
                    description=ai_description,
                    timestamp=timezone.now(),
                    ubicacion=Point(lon, lat),
                    price=10.0,
                    parameters={'created_by': admin_user.alias},
                    variables={'visibility_range': notification_distance}
                )
                promotion.save()
                logging.info(f"Espacio de promoción creado para {place_name}: {parameters['category']}")
                continue
            elif mode == 'social':
                space = SocialSpace(
                    uid=f"social_{admin_user.id}_{index}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    creator=admin_user,
                    theme=themes[1],
                    description=ai_description,
                    timestamp=timezone.now(),
                    ubicacion=Point(lon, lat),
                    price=0.0,
                    parameters={'created_by': admin_user.alias},
                    variables={'visibility_range': notification_distance}
                )
                space.save()
                space.participants.add(admin_user)
                logging.info(f"Espacio social creado para {place_name}: {themes[1]}")
                continue
            elif mode == 'deporte':
                route = Route(
                    uid=f"comp_{admin_user.id}_{index}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    usuario=admin_user,
                    contenido=ai_description,
                    ubicacion=Point(lon, lat),
                    modo='deporte',
                    fecha=datetime.now().date() + timedelta(days=7),
                    privacy='publico',
                    time_scale='dia',
                    distance=10.0,
                    altitude_gain=0.0,
                    sport_type=parameters['sport_type'],
                    price=10.0,
                    parameters={'competition': True, 'participants': [admin_user.uid]},
                    variables={'visibility_range': notification_distance}
                )
                route.save()
                logging.info(f"Competencia deportiva creada para {place_name}: {parameters['sport_type']}")
                continue
            elif mode == 'virtual':
                operation = VirtualOperation(
                    uid=f"vr_{admin_user.id}_{index}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    user=admin_user,
                    operation_type=parameters['operation_type'],
                    title=ai_description[:50],
                    description=ai_description,
                    price=10.0,
                    location=Point(lon, lat),
                    city=place_name,
                    timestamp=timezone.now(),
                    parameters={'created_by': admin_user.alias},
                    variables={'visibility_range': notification_distance}
                )
                operation.save()
                logging.info(f"Operación virtual creada para {place_name}: {parameters['operation_type']}")
                continue

            # Crear cápsula en Django
            capsule_uid = f"{mode}_{admin_user.id}_{index}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            capsule = Capsule(
                uid=capsule_uid,
                usuario=admin_user,
                contenido=ai_description,
                ubicacion=Point(lon, lat),
                modo=mode,
                fecha=datetime.now().date(),
                privacy=privacy,
                time_scale='dia',
                price=10.0 if mode in ['comercio', 'benéfico', 'streaming'] else 0.0,
                temas=themes,
                parameters=parameters,
                variables={'visibility_range': notification_distance},
                timestamp=timezone.now()
            )

            # Moderar cápsula
            if not moderate_capsule(capsule):
                logging.info(f"Cápsula {capsule_uid} eliminada por moderación automática.")
                continue

            capsule.save()

            # Calcular y minar KMT
            capsule_data = {
                'capsule_id': capsule_uid,
                'content': ai_description,
                'classification': {
                    '1D': 'video',
                    '2D': f"({lat}, {lon})",
                    '3D': capsule.fecha.strftime('%d/%m/%Y'),
                    '4D': f"{parameters.get('merits', 5)} M"
                },
                'merits': parameters.get('merits', 5)
            }
            kmt = calculate_kmt(capsule_data)
            user_address = f"test_address_{admin_user.id}"
            mint_kmt(user_address, kmt)
            capsule.parameters['kmt'] = kmt
            capsule.save()

            # Preservar cápsula en blockchain (para modos eterno, benéfico, o conciencia)
            if mode in ['benéfico', 'conciencia']:
                tx_hash = preserve_capsule(capsule)
                capsule.parameters['blockchain_tx_hash'] = tx_hash
                capsule.save()

            # Crear metadatos para NFT con información de mapa personalizada
            metadata = {
                "name": f"Kudos Capsule {place_name} ({mode.capitalize()})",
                "description": ai_description,
                "attributes": [
                    {"trait_type": "Latitude", "value": lat},
                    {"trait_type": "Longitude", "value": lon},
                    {"trait_type": "Timestamp", "value": int(timezone.now().timestamp())},
                    {"trait_type": "Theme", "value": themes[0]},
                    {"trait_type": "Climatology", "value": climatology},
                    {"trait_type": "MapProvider", "value": "Leaflet"},
                    {"trait_type": "MapLayer", "value": "Custom Kudos Layer"}  # Capa personalizada
                ],
                "external_url": f"https://kudos.io/capsule/{capsule_uid}"
            }

            # Subir metadatos a IPFS
            metadata_json = json.dumps(metadata)
            ipfs_result = ipfs_client.add_str(metadata_json)
            metadata_uri = f"https://ipfs.io/ipfs/{ipfs_result['Hash']}"
            capsule.parameters['ipfs_metadata_uri'] = metadata_uri
            capsule.save()

            # Generar escena AR/VR con mejoras (luces y partículas como en scripts.js)
            ar_vr_scene, height = generate_ar_vr_scene(
                content=ai_description,
                is_vr=True,
                sky_url=street_view_url,
                model_url=get_character_model(themes[0]),
                height=500
            )
            ar_vr_scene = enhance_ar_vr_scene(ar_vr_scene, street_view_url, themes[0])
            capsule.parameters['ar_vr_scene'] = ar_vr_scene
            capsule.save()

            # Generar clip Eco
            capsule_data['images'] = [artwork_image] if artwork_image else []
            eco_url = generate_eco(capsule_data, clip_duration=random.randint(10, 30))
            if eco_url:
                capsule.parameters['eco_url'] = eco_url
                capsule.save()

            # Generar clip multimedia estándar
            generate_clip(capsule)

            # Enviar notificación basada en ubicación (excepto para salud/mental/seguridad)
            if mode not in ['salud', 'mental', 'seguridad']:
                send_location_based_notification(
                    message=f"Nueva cápsula {mode}: {place_name} - {ai_description[:50]}...",
                    location=capsule.ubicacion,
                    distance=notification_distance,
                    priority='media'
                )

            # Crear notificación de actividad para cronología
            Notification.objects.create(
                user=admin_user,
                type='activity_summary',
                message=f"Nueva cápsula {mode} creada: {place_name}.",
                priority='media'
            )

            # Simular transacción para comercio, benéfico, streaming, o suscripción Premium
            if mode in ['comercio', 'benéfico', 'streaming']:
                Transaction.objects.create(
                    uid=f"trans_{admin_user.id}_{index}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    user=admin_user,
                    content_type='capsule' if mode == 'comercio' else 'legacy_donation' if mode == 'benéfico' else 'stream_subscription',
                    content_id=capsule_uid,
                    amount=capsule.price,
                    commission=capsule.price * (commission_rate / 100),
                    timestamp=timezone.now()
                )
            elif random.random() < 0.1:  # Simular suscripción Premium ocasionalmente
                premium_price = 5.0 + random.uniform(-1, 1)
                Transaction.objects.create(
                    uid=f"sub_{admin_user.id}_{index}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    user=admin_user,
                    content_type='premium_subscription',
                    content_id=admin_user.uid,
                    amount=premium_price,
                    commission=premium_price * (commission_rate / 100),
                    timestamp=timezone.now()
                )

            # Generar alerta para salud/mental/seguridad
            if mode == 'salud':
                thresholds = health_config.parameters.get("alert_thresholds", {}).get(parameters['metric'], {})
                if (thresholds.get("min") and parameters['value'] < thresholds["min"]) or \
                   (thresholds.get("max") and parameters['value'] > thresholds["max"]):
                    Alert.objects.create(
                        uid=f"alert_{parameters['metric']}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                        type='health',
                        message=f"Alerta: {parameters['metric']} fuera de rango ({parameters['value']}).",
                        severity='media',
                        location=capsule.ubicacion,
                        timestamp=datetime.now(),
                        expiration=datetime.now() + timedelta(hours=24),
                        parameters={'metric': parameters['metric'], 'value': parameters['value']},
                        variables={'distance': notification_distance}
                    )
            elif mode == 'mental':
                threshold = mh_config.parameters.get("alert_thresholds", {}).get(parameters['mood'], {}).get("max")
                if threshold and parameters['intensity'] > threshold:
                    Alert.objects.create(
                        uid=f"alert_{parameters['mood']}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                        type='mental_health',
                        message=f"Alerta: {parameters['mood']} con intensidad alta ({parameters['intensity']}/10).",
                        severity='media',
                        location=capsule.ubicacion,
                        timestamp=datetime.now(),
                        expiration=datetime.now() + timedelta(hours=24),
                        parameters={'mood': parameters['mood'], 'intensity': parameters['intensity']},
                        variables={'distance': notification_distance}
                    )
            elif mode == 'seguridad':
                Alert.objects.create(
                    uid=f"alert_sos_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    type='sos',
                    message=f"SOS: Alerta en {place_name}.",
                    severity='alta',
                    location=capsule.ubicacion,
                    timestamp=datetime.now(),
                    expiration=datetime.now() + timedelta(hours=1),
                    parameters={'source': 'user'},
                    variables={'distance': notification_distance}
                )

            # Buscar cápsulas relacionadas para tendencias
            related_capsules = search_wisdom_capsules(
                themes=themes,
                location=(lat, lon),
                privacy='publico'
            )
            if related_capsules.exists():
                logging.info(f"Encontradas {related_capsules.count()} cápsulas relacionadas para {place_name}.")

            logging.info(f"Cápsula {mode}, NFT, AR/VR mejorado, clips Eco, notificaciones, KMT ({kmt}) creados para {place_name}: IPFS {metadata_uri}, Tx {tx_hash if mode in ['benéfico', 'conciencia'] else 'N/A'}")
        except Exception as e:
            logging.error(f"Error al generar cápsula para {place_name}: {e}")

def get_places_from_google(center_lat, center_lon, radius=5000, place_type="tourist_attraction"):
    """Busca lugares cercanos usando Google Places API."""
    api_key = settings.GOOGLE_MAPS_API_KEY
    url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={center_lat},{center_lon}&radius={radius}&type={place_type}&key={api_key}"
    places = []
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if data['status'] == 'OK':
            for place in data['results']:
                places.append({
                    'name': place['name'],
                    'lat': place['geometry']['location']['lat'],
                    'lon': place['geometry']['location']['lng'],
                    'description': place.get('vicinity', 'Sin descripción')
                })
    except requests.exceptions.RequestException as e:
        logging.error(f"Error en Google Places API: {e}")
    return places

def get_weather_data(lat, lon):
    """Obtiene datos climáticos usando OpenWeatherMap API."""
    try:
        api_key = settings.OPENWEATHERMAP_API_KEY
        url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return {
            'temperature': data['main']['temp'],
            'condition': data['weather'][0]['description']
        }
    except Exception as e:
        logging.error(f"Error en OpenWeatherMap API: {e}")
        return None

def enrich_capsule_with_unesco(lat, lon):
    """Enriquecer con sitios UNESCO cercanos."""
    sites = get_unesco_sites()
    for site in sites:
        site_lat = site['latitude']
        site_lon = site['longitude']
        if abs(site_lat - lat) < 0.1 and abs(site_lon - lon) < 0.1:
            return site['name_en']
    return None

def get_character_model(theme):
    """Obtiene la URL de un modelo 3D basado en un tema."""
    from kudos_app.utils.ar_vr_utils import get_character_model
    return get_character_model(theme)

def download_unsplash_image(theme, capsule_uid):
    """Descarga una imagen de Unsplash basada en un tema."""
    try:
        url = f"https://api.unsplash.com/search/photos?query={theme}&per_page=1&client_id={settings.UNSPLASH_ACCESS_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if data['results']:
            image_url = data['results'][0]['urls']['regular']
            image_path = os.path.join(IMAGE_DIR, f"{capsule_uid}_{theme}.jpg")
            with requests.get(image_url, stream=True) as r:
                with open(image_path, 'wb') as f:
                    shutil.copyfileobj(r.raw, f)
            return image_path
        return None
    except Exception as e:
        logging.error(f"Error al descargar imagen de Unsplash para {theme}: {e}")
        return None

def generate_clip(capsule):
    """Genera un clip multimedia estándar para la cápsula."""
    try:
        content = capsule.contenido[:200]
        if not content:
            logging.error(f"Cápsula {capsule.uid} no tiene contenido.")
            return

        # Generar audio con gTTS
        tts = gTTS(text=content, lang='en')
        audio_path = os.path.join(CLIP_DIR, f"{capsule.uid}_audio.mp3")
        tts.save(audio_path)

        # Descargar imagen de Unsplash
        image_path = None
        for theme in capsule.temas:
            image_path = download_unsplash_image(theme.lower(), capsule.uid)
            if image_path:
                break
        if not image_path:
            logging.error(f"No se encontró imagen para los temas de la cápsula {capsule.uid}.")
            return

        # Crear clip de video
        audio_clip = AudioFileClip(audio_path)
        duration = min(audio_clip.duration, 60)
        image_clip = ImageClip(image_path, duration=duration)
        video_clip = image_clip.set_audio(audio_clip)

        # Guardar clip
        clip_path = os.path.join(CLIP_DIR, f"{capsule.uid}_clip.mp4")
        video_clip.write_videofile(clip_path, fps=24, codec='libx264')

        # Actualizar cápsula
        capsule.clip_path = clip_path
        capsule.save()

        # Limpiar archivos temporales
        audio_clip.close()
        video_clip.close()
        os.remove(audio_path)
        os.remove(image_path)

        logging.info(f"Clip estándar generado para cápsula {capsule.uid}: {clip_path}")
    except Exception as e:
        logging.error(f"Error al generar clip estándar para cápsula {capsule.uid}: {e}")

def enhance_ar_vr_scene(scene, sky_url, theme):
    """Mejora una escena AR/VR con luces y partículas, como en scripts.js."""
    # Añadir luces ambientales y direccionales
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    
    # Añadir partículas para un efecto inmersivo
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 200; velocityValue: 0 0 -5"></a-entity>'

    # Construir la escena mejorada
    narrative = f"Explora {theme} en esta experiencia inmersiva."
    model_url = get_character_model(theme)
    enhanced_scene = f"""
    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
    <a-scene embedded vr-mode-ui="enabled: true">
        <a-sky src="{sky_url}"></a-sky>
        <a-entity
            gltf-model="{model_url}"
            position="0 0 -5"
            scale="0.5 0.5 0.5"
            animation="property: rotation; to: 0 360 0; loop: true; dur: 10000"
        ></a-entity>
        <a-text
            value="{narrative}"
            position="0 1.5 -5"
            align="center"
            color="white"
            width="4"
        ></a-text>
        {ambient_light}
        {directional_light}
        {particles}
        <a-camera position="0 1.6 0"></a-camera>
    </a-scene>
    """
    return enhanced_scene
```