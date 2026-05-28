"""
KUDOS Capsule Engine v2 · /api/telemetry router.
"""
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Query

from kudos_engine.apps.telemetry import service
from kudos_engine.apps.telemetry.models import TelemetryEvent, TelemetryBatch


router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])


@router.post("/event", status_code=202)
def log_event(event: TelemetryEvent):
    """Recibe un evento del frontend y lo persiste."""
    service.log_event(event)
    return {"accepted": True}


@router.post("/batch", status_code=202)
def log_batch(batch: TelemetryBatch):
    """Recibe batch de eventos (más eficiente que 1 por 1)."""
    n = service.log_batch(batch.events)
    return {"accepted": True, "count": n}


@router.get("/stats")
def stats():
    """Cuenta global de eventos por tipo."""
    return service.stats_event_counts()


@router.get("/top-pois")
def top_pois(event: str = Query("poi_click"), limit: int = Query(20, ge=1, le=200)):
    """Top POIs por tipo de evento."""
    return {"event": event, "top": service.top_pois_by_event(event, limit=limit)}
