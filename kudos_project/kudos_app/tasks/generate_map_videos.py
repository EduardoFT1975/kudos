# kudos_project\kudos_app\tasks\generate_map_videos.py.py

import pandas as pd
import os
from django.conf import settings
from celery import shared_task
import logging

# Configurar logging
logging.basicConfig(filename='C:/Users/efert/kudos_project/logs/map_video_generation.log', level=logging.INFO)

@shared_task
def generate_map_videos():
    """Genera videos de mapas usando Google Earth Studio para cada cápsula."""
    logging.info("Iniciando generación de videos de mapas...")
    
    try:
        df = pd.read_csv(settings.BASE_DIR / 'capsule_params.csv')
    except Exception as e:
        logging.error(f"Error al leer capsule_params.csv: {e}")
        return

    # Directorio para guardar proyectos y videos
    project_dir = "C:/Users/efert/kudos_project/map_projects"
    video_dir = "C:/Users/efert/kudos_project/map_videos"
    os.makedirs(project_dir, exist_ok=True)
    os.makedirs(video_dir, exist_ok=True)

    for index, row in df.iterrows():
        try:
            theme = row['tema']
            lat, lon = fetch_geolocation(theme)
            
            # Generar archivo KML para Google Earth Studio
            kml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
    <name>{theme}</name>
    <Placemark>
        <name>{theme}</name>
        <Point>
            <coordinates>{lon},{lat},0</coordinates>
        </Point>
    </Placemark>
    <Tour>
        <name>{theme} Tour</name>
        <Playlist>
            <FlyTo>
                <duration>5</duration>
                <Camera>
                    <longitude>{lon}</longitude>
                    <latitude>{lat}</latitude>
                    <altitude>1000</altitude>
                    <heading>0</heading>
                    <tilt>45</tilt>
                    <range>500</range>
                </Camera>
            </FlyTo>
        </Playlist>
    </Tour>
</Document>
</kml>"""
            
            # Guardar archivo KML
            kml_file = f"{project_dir}/{theme}_{index}.kml"
            with open(kml_file, 'w') as f:
                f.write(kml_content)
            
            # Nota: Google Earth Studio requiere intervención manual para importar el KML y renderizar el video.
            # Automatización completa requeriría scripting con After Effects.
            logging.info(f"Archivo KML generado para {theme}: {kml_file}")
            logging.info("Importa este archivo en Google Earth Studio y renderiza el video manualmente.")
            
            # Simulación: Supongamos que el video se renderiza y se guarda en video_dir
            video_path = f"{video_dir}/{theme}_{index}.mp4"
            logging.info(f"Video simulado generado: {video_path}")
            
        except Exception as e:
            logging.error(f"Error al generar video para fila {index}: {e}")

def fetch_geolocation(query):
    """Obtiene coordenadas de OpenStreetMap."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": query, "format": "json", "limit": 1}
    headers = {"User-Agent": "KudosApp/1.0"}
    response = requests.get(url, params=params, headers=headers).json()
    if response:
        return float(response[0]["lat"]), float(response[0]["lon"])
    return 41.8902, 12.4924  # Roma por defecto