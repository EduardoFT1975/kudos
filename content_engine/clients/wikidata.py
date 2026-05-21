"""
KUDOS Content Engine · V0 Wikidata client.

Minimal sync httpx wrapper over two Wikidata endpoints:

    search_around(lat, lng, radius_m)
        SPARQL query using `wikibase:around` to find entities within
        radius_m of (lat, lng). Returns up to 20 WikidataCandidate
        ordered by distance ascending.

    search_entities(query, type_filter=None)
        wbsearchentities REST endpoint for label/keyword lookup. Returns
        a list of raw dicts (id, label, description). Used by ad-hoc
        diagnostic tooling — NOT part of the V0 pipeline path.

Failure modes are explicit:
    RetrievalTimeoutError · httpx.TimeoutException
    RetrievalClientError  · transport / non-2xx / network failure
    RetrievalParseError   · response body cannot be parsed
"""
from __future__ import annotations

import logging
import re
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from pydantic import ValidationError

from content_engine.constants import USER_AGENT
from content_engine.schemas import WikidataCandidate

log = logging.getLogger(__name__)

SPARQL_URL = "https://query.wikidata.org/sparql"
WBSEARCH_URL = "https://www.wikidata.org/w/api.php"

_MAX_RESULTS: int = 20
_KM_PER_M: float = 1.0 / 1000.0
_M_PER_KM: float = 1000.0

# Hardened outbound timeout for both endpoints (seconds).
_REQUEST_TIMEOUT_S: float = 15.0

# 429 retry policy: up to 2 retries, sleep = max(Retry-After, default).
_RETRY_429_BACKOFFS_S: tuple[float, ...] = (2.0, 5.0)


def _parse_retry_after(value: str | None) -> float:
    """Parse Retry-After header value (seconds) into a float. Returns 0.0
    on missing/malformed/HTTP-date (we do not implement date parsing in V0)."""
    if not value:
        return 0.0
    try:
        return max(float(value), 0.0)
    except (TypeError, ValueError):
        return 0.0


def _sleep_for_429(response: httpx.Response, attempt_index: int) -> float:
    """Return the actual sleep duration used for a 429 retry."""
    default = _RETRY_429_BACKOFFS_S[attempt_index]
    retry_after = _parse_retry_after(response.headers.get("Retry-After"))
    sleep_s = max(retry_after, default)
    time.sleep(sleep_s)
    return sleep_s


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------
class RetrievalError(Exception):
    """Base class for Wikidata retrieval failures."""


class RetrievalTimeoutError(RetrievalError):
    """Request timed out."""


class RetrievalClientError(RetrievalError):
    """Transport, network, or non-2xx HTTP failure."""


class RetrievalParseError(RetrievalError):
    """Response body could not be parsed into the expected shape."""


# ---------------------------------------------------------------------------
# SPARQL template
# ---------------------------------------------------------------------------
# Notes:
# - wikibase:around expects km, returns distance in km.
# - GROUP_CONCAT collapses multiple P31 classes into a CSV string.
# - hasEs / hasEn use EXISTS so they collapse to true/false even when the
#   article is not found.
# - LIMIT 20 caps the candidate pool fed to ranking.
SPARQL_TEMPLATE = """\
SELECT
  ?entity
  ?entityLabel
  ?coord
  ?dist
  (COALESCE(?sitelinks, 0) AS ?sl)
  ?hasEs
  ?hasEn
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?cls), "entity/"); separator=",") AS ?classes)
WHERE {{
  SERVICE wikibase:around {{
    ?entity wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point({lng} {lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "{radius_km}" .
    bd:serviceParam wikibase:distance ?dist .
  }}
  OPTIONAL {{ ?entity wdt:P31 ?cls . }}
  OPTIONAL {{ ?entity wikibase:sitelinks ?sitelinks . }}
  BIND(EXISTS {{ [] schema:about ?entity ; schema:isPartOf <https://es.wikipedia.org/> }} AS ?hasEs)
  BIND(EXISTS {{ [] schema:about ?entity ; schema:isPartOf <https://en.wikipedia.org/> }} AS ?hasEn)
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en" . }}
}}
GROUP BY ?entity ?entityLabel ?coord ?dist ?sitelinks ?hasEs ?hasEn
ORDER BY ASC(?dist)
LIMIT {limit}
"""

