"""
KUDOS Capsule Engine v2 · /api/save router · Personal World extendido + Memory.
"""
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Query, HTTPException

from kudos_engine.apps.save import service
from kudos_engine.apps.save.models import (
    SavedWorld, SaveRequest, MemoryUpdateRequest,
    VisitedWorld, VisitRequest,
    WatchedCapsule, WatchRequest,
    EmotionalResonance, ResonanceRequest,
)


router = APIRouter(prefix="/api/save", tags=["save"])


# ─── World Collection Engine ─────────────────────────────────────────

@router.post("/", response_model=SavedWorld, status_code=201)
def add_to_my_world(req: SaveRequest):
    """Añadir un POI a Mi Mundo (NO 'favorito')."""
    return service.save(req)


@router.get("/user/{user_id}", response_model=List[SavedWorld])
def list_for_user(user_id: str, limit: int = Query(100, ge=1, le=500)):
    return service.list_for_user(user_id, limit=limit)


@router.delete("/{save_id}", status_code=204)
def remove_from_my_world(save_id: str):
    if not service.unsave(save_id):
        raise HTTPException(404, detail="Save not found")


@router.get("/count/poi/{poi_id}")
def count_for_poi(poi_id: str):
    return {"poi_id": poi_id, "saves": service.count_for_poi(poi_id)}


# ─── Memory Engine · Capa 4 ─────────────────────────────────────────

@router.post("/memory", response_model=SavedWorld)
def update_memory(req: MemoryUpdateRequest):
    """Usuario responde al MemoryPrompt: still_relevant / released / want_to_revisit."""
    s = service.update_memory(req)
    if not s:
        raise HTTPException(404, detail="Save not found")
    return s


@router.get("/memory/stale/{user_id}", response_model=List[SavedWorld])
def stale_saves(user_id: str, older_than_days: int = Query(90, ge=1),
                 limit: int = Query(5, ge=1, le=20)):
    """Items guardados hace >N días que nunca recibieron memory update.
       El frontend usa esto para mostrar MemoryPrompt."""
    return service.stale_saves_for_user(user_id, older_than_days=older_than_days, limit=limit)


# ─── Visited ─────────────────────────────────────────────────────────

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


# ─── Emotional Resonance · Capa 5 ────────────────────────────────────

@router.post("/resonance", response_model=EmotionalResonance, status_code=201)
def resonate(req: ResonanceRequest):
    """Resonancia emocional · UNA pulsación · NO like/dislike."""
    return service.resonate(req)


@router.get("/resonance/user/{user_id}", response_model=List[EmotionalResonance])
def resonances_for_user(user_id: str, limit: int = Query(200, ge=1, le=1000)):
    return service.resonances_for_user(user_id, limit=limit)


@router.get("/resonance/target/{target_type}/{target_id}", response_model=List[EmotionalResonance])
def resonances_for_target(target_type: str, target_id: str):
    return service.resonances_for_target(target_type, target_id)


# Aliases legacy (compat)
@router.post("/react", response_model=EmotionalResonance, status_code=201)
def react(req: ResonanceRequest):
    return service.resonate(req)
