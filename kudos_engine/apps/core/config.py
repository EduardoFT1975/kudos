"""
KUDOS Capsule Engine v2 · configuración central.

Single source of truth para paths, pesos Merit, límites,
y constantes que el directive marca como "modulares".
"""
from pathlib import Path

# ─── Paths ────────────────────────────────────────────────────────────
ENGINE_ROOT = Path(__file__).resolve().parent.parent.parent     # kudos_engine/
PROJECT_ROOT = ENGINE_ROOT.parent                                # kudos_project/
STATE_DIR = ENGINE_ROOT / "state"
APPS_DATA_DIR = STATE_DIR / "apps_v2"
OUTPUT_DIR = ENGINE_ROOT / "output"

STATE_DIR.mkdir(parents=True, exist_ok=True)
APPS_DATA_DIR.mkdir(parents=True, exist_ok=True)

# JSON stores por módulo (atomic write via tempfile + os.replace)
STORE_POIS = APPS_DATA_DIR / "pois.json"
STORE_RELATIONSHIPS = APPS_DATA_DIR / "relationships.json"
STORE_CAPSULES = APPS_DATA_DIR / "capsules.json"
STORE_MERIT = APPS_DATA_DIR / "merit_profiles.json"
STORE_NARRATIVES = APPS_DATA_DIR / "narratives.json"
STORE_MEDIA = APPS_DATA_DIR / "media_assets.json"
STORE_SAVES = APPS_DATA_DIR / "saved_world.json"


# ─── Merit weights (modular · CTO directive Phase 4) ─────────────────
# "Scoring formula MUST remain modular."
MERIT_WEIGHTS = {
    "objective_score":      0.25,
    "curiosity_score":      0.25,
    "emotional_score":      0.20,
    "visual_score":         0.10,
    "context_score":        0.10,
    "human_signal_score":   0.10,
}
assert abs(sum(MERIT_WEIGHTS.values()) - 1.0) < 1e-6, "Merit weights must sum to 1.0"


# ─── Tier thresholds (final_score 0..100) ────────────────────────────
TIER_THRESHOLDS = {
    "TIER_S": 85,
    "TIER_A": 65,
    "TIER_B": 40,
    "TIER_C": 0,
}


# ─── Feed targets (CTO Phase 11) ─────────────────────────────────────
FEED_LOAD_TARGET_MS = 300
NODE_OPEN_TARGET_MS = 500
FEED_PAGE_SIZE = 12


# ─── Capsule duration by tier (Merit decides duration) ───────────────
CAPSULE_DURATION_BY_TIER = {
    "TIER_S": 45,   # PREMIUM_45
    "TIER_A": 20,
    "TIER_B": 15,   # FEED_15
    "TIER_C": 10,   # CONTEXT_10
}
