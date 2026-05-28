"""
KUDOS Capsule Engine v2 · MediaAsset + SceneManifest.

CTO directive Phase 6: "DO NOT build generative cinema. Build intelligent
media assembly pipeline." → MediaAsset es metadata + URL; SceneManifest
describe la coreografía de ensamblado.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from kudos_engine.apps.core.enums import MediaType, MotionType, ExportTarget


class MediaAsset(BaseModel):
    id: str
    poi_id: Optional[str] = None
    type: str = MediaType.IMAGE.value
    source: str = "wikimedia"                # wikimedia, internal, anthropic, etc.
    license: Optional[str] = None            # "CC-BY-SA 4.0"
    url: str
    thumbnail: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    visual_quality: float = 0.5              # 0..1
    historical_period: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class SceneSegment(BaseModel):
    """Un segmento del SceneManifest · pipeline lo renderiza con ffmpeg."""
    scene_order: int
    start_time: float
    end_time: float
    asset_id: Optional[str] = None
    motion_type: str = MotionType.STATIC.value
    overlay_text: Optional[str] = None
    voice_segment: Optional[str] = None      # texto que se narra
    music_segment: Optional[str] = None      # filename música ambient
    transition_type: str = "fade"


class SceneManifest(BaseModel):
    """Manifiesto completo de cómo ensamblar una cápsula."""
    id: str
    capsule_id: str
    poi_id: str
    total_duration_s: float
    scenes: List[SceneSegment] = Field(default_factory=list)
    export_targets: List[str] = Field(default_factory=lambda: [ExportTarget.VERTICAL_9_16.value])
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class MediaAssetCreate(BaseModel):
    type: str = MediaType.IMAGE.value
    url: str
    poi_id: Optional[str] = None
    source: str = "wikimedia"
    license: Optional[str] = None
    thumbnail: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    visual_quality: float = 0.5
    historical_period: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
