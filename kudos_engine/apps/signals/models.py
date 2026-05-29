"""
KUDOS HDG · Human Discovery Graph · Signal aggregation por POI.

NUNCA expuestos como números visibles al usuario · alimentan ranking + recommendation.
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, Optional
from pydantic import BaseModel, Field


class PoiSignals(BaseModel):
    """5 scores agregados por POI · base del Human Discovery Graph."""
    poi_id: str

    # Discovery Score · cuánto la humanidad descubre este POI
    discovery_score: float = 0.0     # 0..100 · views + node_opens + capsule_plays normalizado

    # Importance Score · cuánto la gente lo guarda con motivación
    importance_score: float = 0.0    # 0..100 · saves con motivation > saves sin motivation

    # Memory Score · cuánto persiste en el tiempo
    memory_score: float = 0.0        # 0..100 · revisits + "still_relevant" > "released"

    # Emotion Score · perfil emocional agregado
    emotion_profile: Dict[str, float] = Field(default_factory=dict)  # asombro:0.45, aprendizaje:0.3...
    emotion_score: float = 0.0       # 0..100 · intensidad total resonancias

    # Future Value Score · cuánta gente lo guarda con "quiero visitarlo"
    future_value_score: float = 0.0  # 0..100 · % saves con motivation="quiero_visitarlo"

    # Conteos brutos
    total_views: int = 0
    total_saves: int = 0
    total_visits: int = 0
    total_resonances: int = 0

    last_signal_at: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
