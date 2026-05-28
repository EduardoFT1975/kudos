"""
KUDOS Capsule Engine v2 · /api/feed router.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query

from kudos_engine.apps.feed import service


router = APIRouter(prefix="/api/feed", tags=["feed"])


@router.get("/")
def feed(
    limit: int = Query(12, ge=1, le=50),
    offset: int = Query(0, ge=0),
    tier: Optional[str] = None,
    lightweight: bool = Query(True, description="<300ms · campos mínimos"),
):
    """Feed discovery-first · sin followers."""
    if lightweight:
        return {"items": service.get_feed_lightweight(limit=limit, offset=offset)}
    return {"items": [c.model_dump() for c in service.get_feed(limit=limit, offset=offset, tier=tier)]}
