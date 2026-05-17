# kudos_app/utils/ar_vr_utils.py

"""
Módulo utilitario para gestionar operaciones de AR/VR en Kudos.
Proporciona funciones para generar y personalizar experiencias inmersivas.
"""

import json
import os  # Para variables de entorno

# Configuración estática en lugar de SettingsConfig
AR_VR_CONFIG = {
    "default_vr_sky": "https://example.com/default_sky.jpg",
    "character_models": {
        "Filosofía": "https://example.com/socrates_vr.glb",
        "Ciencia": "https://example.com/einstein_vr.glb",
        "Arte": "https://example.com/leonardo_vr.glb",
        "Historia": "https://example.com/cleopatra_vr.glb"
    }
}

def get_aframe_template(is_vr=True, sky_url=None, height=500):
    """
    Genera una plantilla base de A-Frame para AR o VR.

    Args:
        is_vr (bool): True para VR (con cielo), False para AR (sin cielo). Default: True.
        sky_url (str, optional): URL del cielo para VR. Usa configuración por defecto si no se especifica.
        height (int): Altura del contenedor en píxeles. Default: 500.

    Returns:
        str: Plantilla HTML de A-Frame.
    """
    default_sky = os.getenv('DEFAULT_VR_SKY', AR_VR_CONFIG["default_vr_sky"])

    template = f"""
    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
    <a-scene embedded {'vr-mode-ui="enabled: true"' if is_vr else ''}>
    """
    if is_vr:
        sky_url = sky_url or default_sky
        template += f'<a-sky src="{sky_url}"></a-sky>'
    template += "{content}\n    <a-camera position=\"0 1.6 0\"></a-camera>\n</a-scene>"
    return template, height

def add_text_to_scene(content, position="0 1.5 -5", color="white", width=4):
    """
    Agrega un elemento de texto a una escena A-Frame.

    Args:
        content (str): Texto a mostrar.
        position (str): Posición en el espacio 3D (x y z). Default: "0 1.5 -5".
        color (str): Color del texto. Default: "white".
        width (float): Ancho del texto. Default: 4.

    Returns:
        str: Código A-Frame para el elemento de texto.
    """
    return f'<a-text value="{content}" position="{position}" color="{color}" width="{width}"></a-text>'

def add_model_to_scene(model_url, position="0 1 -5", scale="1 1 1", animation=''):
    """
    Agrega un modelo 3D a una escena A-Frame con animación opcional.

    Args:
        model_url (str): URL del modelo GLTF/GLB.
        position (str): Posición en el espacio 3D. Default: "0 1 -5".
        scale (str): Escala del modelo. Default: "1 1 1".
        animation (str, optional): Animación A-Frame (e.g., rotación).

    Returns:
        str: Código A-Frame para el elemento de modelo.
    """
    rotation_animation = 'animation="property: rotation; to: 0 360 0; loop: true; dur: 10000"' if animation else ''
    return f'<a-entity gltf-model="{model_url}" position="{position}" scale="{scale}" {rotation_animation}></a-entity>'

def generate_ar_vr_scene(content, is_vr=True, sky_url=None, model_url=None, height=500):
    """
    Genera una escena completa de AR o VR con texto y modelo opcional.

    Args:
        content (str): Contenido principal a mostrar como texto.
        is_vr (bool): True para VR, False para AR. Default: True.
        sky_url (str, optional): URL del cielo para VR.
        model_url (str, optional): URL del modelo 3D para incluir.
        height (int): Altura del contenedor en píxeles. Default: 500.

    Returns:
        tuple: (Plantilla HTML completa, altura).
    """
    template, height = get_aframe_template(is_vr, sky_url, height)
    scene_content = add_text_to_scene(content)
    if model_url:
        scene_content += f"\n    {add_model_to_scene(model_url)}"
    return template.format(content=scene_content), height

def get_character_model(theme):
    """
    Obtiene la URL de un modelo 3D basado en un tema, usando personajes predefinidos.

    Args:
        theme (str): Tema para seleccionar el personaje (e.g., 'Filosofía').

    Returns:
        str: URL del modelo GLTF/GLB o None si no hay coincidencia.
    """
    character_models = AR_VR_CONFIG["character_models"]
    return character_models.get(theme)