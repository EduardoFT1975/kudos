"""
T3.2 EJEC Day 3 · Core Engine router.

Endpoints:
  GET  /api/core/today                   -> Core del dia + narrative + shift (publico)
  GET  /api/core/{poi_id}                -> Core especifico + narrative + shift (publico)
  POST /api/core/{poi_id}/start          -> Marca inicio lectura (auth opcional · rate-limited)
  POST /api/core/{poi_id}/complete       -> Marca completion >= 80% (auth opcional · sube DTI signal)
  GET  /api/core/{poi_id}/rate-limit-status -> Devuelve cuanto falta para poder consumir otro Core

Disciplina T3.1:
  - Maximo 1 Core/dia por usuario autenticado (rate limit blando, NO bloquea exploracion)
  - Anonimos pueden ver Cores sin limite (no hay user_id para rate-limitar)
  - Si autenticado intenta segundo Core en <24h, devuelve 429 con Retry-After
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.apps.core_engine.selector import (
    get_core_for_today, is_core, core_pillar, CORE_BY_DAY,
)
from kudos_engine.auth.dependencies import get_optional_user
from kudos_engine.db.database import get_async_session
from kudos_engine.db.models.content import Narrative
from kudos_engine.db.models.shift import DiscoveryShift
from kudos_engine.db.models.telemetry import TelemetryEvent
from kudos_engine.db.models.user import User
from kudos_engine.db.repositories.telemetry_repo import TelemetryRepository
from kudos_engine.security.rate_limit import limiter
from kudos_engine.security.validation import validate_poi_id


router = APIRouter(prefix="/api/core", tags=["core"])


# =============================================================
# Schemas
# =============================================================

class ShiftOut(BaseModel):
    before: str
    discovery: str
    after: str
    identity_from: Optional[str] = None
    identity_to: Optional[str] = None
    action_potential: Optional[str] = None
    action_friction: str = "low"


class NarrativeOut(BaseModel):
    id: str
    title: Optional[str]
    hook: Optional[str]
    body_md: Optional[str]
    duration_s: Optional[int]
    emotion: Optional[str]
    story_score: Optional[float]


class CorePayload(BaseModel):
    poi_id: str
    pillar: Optional[str]
    is_today: bool
    narrative: Optional[NarrativeOut]
    shift: Optional[ShiftOut]
    canonical_order: int   # 0..6


class RateLimitStatus(BaseModel):
    can_consume: bool
    last_core_at: Optional[datetime] = None
    next_available_at: Optional[datetime] = None
    seconds_until_next: int = 0


# =============================================================
# Helpers
# =============================================================

async def _load_narrative(db: AsyncSession, poi_id: str) -> Optional[Narrative]:
    stmt = (
        select(Narrative)
        .where(
            Narrative.poi_id == poi_id,
            Narrative.narrative_type == "why_it_matters",
            Narrative.language == "es",
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _load_shift(db: AsyncSession, poi_id: str) -> Optional[DiscoveryShift]:
    stmt = (
        select(DiscoveryShift)
        .where(DiscoveryShift.poi_id == poi_id, DiscoveryShift.language == "es")
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


def _narr_to_out(n: Narrative) -> NarrativeOut:
    return NarrativeOut(
        id=str(n.id),
        title=n.title,
        hook=n.hook,
        body_md=n.body_md,
        duration_s=n.duration_s,
        emotion=n.emotion,
        story_score=n.story_score,
    )


def _shift_to_out(s: DiscoveryShift) -> ShiftOut:
    return ShiftOut(
        before=s.before_statement,
        discovery=s.discovery_revealed,
        after=s.after_statement,
        identity_from=s.identity_shift_from,
        identity_to=s.identity_shift_to,
        action_potential=s.action_potential,
        action_friction=s.action_friction,
    )


async def _build_payload(db: AsyncSession, poi_id: str) -> CorePayload:
    narr = await _load_narrative(db, poi_id)
    shift = await _load_shift(db, poi_id)
    return CorePayload(
        poi_id=poi_id,
        pillar=core_pillar(poi_id),
        is_today=poi_id == get_core_for_today(),
        narrative=_narr_to_out(narr) if narr else None,
        shift=_shift_to_out(shift) if shift else None,
        canonical_order=CORE_BY_DAY.index(poi_id) if is_core(poi_id) else -1,
    )


# Constante: ventana rate limit del Core (24 horas)
CORE_RATE_LIMIT_HOURS = 24


async def _last_core_completed_at(db: AsyncSession, user_id) -> Optional[datetime]:
    """Devuelve cuando el usuario completo su ultimo Core (event_type=core_completed)."""
    if user_id is None:
        return None
    stmt = (
        select(TelemetryEvent.ts)
        .where(
            TelemetryEvent.user_id == user_id,
            TelemetryEvent.event_type == "core_completed",
        )
        .order_by(desc(TelemetryEvent.ts))
        .limit(1)
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    return row


# =============================================================
# Endpoints
# =============================================================

@router.get("/today", response_model=CorePayload)
async def get_core_today(db: AsyncSession = Depends(get_async_session)):
    """Devuelve el Core del dia. Publico, sin auth."""
    poi_id = get_core_for_today()
    return await _build_payload(db, poi_id)


@router.get("/{poi_id}", response_model=CorePayload)
async def get_core(poi_id: str, db: AsyncSession = Depends(get_async_session)):
    validate_poi_id(poi_id)
    if not is_core(poi_id):
        raise HTTPException(404, detail="POI no pertenece al Humanity Core")
    return await _build_payload(db, poi_id)


class StartRequest(BaseModel):
    session_id: str


@router.post("/{poi_id}/start", status_code=202)
@limiter.limit("60/minute")  # anti-spam, no rate limit Core
async def start_core(
    poi_id: str,
    body: StartRequest,
    request: Request,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Marca inicio de lectura Core. NO consume rate limit (solo `complete` lo hace)."""
    validate_poi_id(poi_id)
    if not is_core(poi_id):
        raise HTTPException(404, detail="POI no pertenece al Humanity Core")
    repo = TelemetryRepository(db)
    await repo.add_event(
        session_id=body.session_id,
        event_type="core_view_start",
        user_id=user.id if user else None,
        poi_id=poi_id,
        payload={"pillar": core_pillar(poi_id)},
    )
    await db.commit()
    return {"ok": True}


