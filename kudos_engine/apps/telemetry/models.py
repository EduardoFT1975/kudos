"""
KUDOS Capsule Engine v2 · Telemetry models.

Eventos persistidos append-only en JSONL. Migrable a PostHog/Plausible.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


# Eventos canónicos que el frontend dispara
class EventType:
    POI_VIEW = "poi_view"            # el chip entró en viewport
    POI_CLICK = "poi_click"          # usuario pulsó el chip
    POI_HOVER = "poi_hover"          # hover prolongado >1s
    CAPSULE_PLAY = "capsule_play"    # cápsula reproducida
    CAPSULE_SAVE = "capsule_save"    # primary KPI · SAVE_RATE
    CAPSULE_SHARE = "capsule_share"
    CAPSULE_COMPLETE = "capsule_complete"  # vio cápsula entera (>90%)
    SEARCH_QUERY = "search_query"
    MAP_PAN = "map_pan"
    MAP_ZOOM = "map_zoom"


class TelemetryEvent(BaseModel):
    event: str
    poi_id: Optional[str] = None
    capsule_id: Optional[str] = None
    user_id: Optional[str] = None        # MVP: anonymous_id del navegador
    session_id: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class TelemetryBatch(BaseModel):
    events: list[TelemetryEvent]
