# kudos_app/utils/__init__.py

"""
Paquete de utilidades para el proyecto Kudos.
Proporciona funciones comunes para geolocalización, manejo de datos y más.
"""

from django.contrib.gis.geos import Point
from datetime import datetime
import json
import requests

# Exponer funciones específicas si existen módulos en utils/
# Ejemplo: from .geo_utils import calculate_distance
# Por ahora, definimos funciones básicas directamente aquí

def get_point(lat, lon):
    """
    Crea un objeto Point a partir de coordenadas de latitud y longitud.
    """
    return Point(lon, lat)

def parse_json_data(data):
    """
    Parsea datos JSON de forma segura, manejando excepciones.
    """
    try:
        return json.loads(data) if isinstance(data, str) else data
    except json.JSONDecodeError as e:
        return {"error": f"Error parsing JSON: {e}"}

def fetch_external_data(url, params=None):
    """
    Obtiene datos de una API externa con manejo básico de errores.
    """
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": f"Error fetching data: {e}"}

def format_timestamp(timestamp):
    """
    Formatea un timestamp en un string legible.
    """
    if isinstance(timestamp, str):
        timestamp = datetime.fromisoformat(timestamp)
    return timestamp.strftime('%Y-%m-%d %H:%M:%S')

# Definir qué se expone al importar el paquete
__all__ = ['get_point', 'parse_json_data', 'fetch_external_data', 'format_timestamp']