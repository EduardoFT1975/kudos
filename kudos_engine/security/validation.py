"""
Input validation · T1.5.

Validadores reutilizables para evitar abuso.
"""
from __future__ import annotations

import re
from typing import Any

from fastapi import HTTPException, status


POI_ID_REGEX = re.compile(r"^wd-Q[0-9]+$|^[a-z0-9][a-z0-9_-]{0,127}$", re.IGNORECASE)
SESSION_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]{8,64}$")
CAPSULE_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-][a-zA-Z0-9_:-]{0,127}$")

# Whitelist event_type · 18+ EventTypes canonicos del HDG + T3.2 EJEC Day 3 Core Engine
ALLOWED_EVENT_TYPES = {
    "poi_view", "poi_click", "node_open",
    "scroll_depth", "time_on_screen", "exploration_depth",
    "capsule_play", "capsule_complete", "capsule_pause",
    "added_to_my_world", "removed_from_my_world",
    "motivation_captured", "resonance",
    "memory_revisited", "memory_prompted",
    "share_initiated", "share_completed",
    "search_query", "filter_applied", "city_changed",
    "narrative_opened", "relationship_followed",
    "onboarding_interest",
    # === T3.2 Day 3 · Core Engine ===
    "core_view_start", "core_completed", "core_partial",
    "core_scroll_depth", "core_first_signal",
    "shift_revealed", "shift_acknowledged",
    "return_visit_to_poi",
    "reflection_submitted",
}

MAX_PAYLOAD_BYTES = 4 * 1024     # 4KB
MAX_REASON_LEN = 500             # texto libre WHY


def validate_poi_id(poi_id: str | None) -> None:
    if poi_id is None:
        return
    if not isinstance(poi_id, str) or not POI_ID_REGEX.match(poi_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"invalid poi_id: {poi_id!r}")


def validate_session_id(session_id: str) -> None:
    if not isinstance(session_id, str) or not SESSION_ID_REGEX.match(session_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid session_id")


def validate_capsule_id(capsule_id: str | None) -> None:
    if capsule_id is None:
        return
    if not isinstance(capsule_id, str) or not CAPSULE_ID_REGEX.match(capsule_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"invalid capsule_id")


def validate_event_type(event_type: str) -> None:
    if event_type not in ALLOWED_EVENT_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"unknown event_type: {event_type}")


def truncate_payload(payload: Any) -> Any:
    """Limita el tamano serializado del payload."""
    import json
    if payload is None:
        return {}
    try:
        s = json.dumps(payload, ensure_ascii=False)
    except (TypeError, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="payload no serializable")
    if len(s.encode("utf-8")) > MAX_PAYLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"payload excede {MAX_PAYLOAD_BYTES} bytes")
    return payload


def truncate_reason(text: str | None) -> str | None:
    if text is None:
        return None
    if not isinstance(text, str):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="reason debe ser string")
    return text[:MAX_REASON_LEN]
