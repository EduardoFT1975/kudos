"""
T3.2 EJEC Day 10 · Admin Metrics router.

Endpoints internos (require X-Admin-Token):
  GET /api/admin/metrics                  -> 5 metricas core MVP (24h, 7d, 30d)
  GET /api/admin/metrics/timeseries       -> serie temporal por dia (ultimos 30d)
  GET /api/admin/metrics/top-cores        -> ranking por completion rate

Acceso restringido: header X-Admin-Token == KUDOS_ADMIN_TOKEN env var.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select, func, distinct, and_
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.apps.core_engine.selector import CORE_BY_DAY
from kudos_engine.db.database import get_async_session
from kudos_engine.db.models.telemetry import TelemetryEvent


router = APIRouter(prefix="/api/admin", tags=["admin"])


def _require_admin(token: str | None) -> None:
    expected = os.getenv("KUDOS_ADMIN_TOKEN")
    if not expected:
        raise HTTPException(503, detail="KUDOS_ADMIN_TOKEN no configurada")
    if token != expected:
        raise HTTPException(401, detail="invalid admin token")


async def _users_with_event(
    db: AsyncSession, event_type: str | list[str], since: datetime,
) -> int:
    """Devuelve n de usuarios distintos (incl. anon via session_id) con un event_type."""
    if isinstance(event_type, str):
        types = [event_type]
    else:
        types = event_type
    # Tomamos session_id como proxy de usuario (mas inclusivo que user_id que solo cubre auth)
    stmt = (
        select(func.count(distinct(TelemetryEvent.session_id)))
        .where(
            TelemetryEvent.event_type.in_(types),
            TelemetryEvent.ts >= since,
        )
    )
    r = await db.execute(stmt)
    return int(r.scalar_one() or 0)


async def _users_with_core_play(db: AsyncSession, since: datetime) -> int:
    """Usuarios distintos que abrieron al menos un Core."""
    return await _users_with_event(db, "core_view_start", since)


async def _users_with_core_complete(db: AsyncSession, since: datetime) -> int:
    return await _users_with_event(db, "core_completed", since)


async def _users_with_resonance(db: AsyncSession, since: datetime) -> int:
    return await _users_with_event(db, "resonance", since)


async def _users_with_reflection(db: AsyncSession, since: datetime) -> int:
    return await _users_with_event(db, "reflection_submitted", since)


async def _users_with_return_visit(db: AsyncSession, since: datetime) -> int:
    return await _users_with_event(db, "return_visit_to_poi", since)


async def _users_with_transformation_signals(db: AsyncSession, since: datetime, min_signals: int = 3) -> int:
    """
    DTI preliminar: usuarios con >= min_signals senales de transformacion distintas.
    Senales: resonance, reflection_submitted, return_visit_to_poi, share_initiated, added_to_my_world, narrative_opened.
    """
    TRANSFORMATION_TYPES = [
        "resonance", "reflection_submitted", "return_visit_to_poi",
        "share_initiated", "added_to_my_world", "narrative_opened",
        "shift_acknowledged",
    ]
    # Subquery: por session, contar tipos distintos de los transformation_types
    stmt = (
        select(TelemetryEvent.session_id)
        .where(
            TelemetryEvent.event_type.in_(TRANSFORMATION_TYPES),
            TelemetryEvent.ts >= since,
        )
        .group_by(TelemetryEvent.session_id)
        .having(func.count(distinct(TelemetryEvent.event_type)) >= min_signals)
    )
    r = await db.execute(stmt)
    rows = r.fetchall()
    return len(rows)


async def _build_window(db: AsyncSession, hours: int) -> dict[str, Any]:
    """Computa las 5 metricas para una ventana temporal en horas."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    plays = await _users_with_core_play(db, since)
    completes = await _users_with_core_complete(db, since)
    resonances = await _users_with_resonance(db, since)
    reflections = await _users_with_reflection(db, since)
    returns = await _users_with_return_visit(db, since)
    dti = await _users_with_transformation_signals(db, since, min_signals=3)

    def pct(num: int, den: int) -> float:
        if den == 0:
            return 0.0
        return round((num / den) * 100, 1)

    return {
        "window_hours": hours,
        "since": since.isoformat(),
        "core_plays": plays,
        "core_completes": completes,
        "completion_rate_pct": pct(completes, plays),
        "resonance_rate_pct": pct(resonances, completes),
        "reflection_rate_pct": pct(reflections, completes),
        "return_visit_rate_pct": pct(returns, plays),
        "dti_preliminary_pct": pct(dti, plays),
    }


