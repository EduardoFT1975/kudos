# kudos_app/utils/google_maps_utils.py

import requests
from django.conf import settings

try:
    API_KEY = settings.GOOGLE_MAPS_API_KEY
except AttributeError:
    API_KEY = None

def geocode_address(address):
    """
    Convierte una dirección en coordenadas geográficas (latitud y longitud).

    Args:
        address (str): La dirección a geocodificar.

    Returns:
        tuple: (latitud, longitud) si la geocodificación es exitosa, (None, None) en caso contrario.
    """
    if not API_KEY:
        raise ValueError("La clave API de Google Maps no está configurada. Por favor, configura GOOGLE_MAPS_API_KEY en el archivo .env.")
    url = f"https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={API_KEY}"
    response = requests.get(url).json()
    if response['status'] == 'OK':
        location = response['results'][0]['geometry']['location']
        return location['lat'], location['lng']
    return None, None

def get_elevation(lat, lon):
    """
    Obtiene la elevación de una ubicación dada por sus coordenadas.

    Args:
        lat (float): Latitud de la ubicación.
        lon (float): Longitud de la ubicación.

    Returns:
        float: Elevación en metros, o None si no se puede obtener.
    """
    if not API_KEY:
        raise ValueError("La clave API de Google Maps no está configurada. Por favor, configura GOOGLE_MAPS_API_KEY en el archivo .env.")
    url = f"https://maps.googleapis.com/maps/api/elevation/json?locations={lat},{lon}&key={API_KEY}"
    response = requests.get(url).json()
    if response['status'] == 'OK':
        return response['results'][0]['elevation']
    return None

def get_place_details(place_name):
    """
    Obtiene detalles de un lugar a partir de su nombre.

    Args:
        place_name (str): Nombre del lugar a buscar.

    Returns:
        dict: Detalles del lugar si se encuentra, None en caso contrario.
    """
    if not API_KEY:
        raise ValueError("La clave API de Google Maps no está configurada. Por favor, configura GOOGLE_MAPS_API_KEY en el archivo .env.")
    url = f"https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input={place_name}&inputtype=textquery&fields=formatted_address,name,geometry&key={API_KEY}"
    response = requests.get(url).json()
    if response['status'] == 'OK':
        return response['candidates'][0]
    return None

def get_directions(start, end):
    """
    Obtiene las direcciones entre dos puntos.

    Args:
        start (str): Dirección de inicio.
        end (str): Dirección de destino.

    Returns:
        str: Puntos de la polilínea codificada si la solicitud es exitosa, None en caso contrario.
    """
    if not API_KEY:
        raise ValueError("La clave API de Google Maps no está configurada. Por favor, configura GOOGLE_MAPS_API_KEY en el archivo .env.")
    url = f"https://maps.googleapis.com/maps/api/directions/json?origin={start}&destination={end}&mode=walking&key={API_KEY}"
    response = requests.get(url).json()
    if response['status'] == 'OK':
        return response['routes'][0]['overview_polyline']['points']
    return None

def snap_to_roads(path):
    """
    Ajusta una serie de puntos a las carreteras más cercanas.

    Args:
        path (str): Puntos separados por "|" (e.g., "lat1,lng1|lat2,lng2").

    Returns:
        list: Puntos ajustados si la solicitud es exitosa, None en caso contrario.
    """
    if not API_KEY:
        raise ValueError("La clave API de Google Maps no está configurada. Por favor, configura GOOGLE_MAPS_API_KEY en el archivo .env.")
    url = f"https://roads.googleapis.com/v1/snapToRoads?path={path}&interpolate=true&key={API_KEY}"
    response = requests.get(url).json()
    if 'snappedPoints' in response:
        return response['snappedPoints']
    return None

def get_street_view(lat, lon, size="600x300", heading=0, pitch=0):
    """
    Obtiene una imagen de Street View para una ubicación dada.

    Args:
        lat (float): Latitud de la ubicación.
        lon (float): Longitud de la ubicación.
        size (str): Tamaño de la imagen (e.g., "600x300").
        heading (int): Dirección en grados (0-360).
        pitch (int): Ángulo de inclinación (-90 a 90).

    Returns:
        str: URL de la imagen de Street View.
    """
    if not API_KEY:
        raise ValueError("La clave API de Google Maps no está configurada. Por favor, configura GOOGLE_MAPS_API_KEY en el archivo .env.")
    url = f"https://maps.googleapis.com/maps/api/streetview?size={size}&location={lat},{lon}&heading={heading}&pitch={pitch}&key={API_KEY}"
    return url

def get_time_zone(lat, lon):
    """
    Obtiene la zona horaria de una ubicación dada.

    Args:
        lat (float): Latitud de la ubicación.
        lon (float): Longitud de la ubicación.

    Returns:
        str: ID de la zona horaria (e.g., "America/New_York"), o None si no se puede obtener.
    """
    if not API_KEY:
        raise ValueError("La clave API de Google Maps no está configurada. Por favor, configura GOOGLE_MAPS_API_KEY en el archivo .env.")
    from datetime import datetime
    timestamp = int(datetime.now().timestamp())
    url = f"https://maps.googleapis.com/maps/api/timezone/json?location={lat},{lon}×tamp={timestamp}&key={API_KEY}"
    response = requests.get(url).json()
    if response['status'] == 'OK':
        return response['timeZoneId']
    return None