class CompleteRequest(BaseModel):
    session_id: str
    completion_pct: int           # 0..100
    duration_s: Optional[int] = None


@router.post("/{poi_id}/complete", status_code=202)
@limiter.limit("60/minute")
async def complete_core(
    poi_id: str,
    body: CompleteRequest,
    request: Request,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Marca completion del Core. Si completion_pct >= 80, cuenta como completion real
    y dispara el rate limit 24h del usuario autenticado.

    Anonimos: completion se registra para metricas agregadas, sin rate limit.
    """
    validate_poi_id(poi_id)
    if not is_core(poi_id):
        raise HTTPException(404, detail="POI no pertenece al Humanity Core")
    if not (0 <= body.completion_pct <= 100):
        raise HTTPException(400, detail="completion_pct fuera de rango")

    # Si autenticado y >=80% Y ya consumio un Core en <24h: rechazar (rate limit)
    if user and body.completion_pct >= 80:
        last_at = await _last_core_completed_at(db, user.id)
        if last_at is not None:
            now = datetime.now(timezone.utc)
            elapsed = now - last_at
            if elapsed < timedelta(hours=CORE_RATE_LIMIT_HOURS):
                wait_seconds = int((timedelta(hours=CORE_RATE_LIMIT_HOURS) - elapsed).total_seconds())
                raise HTTPException(
                    status_code=429,
                    detail=f"Solo 1 Core por dia. Vuelve en {wait_seconds // 3600}h {(wait_seconds % 3600) // 60}m.",
                    headers={"Retry-After": str(wait_seconds)},
                )

    repo = TelemetryRepository(db)
    event_type = "core_completed" if body.completion_pct >= 80 else "core_partial"
    await repo.add_event(
        session_id=body.session_id,
        event_type=event_type,
        user_id=user.id if user else None,
        poi_id=poi_id,
        payload={
            "pillar": core_pillar(poi_id),
            "completion_pct": body.completion_pct,
            "duration_s": body.duration_s,
        },
    )
    await db.commit()
    return {"ok": True, "event": event_type}


@router.get("/{poi_id}/rate-limit-status", response_model=RateLimitStatus)
async def rate_limit_status(
    poi_id: str,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Devuelve si el usuario puede consumir otro Core ahora o cuanto tiempo falta."""
    validate_poi_id(poi_id)
    if user is None:
        # Anonimo: siempre puede
        return RateLimitStatus(can_consume=True)
    last_at = await _last_core_completed_at(db, user.id)
    if last_at is None:
        return RateLimitStatus(can_consume=True)
    now = datetime.now(timezone.utc)
    elapsed = now - last_at
    if elapsed >= timedelta(hours=CORE_RATE_LIMIT_HOURS):
        return RateLimitStatus(can_consume=True, last_core_at=last_at)
    wait = int((timedelta(hours=CORE_RATE_LIMIT_HOURS) - elapsed).total_seconds())
    return RateLimitStatus(
        can_consume=False,
        last_core_at=last_at,
        next_available_at=now + timedelta(seconds=wait),
        seconds_until_next=wait,
    )
