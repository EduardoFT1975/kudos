"""
KUDOS Capsule Engine v2 · Narrative service.

Pipeline de generación de candidatos:
  Input: POI metadata + historical_periods + emotional_tags + cultural_context
  Output: lista de Narrative candidates rankeadas por (hook_power × emotional_intensity)

MVP heurístico · futuro: alimentar a Claude para que proponga 5-10 ángulos.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from kudos_engine.apps.core import db
from kudos_engine.apps.core.config import STORE_NARRATIVES
from kudos_engine.apps.core.enums import NarrativeType
from kudos_engine.apps.narrative.models import (
    Narrative, NarrativeCreate, NarrativeCandidates
)
from kudos_engine.apps.pois import service as poi_service


def create_narrative(payload: NarrativeCreate) -> Optional[Narrative]:
    if not poi_service.get_poi(payload.poi_id):
        return None
    n = Narrative(id=uuid.uuid4().hex, **payload.model_dump())
    db.upsert(STORE_NARRATIVES, n.id, n.model_dump())
    return n


def list_for_poi(poi_id: str) -> List[Narrative]:
    items = [n for n in db.list_all(STORE_NARRATIVES) if n.get("poi_id") == poi_id]
    items.sort(
        key=lambda n: (n.get("hook_power", 0) * n.get("emotional_intensity", 0)),
        reverse=True,
    )
    return [Narrative(**n) for n in items]


def get_narrative(narrative_id: str) -> Optional[Narrative]:
    raw = db.get(STORE_NARRATIVES, narrative_id)
    return Narrative(**raw) if raw else None


def delete_narrative(narrative_id: str) -> bool:
    return db.delete(STORE_NARRATIVES, narrative_id)


# ─── Pipeline de candidatos (heurístico MVP) ────────────────────────

_DEFAULT_ANGLES = [
    (NarrativeType.HIDDEN_TRUTH,        "Lo que nadie te cuenta sobre {name}"),
    (NarrativeType.EMOTIONAL_SHOCK,     "La historia de {name} que duele"),
    (NarrativeType.LOST_WORLD,          "El mundo perdido de {name}"),
    (NarrativeType.HUMAN_STORY,         "Las vidas que dieron forma a {name}"),
    (NarrativeType.MYSTERY,             "El misterio sin resolver de {name}"),
    (NarrativeType.TRANSFORMATION,      "Cómo {name} cambió la historia"),
    (NarrativeType.PRESENT_CONNECTION,  "Lo que {name} significa hoy"),
]


def generate_candidates(poi_id: str, max_candidates: int = 5) -> Optional[NarrativeCandidates]:
    poi = poi_service.get_poi(poi_id)
    if not poi:
        return None

    # Heurística simple: 5 ángulos diferentes basados en tags
    emotional_count = len(poi.emotional_tags or [])
    historical_count = len(poi.historical_periods or [])
    importance = poi.importance_level or 0

    candidates: List[Narrative] = []
    for ntype, template in _DEFAULT_ANGLES[:max_candidates]:
        hook_power = min(1.0, 0.4 + (importance / 100) * 0.4 + emotional_count * 0.05)
        emo_intensity = min(1.0, 0.3 + emotional_count * 0.1)
        shareability = min(1.0, 0.3 + (importance / 100) * 0.3)
        n = Narrative(
            id=uuid.uuid4().hex,
            poi_id=poi_id,
            type=ntype.value,
            title=template.format(name=poi.name),
            hook=template.format(name=poi.name),
            core_emotion="awe" if ntype == NarrativeType.HIDDEN_TRUTH else "curiosity",
            historical_context=", ".join(poi.historical_periods or [])[:200] or None,
            emotional_intensity=emo_intensity,
            hook_power=hook_power,
            shareability=shareability,
            visual_potential=min(1.0, 0.3 + len(poi.media_assets or []) * 0.1),
            retention_probability=min(1.0, 0.4 + hook_power * 0.4),
        )
        candidates.append(n)
        db.upsert(STORE_NARRATIVES, n.id, n.model_dump())

    return NarrativeCandidates(poi_id=poi_id, candidates=candidates)
