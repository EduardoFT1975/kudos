"""
Smoke tests T1.2 · Postgres Foundation.

Verifican:
  - Conexion al engine
  - Crear user via repo
  - Crear save via repo
  - Recompute signals
  - Upsert capsule

Si TEST_DATABASE_URL no esta seteada, se skippean automaticamente.
"""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio

from kudos_engine.db.repositories.user_repo import UserRepository
from kudos_engine.db.repositories.save_repo import SaveRepository
from kudos_engine.db.repositories.signals_repo import SignalsRepository
from kudos_engine.db.repositories.content_repo import ContentRepository
from kudos_engine.db.repositories.telemetry_repo import TelemetryRepository


@pytest.mark.asyncio
async def test_user_create_and_lookup(session):
    repo = UserRepository(session)
    user = await repo.create_or_update(
        email="alice@example.com",
        provider="google",
        oauth_id="google-123",
        display_name="Alice",
    )
    assert user.id is not None
    assert user.email == "alice@example.com"
    fetched = await repo.get_by_oauth("google", "google-123")
    assert fetched is not None
    assert fetched.id == user.id


@pytest.mark.asyncio
async def test_save_create_and_list(session):
    user_repo = UserRepository(session)
    save_repo = SaveRepository(session)
    user = await user_repo.create_or_update(
        email="bob@example.com", provider="google", oauth_id="google-456",
    )
    save = await save_repo.create_save(
        user_id=user.id, poi_id="wd-Q10285",
        motivation="travel", themes=["history", "architecture"],
    )
    assert save.id is not None
    assert save.motivation == "travel"
    saves = await save_repo.list_by_user(user.id)
    assert len(saves) == 1
    assert saves[0].poi_id == "wd-Q10285"


@pytest.mark.asyncio
async def test_save_count_by_poi(session):
    user_repo = UserRepository(session)
    save_repo = SaveRepository(session)
    for i in range(3):
        u = await user_repo.create_or_update(
            email=f"user{i}@test.com", provider="anon", oauth_id=f"anon-{i}",
        )
        await save_repo.create_save(user_id=u.id, poi_id="wd-Q12892")
    n = await save_repo.count_by_poi("wd-Q12892")
    assert n == 3


@pytest.mark.asyncio
async def test_signals_recompute_empty(session):
    repo = SignalsRepository(session)
    sig = await repo.recompute_for_poi("wd-Q-empty")
    assert sig.poi_id == "wd-Q-empty"
    assert sig.discovery_score == 0.0
    assert sig.total_saves == 0


@pytest.mark.asyncio
async def test_signals_top_by_score(session):
    repo = SignalsRepository(session)
    await repo.upsert("poi-a", discovery_score=90)
    await repo.upsert("poi-b", discovery_score=50)
    await repo.upsert("poi-c", discovery_score=70)
    top = await repo.top_by_score("discovery_score", limit=2)
    assert len(top) == 2
    assert top[0].poi_id == "poi-a"
    assert top[1].poi_id == "poi-c"


@pytest.mark.asyncio
async def test_capsule_upsert_idempotent(session):
    repo = ContentRepository(session)
    await repo.upsert_capsule(
        "test-capsule-1", poi_id="wd-Q10285", title="Coliseo demo",
        duration_s=15, url="https://example.com/c.mp4",
    )
    await repo.upsert_capsule(
        "test-capsule-1", poi_id="wd-Q10285", title="Coliseo updated",
        duration_s=30, url="https://example.com/c.mp4",
    )
    cap = await repo.get_capsule("test-capsule-1")
    assert cap.title == "Coliseo updated"
    assert cap.duration_s == 30


@pytest.mark.asyncio
async def test_telemetry_add_and_top(session):
    repo = TelemetryRepository(session)
    await repo.add_event(session_id="sess-1", event_type="poi_view", poi_id="wd-Q10285")
    await repo.add_event(session_id="sess-1", event_type="poi_view", poi_id="wd-Q10285")
    await repo.add_event(session_id="sess-2", event_type="poi_view", poi_id="wd-Q12892")
    top = await repo.top_pois(hours=24, limit=10)
    assert any(t["poi_id"] == "wd-Q10285" and t["events"] >= 2 for t in top)


@pytest.mark.asyncio
async def test_save_ownership_check_on_delete(session):
    user_repo = UserRepository(session)
    save_repo = SaveRepository(session)
    u1 = await user_repo.create_or_update(email="u1@t.com", provider="anon", oauth_id="anon-u1")
    u2 = await user_repo.create_or_update(email="u2@t.com", provider="anon", oauth_id="anon-u2")
    save = await save_repo.create_save(user_id=u1.id, poi_id="wd-Q10285")
    # u2 intenta borrar el save de u1 -> debe fallar
    deleted = await save_repo.delete_save(save.id, u2.id)
    assert deleted is False
    # u1 borra su propio save -> OK
    deleted = await save_repo.delete_save(save.id, u1.id)
    assert deleted is True
