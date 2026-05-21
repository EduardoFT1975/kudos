# scripts/generate_massive_capsules.py
import random
import time
import json
import ipfshttpclient
from datetime import datetime
from multiprocessing import Pool
import overpy
import xml.etree.ElementTree as ET
import bz2
import requests

# Lista de temas predefinida
THEMES = ["Historia", "Cultura", "Turismo", "Educación", "Ciencia"]
WEATHER = ["Soleado", "Nublado", "Lluvioso", "Nevado"]

def extract_wiki_articles(file_path, max_articles=2000000):
    """Extrae artículos relevantes de Wikipedia."""
    articles = []
    count = 0
    with bz2.open(file_path, 'rt', encoding='utf-8') as file:
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
                    if count >= max_articles:
                        break
                root.clear()
    return articles

def fetch_osm_pois():
    """Extrae POIs importantes y negocios premium globalmente usando Overpass API."""
    api = overpy.Overpass()
    query = """
    [out:json];
    (
      node["tourism"="museum"];
      node["tourism"="attraction"];
      node["tourism"="monument"];
      node["leisure"="park"];
      node["tourism"="hotel"]["stars"=5];
      node["amenity"="restaurant"]["access"="customers"];
    );
    out body;
    """
    result = api.query(query)
    pois = []
    for node in result.nodes:
        tags = node.tags
        name = tags.get("name", f"POI {node.id}")
        poi_type = tags.get("tourism") or tags.get("leisure") or tags.get("amenity")
        themes = ["Cultura"] if poi_type in ["museum", "attraction", "monument"] else ["Naturaleza"] if poi_type == "park" else ["Lujo", "Turismo"]
        image_url = tags.get("image", None)
        pois.append({
            "name": name,
            "lat": float(node.lat),
            "lon": float(node.lon),
            "themes": themes,
            "date": "2025-05-31" if "tourism" in tags or "amenity" in tags else "1900-01-01",
            "image_url": image_url
        })
    return pois[:5100000]  # Limitar a 5.1M

def download_image(url):
    """Descarga una imagen y la sube a IPFS."""
    try:
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with open("temp_image.jpg", "wb") as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            with ipfshttpclient.connect() as client:
                cid = client.add("temp_image.jpg")["Hash"]
            return cid
    except Exception as e:
        print(f"Error al descargar imagen: {e}")
    return None

def generate_capsule(data):
    """Genera una cápsula basada en datos de OSM o Wikipedia."""
    image_cid = download_image(data.get("image_url", None)) if data.get("image_url") else None
    capsule_data = {
        "uid": f"capsule_{int(time.time())}_{random.randint(1000, 9999)}",
        "contenido": data.get("text", f"{data['name']}: Un lugar emblemático."),
        "ubicacion": data.get("ubicacion", {"lat": random.uniform(-90, 90), "lon": random.uniform(-180, 180)}),
        "modo": data.get("modo", "histórico"),
        "fecha": data.get("date", "1900-01-01"),
        "privacy": "publico",
        "time_scale": "dia",
        "temas": data.get("themes", [random.choice(THEMES)]),
        "parameters": {"weather_data": {"weather": random.choice(WEATHER), "temperature": random.uniform(0, 30)}},
        "timestamp": datetime.now().isoformat(),
        "source": data.get("source", "OpenStreetMap"),
        "image": image_cid
    }
    try:
        with ipfshttpclient.connect() as client:
            capsule_json = json.dumps(capsule_data)
            cid = client.add_str(capsule_json)
            return cid
    except Exception as e:
        print(f"Error al generar cápsula: {e}")
        return None

def generate_massive_capsules():
    """Genera cápsulas masivas a partir de datos reales."""
    print("Extrayendo POIs de OpenStreetMap...")
    osm_pois = fetch_osm_pois()
    osm_data = [{"name": poi["name"], "ubicacion": {"lat": poi["lat"], "lon": poi["lon"]}, "themes": poi["themes"], "date": poi["date"], "image_url": poi["image_url"], "source": "OpenStreetMap", "modo": "histórico" if poi["date"] != "2025-05-31" else "premium"} for poi in osm_pois]

    print("Extrayendo artículos de Wikipedia...")
    wiki_articles = extract_wiki_articles("C:/Users/efert/kudos_project/data/enwiki-latest-pages-articles.xml.bz2")
    wiki_data = [{"text": f"{article['title']}: {article['text']}", "themes": [random.choice(THEMES)], "source": "Wikipedia", "modo": "histórico"} for article in wiki_articles]

    all_data = osm_data + wiki_data
    print(f"Generando {len(all_data)} cápsulas...")
    with Pool(processes=4) as pool:
        results = pool.map(generate_capsule, all_data)
    print("Generación completada.")

if __name__ == "__main__":
    generate_massive_capsules()