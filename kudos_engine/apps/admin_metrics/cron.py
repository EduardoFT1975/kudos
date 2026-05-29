"""
T3.2 EJEC Day 11 · Cron return_visit_to_poi.

Computa eventos `return_visit_to_poi` derivados de la actividad real.

Definicion:
  Una `return_visit_to_poi` se registra cuando:
    - Hay >= 2 eventos poi_view o core_view_start o node_open
      del MISMO (session_id O user_id) sobre el MISMO poi_id
    - Con al menos 24 horas entre la primera y la siguiente
    - Y no se ha registrado ya un return_visit para ese mismo par desde la ultima visita base

Idempotente: usa unique check antes de insertar.

Disparable via:
  - /api/admin/cron/recompute-return-visits (endpoint protegido)
  - python -m kudos_engine.apps.admin_metrics.cron (CLI)
  - Render Background Worker schedule cada 6h
"""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, and_, asc, func
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.db.database import get_async_sessionmaker
from kudos_engine.db.models.telemetry import TelemetryEvent


RETURN_VISIT_GAP_HOURS = 24
BASE_EVENT_TYPES = ("poi_view", "core_view_start", "node_open")


async def compute_return_visits(
    session: AsyncSession, lookback_days: int = 30
) -> int:
    """
    Itera sobre visitas base de los ultimos N dias y crea return_visit_to_poi
    cuando detecta segunda visita >24h despues sin return previo registrado.
    Devuelve numero de eventos creados.
    """
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    # 1. Sacar todas las (session_id, poi_id, ts) ordenadas
    stmt = (
        select(
            TelemetryEvent.session_id,
            TelemetryEvent.user_id,
            TelemetryEvent.poi_id,
            TelemetryEvent.ts,
        )
        .where(
            TelemetryEvent.event_type.in_(BASE_EVENT_TYPES),
            TelemetryEvent.poi_id.is_not(None),
            TelemetryEvent.ts >= since,
        )
        .order_by(asc(TelemetryEvent.session_id), asc(TelemetryEvent.poi_id), asc(TelemetryEvent.ts))
    )
    result = await session.execute(stmt)
    rows = result.all()

    # 2. Agrupar por (session_id, poi_id) y detectar gaps >= 24h
    created = 0
    last_key = None
    last_ts = None
    last_return_logged = None  # para no duplicar dentro del mismo grupo

    # Saca los return_visit ya registrados para chequear duplicados
    existing_stmt = (
        select(
            TelemetryEvent.session_id, TelemetryEvent.poi_id, TelemetryEvent.ts,
        )
        .where(
            TelemetryEvent.event_type == "return_visit_to_poi",
            TelemetryEvent.ts >= since,
        )
    )
    existing_result = await session.execute(existing_stmt)
    existing_set = {(r[0], r[1], r[2].replace(microsecond=0, second=0, minute=0)) for r in existing_result.all()}

    for sid, uid, poi_id, ts in rows:
        key = (sid, poi_id)
        if key != last_key:
            last_key = key
            last_ts = ts
            last_return_logged = None
            continue

        # Mismo (session, poi): comprobar gap
        gap = (ts - last_ts).total_seconds() / 3600
        if gap >= RETURN_VISIT_GAP_HOURS:
            ts_hour = ts.replace(microsecond=0, second=0, minute=0)
            # Evitar duplicar dentro del mismo grupo en la misma hora
            if last_return_logged and (ts - last_return_logged).total_seconds() < RETURN_VISIT_GAP_HOURS * 3600:
                continue
            # Evitar duplicar contra existentes
            if (sid, poi_id, ts_hour) in existing_set:
                last_return_logged = ts
                continue
            session.add(TelemetryEvent(
                session_id=sid,
                user_id=uid,
                event_type="return_visit_to_poi",
                poi_id=poi_id,
                payload={"gap_hours": round(gap, 1), "computed_by": "cron"},
                ts=ts,
                trust_level="normal",
            ))
            existing_set.add((sid, poi_id, ts_hour))
            created += 1
            last_return_logged = ts
        last_ts = ts

    if created > 0:
        await session.commit()
    return created


# CLI standalone
async def _main():
    Session = get_async_sessionmaker()
    async with Session() as s:
        n = await compute_return_visits(s)
        print(f"[cron-return-visits] {n} return_visit_to_poi events created")


if __name__ == "__main__":
    asyncio.run(_main())
