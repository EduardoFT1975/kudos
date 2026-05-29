"""
Tests config T1.2.

Requiere DATABASE_URL apuntando a una BD de tests (NO produccion).
Si DATABASE_URL no esta seteada, los tests de Postgres se skippean.
"""
from __future__ import annotations

import os
import asyncio
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from kudos_engine.db.base import Base
from kudos_engine.db import models  # noqa: F401


def _async_url() -> str | None:
    raw = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not raw:
        return None
    if raw.startswith("postgres://"):
        raw = raw.replace("postgres://", "postgresql://", 1)
    if raw.startswith("postgresql://") and "+asyncpg" not in raw:
        raw = raw.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    url = _async_url()
    if not url:
        pytest.skip("TEST_DATABASE_URL no definida; skip tests Postgres")
    eng = create_async_engine(url, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def session(engine) -> AsyncSession:
    Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with Session() as s:
        yield s
        await s.rollback()
