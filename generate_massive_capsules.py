```python
# kudos_app/scripts/generate_massive_capsules.py
import random
import time
import json
import ipfshttpclient
from datetime import datetime
from multiprocessing import Pool
import xml.etree.ElementTree as ET
import requests
import netCDF4 as nc
import numpy as np
import osmium
import os
import logging
import csv
import hashlib

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("C:/Users/efert/kudos_project/capsule_generation.log"),
        logging.StreamHandler()
    ]
)

THEMES = ["Historia", "Cultura", "Turismo", "Educación", "Ciencia", "Tecnología", "Geografía", "Sociedad", "Deportes", "Naturaleza", "Gastronomía", "Hospedaje"]
WEATHER = ["Soleado", "Nublado", "Lluvioso", "Nevado"]

def load_era5_data(file_path):
    logging.info("Cargando datos climáticos de ERA5 desde %s", file_path)
    dataset = nc.Dataset(file_path)
    latitudes = dataset.variables['latitude'][:]
    longitudes = dataset.variables['longitude'][:]
    times = dataset.variables['valid_time'][:]
    temperature = dataset.variables['t2m'][:]
    logging.info("Datos climáticos cargados exitosamente")
    return latitudes, longitudes, times, temperature

def get_weather_data(lat, lon, date, era5_data):
    latitudes, longitudes, times, temperature = era5_data
    lat_idx = np.abs(latitudes - lat).argmin()
    lon_idx = np.abs(longitudes - lon).argmin()
    time_idx = 0
    lat_idx = min(lat_idx, temperature.shape[1] - 1)
    lon_idx = min(lon_idx, temperature.shape[2] - 1)
    temp = temperature[time_idx, lat_idx, lon_idx] - 273.15
    return {"weather": random.choice(WEATHER), "temperature": float(temp)}

def extract_wiki_articles(file_path, max_articles=500000):
    logging.info("Iniciando extracción de artículos de Wikipedia desde %s", file_path)
    articles = []
    count = 0
    try:
        with open(file_path, 'rb') as file:
            context = ET.iterparse(file, events=("start", "end"))
            context = iter(context)
            event, root = next(context)
            for event, elem in context:
                if event == "end" and elem.tag.endswith("page"):
                    title_elem = elem.find(".//title")
                    text_elem = elem.find(".//text")
                    if title_elem is not None and text_elem is not None:
                        title = title_elem.text
                        text = text_elem.text[:200] if text_elem.text else ""
                        articles.append({"title": title, "text": text})
                        count += 1
                        if count % 10000 == 0:
                            logging.info("Artículos procesados: %d/%d", count, max_articles)
                        if count >= max_articles:
                            break
                    root.clear()
    except ET.ParseError as e:
        logging.error("Error de parsing XML: %s", str(e))
    except MemoryError:
        logging.error("Error de memoria al procesar el archivo XML")
    except Exception as e:
        logging.error("Error al extraer artículos: %s", str(e))
    logging.info("Extracción completada: %d artículos", count)
    return articles

class POIHandler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.pois = []
        self.node_count = 0

    def node(self, n):
        self.node_count += 1
        if self.node_count % 10000 == 0:
            logging.info("Nodos procesados: %d", self.node_count)

        tags = n.tags
        poi_categories = {
            "museum": ["Cultura", "Historia"],
            "monument": ["Cultura", "Historia"],
            "archaeological_site": ["Historia"],
            "historic": ["Historia"],
            "memorial": ["Historia"],
            "artwork": ["Cultura"],
            "theatre": ["Cultura"],
            "library": ["Cultura", "Educación"],
            "observatory": ["Ciencia"],
            "planetarium": ["Ciencia"],
            "research_institute": ["Ciencia", "Tecnología"],
            "university": ["Educación", "Ciencia"],
            "park": ["Naturaleza"],
            "nature_reserve": ["Naturaleza"],
            "forest": ["Naturaleza"],
            "mountain": ["Geografía", "Naturaleza"],
            "river": ["Geografía", "Naturaleza"],
            "lake": ["Geografía", "Naturaleza"],
            "waterfall": ["Geografía", "Naturaleza"],
            "beach": ["Geografía", "Naturaleza"],
            "viewpoint": ["Geografía", "Turismo"],
            "place_of_worship": ["Sociedad"],
            "community_centre": ["Sociedad"],
            "social_facility": ["Sociedad"],
            "townhall": ["Sociedad"],
            "stadium": ["Deportes"],
            "sports_centre": ["Deportes"],
            "pitch": ["Deportes"],
            "golf_course": ["Deportes"],
            "swimming_pool": ["Deportes"],
            "attraction": ["Turismo"],
            "tourist_information": ["Turismo"],
            "zoo": ["Turismo", "Naturaleza"],
            "theme_park": ["Turismo"],
            "restaurant": ["Gastronomía"],
            "cafe": ["Gastronomía"],
            "bar": ["Gastronomía"],
            "pub": ["Gastronomía"],
            "fast_food": ["Gastronomía"],
            "hotel": ["Hospedaje"],
            "hostel": ["Hospedaje"],
            "guest_house": ["Hospedaje"],
            "motel": ["Hospedaje"],
            "railway_station": ["Transporte"],
            "airport": ["Transporte"],
            "bus_station": ["Transporte"],
            "hospital": ["Salud"],
            "school": ["Educación"],
            "marketplace": ["Comercio"],
            "shop": ["Comercio"],
            "office": ["Negocios"]
        }

        poi_type = None
        themes = []
        if "tourism" in tags:
            poi_type = tags.get("tourism")
            if poi_type in poi_categories:
                themes = poi_categories[poi_type]
        elif "amenity" in tags:
            poi_type = tags.get("amenity")
            if poi_type in poi_categories:
                themes = poi_categories[poi_type]
        elif "leisure" in tags:
            poi_type = tags.get("leisure")
            if poi_type in poi_categories:
                themes = poi_categories[poi_type]
        elif "natural" in tags:
            poi_type = tags.get("natural")
            if poi_type in poi_categories:
                themes = poi_categories[poi_type]
        elif "historic" in tags:
            poi_type = tags.get("historic")
            if poi_type in poi_categories:
                themes = poi_categories[poi_type]
        elif "building" in tags and tags.get("building") == "yes":
            if "office" in tags:
                poi_type = "office"
                themes = poi_categories.get("office", [])
            elif "shop" in tags:
                poi_type = "shop"
                themes = poi_categories.get("shop", [])

        if poi_type and themes:
            name = tags.get("name", f"POI {n.id}")
            date = tags.get("date", "2025-06-03" if "tourism" in tags or "amenity" in tags else "1900-01-01")
            image_url = tags.get("image", None)
            self.pois.append({
                "name": name,
                "lat": n.location.lat,
                "lon": n.location.lon,
                "themes": themes,
                "date": date,
                "image_url": image_url
            })

def fetch_osm_pois():
    osm_files = [
        "data\\europe-latest.osm.pbf",
        "data\\russia-latest.osm.pbf",
        "data\\africa-latest.osm.pbf",
        "data\\asia-latest.osm.pbf",
        "data\\australia-oceania-latest.osm.pbf",
        "data\\central-america-latest.osm.pbf",
        "data\\north-america-latest.osm.pbf",
        "data\\south-america-latest.osm.pbf",
        "data\\antarctica-latest.osm.pbf"
    ]
    handler = POIHandler()
    for osm_file in osm_files:
        logging.info("Procesando archivo OSM: %s", osm_file)
        handler.apply_file(osm_file)
        logging.info("POIs encontrados: %d", len(handler.pois))
    logging.info("Total de POIs extraídos: %d", len(handler.pois))
    return handler.pois

def fetch_museums_from_google_places(api_key):
    logging.info("Obteniendo datos de museos desde Google Places...")
    museums = []
    try:
        # Lista de regiones para búsqueda global (simplificado)
        regions = [
            "Europe", "Asia", "North America", "South America", "Africa",
            "Australia", "Antarctica"
        ]
        for region in regions:
            url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query=museum+in+{region}&type=museum&key={api_key}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            for place in data.get('results', []):
                location = place.get('geometry', {}).get('location', {})
                museums.append({
                    "name": place.get('name', "Museo Desconocido"),
                    "lat": location.get('lat', random.uniform(-90, 90)),
                    "lon": location.get('lng', random.uniform(-180, 180)),
                    "themes": ["Cultura", "Museo"],
                    "date": "1900-01-01",
                    "image_url": place.get('photos', [{}])[0].get('photo_reference', None),
                    "source": "Google Places",
                    "modo": "histórico",
                    "text": place.get('formatted_address', "Sin descripción")
                })
            # Manejar paginación
            while 'next_page_token' in data:
                time.sleep(2)  # Esperar para que el token sea válido
                url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken={data['next_page_token']}&key={api_key}"
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                data = response.json()
                for place in data.get('results', []):
                    location = place.get('geometry', {}).get('location', {})
                    museums.append({
                        "name": place.get('name', "Museo Desconocido"),
                        "lat": location.get('lat', random.uniform(-90, 90)),
                        "lon": location.get('lng', random.uniform(-180, 180)),
                        "themes": ["Cultura", "Museo"],
                        "date": "1900-01-01",
                        "image_url": place.get('photos', [{}])[0].get('photo_reference', None),
                        "source": "Google Places",
                        "modo": "histórico",
                        "text": place.get('formatted_address', "Sin descripción")
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
            next(reader)
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

def download_image(url, title, cache_dir="C:/Users/efert/kudos_project/images"):
    if url and 'photo_reference' in url:
        api_key = os.getenv('GOOGLE_PLACES_API_KEY', 'your_google_api_key')
        url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={url}&key={api_key}"
    cache_file = os.path.join(cache_dir, f"{hashlib.md5(title.encode()).hexdigest()}.jpg")
    if os.path.exists(cache_file):
        try:
            with ipfshttpclient.connect() as client:
                cid = client.add(cache_file)["Hash"]
            return cid
        except Exception as e:
            logging.debug("Error al cargar imagen desde caché: %s", e)
    if url:
        try:
            response = requests.get(url, stream=True, timeout=5)
            response.raise_for_status()
            with open(cache_file, "wb") as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            with ipfshttpclient.connect() as client:
                cid = client.add(cache_file)["Hash"]
            return cid
        except Exception as e:
            logging.debug("Error al descargar imagen de OSM/Google: %s", e)
    # Fallback a Wikimedia Commons
    commons_url = f"https://commons.wikimedia.org/w/api.php?action=query&titles={title}&prop=images&imlimit=1&format=json"
    try:
        response = requests.get(commons_url, timeout=5)
        response.raise_for_status()
        data = response.json()
        for page_id in data['query']['pages']:
            if 'images' in data['query']['pages'][page_id]:
                image_title = data['query']['pages'][page_id]['images'][0]['title'].replace("File:", "")
                image_url = f"https://commons.wikimedia.org/wiki/Special:Redirect/file/{image_title}&width=300"
                response = requests.get(image_url, stream=True, timeout=5)
                response.raise_for_status()
                with open(cache_file, "wb") as f:
                    for chunk in response.iter_content(1024):
                        f.write(chunk)
                with ipfshttpclient.connect() as client:
                    cid = client.add(cache_file)["Hash"]
                return cid
    except Exception as e:
        logging.debug("Error al descargar imagen de Wikimedia: %s", e)
    return None

def download_audio(url, cache_dir="C:/Users/efert/kudos_project/clips"):
    if not url:
        return None
    cache_file = os.path.join(cache_dir, f"{hashlib.md5(url.encode()).hexdigest()}.mp3")
    if os.path.exists(cache_file):
        try:
            with ipfshttpclient.connect() as client:
                cid = client.add(cache_file)["Hash"]
            return cid
        except Exception as e:
            logging.debug("Error al cargar audio desde caché: %s", e)
    try:
        response = requests.get(url, stream=True, timeout=5)
        response.raise_for_status()
        with open(cache_file, "wb") as f:
            for chunk in response.iter_content(1024):
                f.write(chunk)
        with ipfshttpclient.connect() as client:
            cid = client.add(cache_file)["Hash"]
        return cid
    except Exception as e:
        logging.debug("Error al descargar audio: %s", e)
        return None

def fetch_audio_from_freesound(query):
    FREESOUND_TOKEN = os.getenv('FREESOUND_TOKEN', 'your_freesound_token')
    url = f"https://freesound.org/apiv2/search/text/?query={query}&token={FREESOUND_TOKEN}&fields=id,name,previews&format=json"
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

def fetch_wiki_museum_description(title):
    url = f"https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles={title}&format=json"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        for page_id in data['query']['pages']:
            if 'extract' in data['query']['pages'][page_id]:
                return data['query']['pages'][page_id]['extract'][:200]
        return None
    except Exception as e:
        logging.debug("Error al obtener descripción de Wikipedia: %s", e)
        return None

def generate_capsule(data, era5_data, counter=None, total=None):
    lat = data.get("lat", random.uniform(-90, 90))
    lon = data.get("lon", random.uniform(-180, 180))
    weather = get_weather_data(lat, lon, data.get("date", "1900-01-01"), era5_data)
    title = data.get('name', data.get('title', 'Lugar Desconocido'))
    # Obtener descripción de Wikipedia para museos si está disponible
    description = data.get("text", None)
    if data.get("source") == "Google Places" and not description:
        description = fetch_wiki_museum_description(title) or f"{title}: Un lugar emblemático."
    image_cid = download_image(data.get("image_url"), title)
    audio_url = fetch_audio_from_freesound(f"{title} sound")
    audio_cid = download_audio(audio_url) if audio_url else None
    capsule_data = {
        "uid": f"capsule_{int(time.time())}_{random.randint(1000, 9999)}",
        "contenido": description or f"{title}: Un lugar emblemático.",
        "ubicacion": {"lat": lat, "lon": lon},
        "modo": data.get("modo", "histórico"),
        "fecha": data.get("date", "1900-01-01"),
        "privacy": "publico",
        "time_scale": "dia",
        "temas": data.get("themes", [random.choice(THEMES)]),
        "parameters": {"weather_data": weather},
        "timestamp": datetime.now().isoformat(),
        "source": data.get("source", "OpenStreetMap"),
        "image": image_cid,
        "audio": audio_cid
    }
    try:
        with ipfshttpclient.connect() as client:
            capsule_json = json.dumps(capsule_data)
            cid = client.add_str(capsule_json)
            if counter is not None and total is not None:
                counter[0] += 1
                if counter[0] % 1000 == 0:
                    logging.info("Cápsulas generadas: %d/%d", counter[0], total)
            logging.info("Cápsula generada con CID: %s", cid)
            return cid
    except Exception as e:
        logging.error("Error al generar cápsula: %s", e)
        return None

def generate_capsule_wrapper(args):
    data, era5_data, counter, total = args
    return generate_capsule(data, era5_data, counter, total)

def save_to_json(data, filename):
    logging.info("Guardando datos en %s", filename)
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    logging.info("Datos guardados en %s", filename)

def load_from_json(filename):
    if os.path.exists(filename):
        logging.info("Cargando datos desde %s", filename)
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        logging.info("Datos cargados desde %s: %d elementos", filename, len(data))
        return data
    logging.info("No se encontró %s, se generarán nuevos datos", filename)
    return None

def generate_massive_capsules():
    logging.info("Iniciando generación de cápsulas masivas")
    print("Cargando datos climáticos de ERA5...")
    era5_data = load_era5_data("C:/Users/efert/kudos_project/data/d2793ab40c06f53eb28118920ea778b8.nc")

    # Cargar o extraer POIs de OSM
    osm_data_file = "C:/Users/efert/kudos_project/data/osm_data.json"
    osm_data = load_from_json(osm_data_file)
    if osm_data is None:
        print("Extrayendo POIs de OpenStreetMap...")
        osm_pois = fetch_osm_pois()
        osm_data = [{"name": poi["name"], "lat": poi["lat"], "lon": poi["lon"], "themes": poi["themes"], "date": poi["date"], "image_url": poi["image_url"], "source": "OpenStreetMap", "modo": "histórico" if poi["date"] != "2025-06-03" else "premium"} for poi in osm_pois]
        save_to_json(osm_data, osm_data_file)

    # Cargar o extraer artículos de Wikipedia
    wiki_data_file = "C:/Users/efert/kudos_project/data/wiki_data.json"
    wiki_data = load_from_json(wiki_data_file)
    if wiki_data is None:
        print("Extrayendo artículos de Wikipedia...")
        wiki_articles = extract_wiki_articles("C:/Users/efert/kudos_project/data/enwiki-subset.xml")
        wiki_data = [{"text": f"{article['title']}: {article['text']}", "themes": [random.choice(THEMES)], "source": "Wikipedia", "modo": "histórico"} for article in wiki_articles]
        save_to_json(wiki_data, wiki_data_file)

    # Cargar datos de museos y UNESCO
    api_key = os.getenv('GOOGLE_PLACES_API_KEY', 'your_google_api_key')
    museums_data = fetch_museums_from_google_places(api_key)
    unesco_data = fetch_unesco_sites()

    all_data = osm_data + wiki_data + museums_data + unesco_data
    print(f"Total de datos para generar cápsulas: {len(all_data)}")
    logging.info("Total de datos para generar cápsulas: %d", len(all_data))

    # Procesar en lotes de 10,000 cápsulas
    batch_size = 10000
    counter = [0]
    total = len(all_data)
    for i in range(0, len(all_data), batch_size):
        batch_data = all_data[i:i + batch_size]
        print(f"Generando lote de {len(batch_data)} cápsulas (lote {i//batch_size + 1})...")
        logging.info("Generando lote de %d cápsulas (lote %d)", len(batch_data), i//batch_size + 1)
        with Pool(processes=8) as pool:
            results = pool.starmap(generate_capsule_wrapper, [((d, era5_data, counter, total),) for d in batch_data])
        logging.info("CIDs generados en este lote: %s", [cid for cid in results if cid is not None])

    print("Generación completada.")
    logging.info("Generación de cápsulas completada")

if __name__ == "__main__":
    generate_massive_capsules()