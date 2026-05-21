import requests
import logging
import csv

def fetch_museums_from_google_arts(api_key):
    logging.info("Obteniendo datos de museos desde Google Arts & Culture...")
    url = f"https://arts.googleapis.com/v1/collections?key={api_key}&fields=nextPageToken,collections.name,collections.location"
    museums = []
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        for collection in data.get('collections', []):
            location = collection.get('location', {})
            museums.append({
                "name": collection.get('name', "Museo Desconocido"),
                "lat": location.get('lat', random.uniform(-90, 90)),
                "lon": location.get('lon', random.uniform(-180, 180)),
                "themes": ["Cultura", "Museo"],
                "date": "1900-01-01",
                "image_url": None,
                "source": "Google Arts",
                "modo": "histórico"
            })
        logging.info("Museos obtenidos: %d", len(museums))
    except Exception as e:
        logging.error("Error al obtener museos: %s", e)
    return museums

def fetch_unesco_sites():
    logging.info("Obteniendo sitios UNESCO desde CSV...")
    unesco_file = "C:/Users/efert/kudos_project/data/unesco_sites.csv"
    sites = []
    try:
        with open(unesco_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader)  # Saltar encabezado
            for row in reader:
                if len(row) >= 4:
                    name, lat, lon, description = row[0], float(row[1]), float(row[2]), row[3]
                    sites.append({
                        "name": name,
                        "lat": lat,
                        "lon": lon,
                        "themes": ["Cultura", "Historia", "UNESCO"],
                        "date": "1900-01-01",
                        "image_url": None,
                        "source": "UNESCO",
                        "modo": "histórico",
                        "text": description
                    })
        logging.info("Sitios UNESCO obtenidos: %d", len(sites))
    except Exception as e:
        logging.error("Error al obtener sitios UNESCO: %s", e)
    return sites

def fetch_image_from_commons(title):
    commons_url = f"https://commons.wikimedia.org/w/api.php?action=query&titles={title}&prop=images&imlimit=1&format=json"
    try:
        response = requests.get(commons_url, timeout=5)
        response.raise_for_status()
        data = response.json()
        for page_id in data['query']['pages']:
            if 'images' in data['query']['pages'][page_id]:
                image_title = data['query']['pages'][page_id]['images'][0]['title'].replace("File:", "")
                return f"https://commons.wikimedia.org/wiki/Special:Redirect/file/{image_title}&width=300"
    except Exception as e:
        logging.debug("Error al obtener imagen de Wikimedia: %s", e)
    return None

def fetch_audio_from_freesound(query, token):
    url = f"https://freesound.org/apiv2/search/text/?query={query}&token={token}&fields=id,name,previews&format=json"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        if 'results' in data and data['results']:
            return data['results'][0]['previews']['preview-hq-mp3']
        return None
    except Exception as e:
        logging.debug("Error al obtener audio de Freesound: %s", e)
        return None