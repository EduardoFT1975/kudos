# kudos_app/utils/import_capsules.py

import pandas as pd
import requests
import os

# Configuración inicial
CSV_OUTPUT = "capsules_data.csv"
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
OPENSTREETMAP_API = "https://nominatim.openstreetmap.org/search"

# Paso 1: Obtener datos de Wikipedia
def fetch_wikipedia_data(query):
    params = {
        "action": "query",
        "format": "json",
        "titles": query,
        "prop": "extracts",
        "exintro": True,
        "explaintext": True
    }
    response = requests.get(WIKIPEDIA_API, params=params)
    data = response.json()
    page = next(iter(data["query"]["pages"].values()))
    return page["extract"] if "extract" in page else "No data found"

# Paso 2: Obtener coordenadas de OpenStreetMap
def fetch_geolocation(query):
    params = {
        "q": query,
        "format": "json",
        "limit": 1
    }
    headers = {"User-Agent": "KudosApp/1.0"}
    response = requests.get(OPENSTREETMAP_API, params=params, headers=headers)
    data = response.json()
    if data:
        return data[0]["lat"], data[0]["lon"]
    return None, None

# Paso 3: Crear CSV con datos estructurados
def create_capsule_csv():
    queries = ["Pyramids of Giza", "Eiffel Tower", "Colosseum", "Machu Picchu"]
    capsules = []

    for query in queries:
        # Obtener texto
        content = fetch_wikipedia_data(query)
        # Obtener geolocalización
        lat, lon = fetch_geolocation(query)
        # Estructurar datos
        if lat and lon:
            capsule = {
                "content": content[:500],
                "latitude": lat,
                "longitude": lon,
                "date": "2023-10-01",
                "theme": query
            }
            capsules.append(capsule)

    # Guardar en CSV
    df = pd.DataFrame(capsules)
    df.to_csv(CSV_OUTPUT, index=False)
    print(f"Datos guardados en {CSV_OUTPUT}")

# Paso 4: Ejecutar importación (simulación de import_data.py)
def import_to_kudos():
    if os.path.exists(CSV_OUTPUT):
        print(f"Simulando importación de {CSV_OUTPUT} a Kudos con import_data.py")
    else:
        print("Error: CSV no encontrado")

# Ejecución principal
if __name__ == "__main__":
    create_capsule_csv()
    import_to_kudos()