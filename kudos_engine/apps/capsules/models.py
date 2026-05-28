"""
KUDOS Capsule Engine v2 · Capsule model.

CTO directive: "A POI is a narrative universe. NOT one video."
→ 1 POI → N Capsules, cada una con su narrative_type y tier.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from kudos_engine.apps.core.enums import CapsuleType, NarrativeType, CapsuleStatus


class EmotionProfile(BaseModel):
    """Perfil emocional · alimenta ranking + pacing."""
    primary: str = "curiosity"              # awe, melancholy, wonder, etc.
    intensity: float = 0.5                  # 0..1
    secondary: List[str] = Field(default_factory=list)


class MediaManifestRef(BaseModel):
    """Referencia ligera al SceneManifest (vive en apps/media)."""
    manifest_id: Optional[str] = None
    scene_count: int = 0
    total_duration_s: float = 0.0
    export_targets: List[str] = Field(default_factory=list)


class MeritSnapshot(BaseModel):
    """Snapshot denormalizado de Merit en el momento de publicar la cápsula."""
    final_score: float = 0.0
    tier: str = "TIER_C"
    captured_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class Capsule(BaseModel):
    id: str
    poi_id: str
    type: str = CapsuleType.FEED_15.value
    narrative_type: str = NarrativeType.HUMAN_STORY.value
    tier: str = "TIER_C"

    title: str
    hook: str                                # primera frase impactante (1 línea)
    summary: Optional[str] = None            # 2-3 frases para feed preview
    script: Optional[str] = None             # script completo para TTS

    duration_s: float = 15.0
    language: str = "es"
    voice_enabled: bool = True

    status: str = CapsuleStatus.DRAFT.value
    visual_style: Optional[str] = None       # "ken_burns_warm" · etc.

    emotion_profile: EmotionProfile = Field(default_factory=EmotionProfile)
    media_manifest: MediaManifestRef = Field(default_factory=MediaManifestRef)
    merit_snapshot: MeritSnapshot = Field(default_factory=MeritSnapshot)

    # KPIs (CTO Primary KPI = SAVE_RATE)
    save_count: int = 0
    share_count: int = 0
    view_count: int = 0
    exploration_depth: float = 0.0           # avg nodes opened tras esta cápsula

    published_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CapsuleCreate(BaseModel):
    poi_id: str
    title: str
    hook: str
    type: str = CapsuleType.FEED_15.value
    narrative_type: str = NarrativeType.HUMAN_STORY.value
    summary: Optional[str] = None
    script: Optional[str] = None
    duration_s: Optional[float] = None
    language: str = "es"


class CapsuleUpdate(BaseModel):
    title: Optional[str] = None
    hook: Optional[str] = None
    summary: Optional[str] = None
    script: Optional[str] = None
    status: Optional[str] = None
    type: Optional[str] = None
    narrative_type: Optional[str] = None
    duration_s: Optional[float] = None
    tier: Optional[str] = None
    visual_style: Optional[str] = None
    media_manifest: Optional[MediaManifestRef] = None
