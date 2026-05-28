"""
KUDOS Engine — Enchufe (stub) para OpenAI Sora 2.

Sora es el motor de OpenAI de vídeo cinematográfico premium. Coste aprox.
$8-12 por cápsula 15".

Para activar:
  1. Crear cuenta OpenAI con créditos disponibles
  2. Acceso al API de Sora 2 (requiere onboarding actualmente)
  3. Exportar OPENAI_API_KEY
  4. Reemplazar el cuerpo de generate_clip() por la llamada real

Stub funcional: lanza error claro si no hay API key, el pipeline cae a gratis.
"""

from __future__ import annotations

import os
from pathlib import Path


def generate_clip(
    prompt_en: str,
    out: Path,
    duration_seconds: int = 5,
    aspect_ratio: str = "9:16",
) -> Path:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY no definida. Para usar Sora: "
            "export OPENAI_API_KEY=tu_clave  y vuelve a ejecutar."
        )

    raise NotImplementedError(
        "Integración Sora pendiente de activar. Pídele a Claude que la "
        "complete cuando tengas el acceso al API y créditos cargados."
    )
