"""
KUDOS Engine — Pipeline orchestrator.

Une los 5 pasos del motor para generar una cápsula completa de un POI:

    1. clasificar(poi)               → tier + recipe (kudos_engine.tier)
    2. generar_guion(poi, recipe)    → JSON con escenas (providers.guion_claude)
    3. descargar_fotos(poi, scenes)  → imágenes Wikimedia por escena
    4. generar_voz(scenes)           → MP3 por escena (Edge-TTS)
    5. ensamblar(clips, voz, música) → MP4 final 9:16 (ffmpeg Ken Burns)

Salida en kudos_engine/output/<slug>/capsula.mp4 + metadata.json (créditos).
"""

from __future__ import annotations

import json
import shutil
from dataclasses import asdict
from pathlib import Path
from typing import Any, Optional

from .tier import classify_poi
from .providers.guion_claude import generate_script
from .providers.wikimedia import download_images_for_poi, _slugify
from .providers.voice_edge import synthesize_scenes, VOICE_DEFAULT
from .providers.ffmpeg_kenburns import kenburns_clip, concat_scenes, build_intro


ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "output"
ASSETS_DIR = ROOT / "assets"


def generate_capsule(
    poi: dict[str, Any],
    voice: str = VOICE_DEFAULT,
    music_path: Optional[Path] = None,
    include_intro: bool = True,
    skip_voice: bool = False,
    verbose: bool = True,
) -> dict:
    """
    Genera la cápsula completa de un POI.

    Args:
        poi: dict con como mínimo `name`. Otros campos opcionales mejoran tier.
        voice: voz de Edge-TTS (ver providers/voice_edge.py).
        music_path: pista de música de fondo. Si None, sin música.
        include_intro: añade intro KUDOS de 0.8s al principio.
        skip_voice: si True, salta narración (vídeo mudo).

    Returns:
        dict con paths generados y metadata.
    """
    name = poi.get("name", "POI sin nombre")
    slug = _slugify(name)
    work_dir = OUTPUT_DIR / slug
    work_dir.mkdir(parents=True, exist_ok=True)

    log = (lambda *a: print("[pipeline]", *a)) if verbose else (lambda *_: None)

    # 1) Tier
    log(f"clasificando {name}...")
    cls = classify_poi(poi)
    tier = cls["tier"]
    recipe = cls["recipe"]
    log(f"tier={tier} score={cls['score']} → {cls['rationale']}")

    if not recipe["duration_seconds"]:
        log(f"Tier {tier} no genera vídeo — terminando con metadata.")
        (work_dir / "metadata.json").write_text(
            json.dumps({"poi": poi, "classification": cls}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return {"tier": tier, "video": None, "metadata": str(work_dir / "metadata.json")}

    # 2) Guion
    log(f"generando guion {recipe['scenes']} escenas / {recipe['duration_seconds']}s...")
    script = generate_script(
        name=name,
        duration_seconds=recipe["duration_seconds"],
        scenes=recipe["scenes"],
        context=poi.get("description", ""),
    )
    (work_dir / "script.json").write_text(
        json.dumps(script, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log(f"guion: {script.get('title', '')} · {len(script['scenes'])} escenas")

    # 3) Fotos Wikimedia
    log("descargando imágenes Wikimedia...")
    images = download_images_for_poi(
        name,
        min_count=recipe["min_photos"],
        max_count=max(recipe["min_photos"] + 2, len(script["scenes"]) + 2),
    )
    if not images:
        raise RuntimeError(f"No se pudieron descargar imágenes para «{name}»")
    log(f"descargadas {len(images)} imágenes")

    # 4) Voz
    voice_files: list[Optional[Path]] = []
    if not skip_voice and recipe["generate_voice"]:
        log(f"generando voz ({voice})...")
        voice_files = synthesize_scenes(
            script["scenes"],
            work_dir / "voice",
            voice=voice,
        )
    else:
        voice_files = [None] * len(script["scenes"])

    # 5) Ken Burns por escena
    log("generando clips Ken Burns por escena...")
    clips_dir = work_dir / "clips"
    clips_dir.mkdir(exist_ok=True)
    clips: list[Path] = []
    for i, scene in enumerate(script["scenes"]):
        img = images[i % len(images)]
        clip_path = clips_dir / f"scene_{i:02d}.mp4"
        kenburns_clip(
            Path(img.path),
            clip_path,
            duration=float(scene.get("duration", 2.0)),
            direction=scene.get("direction", "in"),
            grading=True,
        )
        clips.append(clip_path)
    log(f"generados {len(clips)} clips")

    # Intro
    full_clips: list[Path] = []
    if include_intro:
        intro = build_intro(work_dir / "intro.mp4", duration=0.8)
        full_clips.append(intro)
    full_clips.extend(clips)

    # Voces alineadas: si hay intro al principio, prepend un None a voice_files
    aligned_voices: list[Optional[Path]] = []
    if include_intro:
        aligned_voices.append(None)
    aligned_voices.extend(voice_files)

    # 6) Ensamblaje final
    log("ensamblando vídeo final con voz + música...")
    final = work_dir / "capsula.mp4"
    concat_scenes(
        full_clips,
        final,
        voice_files=aligned_voices,
        music_file=music_path,
    )
    log(f"OK · {final} ({final.stat().st_size//1024} KB)")

    # 7) Metadata + créditos
    metadata = {
        "poi": poi,
        "classification": cls,
        "script": script,
        "voice": voice if not skip_voice else None,
        "music": str(music_path) if music_path else None,
        "images": [asdict(i) for i in images],
        "credits": _build_credits(images),
    }
    (work_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return {
        "tier": tier,
        "video": str(final),
        "metadata": str(work_dir / "metadata.json"),
        "script": str(work_dir / "script.json"),
    }


def _build_credits(images) -> str:
    """Genera un bloque de créditos para metadata (cumplimiento CC-BY)."""
    lines = ["Imágenes via Wikimedia Commons:"]
    seen = set()
    for img in images:
        key = (img.author, img.license)
        if key in seen:
            continue
        seen.add(key)
        lines.append(f"  · {img.title} — {img.author} — {img.license}")
    return "\n".join(lines)
