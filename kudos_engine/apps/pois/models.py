"""
KUDOS Capsule Engine v2 · POI model · MULTI-i18n.

POI = "narrative universe", no "card".
Soporta:
  - N capsules (1 POI → narrative universe)
  - N relationships (POI↔POI)
  - future temporal layers (historical_periods)
  - i18n: name / short_description / tags pueden ser dict locale→string
  - feed indexing (merit_score)
  - search indexing
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

from kudos_engine.apps.core.enums import POIStatus
from kudos_engine.apps.core.i18n import LocalizedString


class MediaAssetRef(BaseModel):
    asset_id: str
    type: str
    url: str
    thumbnail: Optional[str] = None


class POI(BaseModel):
    id: str
    slug: str
    name: LocalizedString                  # str o dict locale→string
    short_description: Optional[LocalizedString] = None

    # Geografía
    latitude: float
    longitude: float
    country: Optional[str] = None
    city: Optional[str] = None

    # Categorización
    category: Optional[str] = None
    importance_level: int = 0

    # Temporal layers
    historical_periods: List[str] = Field(default_factory=list)

    # Tags
    tags: List[str] = Field(default_factory=list)
    emotional_tags: List[str] = Field(default_factory=list)

    # Scoring (poblado por Merit Engine)
    visual_score: float = 0.0
    curiosity_score: float = 0.0
    merit_score: float = 0.0
    tier: Optional[str] = None

    # Media
    media_assets: List[MediaAssetRef] = Field(default_factory=list)

    # Relationships denormalizadas
    relationship_ids: List[str] = Field(default_factory=list)

    # Trazabilidad
    source_metadata: Dict[str, Any] = Field(default_factory=dict)

    status: str = POIStatus.DRAFT.value
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class POIRelationship(BaseModel):
    id: str
    poi_a_id: str
    poi_b_id: str
    type: str
    weight: float = 1.0
    description: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class POICreate(BaseModel):
    name: LocalizedString
    latitude: float
    longitude: float
    slug: Optional[str] = None
    category: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    short_description: Optional[LocalizedString] = None
    importance_level: int = 0
    historical_periods: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    emotional_tags: List[str] = Field(default_factory=list)
    source_metadata: Dict[str, Any] = Field(default_factory=dict)


class POIUpdate(BaseModel):
    name: Optional[LocalizedString] = None
    short_description: Optional[LocalizedString] = None
    category: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    importance_level: Optional[int] = None
    historical_periods: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    emotional_tags: Optional[List[str]] = None
    visual_score: Optional[float] = None
    curiosity_score: Optional[float] = None
    merit_score: Optional[float] = None
    tier: Optional[str] = None
    status: Optional[str] = None
