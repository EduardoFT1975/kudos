"""
KUDOS Capsule Engine v2 · POI model.

POI = "narrative universe", no "card".
Soporta N capsules + relationships POI↔POI + future temporal layers.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from kudos_engine.apps.core.enums import POIStatus, RelationshipType, Tier


class MediaAssetRef(BaseModel):
    """Referencia ligera a un MediaAsset (full model en apps/media)."""
    asset_id: str
    type: str   # IMAGE/VIDEO/AUDIO/MAP/ARCHIVE/RECONSTRUCTION
    url: str
    thumbnail: Optional[str] = None


class POI(BaseModel):
    """
    Point of Interest · unidad fundacional del World Graph.

    Soporta:
      - N capsules (1 POI → narrative universe)
      - N relationships (POI↔POI)
      - future temporal layers (historical_periods)
      - future human memory (hooks vacíos por ahora)
      - feed indexing (merit_score)
      - search indexing (tags + emotional_tags)
    """
    id: str
    slug: str
    name: str
    short_description: Optional[str] = None

    # Geografía
    latitude: float
    longitude: float
    country: Optional[str] = None
    city: Optional[str] = None

    # Categorización
    category: Optional[str] = None     # museo · monumento · parque · etc.
    importance_level: int = 0          # 0..100 importance objetiva

    # Temporal layers (CTO future-proofing)
    historical_periods: List[str] = Field(default_factory=list)

    # Tags
    tags: List[str] = Field(default_factory=list)
    emotional_tags: List[str] = Field(default_factory=list)

    # Scoring (poblado por Merit Engine · denormalizado para feed rápido)
    visual_score: float = 0.0
    curiosity_score: float = 0.0
    merit_score: float = 0.0
    tier: Optional[str] = None         # TIER_S/A/B/C cuando Merit corre

    # Media
    media_assets: List[MediaAssetRef] = Field(default_factory=list)

    # Relationships denormalizadas para queries rápidas (lista de POI ids)
    relationship_ids: List[str] = Field(default_factory=list)

    # Trazabilidad
    source_metadata: Dict[str, Any] = Field(default_factory=dict)  # wikidata_id, osm_id, etc.

    status: str = POIStatus.DRAFT.value
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class POIRelationship(BaseModel):
    """
    Arco del grafo POI↔POI.

    CTO directive ejemplos:
      Roman Empire → Gladiators (CULTURAL)
      Coliseo → Foro Romano (GEOGRAPHIC + HISTORICAL)
    """
    id: str
    poi_a_id: str
    poi_b_id: str
    type: str   # RelationshipType enum value
    weight: float = 1.0                 # 0..1 fuerza del enlace
    description: Optional[str] = None   # "ambos pertenecen al imperio romano"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class POICreate(BaseModel):
    """Input para crear POI · campos mínimos."""
    name: str
    latitude: float
    longitude: float
    slug: Optional[str] = None
    category: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    short_description: Optional[str] = None
    importance_level: int = 0
    historical_periods: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    emotional_tags: List[str] = Field(default_factory=list)
    source_metadata: Dict[str, Any] = Field(default_factory=dict)


class POIUpdate(BaseModel):
    """Patch parcial · todos opcionales."""
    name: Optional[str] = None
    short_description: Optional[str] = None
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
