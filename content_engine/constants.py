"""
KUDOS Content Engine · V0 constants.

Locked values for the PLACE CAPSULE V0 pipeline. Single source of truth
for prompt version, model name, network timeouts, ranking thresholds,
radius bucketing, geohash precision, and HTTP user-agent.

Do NOT mutate at runtime. Bump PROMPT_VERSION on any prompt change so
content_hash inputs change accordingly.
"""
from __future__ import annotations

from typing import Final

# ---------------------------------------------------------------------------
# Versioning · LLM
# ---------------------------------------------------------------------------
PROMPT_VERSION: Final[str] = "v1.0.0"
MODEL_NAME: Final[str] = "claude-haiku-4-5-20251001"
LLM_LANGUAGE: Final[str] = "es"

# ---------------------------------------------------------------------------
# Network timeouts (seconds)
# ---------------------------------------------------------------------------
WIKIDATA_TIMEOUT_S: Final[int] = 5
WIKIPEDIA_TIMEOUT_S: Final[int] = 5
LLM_TIMEOUT_S: Final[int] = 30

# ---------------------------------------------------------------------------
# Ranking thresholds
# ---------------------------------------------------------------------------
RANK_THRESHOLD: Final[float] = 0.30
RANK_AMBIGUITY_DELTA: Final[float] = 0.02
RANK_AMBIGUITY_CLASS_MIN: Final[float] = 0.85

# Phase 12 · Anti-city dominance arbitration
# When the top-ranked candidate is a city/admin entity and a local POI
# candidate within CITY_DEMOTION_DELTA score difference is geographically
# close enough to the query, swap winner to the local POI. Prevents
# macro-city notability from beating fine-grained landmark intent.
CITY_DEMOTION_DELTA: Final[float] = 0.15

# Phase 12 FIX C · proximity tolerance for the anti-city swap.
# Old logic required POI strictly closer than city · this failed when
# city's Wikidata P625 centroid coincides with the POI (e.g., Madrid's
# coord IS Puerta del Sol's coord). New logic allows POI distance up
# to `city_distance * tolerance` for the swap to fire. Keeps the swap
# conservative · POI cannot be much further away than the city.
CITY_DEMOTION_PROXIMITY_TOLERANCE: Final[float] = 1.5

# Phase 12 · Notability tie-break ratio for ambiguous winners
# When two top candidates fall within RANK_AMBIGUITY_DELTA AND both
# pass the class min, instead of suppressing AMBIGUOUS_WINNER we
# resolve by sitelinks_count: the second candidate wins only if its
# notability is at least this multiple of the first.
RANK_AMBIGUITY_NOTABILITY_RATIO: Final[float] = 1.5

# ---------------------------------------------------------------------------
# Confidence (V0.1.0 baseline: compute, no gating)
# ---------------------------------------------------------------------------
CONFIDENCE_THRESHOLD: Final[float | None] = None

# ---------------------------------------------------------------------------
# Geo · radius and hashing
# ---------------------------------------------------------------------------
RADIUS_MIN_M: Final[int] = 100
RADIUS_MAX_M: Final[int] = 5000
GEOHASH_PRECISION: Final[int] = 6

# Radius buckets used in content_hash to preserve legitimate variants.
# Bucket name is chosen by the SMALLEST bucket whose max_m >= radius_m.
RADIUS_BUCKETS: Final[tuple[tuple[str, int], ...]] = (
    ("narrow", 300),
    ("medium", 1000),
    ("wide", 3000),
    ("broad", 5000),
)

# ---------------------------------------------------------------------------
# HTTP identity
# ---------------------------------------------------------------------------
USER_AGENT: Final[str] = (
    "KUDOS-ContentEngine/0.1 (https://kudos-40cq.onrender.com)"
)

# ---------------------------------------------------------------------------
# Geocache · V0 (geo-retrieval cache)
# ---------------------------------------------------------------------------
# Bump CACHE_SCHEMA_VERSION to invalidate ALL existing rows (lookup filters
# by version match). Bump on candidate-source semantics change, JSON shape
# change, or any change that makes prior cached payloads incompatible with
# the current pipeline.
#
# Version history:
#   1 · initial · Wikidata SPARQL primary (full classes, real sitelinks)
#   2 · Wikipedia GeoSearch primary + pageprops QID resolution
#       (classes=(), sitelinks_count=1 placeholder, candidates canonical
#       by construction · entity_id always Qxxxx)
#   3 · GeoSearch + pageprops + wbgetentities enrichment
#       (real P31 classes populated, real sitelinks_count populated;
#       previous rows with hardcoded placeholders are now incompatible
#       with downstream ranking which expects live class signal)
CACHE_SCHEMA_VERSION: Final[int] = 3
CACHE_FRESH_TTL_DAYS: Final[int] = 7
CACHE_HARD_TTL_DAYS: Final[int] = 30
CACHE_NEGATIVE_TTL_SECONDS: Final[int] = 300
