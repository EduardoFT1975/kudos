# kudos_app/utils/capsules.generator.py

import sys
import os
import os
os.environ['GDAL_LIBRARY_PATH'] = r'C:\Users\efert\anaconda3\envs\kudos\Library\bin\gdal.dll'
# Añade el directorio raíz del proyecto al sys.path
sys.path.append(r'C:\Users\efert\kudos_project')
from kudos_app.utils.unesco_utils import get_unesco_sites
def get_unesco_sites():
    # Código para obtener sitios de la UNESCO
    pass
import django
import requests
import logging
import sys

# Resto de tu código aquí
from datetime import datetime

# Configurar logging
logging.basicConfig(filename='/app/capsule_generation.log', level=logging.INFO)

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kudos_project.settings')

# Asegurarse de que Django se inicialice completamente
try:
    django.setup()
    from django.apps import apps
    # Verificar que las aplicaciones estén cargadas
    if not apps.ready:
        raise Exception("Django apps are not loaded after setup.")
except Exception as e:
    logging.error(f"Error al inicializar Django: {str(e)}")
    raise

# Importar modelos después de inicializar Django
from django.conf import settings
from kudos_app.models import Capsule, User
from kudos_app.utils.unesco_utils import get_unesco_sites
from kudos_app.utils.museum_utils import get_met_artworks
from kudos_app.utils.google_maps_utils import (
    get_elevation,
    get_street_view,
    get_time_zone
)
from django.contrib.gis.geos import Point
from django.utils import timezone

def get_places_from_google(center_lat, center_lon, radius=5000, place_type="tourist_attraction"):
    """
    Busca lugares cercanos usando Google Places API.

    Args:
        center_lat (float): Latitud del centro de búsqueda (e.g., Madrid: 40.4168).
        center_lon (float): Longitud del centro de búsqueda (e.g., Madrid: -3.7038).
        radius (int): Radio de búsqueda en metros (default: 5000).
        place_type (str): Tipo de lugar a buscar (e.g., "tourist_attraction", "museum").

    Returns:
        list: Lista de lugares con nombre, latitud, longitud y descripción.
    """
    api_key = settings.GOOGLE_MAPS_API_KEY
    url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={center_lat},{center_lon}&radius={radius}&type={place_type}&key={api_key}"
    places = []

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        if data['status'] == 'OK':
            for place in data['results']:
                name = place['name']
                lat = place['geometry']['location']['lat']
                lon = place['geometry']['location']['lng']
                description = place.get('vicinity', 'Sin descripción')
                places.append({
                    'name': name,
                    'lat': lat,
                    'lon': lon,
                    'description': description
                })
        else:
            logging.error(f"Error al obtener datos de Google Places: {data['status']}")
    except requests.exceptions.RequestException as e:
        logging.error(f"Error en la solicitud a Google Places API: {e}")

    return places

def generate_capsules(center_lat=40.4168, center_lon=-3.7038, place_type="tourist_attraction", max_places=50):
    """
    Genera cápsulas masivas a partir de datos obtenidos de Google Places API.

    Args:
        center_lat (float): Latitud del centro de búsqueda (default: Madrid).
        center_lon (float): Longitud del centro de búsqueda (default: Madrid).
        place_type (str): Tipo de lugar a buscar (default: "tourist_attraction").
        max_places (int): Número máximo de lugares a procesar (default: 50).
    """
    logging.info("Iniciando generación de cápsulas masivas...")

    try:
        admin_user = User.objects.get(alias='Administrador')
    except User.DoesNotExist:
        logging.error("Usuario 'admin' no encontrado.")
        return

    # Obtener lugares desde Google Places
    places = get_places_from_google(center_lat, center_lon, place_type=place_type)

    if not places:
        logging.warning("No se encontraron lugares para procesar.")
        return

    # Limitar el número de lugares a procesar
    places = places[:max_places]

    for index, place in enumerate(places):
        try:
            lat = place['lat']
            lon = place['lon']
            place_name = place['name']
            description = place['description']

            # Obtener datos adicionales
            elevation = get_elevation(lat, lon)
            time_zone = get_time_zone(lat, lon)
            street_view_url = get_street_view(lat, lon)
            unesco_site = enrich_capsule_with_unesco(lat, lon)
            artwork_title, artwork_image = get_met_artworks(place_name)

            # Crear la cápsula
            capsule = Capsule(
                uid=f"capsule_{admin_user.id}_{index}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                usuario=admin_user,
                contenido=description,
                ubicacion=Point(lon, lat),
                modo='publico',
                fecha=datetime.now().date(),
                privacy='publico',
                time_scale='dia',
                price=0.0,
                temas=[place_name],
                parameters={
                    'elevation': elevation,
                    'time_zone': time_zone,
                    'street_view_url': street_view_url,
                    'unesco_site': unesco_site,
                    'artwork_title': artwork_title,
                    'artwork_image': artwork_image
                },
                variables={'notification_range': 500},
                timestamp=timezone.now()  # Usar timezone.now() para evitar advertencias
            )
            capsule.save()
            logging.info(f"Cápsula creada para {place_name}")
        except Exception as e:
            logging.error(f"Error al generar cápsula para {place_name}: {e}")

def enrich_capsule_with_unesco(lat, lon):
    """
    Enriquecer la cápsula con información de la UNESCO si hay un sitio cercano.
    """
    sites = get_unesco_sites()
    for site in sites:
        site_lat = site['latitude']
        site_lon = site['longitude']
        if abs(site_lat - lat) < 0.1 and abs(site_lon - lon) < 0.1:
            return site['name_en']
    return None

if __name__ == "__main__":
    # Generar cápsulas para atracciones turísticas en Madrid
    generate_capsules(center_lat=40.4168, center_lon=-3.7038, place_type="tourist_attraction", max_places=50)