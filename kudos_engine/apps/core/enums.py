"""
KUDOS Capsule Engine v2 · enums fundacionales.

Tipos canónicos según CTO directive. NO inventar nuevos sin
actualizar el directive — son contratos de diseño.
"""
from enum import Enum


class CapsuleType(str, Enum):
    FEED_15 = "FEED_15"               # cápsula de feed · 15s vertical
    PREMIUM_45 = "PREMIUM_45"          # cápsula premium · 45s expansión
    CONTEXT_10 = "CONTEXT_10"          # contextual · 10s informativa
    FUTURE_MEMORY = "FUTURE_MEMORY"    # memoria humana · capsule futura


class NarrativeType(str, Enum):
    HIDDEN_TRUTH = "HIDDEN_TRUTH"
    EMOTIONAL_SHOCK = "EMOTIONAL_SHOCK"
    LOST_WORLD = "LOST_WORLD"
    HUMAN_STORY = "HUMAN_STORY"
    MYSTERY = "MYSTERY"
    TRANSFORMATION = "TRANSFORMATION"
    PRESENT_CONNECTION = "PRESENT_CONNECTION"
    PARALLEL_REALITY = "PARALLEL_REALITY"
    MEMORY_LAYER = "MEMORY_LAYER"


class Tier(str, Enum):
    S = "TIER_S"
    A = "TIER_A"
    B = "TIER_B"
    C = "TIER_C"


class MotionType(str, Enum):
    ZOOM_IN = "ZOOM_IN"
    ZOOM_OUT = "ZOOM_OUT"
    PAN_LEFT = "PAN_LEFT"
    PAN_RIGHT = "PAN_RIGHT"
    PARALLAX = "PARALLAX"
    SLOW_FLOAT = "SLOW_FLOAT"
    STATIC = "STATIC"


class ExportTarget(str, Enum):
    VERTICAL_9_16 = "VERTICAL_9_16"
    FEED_PREVIEW = "FEED_PREVIEW"
    NODE_EXPANDED = "NODE_EXPANDED"
    SOCIAL_SHARE = "SOCIAL_SHARE"


class MediaType(str, Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"
    MAP = "MAP"
    ARCHIVE = "ARCHIVE"
    RECONSTRUCTION = "RECONSTRUCTION"


class POIStatus(str, Enum):
    DRAFT = "DRAFT"
    READY = "READY"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class CapsuleStatus(str, Enum):
    DRAFT = "DRAFT"
    SCRIPT_READY = "SCRIPT_READY"
    MEDIA_READY = "MEDIA_READY"
    RENDERED = "RENDERED"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class RelationshipType(str, Enum):
    """Relaciones POI ↔ POI · directive 'Roman Empire → Gladiators → Ancient Rome'."""
    HISTORICAL = "HISTORICAL"      # comparten época/civilización
    EMOTIONAL = "EMOTIONAL"        # comparten resonancia emocional
    GEOGRAPHIC = "GEOGRAPHIC"      # cercanía física
    CULTURAL = "CULTURAL"          # misma cultura/tradición
    THEMATIC = "THEMATIC"          # mismo tema (museos, batallas, etc.)
    CAUSAL = "CAUSAL"              # uno causó/influyó al otro
