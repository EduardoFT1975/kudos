"""T1.4 Postgres-aware Signals router."""
from __future__ import annotations

import os
from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.db.database import get_async_session
from kudos_engine.db.models.signals import PoiSignals
from kudos_engine.db.repositories.signals_repo import SignalsRepository
from kudos_engine.security.validation import validate_poi_id


router = APIRouter(prefix="/api/signals", tags=["signals"])


def _require_admin(token: str | None) -> None:
    expected = os.getenv("KUDOS_ADMIN_TOKEN")
    if not expected:
        raise HTTPException(503, detail="KUDOS_ADMIN_TOKEN no configurada")
    if token != expected:
        raise HTTPException(401, detail="invalid admin token")


@router.get("/{poi_id}")
async def get_signals(poi_id: str, db: AsyncSession = Depends(get_async_session)):
    validate_poi_id(poi_id)
    repo = SignalsRepository(db)
    sig = await repo.get_for_poi(poi_id)
    if not sig:
        raise HTTPException(404, detail="signals no calculadas para este POI")
    return {
        "poi_id": sig.poi_id,
        "discovery_score": sig.discovery_score,
        "importance_score": sig.importance_score,
        "memory_score": sig.memory_score,
        "emotion_score": sig.emotion_score,
        "future_value_score": sig.future_value_score,
        "emotion_profile": sig.emotion_profile,
        "total_views": sig.total_views,
        "total_saves": sig.total_saves,
        "total_visits": sig.total_visits,
        "total_resonances": sig.total_resonances,
        "updated_at": sig.updated_at.isoformat() if sig.updated_at else None,
    }


@router.post("/{poi_id}/recompute")
async def recompute_one(
    poi_id: str,
    x_admin_token: str | None = Header(None),
    db: AsyncSession = Depends(get_async_session),
):
    _require_admin(x_admin_token)
    validate_poi_id(poi_id)
    repo = SignalsRepository(db)
    sig = await repo.recompute_for_poi(poi_id)
    await db.commit()
    return {"ok": True, "poi_id": sig.poi_id,
            "discovery_score": sig.discovery_score,
            "importance_score": sig.importance_score,
            "emotion_score": sig.emotion_score}


@router.get("/top/{score}")
async def top_by_score(score: str, limit: int = 20,
                        db: AsyncSession = Depends(get_async_session)):
    allowed = {"discovery_score", "importance_score", "memory_score",
                "emotion_score", "future_value_score"}
    if score not in allowed:
        raise HTTPException(400, detail=f"score debe ser uno de {sorted(allowed)}")
    if limit < 1 or limit > 100:
        limit = 20
    repo = SignalsRepository(db)
    rows = await repo.top_by_score(score, limit=limit)
    return [{"poi_id": r.poi_id, "score": getattr(r, score)} for r in rows]
