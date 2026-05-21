"""
KUDOS Content Engine · V0 hashing.

Deterministic identifiers for cache + dedupe:

    geo_bucket(lat, lng)      → geohash6 string
    radius_bucket(radius_m)   → bucket name (narrow/medium/wide/broad)
    compute_content_hash(...) → sha256 hex of canonical key

The content_hash is the UNIQUE key in PlaceCapsule. It must include
entity_id, geohash6, radius_bucket, and prompt_version so that legitimate
variants (different radius scope, prompt iteration, geographic context)
do not collide while the same query at the same scope deduplicates.
"""
from __future__ import annotations

import hashlib

import pygeohash

from content_engine.constants import (
    GEOHASH_PRECISION,
    PROMPT_VERSION,
    RADIUS_BUCKETS,
    RADIUS_MAX_M,
    RADIUS_MIN_M,
)


# ---------------------------------------------------------------------------
# geo_bucket · lat/lng → geohash6
# ---------------------------------------------------------------------------
def geo_bucket(lat: float, lng: float) -> str:
    """Encode coordinates to a geohash at GEOHASH_PRECISION."""
    if not (-90.0 <= lat <= 90.0):
        raise ValueError(f"lat out of range: {lat}")
    if not (-180.0 <= lng <= 180.0):
        raise ValueError(f"lng out of range: {lng}")
    return pygeohash.encode(latitude=lat, longitude=lng, precision=GEOHASH_PRECISION)


# ---------------------------------------------------------------------------
# radius_bucket · meters → named bucket
# ---------------------------------------------------------------------------
def radius_bucket(radius_m: int) -> str:
    """Pick the smallest bucket whose max_m >= radius_m.

    Buckets (locked): narrow ≤300m, medium ≤1000m, wide ≤3000m, broad ≤5000m.
    """
    r = int(radius_m)
    if r < RADIUS_MIN_M:
        raise ValueError(f"radius_m below minimum {RADIUS_MIN_M}: {r}")
    if r > RADIUS_MAX_M:
        raise ValueError(f"radius_m above maximum {RADIUS_MAX_M}: {r}")
    for name, max_m in RADIUS_BUCKETS:
        if r <= max_m:
            return name
    # Defensive: RADIUS_BUCKETS covers up to RADIUS_MAX_M by construction.
    raise ValueError(f"no bucket matched radius_m={r}")


# ---------------------------------------------------------------------------
# compute_content_hash · canonical sha256
# ---------------------------------------------------------------------------
def compute_content_hash(
    *,
    entity_id: str,
    lat: float,
    lng: float,
    radius_m: int,
    prompt_version: str | None = None,
) -> str:
    """Return the sha256 hex of the canonical PlaceCapsule key.

    Canonical key: "place|{entity_id}|{geohash6}|{radius_bucket}|{prompt_version}"
    """
    if not entity_id:
        raise ValueError("entity_id must be non-empty")
    pv = prompt_version or PROMPT_VERSION
    key = "|".join(
        [
            "place",
            entity_id,
            geo_bucket(lat, lng),
            radius_bucket(radius_m),
            pv,
        ]
    )
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# cache_key_for · geohash6 + radius_bucket (Wikidata geocache)
# ---------------------------------------------------------------------------
def cache_key_for(lat: float, lng: float, radius_m: int) -> str:
    """Cache key for WikidataGeoCache lookups.

    Same geohash + radius_bucket pair → same cache row. Independent of
    entity_id and prompt_version (those live in content_hash, downstream
    of retrieval).
    """
    return f"{geo_bucket(lat, lng)}|{radius_bucket(radius_m)}"
