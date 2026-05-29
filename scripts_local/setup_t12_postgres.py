"""
T1.2 setup · crea estructura kudos_engine/db/ + alembic/ + tests/ atomicamente.
Idempotente: si los archivos existen los sobreescribe (T1.2 es setup inicial).
"""
import os, tempfile

ROOT = "/sessions/exciting-jolly-mccarthy/mnt/kudos_project"
if not os.path.exists(ROOT):
    ROOT = r"C:\Users\efert\kudos_project"

KE = os.path.join(ROOT, "kudos_engine")


def atomic_write(rel_path: str, content: str):
    """Write content to ROOT/rel_path atomicamente."""
    full = os.path.join(ROOT, rel_path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    d = os.path.dirname(full)
    fd, tmp = tempfile.mkstemp(prefix=".tmp_", dir=d)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(content.encode("utf-8"))
        os.replace(tmp, full)
    except Exception:
        try: os.unlink(tmp)
        except: pass
        raise
    print(f"WROTE: {rel_path} ({len(content)} chars)")


# ============================================================
# 1. kudos_engine/db/__init__.py
# ============================================================
atomic_write("kudos_engine/db/__init__.py", '''"""
KUDOS Data Layer · T1.2 Postgres Foundation.

Modulo de persistencia productiva basado en SQLAlchemy 2.0 + asyncpg + Alembic.
Reemplaza progresivamente el JSON store legacy en kudos_engine/apps/core/db.py.

Activacion controlada por env var KUDOS_USE_POSTGRES=true.
"""
''')


# ============================================================
# 2. kudos_engine/db/database.py · engine + session factory
# ============================================================
atomic_write("kudos_engine/db/database.py", '''"""
KUDOS DataLayer · engine + session async + sync.

Two engines:
  - async_engine: usado por FastAPI runtime (asyncpg)
  - sync_engine:  usado por Alembic + scripts (psycopg2)

Ambos leen DATABASE_URL del entorno:
  postgresql+asyncpg://user:pass@host:port/dbname     (async)
  postgresql+psycopg2://user:pass@host:port/dbname    (sync)

Si DATABASE_URL no esta seteada, los engines lanzan al primer uso. Esto es
intencional: en modo legacy JSON, KUDOS_USE_POSTGRES=false y nadie llama
a estos engines.
"""
from __future__ import annotations

import os
from typing import AsyncGenerator, Generator, Optional

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker


def _async_url() -> str:
    """Devuelve DATABASE_URL convertida a driver asyncpg."""
    raw = os.getenv("DATABASE_URL")
    if not raw:
        raise RuntimeError(
            "DATABASE_URL no esta definida. Setea la variable de entorno antes de "
            "usar Postgres. Para modo legacy JSON, KUDOS_USE_POSTGRES=false."
        )
    # Render entrega postgresql:// (driver default psycopg2). Convertimos a asyncpg.
    if raw.startswith("postgres://"):
        raw = raw.replace("postgres://", "postgresql://", 1)
    if raw.startswith("postgresql://") and "+asyncpg" not in raw:
        raw = raw.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw


def _sync_url() -> str:
    """Devuelve DATABASE_URL en modo sync (psycopg2) para Alembic + scripts."""
    raw = os.getenv("DATABASE_URL")
    if not raw:
        raise RuntimeError("DATABASE_URL no esta definida.")
    if raw.startswith("postgres://"):
        raw = raw.replace("postgres://", "postgresql://", 1)
    if raw.startswith("postgresql+asyncpg://"):
        raw = raw.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    elif raw.startswith("postgresql://") and "+psycopg2" not in raw:
        raw = raw.replace("postgresql://", "postgresql+psycopg2://", 1)
    return raw


# Lazy singletons
_async_engine = None
_async_sessionmaker = None
_sync_engine = None
_sync_sessionmaker = None


def get_async_engine():
    global _async_engine
    if _async_engine is None:
        _async_engine = create_async_engine(
            _async_url(),
            pool_pre_ping=True,        # evita conexiones muertas
            pool_size=5,
            max_overflow=10,
            pool_recycle=1800,         # 30 min · evita timeouts Render
            echo=False,
        )
    return _async_engine


def get_async_sessionmaker():
    global _async_sessionmaker
    if _async_sessionmaker is None:
        _async_sessionmaker = async_sessionmaker(
            bind=get_async_engine(),
            expire_on_commit=False,
            class_=AsyncSession,
        )
    return _async_sessionmaker


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency. Usar: db: AsyncSession = Depends(get_async_session)."""
    SessionLocal = get_async_sessionmaker()
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def get_sync_engine():
    global _sync_engine
    if _sync_engine is None:
        _sync_engine = create_engine(
            _sync_url(),
            pool_pre_ping=True,
            pool_size=2,
            max_overflow=4,
            pool_recycle=1800,
            echo=False,
        )
    return _sync_engine


def get_sync_sessionmaker():
    global _sync_sessionmaker
    if _sync_sessionmaker is None:
        _sync_sessionmaker = sessionmaker(bind=get_sync_engine(), expire_on_commit=False)
    return _sync_sessionmaker


def get_sync_session() -> Generator[Session, None, None]:
    """Generator para scripts CLI: with next(get_sync_session()) as s:..."""
    SessionLocal = get_sync_sessionmaker()
    with SessionLocal() as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise


def is_postgres_enabled() -> bool:
    """Feature flag: True si KUDOS_USE_POSTGRES=true."""
    return os.getenv("KUDOS_USE_POSTGRES", "false").lower() in ("true", "1", "yes")
''')


# ============================================================
# 3. kudos_engine/db/base.py · Base + naming conventions
# ============================================================
atomic_write("kudos_engine/db/base.py", '''"""
SQLAlchemy DeclarativeBase con naming convention estable.
Naming convention evita conflictos al renombrar indices/constraints.
"""
from __future__ import annotations

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
''')


# ============================================================
# 4. kudos_engine/db/models/__init__.py · re-export all models
# ============================================================
atomic_write("kudos_engine/db/models/__init__.py", '''"""Re-export de todos los modelos para que Alembic los detecte."""
from kudos_engine.db.base import Base
from kudos_engine.db.models.user import User, RefreshToken
from kudos_engine.db.models.save import Save, Visit, Watched, Resonance, MemoryPrompt
from kudos_engine.db.models.signals import PoiSignals
from kudos_engine.db.models.telemetry import TelemetryEvent
from kudos_engine.db.models.content import Capsule, Narrative, PoiRelationship

__all__ = [
    "Base",
    "User", "RefreshToken",
    "Save", "Visit", "Watched", "Resonance", "MemoryPrompt",
    "PoiSignals",
    "TelemetryEvent",
    "Capsule", "Narrative", "PoiRelationship",
]
''')


print("STEP 1-4 DONE (init, database, base, models __init__)")
