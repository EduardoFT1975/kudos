"""
KUDOS Capsule Engine v2 · Merit scoring pipeline.

Reusa señales objetivas del legacy kudos_engine/score.py cuando estén
disponibles (UNESCO, visitors, wikipedia_languages, anthropic_confidence)
y deriva curiosity/emotional/visual/context si no se pasan explícitos.

Pesos modulares vienen de apps/core/config.MERIT_WEIGHTS.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from kudos_engine.apps.core import db
from kudos_engine.apps.core.config import (
    STORE_MERIT, MERIT_WEIGHTS, TIER_THRESHOLDS, CAPSULE_DURATION_BY_TIER
)
from kudos_engine.apps.merit.models import MeritProfile, MeritInputs
from kudos_engine.apps.pois import service as poi_service


def _tier_for(score: float) -> str:
    if score >= TIER_THRESHOLDS["TIER_S"]: return "TIER_S"
    if score >= TIER_THRESHOLDS["TIER_A"]: return "TIER_A"
    if score >= TIER_THRESHOLDS["TIER_B"]: return "TIER_B"
    return "TIER_C"


def _derive_from_poi(poi) -> dict:
    """Deriva señales a partir del POI cuando no vienen explícitas."""
    objective = float(poi.importance_level or 0)

    # curiosity: inversa de obviedad (importance alto = poco curioso)
    # mejor un POI tier-B con buena emocional que un Coliseo más
    curiosity = max(0.0, 70.0 - abs(objective - 60) * 0.8)

    # emotional: depende de emotional_tags (más tags = más resonancia)
    emotional = min(100.0, 30.0 + len(poi.emotional_tags or []) * 12)

    # visual: depende de media_assets (más fotos = más visualizable)
    visual = min(100.0, 20.0 + len(poi.media_assets or []) * 15)

    # context: cuántas relationships + historical_periods conocidos
    context = min(100.0, 25.0 +
                  len(poi.historical_periods or []) * 10 +
                  len(poi.relationship_ids or []) * 5)

    return {
        "objective_score": objective,
        "curiosity_score": curiosity,
        "emotional_score": emotional,
        "visual_score": visual,
        "context_score": context,
        "human_signal_score": 0.0,   # se actualizará con saves/shares
    }


def compute_for_poi(poi_id: str, inputs: Optional[MeritInputs] = None) -> Optional[MeritProfile]:
    poi = poi_service.get_poi(poi_id)
    if not poi:
        return None

    base = _derive_from_poi(poi)
    if inputs:
        for k, v in inputs.model_dump(exclude_none=True).items():
            base[k] = float(v)

    final = sum(base[dim] * MERIT_WEIGHTS[dim] for dim in MERIT_WEIGHTS)
    tier = _tier_for(final)

    profile = MeritProfile(
        id=poi_id,
        poi_id=poi_id,
        **base,
        final_score=round(final, 2),
        tier=tier,
        breakdown={k: round(v, 2) for k, v in base.items()},
        rationale=f"{tier} · final {round(final,1)} (obj {base['objective_score']:.0f} · "
                  f"cur {base['curiosity_score']:.0f} · emo {base['emotional_score']:.0f})",
        updated_at=datetime.utcnow().isoformat(),
    )

    db.upsert(STORE_MERIT, poi_id, profile.model_dump())

    # Denormalizar tier + merit_score en el POI para feed rápido
    from kudos_engine.apps.pois.models import POIUpdate
    poi_service.update_poi(poi_id, POIUpdate(
        merit_score=profile.final_score,
        tier=profile.tier,
        visual_score=profile.visual_score,
        curiosity_score=profile.curiosity_score,
    ))

    return profile


def get_profile(poi_id: str) -> Optional[MeritProfile]:
    raw = db.get(STORE_MERIT, poi_id)
    return MeritProfile(**raw) if raw else None


def recommended_duration(tier: str) -> int:
    return CAPSULE_DURATION_BY_TIER.get(tier, 15)


def recompute_all(limit: int = 1000) -> int:
    """Recalcula merit para todos los POIs · útil tras importar masivo."""
    pois = poi_service.list_pois(limit=limit)
    n = 0
    for p in pois:
        if compute_for_poi(p.id):
            n += 1
    return n