_POINT_RX = re.compile(r"^\s*Point\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)\s*$")
_QID_TAIL_RX = re.compile(r"(Q[1-9]\d*)$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _extract_qid(uri_or_id: str) -> str | None:
    """Pull the trailing Qxxxx out of a Wikidata entity URI or raw QID."""
    if not uri_or_id:
        return None
    m = _QID_TAIL_RX.search(uri_or_id.strip())
    return m.group(1) if m else None


def _parse_point(value: str) -> tuple[float, float] | None:
    """Wikidata returns `Point(lng lat)`. Return (lat, lng) or None."""
    if not value:
        return None
    m = _POINT_RX.match(value)
    if not m:
        return None
    try:
        lng = float(m.group(1))
        lat = float(m.group(2))
    except ValueError:
        return None
    return lat, lng


def _binding_value(binding: dict[str, Any], key: str) -> str | None:
    cell = binding.get(key)
    if not isinstance(cell, dict):
        return None
    val = cell.get("value")
    return val if isinstance(val, str) else None


def _binding_bool(binding: dict[str, Any], key: str) -> bool:
    cell = binding.get(key)
    if not isinstance(cell, dict):
        return False
    raw = cell.get("value")
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, str):
        return raw.strip().lower() == "true"
    return False


def _binding_int(binding: dict[str, Any], key: str, default: int = 0) -> int:
    raw = _binding_value(binding, key)
    if raw is None:
        return default
    try:
        return int(float(raw))
    except (TypeError, ValueError):
        return default


