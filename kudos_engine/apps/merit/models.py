"""
KUDOS Capsule Engine v2 · MeritProfile model.

6 dimensiones según CTO directive Phase 4:
  objective    25%  · UNESCO, visitors, wikipedia langs
  curiosity    25%  · "qué tan poco obvio es"
  emotional    20%  · hook power, resonancia
  visual       10%  · disponibilidad media de calidad
  context      10%  · relevancia temporal/cultural
  human_signal 10%  · saves, shares, exploration depth

Determina:
  - capsule creation priority
  - feed frequency
  - capsule duration
  - media investment
  - future recommendation power
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, Field


class MeritProfile(BaseModel):
    """Perfil de mérito de un POI · alimenta ranking + capsule decisions."""
    id: str                               # = poi_id (1:1)
    poi_id: str

    # Las 6 dimensiones (0..100)
    objective_score: float = 0.0
    curiosity_score: float = 0.0
    emotional_score: float = 0.0
    visual_score: float = 0.0
    context_score: float = 0.0
    human_signal_score: float = 0.0

    # Computado
    final_score: float = 0.0              # weighted sum 0..100
    tier: str = "TIER_C"                  # TIER_S/A/B/C

    # Trazabilidad
    breakdown: Dict[str, float] = Field(default_factory=dict)
    rationale: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class MeritInputs(BaseModel):
    """Inputs opcionales para recalcular · todos 0..100."""
    objective_score: Optional[float] = None
    curiosity_score: Optional[float] = None
    emotional_score: Optional[float] = None
    visual_score: Optional[float] = None
    context_score: Optional[float] = None
    human_signal_score: Optional[float] = None
