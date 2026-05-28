"""
KUDOS Capsule Engine v2 · Media service.

Pipeline de assembly (sin ejecutar render todavía · MVP genera manifests):
  script → scene segmentation → asset matching → motion → subtitles → manifest

Render efectivo a MP4 lo seguirá haciendo el legacy kudos_engine/providers/ffmpeg_kenburns.py
cuando el panel del fundador lo invoque. Aquí sólo se prepara el manifest.
"""
from __future__ import annotations

import uuid
from typing import List, Optional

from kudos_engine.apps.core import db
from kudos_engine.apps.core.config import STORE_MEDIA
from kudos_engine.apps.core.enums import MotionType
from kudos_engine.apps.media.models import (
    MediaAsset, MediaAssetCreate, SceneManifest, SceneSegment
)
from kudos_engine.apps.capsules import service as capsule_service


def register_asset(payload: MediaAssetCreate) -> MediaAsset:
    asset = MediaAsset(id=uuid.uuid4().hex, **payload.model_dump())
    db.upsert(STORE_MEDIA, asset.id, asset.model_dump())
    return asset


def get_asset(asset_id: str) -> Optional[MediaAsset]:
    raw = db.get(STORE_MEDIA, asset_id)
    return MediaAsset(**raw) if raw else None


def list_assets_for_poi(poi_id: str) -> List[MediaAsset]:
    items = [a for a in db.list_all(STORE_MEDIA) if a.get("poi_id") == poi_id]
    items.sort(key=lambda a: a.get("visual_quality", 0), reverse=True)
    return [MediaAsset(**a) for a in items]


# ─── Scene assembly pipeline ─────────────────────────────────────────

_MOTION_ROTATION = [
    MotionType.ZOOM_IN, MotionType.PAN_RIGHT, MotionType.ZOOM_OUT,
    MotionType.PAN_LEFT, MotionType.PARALLAX, MotionType.SLOW_FLOAT,
]


def _segment_script(script: str, duration_s: float, scene_count: int = 5) -> List[str]:
    """Parte el script en N escenas de tamaño similar respetando límites de frase."""
    if not script:
        return [""] * scene_count
    sentences = [s.strip() for s in script.replace("\n", " ").split(".") if s.strip()]
    if len(sentences) <= scene_count:
        return sentences + [""] * (scene_count - len(sentences))
    # Agrupar sentences en N buckets balanceados por longitud
    target_len = sum(len(s) for s in sentences) / scene_count
    buckets: List[List[str]] = [[] for _ in range(scene_count)]
    idx, current_len = 0, 0
    for s in sentences:
        if current_len > target_len and idx < scene_count - 1:
            idx += 1
            current_len = 0
        buckets[idx].append(s)
        current_len += len(s)
    return [". ".join(b) + "." if b else "" for b in buckets]


def build_manifest(capsule_id: str, scene_count: int = 5) -> Optional[SceneManifest]:
    """Genera SceneManifest desde un Capsule + assets disponibles del POI."""
    capsule = capsule_service.get_capsule(capsule_id)
    if not capsule:
        return None

    duration = capsule.duration_s or 15.0
    scene_dur = duration / scene_count

    assets = list_assets_for_poi(capsule.poi_id)
    voice_chunks = _segment_script(capsule.script or capsule.hook, duration, scene_count)

    segments: List[SceneSegment] = []
    for i in range(scene_count):
        asset = assets[i] if i < len(assets) else (assets[i % len(assets)] if assets else None)
        seg = SceneSegment(
            scene_order=i,
            start_time=i * scene_dur,
            end_time=(i + 1) * scene_dur,
            asset_id=asset.id if asset else None,
            motion_type=_MOTION_ROTATION[i % len(_MOTION_ROTATION)].value,
            overlay_text=voice_chunks[i][:80] if voice_chunks[i] else None,
            voice_segment=voice_chunks[i] or None,
            transition_type="fade",
        )
        segments.append(seg)

    manifest = SceneManifest(
        id=uuid.uuid4().hex,
        capsule_id=capsule_id,
        poi_id=capsule.poi_id,
        total_duration_s=duration,
        scenes=segments,
    )

    # Actualizar capsule.media_manifest (denormalizado)
    from kudos_engine.apps.capsules.models import CapsuleUpdate, MediaManifestRef
    capsule_service.update_capsule(capsule_id, CapsuleUpdate(
        media_manifest=MediaManifestRef(
            manifest_id=manifest.id,
            scene_count=len(segments),
            total_duration_s=duration,
            export_targets=manifest.export_targets,
        )
    ))

    return manifest
