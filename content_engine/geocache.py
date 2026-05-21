"""
KUDOS Content Engine · V0 geocache helpers.

Thin functional layer over `WikidataGeoCache`. Three public helpers:

    cache_lookup(cache_key)
        Returns the row if (and only if) its `cache_schema_version`
        matches the current CACHE_SCHEMA_VERSION constant. Caller
        branches on `status` + timestamps.

    cache_write_fresh(cache_key, geohash6, radius_bucket, candidates)
        Upsert as `fresh`. TTLs:
            stale_after = now + CACHE_FRESH_TTL_DAYS
            expires_at  = now + CACHE_HARD_TTL_DAYS

    cache_write_negative(cache_key, geohash6, radius_bucket, failure_reason)
        Upsert as `negative`. TTL:
            expires_at = now + CACHE_NEGATIVE_TTL_SECONDS

Also exports `deserialize_candidates` so the pipeline can convert
JSONField payloads back into pydantic models.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from pydantic import ValidationError

from content_engine.constants import (
    CACHE_FRESH_TTL_DAYS,
    CACHE_HARD_TTL_DAYS,
    CACHE_NEGATIVE_TTL_SECONDS,
    CACHE_SCHEMA_VERSION,
)
from content_engine.models import WikidataGeoCache
from content_engine.schemas import WikidataCandidate

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def cache_lookup(cache_key: str) -> WikidataGeoCache | None:
    """Return the cache row if its schema version matches, else None."""
    if not cache_key:
        return None
    entry = WikidataGeoCache.objects.filter(cache_key=cache_key).first()
    if entry is None:
        return None
    if entry.cache_schema_version != CACHE_SCHEMA_VERSION:
        # Schema bump → treat old payload as if absent.
        return None
    return entry


def deserialize_candidates(raw: Any) -> list[WikidataCandidate]:
    """Decode JSONField list back into WikidataCandidate models.
    Silently drops malformed entries; logs at DEBUG."""
    out: list[WikidataCandidate] = []
    if not isinstance(raw, list):
        return out
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            out.append(WikidataCandidate.model_validate(item))
        except ValidationError as exc:
            log.debug("Dropping malformed cached candidate: %s", exc)
    return out


def cache_write_fresh(
    cache_key: str,
    geohash6: str,
    radius_bucket: str,
    candidates: list[WikidataCandidate],
) -> None:
    """Upsert a `fresh` cache row with full TTL windows."""
    now = datetime.now(timezone.utc)
    payload = [_serialize_candidate(c) for c in candidates]
    WikidataGeoCache.objects.update_or_create(
        cache_key=cache_key,
        defaults={
            "geohash6": geohash6,
            "radius_bucket": radius_bucket,
            "candidates": payload,
            "status": WikidataGeoCache.STATUS_FRESH,
            "fetched_at": now,
            "stale_after": now + timedelta(days=CACHE_FRESH_TTL_DAYS),
            "expires_at": now + timedelta(days=CACHE_HARD_TTL_DAYS),
            "failure_reason": "",
            "cache_schema_version": CACHE_SCHEMA_VERSION,
        },
    )


def cache_write_negative(
    cache_key: str,
    geohash6: str,
    radius_bucket: str,
    failure_reason: str,
) -> None:
    """Upsert a `negative` cache row with short TTL (thundering-herd guard)."""
    now = datetime.now(timezone.utc)
    WikidataGeoCache.objects.update_or_create(
        cache_key=cache_key,
        defaults={
            "geohash6": geohash6,
            "radius_bucket": radius_bucket,
            "candidates": [],
            "status": WikidataGeoCache.STATUS_NEGATIVE,
            "fetched_at": now,
            "stale_after": now,
            "expires_at": now + timedelta(seconds=CACHE_NEGATIVE_TTL_SECONDS),
            "failure_reason": (failure_reason or "")[:200],
            "cache_schema_version": CACHE_SCHEMA_VERSION,
        },
    )


# ---------------------------------------------------------------------------
# Private
# ---------------------------------------------------------------------------
def _serialize_candidate(c: WikidataCandidate) -> dict[str, Any]:
    """Pydantic → JSON-safe dict for storage in JSONField."""
    return c.model_dump(mode="json")
