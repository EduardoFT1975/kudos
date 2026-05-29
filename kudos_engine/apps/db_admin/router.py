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


@router.post("/upgrade")
async def db_upgrade(x_admin_token: str | None = Header(None)):
    """T3.2 Day 22+ - Ejecuta `alembic upgrade head` desde Python (sin shell).

    Aplica todas las migraciones pendientes (001 -> 002 -> 003 -> 004 -> 005).
    Idempotente: si ya estan aplicadas, no hace nada.
    Require X-Admin-Token.
    """
    _require_admin(x_admin_token)
    if not is_postgres_enabled():
        raise HTTPException(503, detail="Postgres no habilitado")

    import os
    from alembic import command
    from alembic.config import Config

    # Localizar alembic.ini (esta en la raiz del repo en deploy)
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    ini_path = os.path.join(repo_root, "alembic.ini")
    if not os.path.isfile(ini_path):
        ini_path = os.path.join(os.getcwd(), "alembic.ini")
    if not os.path.isfile(ini_path):
        raise HTTPException(500, detail=f"alembic.ini not found (cwd={os.getcwd()})")

    cfg = Config(ini_path)
    try:
        command.upgrade(cfg, "head")
    except Exception as e:
        raise HTTPException(500, detail=f"alembic upgrade failed: {type(e).__name__}: {e}")

    return {"ok": True, "msg": "alembic upgrade head completed"}


@router.post("/seed-humanity-core")
async def db_seed_humanity_core(
    x_admin_token: str | None = Header(None),
    db: AsyncSession = Depends(get_async_session),
):
    """T3.2 Day 1 - Carga las 7 narrativas + 7 Discovery Shifts del Humanity Core.

    Idempotente: usa upsert por (poi_id, language).
    Require X-Admin-Token.
    """
    _require_admin(x_admin_token)
    if not is_postgres_enabled():
        raise HTTPException(503, detail="Postgres no habilitado")

    try:
        from kudos_engine.db.seed.seed_humanity_core import seed_narratives, seed_shifts
    except ImportError as e:
        raise HTTPException(500, detail=f"seed_humanity_core import failed: {e}")

    try:
        n_narratives = await seed_narratives(db)
        n_shifts = await seed_shifts(db)
        await db.commit()
        return {
            "ok": True,
            "seeded": {
                "narratives": n_narratives,
                "discovery_shifts": n_shifts,
            },
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, detail=f"seed_humanity_core failed: {type(e).__name__}: {e}")
