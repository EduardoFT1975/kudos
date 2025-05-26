# kudos_app/views/ecos.py

import random

def generate_eco(capsule, clip_duration=10):
    """
    Genera un clip de video "Eco" de 10-30 segundos a partir de una cápsula.

    Args:
        capsule (dict): Cápsula con datos multidimensionales (capsule_id, content, images).
        clip_duration (int): Duración del clip en segundos (entre 10 y 30).

    Returns:
        str: URL del clip generado (simulada).
    """
    if capsule.get("eco_url"):
        return capsule["eco_url"]

    # Validar la duración del clip
    clip_duration = max(10, min(30, clip_duration))

    # Simulación: generar una URL de clip basada en el ID de la cápsula
    capsule_id = capsule.get('capsule_id', 'unknown')
    eco_url = f"https://kudos-clips.example.com/eco_{capsule_id}_{clip_duration}s.mp4"
    return eco_url