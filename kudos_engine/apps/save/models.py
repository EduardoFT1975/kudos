"""
KUDOS Capsule Engine v2 · SavedWorld.

CTO directive: "Save ≠ bookmark. Save = graph signal."
Feeds: recommendation + merit + exploration graph.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SavedWorld(BaseModel):
    id: str
    user_id: str                                    # MVP: cualquier string
    poi_id: str
    capsule_id: Optional[str] = None                # opcional · la cápsula que disparó el save
    collection_type: Optional[str] = "default"      # "viaje-roma" · "kids" · etc.
    emotional_reason: Optional[str] = None          # "me recordó a mi abuelo"
    future_relevance: Optional[str] = None          # "ir verano 2027"
    saved_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class SaveRequest(BaseModel):
    user_id: str
    poi_id: str
    capsule_id: Optional[str] = None
    collection_type: Optional[str] = "default"
    emotional_reason: Optional[str] = None
    future_relevance: Optional[str] = None
