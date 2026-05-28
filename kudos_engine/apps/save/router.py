"""
KUDOS Capsule Engine v2 · /api/save router.
"""
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Query, HTTPException

from kudos_engine.apps.save import service
from kudos_engine.apps.save.models import SavedWorld, SaveRequest


router = APIRouter(prefix="/api/save", tags=["save"])


@router.post("/", response_model=SavedWorld, status_code=201)
def save_poi(req: SaveRequest):
    return service.save(req)


@router.get("/user/{user_id}", response_model=List[SavedWorld])
def list_for_user(user_id: str, limit: int = Query(100, ge=1, le=500)):
    return service.list_for_user(user_id, limit=limit)


@router.delete("/{save_id}", status_code=204)
def unsave(save_id: str):
    if not service.unsave(save_id):
        raise HTTPException(404, detail="Save not found")


@router.get("/count/poi/{poi_id}")
def count_for_poi(poi_id: str):
    return {"poi_id": poi_id, "saves": service.count_for_poi(poi_id)}
