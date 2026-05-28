"""
KUDOS Capsule Engine v2 · /api/world router.

Node Expansion endpoint · agregado para que el front renderice
una capa contextual completa sin N requests.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from kudos_engine.apps.nodes import service


router = APIRouter(prefix="/api/world", tags=["world"])


@router.get("/poi/{poi_id}/node")
def get_node(poi_id: str, related_limit: int = Query(8, ge=1, le=30)):
    """CTO Phase 8 · respuesta única <500ms para abrir nodo."""
    node = service.get_node(poi_id, related_limit=related_limit)
    if not node:
        raise HTTPException(404, detail="POI not found")
    return node
