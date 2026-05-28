"""
KUDOS Engine — Enchufe (stub) para Google Veo 3.

Veo es el motor de vídeo IA de Google DeepMind con mejor física y movimiento.
Coste aprox. $10-15 por cápsula 15".

Para activar:
  1. Cuenta Google Cloud con Vertex AI habilitado
  2. Acceso al modelo veo-3 (requiere allowlist actualmente)
  3. Exportar GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de servicio
  4. Reemplazar el cuerpo de generate_clip() por la llamada real

Stub funcional. El pipeline cae a gratis si no está configurado.
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
    creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds:
        raise RuntimeError(
            "GOOGLE_APPLICATION_CREDENTIALS no definida. Para usar Veo: "
            "export GOOGLE_APPLICATION_CREDENTIALS=ruta/al/service-account.json"
        )

    raise NotImplementedError(
        "Integración Veo pendiente de activar. Pídele a Claude que la "
        "complete cuando tengas acceso al modelo y credenciales válidas."
    )
