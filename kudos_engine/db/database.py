"""
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
