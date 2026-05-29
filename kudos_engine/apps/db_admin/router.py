"""
DB Admin router · T1.2 Postgres Foundation.

Endpoints:
  GET  /api/db/health         · verifica conexion + cuenta tablas pobladas
  POST /api/db/seed           · ejecuta seed_initial (require KUDOS_ADMIN_TOKEN)

Estos endpoints SOLO se montan si KUDOS_USE_POSTGRES=true.
"""
from __future__ import annotations

import os
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.db.database import get_async_session, is_postgres_enabled


router = APIRouter(prefix="/api/db", tags=["db-admin"])


def _require_admin(token: str | None) -> None:
    expected = os.getenv("KUDOS_ADMIN_TOKEN")
    if not expected:
        raise HTTPException(503, detail="KUDOS_ADMIN_TOKEN not configured")
    if token != expected:
        raise HTTPException(401, detail="invalid admin token")


@router.get("/health")
async def db_health(db: AsyncSession = Depends(get_async_session)):
    """Verifica conexion y devuelve conteo basico de filas por tabla."""
    if not is_postgres_enabled():
        raise HTTPException(503, detail="Postgres no habilitado (KUDOS_USE_POSTGRES=false)")
    counts = {}
    for tbl in [
        "users", "refresh_tokens", "saves", "visits", "watched", "resonances",
        "memory_prompts", "poi_signals", "telemetry_events",
        "capsules", "narratives", "poi_relationships", "merit_overrides",
    ]:
        try:
            r = await db.execute(text(f"SELECT COUNT(*) FROM {tbl}"))
            counts[tbl] = int(r.scalar_one())
        except Exception as e:
            counts[tbl] = f"err:{type(e).__name__}"
    return {"ok": True, "tables": counts}


@router.post("/seed")
async def db_seed(
    x_admin_token: str | None = Header(None),
    db: AsyncSession = Depends(get_async_session),
):
    """Ejecuta seed_initial. Require header X-Admin-Token == KUDOS_ADMIN_TOKEN."""
    _require_admin(x_admin_token)
    if not is_postgres_enabled():
        raise HTTPException(503, detail="Postgres no habilitado")
    from kudos_engine.db.seed.seed_initial import (
        seed_capsules, seed_narratives, seed_relationships,
    )
    capsules = await seed_capsules(db)
    narratives = await seed_narratives(db)
    relationships = await seed_relationships(db)
    return {
        "ok": True,
        "seeded": {
            "capsules": capsules,
            "narratives": narratives,
            "relationships": relationships,
        },
    }
