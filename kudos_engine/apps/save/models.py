"""
KUDOS Capsule Engine v2 · Personal World Layer · World Collection Engine.

CTO directive: "Save ≠ bookmark. Save = graph signal."
Implementa:
  - Capa 2 · World Collection Engine (SavedWorld con colecciones + temas)
  - Capa 3 · Meaning Capture Engine (motivación)
  - Capa 4 · Memory Engine (revisitas)
  - Capa 5 · Emotional Resonance Engine
  - Visit (estuve aquí · GPS-verified)
  - WatchedCapsule (cápsula vista con completion%)
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ─── 1) SAVE · "Añadir a Mi Mundo" (NO favorito) ────────────────────

class SavedWorld(BaseModel):
    """Item añadido al mapa personal de significado."""
    id: str
    user_id: str
    poi_id: str
    capsule_id: Optional[str] = None

    # Capa 2 · World Collection · puede pertenecer a colecciones temáticas
    collection_type: Optional[str] = "default"
    themes: List[str] = Field(default_factory=list)   # "viaje-roma" "renacimiento" etc.

    # Capa 3 · Meaning Capture Engine
    motivation: Optional[str] = None  # me_inspira | quiero_visitarlo | quiero_aprender | me_emociona | me_recuerda_algo
    emotional_reason: Optional[str] = None   # texto libre opcional ("me recordó a mi abuela")
    future_relevance: Optional[str] = None   # texto libre opcional

    # Capa 4 · Memory · revisitas
    last_revisited_at: Optional[str] = None
    revisit_count: int = 0
    memory_status: Optional[str] = None      # "still_relevant" | "released" | "want_to_revisit"
    memory_updated_at: Optional[str] = None

    saved_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class SaveRequest(BaseModel):
    user_id: str
    poi_id: str
    capsule_id: Optional[str] = None
    collection_type: Optional[str] = "default"
    themes: List[str] = Field(default_factory=list)
    motivation: Optional[str] = None
    emotional_reason: Optional[str] = None
    future_relevance: Optional[str] = None


class MemoryUpdateRequest(BaseModel):
    """Capa 4 · "¿sigue siendo importante?" · "ya no" · "quiero revisitar"."""
    save_id: str
    status: str   # "still_relevant" | "released" | "want_to_revisit"


# ─── 2) VISITED · "estuve aquí" GPS-verified ─────────────────────────

class VisitedWorld(BaseModel):
    id: str
    user_id: str
    poi_id: str
    visited_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    coords_lat: Optional[float] = None
    coords_lng: Optional[float] = None
    accuracy_m: Optional[float] = None
    note: Optional[str] = None
    photo_url: Optional[str] = None


class VisitRequest(BaseModel):
    user_id: str
    poi_id: str
    coords_lat: Optional[float] = None
    coords_lng: Optional[float] = None
    accuracy_m: Optional[float] = None
    note: Optional[str] = None
    photo_url: Optional[str] = None


# ─── 3) WATCHED CAPSULE · cápsula reproducida ────────────────────────

class WatchedCapsule(BaseModel):
    id: str
    user_id: str
    capsule_id: str
    poi_id: Optional[str] = None
    completion_pct: float = 0.0
    duration_watched_s: float = 0.0
    watched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class WatchRequest(BaseModel):
    user_id: str
    capsule_id: str
    poi_id: Optional[str] = None
    completion_pct: float = 0.0
    duration_watched_s: float = 0.0


# ─── 4) EMOTIONAL RESONANCE · capa 5 ─────────────────────────────────
# Sustituye al like clásico. Una pulsación · una emoción.

class EmotionalResonance(BaseModel):
    """Resonancia emocional · una pulsación · sin likes/dislikes."""
    id: str
    user_id: str
    target_type: str                       # "poi" | "capsule"
    target_id: str
    resonance: str                         # asombro | aprendizaje | inspiracion | conexion | nostalgia
    intensity: float = 1.0                 # default 1.0 · usuarios avanzados pueden modular
    note: Optional[str] = None
    reacted_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ResonanceRequest(BaseModel):
    user_id: str
    target_type: str
    target_id: str
    resonance: str
    note: Optional[str] = None


# ─── Aliases legacy para compat ──────────────────────────────────────
EmotionalReaction = EmotionalResonance
ReactionRequest = ResonanceRequest
