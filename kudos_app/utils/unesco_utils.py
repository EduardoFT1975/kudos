# kudos_app/utils/unesco_utils.py

import requests

def get_unesco_sites():
    """
    Obtiene la lista de sitios del Patrimonio Mundial de la UNESCO.

    Esta función realiza una solicitud GET a la API de la UNESCO y devuelve
    una lista de sitios en formato JSON. Cada sitio incluye información como
    el nombre, las coordenadas geográficas y otros detalles relevantes.

    Returns:
        list: Una lista de diccionarios, donde cada diccionario representa un sitio
              del Patrimonio Mundial con sus respectivos datos.

    Raises:
        Exception: Si ocurre un error durante la solicitud a la API, como problemas
                   de conexión o respuestas no válidas.
    """
    url = "https://whc.unesco.org/en/list/json"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise Exception(f"Error al obtener datos de la UNESCO: {e}")