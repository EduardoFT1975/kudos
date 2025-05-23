# kudos_app/views/import_data.py

import streamlit as st
import zipfile
import os
from datetime import datetime
from django.contrib.gis.geos import Point
from kudos_app.models import Capsule
from geopy.geocoders import Nominatim

def create_capsule_from_file(user, filename, interests):
    """
    Crea una cápsula a partir de un archivo.

    Args:
        user (User): Usuario actual.
        filename (str): Nombre del archivo.
        interests (str): Etiqueta de intereses.

    Returns:
        Capsule: Cápsula creada.
    """
    # Determinar el tipo de archivo (1D)
    file_type = "unknown"
    if filename.lower().endswith((".mp4", ".avi", ".mov")):
        file_type = "video"
    elif filename.lower().endswith((".mp3", ".wav")):
        file_type = "audio"
    elif filename.lower().endswith((".jpg", ".png", ".jpeg")):
        file_type = "imagen"
    elif filename.lower().endswith((".txt", ".md")):
        file_type = "texto"

    # Geolocalización (2D) - Simulación
    geolocator = Nominatim(user_agent="kudos_vault")
    location = geolocator.geocode("Madrid")  # Sustituir por metadatos reales en producción
    lat, lon = (location.latitude, location.longitude) if location else (40.4168, -3.7038)

    # Marca de tiempo (3D) - Simulación
    timestamp = datetime.now()  # Sustituir por metadatos reales en producción

    # Méritos iniciales (4D)
    merits = 5

    # Crear la cápsula
    capsule = Capsule.objects.create(
        usuario=user,
        contenido=f"Contenido importado desde {filename}",
        fecha=timestamp,
        modo="publico",
        privacy="publico",
        ubicacion=Point(lon, lat),
        parameters={
            "type": file_type,
            "merits": merits,
            "weather": {"weather": "Desconocido"},
            "themes": [interests]
        }
    )
    return capsule

def import_data(user):
    """
    Maneja la importación de datos desde un archivo ZIP y crea cápsulas.

    Args:
        user (User): Usuario actual.

    Returns:
        list: Lista de cápsulas creadas.
    """
    if not user:
        st.error("Usuario no válido. Por favor, inicia sesión.")
        return []

    # Formulario para cargar el archivo ZIP y especificar intereses
    st.subheader("Importar Datos")
    uploaded_file = st.file_uploader("Sube un archivo ZIP", type=["zip"])
    interests = st.text_input("Intereses (ej. Historia Local)", value="General")
    submit = st.button("Importar")

    new_capsules = []

    if submit and uploaded_file:
        # Guardar el archivo temporalmente
        with open("temp.zip", "wb") as f:
            f.write(uploaded_file.getbuffer())

        # Procesar el archivo ZIP
        try:
            with zipfile.ZipFile("temp.zip", "r") as zip_ref:
                zip_ref.extractall("temp_extract")
            
            # Procesar los archivos extraídos
            for filename in os.listdir("temp_extract"):
                filepath = os.path.join("temp_extract", filename)
                if os.path.isfile(filepath):
                    capsule = create_capsule_from_file(user, filename, interests)
                    new_capsules.append(capsule)

            st.success(f"Se importaron {len(new_capsules)} cápsulas correctamente.")
        except Exception as e:
            st.error(f"Error al importar el archivo: {str(e)}")
        finally:
            # Limpiar archivos temporales
            if os.path.exists("temp.zip"):
                os.remove("temp.zip")
            if os.path.exists("temp_extract"):
                for file in os.listdir("temp_extract"):
                    os.remove(os.path.join("temp_extract", file))
                os.rmdir("temp_extract")

    return new_capsules