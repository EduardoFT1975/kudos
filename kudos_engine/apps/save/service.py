"""
KUDOS Capsule Engine v2 · Personal World service + Memory + Meaning.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from kudos_engine.apps.capsules import service as capsule_service
from kudos_engine.apps.core import db
from kudos_engine.apps.core.config import APPS_DATA_DIR, STORE_SAVES
from kudos_engine.apps.save.models import (
    SavedWorld, SaveRequest, MemoryUpdateRequest,
    VisitedWorld, VisitRequest,
    WatchedCapsule, WatchRequest,
    EmotionalResonance, ResonanceRequest,
)


STORE_VISITED = APPS_DATA_DIR / "visited_world.json"
STORE_WATCHED = APPS_DATA_DIR / "watched_capsules.json"
STORE_RESONANCES = APPS_DATA_DIR / "resonances.json"


# ─── SAVE · World Collection Engine ─────────────────────────────────

def save(req: SaveRequest) -> SavedWorld:
    s = SavedWorld(
        id=uuid.uuid4().hex,
        user_id=req.user_id,
        poi_id=req.poi_id,
        capsule_id=req.capsule_id,
        collection_type=req.collection_type,
        themes=req.themes,
        motivation=req.motivation,
        emotional_reason=req.emotional_reason,
        future_relevance=req.future_relevance,
    )
    db.upsert(STORE_SAVES, s.id, s.model_dump())
    if req.capsule_id:
        capsule_service.increment_save(req.capsule_id)
    return s


def list_for_user(user_id: str, limit: int = 100) -> List[SavedWorld]:
    items = [s for s in db.list_all(STORE_SAVES) if s.get("user_id") == user_id]
    items.sort(key=lambda s: s.get("saved_at", ""), reverse=True)
    return [SavedWorld(**s) for s in items[:limit]]


def unsave(save_id: str) -> bool:
    return db.delete(STORE_SAVES, save_id)


def count_for_poi(poi_id: str) -> int:
    return sum(1 for s in db.list_all(STORE_SAVES) if s.get("poi_id") == poi_id)


# ─── MEMORY ENGINE · Capa 4 ─────────────────────────────────────────

def update_memory(req: MemoryUpdateRequest) -> Optional[SavedWorld]:
    raw = db.get(STORE_SAVES, req.save_id)
    if not raw:
        return None
    s = SavedWorld(**raw)
    data = s.model_dump()
    data["memory_status"] = req.status
    data["memory_updated_at"] = datetime.utcnow().isoformat()
    if req.status == "want_to_revisit":
        data["last_revisited_at"] = datetime.utcnow().isoformat()
        data["revisit_count"] = int(data.get("revisit_count", 0)) + 1
    db.upsert(STORE_SAVES, req.save_id, data)
    return SavedWorld(**data)


def stale_saves_for_user(user_id: str, older_than_days: int = 90, limit: int = 5) -> List[SavedWorld]:
    """Items guardados hace >N días que NO han recibido memory update reciente.
       Material para Memory Prompt UI."""
    from datetime import timedelta
    cutoff = (datetime.utcnow() - timedelta(days=older_than_days)).isoformat()
    items = [s for s in db.list_all(STORE_SAVES) if s.get("user_id") == user_id]
    stale = [
        s for s in items
        if s.get("saved_at", "") < cutoff
        and not s.get("memory_updated_at")    # nunca ha sido revisitado
    ]
    stale.sort(key=lambda s: s.get("saved_at", ""))   # más antiguos primero
    return [SavedWorld(**s) for s in stale[:limit]]


# ─── VISITED ─────────────────────────────────────────────────────────

def mark_visited(req: VisitRequest) -> VisitedWorld:
    v = VisitedWorld(id=uuid.uuid4().hex, **req.model_dump())
    db.upsert(STORE_VISITED, v.id, v.model_dump())
    return v


def visits_for_user(user_id: str, limit: int = 200) -> List[VisitedWorld]:
    items = [v for v in db.list_all(STORE_VISITED) if v.get("user_id") == user_id]
    items.sort(key=lambda v: v.get("visited_at", ""), reverse=True)
    return [VisitedWorld(**v) for v in items[:limit]]


def visits_for_poi(poi_id: str) -> int:
    return sum(1 for v in db.list_all(STORE_VISITED) if v.get("poi_id") == poi_id)


# ─── WATCHED CAPSULES ────────────────────────────────────────────────

def mark_watched(req: WatchRequest) -> WatchedCapsule:
    w = WatchedCapsule(id=uuid.uuid4().hex, **req.model_dump())
    db.upsert(STORE_WATCHED, w.id, w.model_dump())
    return w


def watched_for_user(user_id: str, limit: int = 200) -> List[WatchedCapsule]:
    items = [w for w in db.list_all(STORE_WATCHED) if w.get("user_id") == user_id]
    items.sort(key=lambda w: w.get("watched_at", ""), reverse=True)
    return [WatchedCapsule(**w) for w in items[:limit]]


# ─── EMOTIONAL RESONANCE · Capa 5 ────────────────────────────────────

def resonate(req: ResonanceRequest) -> EmotionalResonance:
    r = EmotionalResonance(id=uuid.uuid4().hex, **req.model_dump())
    db.upsert(STORE_RESONANCES, r.id, r.model_dump())
    return r


def resonances_for_user(user_id: str, limit: int = 200) -> List[EmotionalResonance]:
    items = [r for r in db.list_all(STORE_RESONANCES) if r.get("user_id") == user_id]
    items.sort(key=lambda r: r.get("reacted_at", ""), reverse=True)
    return [EmotionalResonance(**r) for r in items[:limit]]


def resonances_for_target(target_type: str, target_id: str) -> List[EmotionalResonance]:
    items = [
        r for r in db.list_all(STORE_RESONANCES)
        if r.get("target_type") == target_type and r.get("target_id") == target_id
    ]
    return [EmotionalResonance(**r) for r in items]


# Aliases legacy
react = resonate
reactions_for_user = resonances_for_user
reactions_for_target = resonances_for_target
