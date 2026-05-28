"""
KUDOS Capsule Engine v2 · /api/capsules router.
"""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from kudos_engine.apps.capsules import service
from kudos_engine.apps.capsules.models import Capsule, CapsuleCreate, CapsuleUpdate


router = APIRouter(prefix="/api/capsules", tags=["capsules"])


@router.get("/", response_model=List[Capsule])
def list_capsules(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    poi_id: Optional[str] = None,
    status: Optional[str] = None,
    tier: Optional[str] = None,
):
    return service.list_capsules(limit=limit, offset=offset, poi_id=poi_id,
                                  status=status, tier=tier)


@router.get("/count")
def count():
    return {"count": service.count_capsules()}


@router.post("/", response_model=Capsule, status_code=201)
def create_capsule(payload: CapsuleCreate):
    capsule = service.create_capsule(payload)
    if not capsule:
        raise HTTPException(404, detail="POI not found")
    return capsule


@router.get("/{capsule_id}", response_model=Capsule)
def get_capsule(capsule_id: str):
    capsule = service.get_capsule(capsule_id)
    if not capsule:
        raise HTTPException(404, detail="Capsule not found")
    return capsule


@router.patch("/{capsule_id}", response_model=Capsule)
def update_capsule(capsule_id: str, patch: CapsuleUpdate):
    capsule = service.update_capsule(capsule_id, patch)
    if not capsule:
        raise HTTPException(404, detail="Capsule not found")
    return capsule


@router.post("/{capsule_id}/publish", response_model=Capsule)
def publish(capsule_id: str):
    capsule = service.publish(capsule_id)
    if not capsule:
        raise HTTPException(404, detail="Capsule not found")
    return capsule


@router.post("/{capsule_id}/save", response_model=Capsule)
def increment_save(capsule_id: str):
    """Primary KPI · SAVE_RATE."""
    capsule = service.increment_save(capsule_id)
    if not capsule:
        raise HTTPException(404, detail="Capsule not found")
    return capsule


@router.delete("/{capsule_id}", status_code=204)
def delete_capsule(capsule_id: str):
    if not service.delete_capsule(capsule_id):
        raise HTTPException(404, detail="Capsule not found")
