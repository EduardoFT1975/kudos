"""
KUDOS Capsule Engine v2 · Personal World service · extendido.
"""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import List, Optional

from kudos_engine.apps.capsules import service as capsule_service
from kudos_engine.apps.core import db
from kudos_engine.apps.core.config import (
    APPS_DATA_DIR, STORE_SAVES
)
from kudos_engine.apps.save.models import (
    SavedWorld, SaveRequest,
    VisitedWorld, VisitRequest,
    WatchedCapsule, WatchRequest,
    EmotionalReaction, ReactionRequest,
)


# Stores adicionales (Personal World Layer)
STORE_VISITED = APPS_DATA_DIR / "visited_world.json"
STORE_WATCHED = APPS_DATA_DIR / "watched_capsules.json"
STORE_REACTIONS = APPS_DATA_DIR / "emotional_reactions.json"


# ─── SAVE ────────────────────────────────────────────────────────────

def save(req: SaveRequest) -> SavedWorld:
    s = SavedWorld(
        id=uuid.uuid4().hex,
        user_id=req.user_id,
        poi_id=req.poi_id,
        capsule_id=req.capsule_id,
        collection_type=req.collection_type,
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
    # Si vio >90% se considera "complete" · incrementar view del capsule
    return w


def watched_for_user(user_id: str, limit: int = 200) -> List[WatchedCapsule]:
    items = [w for w in db.list_all(STORE_WATCHED) if w.get("user_id") == user_id]
    items.sort(key=lambda w: w.get("watched_at", ""), reverse=True)
    return [WatchedCapsule(**w) for w in items[:limit]]


# ─── EMOTIONAL REACTIONS ─────────────────────────────────────────────

def react(req: ReactionRequest) -> EmotionalReaction:
    r = EmotionalReaction(id=uuid.uuid4().hex, **req.model_dump())
    db.upsert(STORE_REACTIONS, r.id, r.model_dump())
    return r


def reactions_for_user(user_id: str, limit: int = 200) -> List[EmotionalReaction]:
    items = [r for r in db.list_all(STORE_REACTIONS) if r.get("user_id") == user_id]
    items.sort(key=lambda r: r.get("reacted_at", ""), reverse=True)
    return [EmotionalReaction(**r) for r in items[:limit]]


def reactions_for_target(target_type: str, target_id: str) -> List[EmotionalReaction]:
    items = [
        r for r in db.list_all(STORE_REACTIONS)
        if r.get("target_type") == target_type and r.get("target_id") == target_id
    ]
    return [EmotionalReaction(**r) for r in items]
