"""
KUDOS HDG · /api/signals router.

Endpoints internos · NUNCA mostrar al usuario los scores como números.
Útil para sistema de recommendation + ranking del feed.
"""
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Query, HTTPException

from kudos_engine.apps.signals import service
from kudos_engine.apps.signals.models import PoiSignals


router = APIRouter(prefix="/api/signals", tags=["signals"])


@router.get("/{poi_id}", response_model=PoiSignals)
def get_signals(poi_id: str):
    sig = service.get_signals(poi_id)
    if not sig:
        raise HTTPException(404, detail="No signals yet for this POI")
    return sig


@router.post("/{poi_id}/recompute", response_model=PoiSignals)
def recompute_one(poi_id: str):
    return service.recompute_for_poi(poi_id)


@router.post("/recompute-all")
def recompute_all(limit: int = Query(1000, ge=1, le=10000)):
    n = service.recompute_all_active(limit=limit)
    return {"recomputed": n}


@router.get("/top/{score}")
def top_by_score(score: str, limit: int = Query(20, ge=1, le=100)):
    """
    score: discovery_score | importance_score | memory_score | emotion_score | future_value_score
    """
    allowed = {"discovery_score", "importance_score", "memory_score",
               "emotion_score", "future_value_score"}
    if score not in allowed:
        raise HTTPException(400, detail=f"score must be one of {allowed}")
    return service.top_pois_by(score, limit=limit)
