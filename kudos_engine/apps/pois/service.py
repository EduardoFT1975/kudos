"""
KUDOS Capsule Engine v2 · POI service · i18n-aware.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import List, Optional

from kudos_engine.apps.core.i18n import get_localized
from kudos_engine.apps.pois import repository as repo
from kudos_engine.apps.pois.models import POI, POICreate, POIUpdate, POIRelationship


def _slugify(text) -> str:
    # Si llega LocalizedString, sacar el español o el primero disponible
    s = get_localized(text, "es") if not isinstance(text, str) else text
    t = re.sub(r"[^a-z0-9]+", "-", s.lower())
    return t.strip("-")[:80] or uuid.uuid4().hex[:8]


def create_poi(payload: POICreate) -> POI:
    poi_id = uuid.uuid4().hex
    slug = payload.slug or _slugify(payload.name)
    poi = POI(
        id=poi_id,
        slug=slug,
        name=payload.name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        country=payload.country,
        city=payload.city,
        category=payload.category,
        short_description=payload.short_description,
        importance_level=payload.importance_level,
        historical_periods=payload.historical_periods,
        tags=payload.tags,
        emotional_tags=payload.emotional_tags,
        source_metadata=payload.source_metadata,
    )
    return repo.upsert_poi(poi)


def update_poi(poi_id: str, patch: POIUpdate) -> Optional[POI]:
    existing = repo.get_poi(poi_id)
    if not existing:
        return None
    data = existing.model_dump()
    for k, v in patch.model_dump(exclude_none=True).items():
        data[k] = v
    data["updated_at"] = datetime.utcnow().isoformat()
    return repo.upsert_poi(POI(**data))


def get_poi(poi_id: str) -> Optional[POI]:
    return repo.get_poi(poi_id)


def list_pois(limit: int = 50, offset: int = 0, country: Optional[str] = None,
              tier: Optional[str] = None) -> List[POI]:
    return repo.list_pois(limit=limit, offset=offset, country=country, tier=tier)


def delete_poi(poi_id: str) -> bool:
    return repo.delete_poi(poi_id)


def count_pois() -> int:
    return repo.count_pois()


def link_pois(poi_a_id: str, poi_b_id: str, rel_type: str,
              weight: float = 1.0, description: Optional[str] = None) -> POIRelationship:
    rel = POIRelationship(
        id=uuid.uuid4().hex,
        poi_a_id=poi_a_id,
        poi_b_id=poi_b_id,
        type=rel_type,
        weight=weight,
        description=description,
    )
    return repo.upsert_relationship(rel)


def get_related(poi_id: str, limit: int = 8) -> List[POI]:
    return repo.get_related_pois(poi_id, limit=limit)
