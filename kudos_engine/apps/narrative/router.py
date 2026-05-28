"""
KUDOS Capsule Engine v2 · /api/narratives router.
"""
from __future__ import annotations

from typing import List
from fastapi import APIRouter, HTTPException, Query

from kudos_engine.apps.narrative import service
from kudos_engine.apps.narrative.models import (
    Narrative, NarrativeCreate, NarrativeCandidates
)


router = APIRouter(prefix="/api/narratives", tags=["narratives"])


@router.post("/", response_model=Narrative, status_code=201)
def create_narrative(payload: NarrativeCreate):
    n = service.create_narrative(payload)
    if not n:
        raise HTTPException(404, detail="POI not found")
    return n


@router.get("/by-poi/{poi_id}", response_model=List[Narrative])
def list_for_poi(poi_id: str):
    return service.list_for_poi(poi_id)


@router.get("/{narrative_id}", response_model=Narrative)
def get_narrative(narrative_id: str):
    n = service.get_narrative(narrative_id)
    if not n:
        raise HTTPException(404, detail="Narrative not found")
    return n


@router.post("/{poi_id}/generate", response_model=NarrativeCandidates)
def generate_candidates(poi_id: str, max_candidates: int = Query(5, ge=1, le=10)):
    res = service.generate_candidates(poi_id, max_candidates=max_candidates)
    if not res:
        raise HTTPException(404, detail="POI not found")
    return res


@router.delete("/{narrative_id}", status_code=204)
def delete_narrative(narrative_id: str):
    if not service.delete_narrative(narrative_id):
        raise HTTPException(404, detail="Narrative not found")
