"""
KUDOS Capsule Engine v2 · Capsule repository.
"""
from __future__ import annotations

from typing import List, Optional

from kudos_engine.apps.core import db
from kudos_engine.apps.core.config import STORE_CAPSULES
from kudos_engine.apps.capsules.models import Capsule


def list_capsules(limit: int = 100, offset: int = 0, poi_id: Optional[str] = None,
                  status: Optional[str] = None, tier: Optional[str] = None) -> List[Capsule]:
    items = db.list_all(STORE_CAPSULES)
    if poi_id:
        items = [c for c in items if c.get("poi_id") == poi_id]
    if status:
        items = [c for c in items if c.get("status") == status]
    if tier:
        items = [c for c in items if c.get("tier") == tier]
    # ordenar por merit_snapshot.final_score desc
    items.sort(key=lambda c: c.get("merit_snapshot", {}).get("final_score", 0), reverse=True)
    return [Capsule(**c) for c in items[offset:offset + limit]]


def get_capsule(capsule_id: str) -> Optional[Capsule]:
    raw = db.get(STORE_CAPSULES, capsule_id)
    return Capsule(**raw) if raw else None


def upsert_capsule(capsule: Capsule) -> Capsule:
    db.upsert(STORE_CAPSULES, capsule.id, capsule.model_dump())
    return capsule


def delete_capsule(capsule_id: str) -> bool:
    return db.delete(STORE_CAPSULES, capsule_id)


def count_capsules() -> int:
    return len(db.load(STORE_CAPSULES))
