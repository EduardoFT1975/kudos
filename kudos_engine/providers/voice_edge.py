"""
KUDOS Engine — Provider de voz GRATIS usando Edge-TTS (Microsoft).

Edge-TTS es el motor de síntesis del navegador Edge. Calidad muy alta, voces
neurales, español de España y Latinoamérica, totalmente gratis y sin cuotas.

Instalación:
    pip install edge-tts

Voces recomendadas (español):
  - "es-ES-AlvaroNeural"     — voz masculina seria, ideal para documental
  - "es-ES-ElviraNeural"     — voz femenina cálida
  - "es-ES-XimenaNeural"     — voz femenina narradora
  - "es-MX-JorgeNeural"      — voz masculina latina, épica
  - "es-AR-TomasNeural"      — voz masculina rioplatense

Para KUDOS Tier S sugerimos AlvaroNeural (gravedad documental).
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Optional


VOICE_DEFAULT = "es-ES-AlvaroNeural"


def synthesize(
    text: str,
    out_path: Path,
    voice: str = VOICE_DEFAULT,
    rate: str = "-5%",          # ligeramente más lento = más cinematográfico
    pitch: str = "-2Hz",        # ligeramente grave
) -> Path:
    """
    Genera un MP3 con la narración a partir de `text`.

    `rate` y `pitch` son strings con prefijo +/- (ej: "+10%", "-5%", "+3Hz").
    """
    import edge_tts  # type: ignore  (instalado vía requirements.txt)

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    async def _run():
        communicate = edge_tts.Communicate(
            text=text,
            voice=voice,
            rate=rate,
            pitch=pitch,
        )
        await communicate.save(str(out_path))

    asyncio.run(_run())
    return out_path


def synthesize_scenes(
    scenes: list[dict],
    out_dir: Path,
    voice: str = VOICE_DEFAULT,
) -> list[Path]:
    """
    Genera un MP3 por escena. Cada escena debe tener un campo `narration`.
    Devuelve la lista de paths generados (en orden).
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for i, scene in enumerate(scenes):
        text = (scene.get("narration") or "").strip()
        if not text:
            paths.append(None)  # type: ignore
            continue
        p = out_dir / f"scene_{i:02d}.mp3"
        synthesize(text, p, voice=voice)
        paths.append(p)
    return paths


def list_spanish_voices() -> list[str]:
    """Devuelve las voces neurales en español disponibles en Edge-TTS."""
    import edge_tts  # type: ignore

    async def _list():
        return await edge_tts.list_voices()

    voices = asyncio.run(_list())
    return sorted(
        v["ShortName"] for v in voices
        if v["Locale"].startswith("es-") and v.get("VoiceType") == "Neural"
    )
