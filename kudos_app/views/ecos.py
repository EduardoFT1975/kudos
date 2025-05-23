# kudos_app/views/ecos.py

import streamlit as st
import subprocess
import os

def generate_eco(capsule, clip_duration=10):
    """
    Genera un clip de video "Eco" de 10-30 segundos a partir de una cápsula.

    Args:
        capsule (dict): Cápsula con datos multidimensionales.
        clip_duration (int): Duración del clip en segundos (entre 10 y 30).

    Returns:
        str: URL del clip generado (simulada).
    """
    if capsule.get("eco_url"):
        return capsule["eco_url"]

    # Validar la duración del clip
    clip_duration = max(10, min(30, clip_duration))

    # Simulación: En un entorno real, usaríamos ffmpeg para generar el clip
    # Ejemplo de comando ffmpeg: ffmpeg -i input.mp4 -t 10 eco.mp4
    if capsule["classification"]["1D"] in ["video", "audio"]:
        # Simular la generación del clip
        eco_url = f"https://kudos-clips.example.com/eco_{capsule['capsule_id']}.mp4"
        return eco_url
    return ""