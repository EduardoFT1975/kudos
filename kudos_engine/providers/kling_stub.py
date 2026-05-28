"""
KUDOS Engine — Enchufe (stub) para Kling AI.

Kling es uno de los motores de vídeo IA más potentes y con free tier generoso
(~166 créditos/día, suficiente para 1-2 cápsulas Tier S/día).

Para activar de verdad:
  1. Crear cuenta en https://app.klingai.com/
  2. Obtener API key (algunos planes la incluyen, otros requieren pago)
  3. Exportar KLING_API_KEY en el entorno
  4. Sustituir el TODO de generate_clip() por la llamada real al endpoint

Esta versión es un placeholder funcional: si no hay API key, levanta una
excepción descriptiva. El pipeline simplemente saltará a la versión gratis
(ffmpeg + Wikimedia) en ese caso.
"""

from __future__ import annotations

import os
from pathlib import Path


KLING_API = "https://api.klingai.com/v1/videos/text2video"


def generate_clip(
    prompt_en: str,
    out: Path,
    duration_seconds: int = 5,
    aspect_ratio: str = "9:16",
) -> Path:
    """
    Genera un clip IA con Kling a partir de un prompt en inglés.

    POR AHORA es un stub. Cuando Eduardo decida pagar Kling y dar la API key,
    completamos la integración real. Mientras tanto, el orchestrator se cae
    elegantemente a la pipeline ffmpeg+Wikimedia.
    """
    api_key = os.environ.get("KLING_API_KEY")
    if not api_key:
        raise RuntimeError(
            "KLING_API_KEY no definida. Para usar Kling: "
            "export KLING_API_KEY=tu_clave  y vuelve a ejecutar."
        )

    raise NotImplementedError(
        "Integración Kling pendiente de activar. Pídele a Claude que la "
        "complete cuando tengas la API key."
    )