@router.get("/metrics")
async def metrics(
    x_admin_token: str | None = Header(None),
    db: AsyncSession = Depends(get_async_session),
):
    """5 metricas core MVP en 3 ventanas (24h, 7d, 30d)."""
    _require_admin(x_admin_token)
    return {
        "now": datetime.now(timezone.utc).isoformat(),
        "windows": {
            "24h":  await _build_window(db, 24),
            "7d":   await _build_window(db, 24 * 7),
            "30d":  await _build_window(db, 24 * 30),
        },
        "targets": {
            "completion_rate_pct":  {"minimum_viable": 50, "good": 65, "excellent": 80},
            "resonance_rate_pct":   {"minimum_viable": 30, "good": 45, "excellent": 60},
            "reflection_rate_pct":  {"minimum_viable": 10, "good": 20, "excellent": 35},
            "return_visit_rate_pct":{"minimum_viable": 15, "good": 25, "excellent": 40},
            "dti_preliminary_pct":  {"minimum_viable": 15, "good": 25, "excellent": 40},
        },
    }


@router.get("/metrics/top-cores")
async def top_cores(
    x_admin_token: str | None = Header(None),
    db: AsyncSession = Depends(get_async_session),
):
    """Ranking de los 7 Core por completion + resonance rate (ultimos 7d)."""
    _require_admin(x_admin_token)
    since = datetime.now(timezone.utc) - timedelta(days=7)
    rows = []
    for poi_id in CORE_BY_DAY:
        plays_q = await db.execute(
            select(func.count(distinct(TelemetryEvent.session_id)))
            .where(
                TelemetryEvent.poi_id == poi_id,
                TelemetryEvent.event_type == "core_view_start",
                TelemetryEvent.ts >= since,
            )
        )
        plays = int(plays_q.scalar_one() or 0)
        comp_q = await db.execute(
            select(func.count(distinct(TelemetryEvent.session_id)))
            .where(
                TelemetryEvent.poi_id == poi_id,
                TelemetryEvent.event_type == "core_completed",
                TelemetryEvent.ts >= since,
            )
        )
        completes = int(comp_q.scalar_one() or 0)
        res_q = await db.execute(
            select(func.count(distinct(TelemetryEvent.session_id)))
            .where(
                TelemetryEvent.poi_id == poi_id,
                TelemetryEvent.event_type == "resonance",
                TelemetryEvent.ts >= since,
            )
        )
        resonances = int(res_q.scalar_one() or 0)
        rows.append({
            "poi_id": poi_id,
            "plays": plays,
            "completes": completes,
            "completion_rate_pct": round((completes / plays * 100) if plays else 0, 1),
            "resonance_rate_pct": round((resonances / completes * 100) if completes else 0, 1),
        })
    rows.sort(key=lambda r: r["completion_rate_pct"], reverse=True)
    return {"window_days": 7, "cores": rows}


@router.post("/cron/recompute-return-visits")
async def trigger_cron_return_visits(
    x_admin_token: str | None = Header(None),
    lookback_days: int = 30,
    db: AsyncSession = Depends(get_async_session),
):
    """Dispara la computacion de return_visit_to_poi (manualmente o desde cron worker)."""
    _require_admin(x_admin_token)
    from kudos_engine.apps.admin_metrics.cron import compute_return_visits
    n = await compute_return_visits(db, lookback_days=lookback_days)
    return {"ok": True, "created": n, "lookback_days": lookback_days}
