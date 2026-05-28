"""
KUDOS Capsule Engine v2 · Save service.

Cada save:
  - persiste SavedWorld
  - incrementa Capsule.save_count (primary KPI SAVE_RATE)
  - boost human_signal_score del Merit del POI (futuro)
"""
from __future__ import annotations

import uuid
from typing import List, Optional

from kudos_engine.apps.capsules import service as capsule_service
from kudos_engine.apps.core import db
from kudos_engine.apps.core.config import STORE_SAVES
from kudos_engine.apps.save.models import SavedWorld, SaveRequest


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

    # Side effect: incrementar contador en la cápsula (primary KPI)
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