def _binding_float(binding: dict[str, Any], key: str) -> float | None:
    raw = _binding_value(binding, key)
    if raw is None:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def _parse_classes(raw: str | None) -> tuple[str, ...]:
    if not raw:
        return ()
    out: list[str] = []
    seen: set[str] = set()
    for token in raw.split(","):
        qid = _extract_qid(token.strip())
        if qid and qid not in seen:
            seen.add(qid)
            out.append(qid)
    return tuple(out)


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------
class WikidataClient:
    """Sync Wikidata client. Single instance per pipeline run is fine."""

    def __init__(
        self,
        timeout_s: float | None = None,
        user_agent: str | None = None,
        fail_fast_429: bool = False,
    ) -> None:
        # Hardened default = _REQUEST_TIMEOUT_S (15.0s). Per-instance
        # override via timeout_s kwarg restores configurability.
        self._timeout_s = float(timeout_s) if timeout_s is not None else _REQUEST_TIMEOUT_S
        self._ua = user_agent or USER_AGENT
        # When True, HTTP 429 short-circuits the retry loop and surfaces
        # immediately as RetrievalClientError. Intended for smoke/debug
        # runs where multi-second back-offs look like hangs.
        self._fail_fast_429 = bool(fail_fast_429)

    # ------------------------------------------------------------------ API
    def search_around(
        self, lat: float, lng: float, radius_m: int
    ) -> list[WikidataCandidate]:
        """Return up to 20 candidates within radius_m of (lat, lng)."""
        radius_km = max(float(radius_m) * _KM_PER_M, 0.001)
        query = SPARQL_TEMPLATE.format(
            lat=lat,
            lng=lng,
            radius_km=f"{radius_km:.6f}",
            limit=_MAX_RESULTS,
        )
        response: httpx.Response | None = None
        for attempt in range(len(_RETRY_429_BACKOFFS_S) + 1):
            try:
                with httpx.Client(timeout=self._timeout_s) as client:
                    response = client.get(
                        SPARQL_URL,
                        params={"query": query, "format": "json"},
                        headers={
                            "User-Agent": self._ua,
                            "Accept": "application/sparql-results+json",
                        },
                    )
            except httpx.TimeoutException as exc:
                raise RetrievalTimeoutError(f"Wikidata SPARQL timed out: {exc}") from exc
            except httpx.TransportError as exc:
                raise RetrievalClientError(f"Wikidata transport error: {exc}") from exc

            if response.status_code != 429 or attempt >= len(_RETRY_429_BACKOFFS_S):
                break
            if self._fail_fast_429:
                log.info("Wikidata SPARQL 429 · fail_fast_429 active · no retry")
                break
            slept = _sleep_for_429(response, attempt)
            log.info(
                "Wikidata SPARQL 429 · retry %d/%d after %.1fs",
                attempt + 1, len(_RETRY_429_BACKOFFS_S), slept,
            )

        assert response is not None  # loop always assigns

        if response.status_code >= 400:
            raise RetrievalClientError(
                f"Wikidata SPARQL HTTP {response.status_code}: {response.text[:200]}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise RetrievalParseError(f"Wikidata SPARQL JSON decode failed: {exc}") from exc

        bindings = (payload.get("results") or {}).get("bindings")
        if not isinstance(bindings, list):
            raise RetrievalParseError("Wikidata SPARQL response missing results.bindings")

        candidates: list[WikidataCandidate] = []
        for binding in bindings:
            cand = self._binding_to_candidate(binding)
            if cand is not None:
                candidates.append(cand)
        return candidates

    def search_entities(
        self, query: str, type_filter: str | None = None
    ) -> list[dict[str, Any]]:
        """wbsearchentities lookup. Returns raw search hits."""
        params: dict[str, Any] = {
            "action": "wbsearchentities",
            "format": "json",
            "language": "es",
            "uselang": "es",
            "type": type_filter or "item",
            "limit": 20,
            "search": query,
        }
        response: httpx.Response | None = None
        for attempt in range(len(_RETRY_429_BACKOFFS_S) + 1):
            try:
                with httpx.Client(timeout=self._timeout_s) as client:
                    response = client.get(
                        WBSEARCH_URL,
                        params=params,
                        headers={"User-Agent": self._ua, "Accept": "application/json"},
                    )
            except httpx.TimeoutException as exc:
                raise RetrievalTimeoutError(f"wbsearchentities timed out: {exc}") from exc
            except httpx.TransportError as exc:
                raise RetrievalClientError(f"wbsearchentities transport error: {exc}") from exc

            if response.status_code != 429 or attempt >= len(_RETRY_429_BACKOFFS_S):
                break
            if self._fail_fast_429:
                log.info("wbsearchentities 429 · fail_fast_429 active · no retry")
                break
            slept = _sleep_for_429(response, attempt)
            log.info(
                "wbsearchentities 429 · retry %d/%d after %.1fs",
                attempt + 1, len(_RETRY_429_BACKOFFS_S), slept,
            )

        assert response is not None  # loop always assigns

        if response.status_code >= 400:
            raise RetrievalClientError(
                f"wbsearchentities HTTP {response.status_code}: {response.text[:200]}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise RetrievalParseError(f"wbsearchentities JSON decode failed: {exc}") from exc

        hits = payload.get("search")
        return list(hits) if isinstance(hits, list) else []

    # ------------------------------------------------------------- internal
    def _binding_to_candidate(
        self, binding: dict[str, Any]
    ) -> WikidataCandidate | None:
        entity_uri = _binding_value(binding, "entity")
        qid = _extract_qid(entity_uri or "")
        if not qid:
            return None

        label = _binding_value(binding, "entityLabel") or qid
        coord_raw = _binding_value(binding, "coord") or ""
        coords = _parse_point(coord_raw)
        if coords is None:
            return None
        lat, lng = coords

        dist_km = _binding_float(binding, "dist")
        if dist_km is None:
            return None
        distance_m = max(dist_km * _M_PER_KM, 0.0)

        sitelinks = _binding_int(binding, "sl", default=0)
        has_es = _binding_bool(binding, "hasEs")
        has_en = _binding_bool(binding, "hasEn")
        classes = _parse_classes(_binding_value(binding, "classes"))

        try:
            return WikidataCandidate(
                entity_id=qid,
                label=label,
                lat=lat,
                lng=lng,
                distance_m=distance_m,
                classes=classes,
                sitelinks_count=sitelinks,
                has_es_wiki=has_es,
                has_en_wiki=has_en,
            )
        except ValidationError as exc:
            log.debug("Dropping malformed Wikidata candidate %s: %s", qid, exc)
            return None


# Re-exported convenience: fetched-at stamp for callers wiring SourceRef.
def wikidata_now() -> datetime:
    return datetime.now(timezone.utc)
