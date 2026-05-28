"""
KUDOS Capsule Engine v2 · Node Expansion service.

CTO directive Phase 8: "Opening a node MUST NOT feel like opening a card.
It must feel like entering a contextual layer."
→ Endpoint agregador que devuelve TODO lo necesario en una sola respuesta:
  hero capsule + related capsules + historical layers + relationships +
  media gallery + exploration graph + related POIs.

Performance target: <500ms perceived.
"""
from __future__ import annotations

from typing import Dict, Any, Optional

from kudos_engine.apps.capsules import service as capsule_service
from kudos_engine.apps.media import service as media_service
from kudos_engine.apps.merit import service as merit_service
from kudos_engine.apps.narrative import service as narrative_service
from kudos_engine.apps.pois import service as poi_service
from kudos_engine.apps.save import service as save_service


def get_node(poi_id: str, related_limit: int = 8) -> Optional[Dict[str, Any]]:
    """
    Respuesta única para abrir un nodo · diseñada para renderizar
    como capa contextual, no popup.
    """
    poi = poi_service.get_poi(poi_id)
    if not poi:
        return None

    # Hero capsule = la mejor cápsula del POI por merit+saves
    capsules = capsule_service.list_for_poi(poi_id)
    hero = None
    related_caps = []
    if capsules:
        capsules.sort(
            key=lambda c: (c.merit_snapshot.final_score if c.merit_snapshot else 0) + c.save_count * 2,
            reverse=True,
        )
        hero = capsules[0]
        related_caps = capsules[1:6]

    related_pois = poi_service.get_related(poi_id, limit=related_limit)
    media_assets = media_service.list_assets_for_poi(poi_id)
    narratives = narrative_service.list_for_poi(poi_id)
    merit = merit_service.get_profile(poi_id)
    save_count = save_service.count_for_poi(poi_id)

    return {
        "poi": poi.model_dump(),
        "hero_capsule": hero.model_dump() if hero else None,
        "related_capsules": [c.model_dump() for c in related_caps],
        "historical_layers": poi.historical_periods or [],
        "relationships": [r.model_dump() for r in related_pois],   # ya son POI completos
        "media_gallery": [a.model_dump() for a in media_assets[:12]],
        "exploration_graph": {
            "narratives_available": len(narratives),
            "narratives_preview": [n.model_dump() for n in narratives[:3]],
            "capsules_count": len(capsules),
            "save_count": save_count,
        },
        "merit": merit.model_dump() if merit else None,
    }
