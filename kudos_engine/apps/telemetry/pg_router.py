"""
T1.4 Postgres-aware Telemetry router.

Acepta eventos anonimos (sin auth) y autenticados.
Rate limit canonico 30/min por IP.
trust_level se asigna en escritura (NORMAL default).
"""
from __future__ import annotations

import uuid
from typing import List, Optional, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.auth.dependencies import get_optional_user
from kudos_engine.db.database import get_async_session
from kudos_engine.db.models.user import User
from kudos_engine.db.repositories.telemetry_repo import TelemetryRepository
from kudos_engine.security.rate_limit import limiter, RL_TELEMETRY
from kudos_engine.security.validation import (
    validate_poi_id, validate_capsule_id, validate_session_id,
    validate_event_type, truncate_payload, truncate_reason,
)
from kudos_engine.security.trust import TrustLevel, DEFAULT_TRUST


router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])


class EventIn(BaseModel):
    session_id: str
    event_type: str
    poi_id: Optional[str] = None
    capsule_id: Optional[str] = None
    payload: Optional[Dict[str, Any]] = Field(default_factory=dict)
    event_reason: Optional[str] = None


class BatchIn(BaseModel):
    events: List[EventIn]


def _validate_event(e: EventIn) -> None:
    validate_session_id(e.session_id)
    validate_event_type(e.event_type)
    validate_poi_id(e.poi_id)
    validate_capsule_id(e.capsule_id)
    truncate_payload(e.payload)
    truncate_reason(e.event_reason)


@router.post("/event", status_code=202)
@limiter.limit(RL_TELEMETRY)
async def add_event(
    body: EventIn,
    request: Request,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_async_session),
):
    _validate_event(body)
    repo = TelemetryRepository(db)
    ev = await repo.add_event(
        session_id=body.session_id,
        event_type=body.event_type,
        user_id=user.id if user else None,
        poi_id=body.poi_id,
        capsule_id=body.capsule_id,
        payload=body.payload or {},
        event_reason=body.event_reason,
    )
    # trust_level se setea via default normal en BD. Classifier real en futura fase.
    await db.commit()
    return {"id": ev.id, "trust_level": DEFAULT_TRUST.value}


@router.post("/batch", status_code=202)
@limiter.limit(RL_TELEMETRY)
async def add_batch(
    body: BatchIn,
    request: Request,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_async_session),
):
    if len(body.events) > 100:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail="max 100 events per batch")
    for e in body.events:
        _validate_event(e)
    repo = TelemetryRepository(db)
    n = 0
    for e in body.events:
        await repo.add_event(
            session_id=e.session_id, event_type=e.event_type,
            user_id=user.id if user else None,
            poi_id=e.poi_id, capsule_id=e.capsule_id,
            payload=e.payload or {}, event_reason=e.event_reason,
        )
        n += 1
    await db.commit()
    return {"accepted": n}


@router.get("/top-pois")
async def top_pois(hours: int = 24, limit: int = 10,
                    db: AsyncSession = Depends(get_async_session)):
    if hours not in (1, 24, 168):
        hours = 24
    if limit < 1 or limit > 50:
        limit = 10
    repo = TelemetryRepository(db)
    return await repo.top_pois(hours=hours, limit=limit)
