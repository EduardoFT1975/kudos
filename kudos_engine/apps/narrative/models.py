"""
KUDOS Capsule Engine v2 · Narrative model.

CTO directive: "A POI MUST support infinite narratives."
1 POI puede tener 50 narrativas; cada una puede materializarse en N Capsules.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from kudos_engine.apps.core.enums import NarrativeType


class Narrative(BaseModel):
    id: str
    poi_id: str
    type: str = NarrativeType.HUMAN_STORY.value

    title: str
    hook: str
    core_emotion: str = "curiosity"

    story_arc: Optional[str] = None              # "setup → conflict → reveal"
    historical_context: Optional[str] = None     # "Roma · siglo I dC"

    # Scoring (0..1)
    emotional_intensity: float = 0.5
    hook_power: float = 0.5
    shareability: float = 0.5
    visual_potential: float = 0.5
    retention_probability: float = 0.5

    script_template: Optional[str] = None

    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class NarrativeCreate(BaseModel):
    poi_id: str
    title: str
    hook: str
    type: str = NarrativeType.HUMAN_STORY.value
    core_emotion: str = "curiosity"
    story_arc: Optional[str] = None
    historical_context: Optional[str] = None
    emotional_intensity: float = 0.5
    hook_power: float = 0.5
    shareability: float = 0.5
    visual_potential: float = 0.5
    retention_probability: float = 0.5
    script_template: Optional[str] = None


class NarrativeCandidates(BaseModel):
    """Output del pipeline de generación · varias narrativas para 1 POI."""
    poi_id: str
    candidates: List[Narrative] = Field(default_factory=list)
