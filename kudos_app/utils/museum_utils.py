# kudos_app/utils/museum_utils.py.py

import requests

def get_met_artworks(search_term):
    """
    Busca obras de arte en la colección del Metropolitan Museum of Art (MET) relacionadas con un término específico.

    Esta función realiza una solicitud a la API del MET para buscar obras de arte que coincidan con el término de búsqueda proporcionado.
    Si se encuentran resultados, devuelve el título y la URL de la imagen de la primera obra encontrada. Si no hay resultados o ocurre un error,
    devuelve None para ambos valores.

    Args:
        search_term (str): El término de búsqueda para encontrar obras de arte relacionadas (e.g., nombre de un lugar, tema, etc.).

    Returns:
        tuple: Un tuple que contiene el título de la obra (str) y la URL de la imagen (str) si se encuentra una obra,
               o (None, None) si no hay resultados o ocurre un error.

    Raises:
        Exception: Si ocurre un error durante la solicitud a la API, como problemas de conexión o respuestas no válidas.
    """
    try:
        # Realizar la solicitud de búsqueda
        search_url = f"https://collectionapi.metmuseum.org/public/collection/v1/search?q={search_term}"
        search_response = requests.get(search_url)
        search_response.raise_for_status()  # Lanza una excepción si la respuesta no es 200 OK
        search_data = search_response.json()

        # Verificar si hay resultados
        if 'objectIDs' in search_data and search_data['objectIDs']:
            object_id = search_data['objectIDs'][0]  # Tomar el primer resultado
            # Obtener detalles de la obra
            details_url = f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}"
            details_response = requests.get(details_url)
            details_response.raise_for_status()
            details_data = details_response.json()
            title = details_data.get('title', 'Sin título')
            image_url = details_data.get('primaryImage', None)
            return title, image_url
        else:
            return None, None
    except requests.exceptions.RequestException as e:
        raise Exception(f"Error al obtener datos del MET: {e}")