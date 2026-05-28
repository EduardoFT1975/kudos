"""
KUDOS Capsule Engine v2 · /api/merit router.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from kudos_engine.apps.merit import service
from kudos_engine.apps.merit.models import MeritProfile, MeritInputs


router = APIRouter(prefix="/api/merit", tags=["merit"])


@router.get("/{poi_id}", response_model=MeritProfile)
def get_merit(poi_id: str):
    profile = service.get_profile(poi_id)
    if not profile:
        raise HTTPException(404, detail="Merit profile not found · compute first")
    return profile


@router.post("/{poi_id}/compute", response_model=MeritProfile)
def compute_merit(poi_id: str, inputs: Optional[MeritInputs] = None):
    profile = service.compute_for_poi(poi_id, inputs)
    if not profile:
        raise HTTPException(404, detail="POI not found")
    return profile


@router.post("/recompute-all")
def recompute_all(limit: int = Query(500, ge=1, le=10000)):
    n = service.recompute_all(limit=limit)
    return {"recomputed": n}
