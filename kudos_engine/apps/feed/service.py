"""
KUDOS Capsule Engine v2 · Feed service.

CTO directive Phase 7:
  Feed is discovery-first · NOT social-first
  Ranking = MERIT + CURIOSITY + CONTEXT + PERSONAL · NO followers

Performance target: <300ms perceived.
Implementation: lee del store JSON, ranking en memoria, paginado.
"""
from __future__ import annotations

from typing import List, Optional

from kudos_engine.apps.capsules import service as capsule_service
from kudos_engine.apps.capsules.models import Capsule
from kudos_engine.apps.core.enums import CapsuleStatus


# Pesos del ranking del feed · modulares
FEED_WEIGHTS = {
    "merit":     0.45,    # qué tan valiosa es objetivamente
    "curiosity": 0.25,    # qué tan sorprendente
    "context":   0.15,    # relevancia temporal/cultural
    "personal":  0.15,    # señal personalizada (futuro · MVP=0)
}


def _capsule_rank_score(c: Capsule) -> float:
    """Score 0..100 que decide posición en feed."""
    merit = c.merit_snapshot.final_score if c.merit_snapshot else 0
    # curiosity · invertimos un poco para que el feed no sea todo TIER_S
    # (premia variedad · CTO directive 'preserve mystery')
    curiosity = max(0, 70 - abs(merit - 60) * 0.6)
    # context · proxy = saves recientes
    context = min(100, c.save_count * 4)
    # personal · MVP = 0 (sin user signals)
    personal = 0.0
    score = (merit * FEED_WEIGHTS["merit"] +
             curiosity * FEED_WEIGHTS["curiosity"] +
             context * FEED_WEIGHTS["context"] +
             personal * FEED_WEIGHTS["personal"])
    return score


def get_feed(limit: int = 12, offset: int = 0, tier: Optional[str] = None) -> List[Capsule]:
    """
    Devuelve cápsulas listas para feed (PUBLISHED o MEDIA_READY).
    Rankeadas por merit+curiosity+context (sin followers).
    """
    all_caps = capsule_service.list_capsules(limit=500, tier=tier)
    eligible = [c for c in all_caps if c.status in (
        CapsuleStatus.PUBLISHED.value, CapsuleStatus.MEDIA_READY.value, CapsuleStatus.RENDERED.value
    )]
    eligible.sort(key=_capsule_rank_score, reverse=True)
    return eligible[offset:offset + limit]


def get_feed_lightweight(limit: int = 12, offset: int = 0) -> List[dict]:
    """
    Versión ultra-ligera para <300ms · sólo campos necesarios para preview.
    """
    capsules = get_feed(limit=limit, offset=offset)
    return [{
        "id": c.id,
        "poi_id": c.poi_id,
        "title": c.title,
        "hook": c.hook,
        "tier": c.tier,
        "duration_s": c.duration_s,
        "narrative_type": c.narrative_type,
        "score": round(_capsule_rank_score(c), 2),
    } for c in capsules]
