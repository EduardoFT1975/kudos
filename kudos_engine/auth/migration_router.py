"""
POST /api/save/migrate-anon
Recibe array de saves desde localStorage cliente y los persiste con user_id JWT.
Idempotente: no crea duplicados si el (user, poi) ya existe.
"""
from __future__ import annotations

from typing import List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from kudos_engine.auth.dependencies import get_current_user
from kudos_engine.db.database import get_async_session
from kudos_engine.db.models.user import User
from kudos_engine.db.models.save import Save
from kudos_engine.db.repositories.save_repo import SaveRepository


router = APIRouter(prefix="/api/save", tags=["save"])


class AnonSaveItem(BaseModel):
    poi_id: str
    capsule_id: Optional[str] = None
    motivation: Optional[str] = None
    themes: Optional[List[str]] = Field(default_factory=list)
    emotional_reason: Optional[str] = None
    collection_type: str = "personal"


class MigrateAnonRequest(BaseModel):
    saves: List[AnonSaveItem]


class MigrateAnonResponse(BaseModel):
    migrated: int
    skipped: int
    total: int


@router.post("/migrate-anon", response_model=MigrateAnonResponse)
async def migrate_anon(
    body: MigrateAnonRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Persiste array de saves anonimos al usuario autenticado. Skip duplicados."""
    if len(body.saves) > 500:
        raise HTTPException(400, detail="Demasiados saves en una sola llamada (max 500)")

    repo = SaveRepository(db)
    migrated = 0
    skipped = 0

    for item in body.saves:
        # Skip duplicate (mismo poi_id ya guardado por este user)
        existing_stmt = select(Save).where(
            Save.user_id == current_user.id,
            Save.poi_id == item.poi_id,
            Save.collection_type == item.collection_type,
        ).limit(1)
        existing = (await db.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            skipped += 1
            continue

        await repo.create_save(
            user_id=current_user.id,
            poi_id=item.poi_id,
            capsule_id=item.capsule_id,
            motivation=item.motivation,
            themes=item.themes or [],
            emotional_reason=item.emotional_reason,
            collection_type=item.collection_type,
        )
        migrated += 1

    await db.commit()
    return MigrateAnonResponse(
        migrated=migrated,
        skipped=skipped,
        total=len(body.saves),
    )
