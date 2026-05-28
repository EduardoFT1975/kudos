"""
KUDOS Capsule Engine v2 · POI repository.

CRUD ligero sobre JSON store. La capa service.py llama aquí.
"""
from __future__ import annotations

from typing import List, Optional

from kudos_engine.apps.core import db
from kudos_engine.apps.core.config import STORE_POIS, STORE_RELATIONSHIPS
from kudos_engine.apps.pois.models import POI, POIRelationship


# ─── POIs ─────────────────────────────────────────────────────────────

def list_pois(limit: int = 100, offset: int = 0, country: Optional[str] = None,
              tier: Optional[str] = None) -> List[POI]:
    items = db.list_all(STORE_POIS)
    if country:
        items = [p for p in items if p.get("country") == country]
    if tier:
        items = [p for p in items if p.get("tier") == tier]
    items.sort(key=lambda p: p.get("merit_score", 0), reverse=True)
    return [POI(**p) for p in items[offset:offset + limit]]


def get_poi(poi_id: str) -> Optional[POI]:
    raw = db.get(STORE_POIS, poi_id)
    return POI(**raw) if raw else None


def upsert_poi(poi: POI) -> POI:
    db.upsert(STORE_POIS, poi.id, poi.model_dump())
    return poi


def delete_poi(poi_id: str) -> bool:
    return db.delete(STORE_POIS, poi_id)


def bulk_upsert_pois(pois: List[POI]) -> int:
    items = {p.id: p.model_dump() for p in pois}
    return db.bulk_upsert(STORE_POIS, items)


def count_pois() -> int:
    return len(db.load(STORE_POIS))


# ─── Relationships ───────────────────────────────────────────────────

def list_relationships_for(poi_id: str) -> List[POIRelationship]:
    items = db.list_all(STORE_RELATIONSHIPS)
    related = [r for r in items if r.get("poi_a_id") == poi_id or r.get("poi_b_id") == poi_id]
    return [POIRelationship(**r) for r in related]


def upsert_relationship(rel: POIRelationship) -> POIRelationship:
    db.upsert(STORE_RELATIONSHIPS, rel.id, rel.model_dump())
    return rel


def delete_relationship(rel_id: str) -> bool:
    return db.delete(STORE_RELATIONSHIPS, rel_id)


def get_related_pois(poi_id: str, limit: int = 8) -> List[POI]:
    """Devuelve los POIs conectados a poi_id, ordenados por weight desc."""
    rels = list_relationships_for(poi_id)
    rels.sort(key=lambda r: r.weight, reverse=True)
    related_ids: List[str] = []
    for r in rels:
        other = r.poi_b_id if r.poi_a_id == poi_id else r.poi_a_id
        if other not in related_ids:
            related_ids.append(other)
        if len(related_ids) >= limit:
            break
    return [p for p in (get_poi(i) for i in related_ids) if p is not None]
