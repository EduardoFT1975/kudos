"""Re-export de todos los modelos para que Alembic los detecte."""
from kudos_engine.db.base import Base
from kudos_engine.db.models.user import User, RefreshToken
from kudos_engine.db.models.save import Save, Visit, Watched, Resonance, MemoryPrompt
from kudos_engine.db.models.signals import PoiSignals
from kudos_engine.db.models.telemetry import TelemetryEvent
from kudos_engine.db.models.content import Capsule, Narrative, PoiRelationship
from kudos_engine.db.models.merit import MeritOverride
from kudos_engine.db.models.profile import UserProfile
from kudos_engine.db.models.shift import DiscoveryShift

__all__ = [
    "Base",
    "User", "RefreshToken",
    "Save", "Visit", "Watched", "Resonance", "MemoryPrompt",
    "PoiSignals",
    "TelemetryEvent",
    "Capsule", "Narrative", "PoiRelationship",
    "MeritOverride",
    "UserProfile",
    "DiscoveryShift",
]
