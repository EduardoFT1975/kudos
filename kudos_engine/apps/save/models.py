"""
KUDOS Capsule Engine v2 · Personal World Layer · SavedWorld + extensions.

CTO directive Phase 9: "Save ≠ bookmark. Save = graph signal."
Extensiones para Personal World:
  - SavedWorld         → POI guardado (planificación · "quiero ir")
  - VisitedWorld       → POI visitado en la realidad (con coords GPS)
  - WatchedCapsule     → cápsula vista (con % completion)
  - EmotionalReaction  → POI/capsule etiquetado emocionalmente

Estos cuatro modelos alimentan el ranking personalizado del feed,
el "tu mundo" del usuario, y el recommendation engine futuro.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ─── 1) SAVE · "quiero ir / quiero acordarme" ────────────────────────

class SavedWorld(BaseModel):
    id: str
    user_id: str
    poi_id: str
    capsule_id: Optional[str] = None
    collection_type: Optional[str] = "default"
    emotional_reason: Optional[str] = None
    future_relevance: Optional[str] = None
    saved_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class SaveRequest(BaseModel):
    user_id: str
    poi_id: str
    capsule_id: Optional[str] = None
    collection_type: Optional[str] = "default"
    emotional_reason: Optional[str] = None
    future_relevance: Optional[str] = None


# ─── 2) VISITED · "estuve aquí en la realidad" ───────────────────────

class VisitedWorld(BaseModel):
    """Visita real al POI · GPS-verified."""
    id: str
    user_id: str
    poi_id: str
    visited_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    coords_lat: Optional[float] = None     # GPS real del momento
    coords_lng: Optional[float] = None
    accuracy_m: Optional[float] = None     # precisión GPS
    note: Optional[str] = None             # nota personal del viaje
    photo_url: Optional[str] = None        # foto del usuario


class VisitRequest(BaseModel):
    user_id: str
    poi_id: str
    coords_lat: Optional[float] = None
    coords_lng: Optional[float] = None
    accuracy_m: Optional[float] = None
    note: Optional[str] = None
    photo_url: Optional[str] = None


# ─── 3) WATCHED CAPSULE · "vi la cápsula" ────────────────────────────

class WatchedCapsule(BaseModel):
    """Cápsula reproducida · con métrica de completion."""
    id: str
    user_id: str
    capsule_id: str
    poi_id: Optional[str] = None
    completion_pct: float = 0.0            # 0..1 · 1.0 = vio completa
    duration_watched_s: float = 0.0
    watched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class WatchRequest(BaseModel):
    user_id: str
    capsule_id: str
    poi_id: Optional[str] = None
    completion_pct: float = 0.0
    duration_watched_s: float = 0.0


# ─── 4) EMOTIONAL REACTION · "me hizo sentir X" ──────────────────────

class EmotionalReaction(BaseModel):
    """Etiqueta emocional sobre un POI o cápsula · feeds personal layer."""
    id: str
    user_id: str
    target_type: str                       # "poi" | "capsule"
    target_id: str
    emotion: str                           # awe, melancholy, wonder, joy, calm,
                                            # nostalgia, curiosity, gratitude, etc.
    intensity: float = 0.5                 # 0..1
    note: Optional[str] = None
    reacted_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ReactionRequest(BaseModel):
    user_id: str
    target_type: str
    target_id: str
    emotion: str
    intensity: float = 0.5
    note: Optional[str] = None
