"""
KUDOS Capsule Engine v2 · Telemetry models · DISCOVERY EVENT ENGINE.

Eventos invisibles · base del Human Discovery Graph.
Sin estos eventos, el sistema no aprende. Con estos eventos, KUDOS sabe
qué considera la humanidad importante.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


# ─── Discovery Event Engine · todos los eventos canónicos ─────────────
class EventType:
    # Capa 1 · Discovery Signals (invisibles)
    POI_VIEW = "poi_view"                # POI entró en viewport
    POI_CLICK = "poi_click"              # usuario abrió el POI
    POI_HOVER = "poi_hover"              # hover prolongado >1s
    NODE_OPEN = "node_open"              # se abrió la vista detalle POI
    SCROLL_DEPTH = "scroll_depth"        # cuánto bajó en la pantalla
    EXPLORATION_DEPTH = "exploration_depth"  # capas/POIs visitados consecutivos
    CAPSULE_PLAY = "capsule_play"
    CAPSULE_COMPLETE = "capsule_complete"   # vio >90%
    CAPSULE_REPLAY = "capsule_replay"

    # Capa 2 · Save Signals
    ADDED_TO_MY_WORLD = "added_to_my_world"
    REMOVED_FROM_MY_WORLD = "removed_from_my_world"

    # Capa 3 · Importance Signals (Meaning Capture)
    MOTIVATION_CAPTURED = "motivation_captured"

    # Capa 4 · Memory Signals
    MEMORY_REVISITED = "memory_revisited"
    MEMORY_CONFIRMED = "memory_confirmed"  # "sigue siendo importante"
    MEMORY_RELEASED = "memory_released"    # "ya no"

    # Capa 5 · Emotion Signals (Emotional Resonance Engine)
    RESONANCE = "resonance"               # asombro, aprendizaje, inspiración, conexión, nostalgia

    # Otros · social
    CAPSULE_SHARE = "capsule_share"
    SEARCH_QUERY = "search_query"
    MAP_PAN = "map_pan"
    MAP_ZOOM = "map_zoom"


# ─── Resonances canónicas · capa 5 ───────────────────────────────────
class Resonance:
    ASOMBRO = "asombro"
    APRENDIZAJE = "aprendizaje"
    INSPIRACION = "inspiracion"
    CONEXION = "conexion"
    NOSTALGIA = "nostalgia"


# ─── Motivaciones canónicas · capa 3 ─────────────────────────────────
class Motivation:
    ME_INSPIRA = "me_inspira"
    QUIERO_VISITARLO = "quiero_visitarlo"
    QUIERO_APRENDER = "quiero_aprender"
    ME_EMOCIONA = "me_emociona"
    ME_RECUERDA_ALGO = "me_recuerda_algo"


class TelemetryEvent(BaseModel):
    event: str
    poi_id: Optional[str] = None
    capsule_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None

    # Discovery signals
    scroll_depth: Optional[float] = None      # 0..1
    duration_ms: Optional[int] = None
    exploration_chain: Optional[list[str]] = None  # POIs visitados consecutivos

    # Importance signal
    motivation: Optional[str] = None          # uno de Motivation.*

    # Emotion signal
    resonance: Optional[str] = None           # uno de Resonance.*

    # Memory signal
    memory_response: Optional[str] = None     # "confirmed" | "released" | "revisit"

    properties: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class TelemetryBatch(BaseModel):
    events: list[TelemetryEvent]
