"""
KUDOS Capsule Engine v2 · /api/save router · Personal World extendido.
"""
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Query, HTTPException

from kudos_engine.apps.save import service
from kudos_engine.apps.save.models import (
    SavedWorld, SaveRequest,
    VisitedWorld, VisitRequest,
    WatchedCapsule, WatchRequest,
    EmotionalReaction, ReactionRequest,
)


router = APIRouter(prefix="/api/save", tags=["save"])


# ─── Save ─────────────────────────────────────────────────────────────

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


# ─── Visited (estuve aquí · GPS verified) ────────────────────────────

@router.post("/visit", response_model=VisitedWorld, status_code=201)
def mark_visit(req: VisitRequest):
    return service.mark_visited(req)


@router.get("/visits/user/{user_id}", response_model=List[VisitedWorld])
def visits_for_user(user_id: str, limit: int = Query(200, ge=1, le=1000)):
    return service.visits_for_user(user_id, limit=limit)


@router.get("/visits/count/poi/{poi_id}")
def count_visits(poi_id: str):
    return {"poi_id": poi_id, "visits": service.visits_for_poi(poi_id)}


# ─── Watched capsules ────────────────────────────────────────────────

@router.post("/watch", response_model=WatchedCapsule, status_code=201)
def mark_watch(req: WatchRequest):
    return service.mark_watched(req)


@router.get("/watch/user/{user_id}", response_model=List[WatchedCapsule])
def watched_for_user(user_id: str, limit: int = Query(200, ge=1, le=1000)):
    return service.watched_for_user(user_id, limit=limit)


# ─── Emotional reactions ─────────────────────────────────────────────

@router.post("/react", response_model=EmotionalReaction, status_code=201)
def react(req: ReactionRequest):
    return service.react(req)


@router.get("/react/user/{user_id}", response_model=List[EmotionalReaction])
def reactions_for_user(user_id: str, limit: int = Query(200, ge=1, le=1000)):
    return service.reactions_for_user(user_id, limit=limit)


@router.get("/react/target/{target_type}/{target_id}", response_model=List[EmotionalReaction])
def reactions_for_target(target_type: str, target_id: str):
    return service.reactions_for_target(target_type, target_id)
