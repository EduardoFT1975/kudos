"""
T1.4 Postgres-aware Save router.

Reemplaza save/router.py JSON legacy cuando KUDOS_USE_POSTGRES=true.

WHO / WHAT / WHY / WHEN columnas pobladas (GPT-5 directive T1.4):
  WHO  - user_id (JWT)
  WHAT - poi_id / capsule_id / resonance_type
  WHY  - motivation / visit_reason / watch_reason / resonance_reason / memory_reason
  WHEN - created_at / visited_at / watched_at / prompted_at (server defaults)
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from kudos_engine.auth.dependencies import get_current_user
from kudos_engine.db.database import get_async_session
from kudos_engine.db.models.user import User
from kudos_engine.db.models.save import (
    Save, Visit, Watched, Resonance, MemoryPrompt,
    SAVE_MOTIVATIONS, VISIT_REASONS, WATCH_REASONS, RESONANCE_TYPES, MEMORY_RESPONSES,
)
from kudos_engine.db.repositories.save_repo import SaveRepository
from kudos_engine.security.rate_limit import limiter, RL_SAVE
from kudos_engine.security.validation import (
    validate_poi_id, validate_capsule_id, truncate_reason,
)


router = APIRouter(prefix="/api/save", tags=["save"])


# ============ Pydantic schemas ============

class SaveCreate(BaseModel):
    poi_id: str
    capsule_id: Optional[str] = None
    motivation: Optional[str] = Field(None, description="WHY: " + " | ".join(SAVE_MOTIVATIONS))
    themes: Optional[List[str]] = Field(default_factory=list)
    emotional_reason: Optional[str] = None
    collection_type: str = "personal"


class SaveOut(BaseModel):
    id: str
    user_id: str
    poi_id: str
    capsule_id: Optional[str]
    motivation: Optional[str]
    themes: Optional[Any]
    emotional_reason: Optional[str]
    collection_type: str
    memory_status: str
    created_at: datetime


def _save_to_out(s: Save) -> SaveOut:
    return SaveOut(
        id=str(s.id), user_id=str(s.user_id), poi_id=s.poi_id,
        capsule_id=s.capsule_id, motivation=s.motivation,
        themes=s.themes, emotional_reason=s.emotional_reason,
        collection_type=s.collection_type, memory_status=s.memory_status,
        created_at=s.created_at,
    )


# ============ SAVES ============

@router.post("/", response_model=SaveOut, status_code=201)
@limiter.limit(RL_SAVE)
async def create_save(
    body: SaveCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    validate_poi_id(body.poi_id)
    validate_capsule_id(body.capsule_id)
    if body.motivation and body.motivation not in SAVE_MOTIVATIONS:
        raise HTTPException(400, detail=f"motivation invalida. Valores: {SAVE_MOTIVATIONS}")

    repo = SaveRepository(db)
    save = await repo.create_save(
        user_id=current_user.id,
        poi_id=body.poi_id,
        capsule_id=body.capsule_id,
        motivation=body.motivation,
        themes=body.themes or [],
        emotional_reason=truncate_reason(body.emotional_reason),
        collection_type=body.collection_type,
    )
    await db.commit()
    return _save_to_out(save)


@router.get("/user/me", response_model=List[SaveOut])
async def list_my_saves(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    repo = SaveRepository(db)
    saves = await repo.list_by_user(current_user.id, limit=limit)
    return [_save_to_out(s) for s in saves]


@router.delete("/{save_id}", status_code=204)
async def delete_save(
    save_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    repo = SaveRepository(db)
    ok = await repo.delete_save(save_id, current_user.id)
    if not ok:
        # Sin user_id match: 404 (no revelar si existe el id)
        raise HTTPException(404, detail="save not found")
    await db.commit()


@router.get("/count/poi/{poi_id}")
async def count_saves_for_poi(poi_id: str, db: AsyncSession = Depends(get_async_session)):
    validate_poi_id(poi_id)
    repo = SaveRepository(db)
    n = await repo.count_by_poi(poi_id)
    return {"poi_id": poi_id, "count": n}


# ============ MEMORY ============

class MemoryUpdate(BaseModel):
    save_id: uuid.UUID
    status: str = Field(..., description=" | ".join(MEMORY_RESPONSES))
    memory_reason: Optional[str] = None


@router.post("/memory", response_model=SaveOut)
async def update_memory(
    body: MemoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    if body.status not in MEMORY_RESPONSES:
        raise HTTPException(400, detail=f"status invalido. Valores: {MEMORY_RESPONSES}")
    repo = SaveRepository(db)
    # Verificar ownership del save antes de actualizar
    save = await db.get(Save, body.save_id)
    if not save or save.user_id != current_user.id:
        raise HTTPException(404, detail="save not found")
    updated = await repo.update_memory_status(
        body.save_id, body.status,
        memory_reason=truncate_reason(body.memory_reason),
    )
    await db.commit()
    return _save_to_out(updated)


@router.get("/memory/stale/me", response_model=List[SaveOut])
async def list_my_stale(
    older_than_days: int = 90,
    limit: int = 5,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    repo = SaveRepository(db)
    saves = await repo.list_stale_for_user(current_user.id, older_than_days, limit)
    return [_save_to_out(s) for s in saves]


# ============ VISITS ============

class VisitCreate(BaseModel):
    poi_id: str
    source: Optional[str] = None
    visit_reason: Optional[str] = None      # WHY


@router.post("/visit", status_code=201)
async def create_visit(
    body: VisitCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    validate_poi_id(body.poi_id)
    if body.visit_reason and body.visit_reason not in VISIT_REASONS:
        raise HTTPException(400, detail=f"visit_reason invalida. Valores: {VISIT_REASONS}")
    repo = SaveRepository(db)
    v = await repo.add_visit(
        user_id=current_user.id, poi_id=body.poi_id,
        source=body.source, visit_reason=body.visit_reason,
    )
    await db.commit()
    return {"id": str(v.id), "poi_id": v.poi_id, "visited_at": v.visited_at.isoformat()}


# ============ WATCHED ============

class WatchedCreate(BaseModel):
    capsule_id: str
    poi_id: Optional[str] = None
    completion_pct: Optional[int] = None
    watch_reason: Optional[str] = None      # WHY


@router.post("/watch", status_code=201)
async def create_watched(
    body: WatchedCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    validate_capsule_id(body.capsule_id)
    validate_poi_id(body.poi_id)
    if body.watch_reason and body.watch_reason not in WATCH_REASONS:
        raise HTTPException(400, detail=f"watch_reason invalida. Valores: {WATCH_REASONS}")
    if body.completion_pct is not None and not (0 <= body.completion_pct <= 100):
        raise HTTPException(400, detail="completion_pct fuera de rango")
    repo = SaveRepository(db)
    w = await repo.add_watched(
        user_id=current_user.id, capsule_id=body.capsule_id, poi_id=body.poi_id,
        completion_pct=body.completion_pct, watch_reason=body.watch_reason,
    )
    await db.commit()
    return {"id": str(w.id), "capsule_id": w.capsule_id}


# ============ RESONANCES ============

class ResonanceCreate(BaseModel):
    poi_id: str
    capsule_id: Optional[str] = None
    resonance_type: str = Field(..., description=" | ".join(RESONANCE_TYPES))
    intensity: int = 1
    resonance_reason: Optional[str] = None      # WHY texto libre


@router.post("/resonance", status_code=201)
async def create_resonance(
    body: ResonanceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    validate_poi_id(body.poi_id)
    validate_capsule_id(body.capsule_id)
    if body.resonance_type not in RESONANCE_TYPES:
        raise HTTPException(400, detail=f"resonance_type invalido. Valores: {RESONANCE_TYPES}")
    if not (1 <= body.intensity <= 5):
        raise HTTPException(400, detail="intensity fuera de rango 1..5")
    repo = SaveRepository(db)
    r = await repo.add_resonance(
        user_id=current_user.id, poi_id=body.poi_id, capsule_id=body.capsule_id,
        resonance_type=body.resonance_type, intensity=body.intensity,
        resonance_reason=truncate_reason(body.resonance_reason),
    )
    await db.commit()
    return {"id": str(r.id), "poi_id": r.poi_id, "resonance_type": r.resonance_type}
