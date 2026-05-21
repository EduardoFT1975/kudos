"""
KUDOS Content Engine · API bridge (Phase 11 / 11.5 / 13).

Single Django view that runs the pipeline and translates its output to
the UX-safe CapsuleResponse shape consumed by the Next.js
CapsuleStateRouter.

Strict boundary: this file is the ONLY place where backend taxonomy
(failure_class, raw confidence floats, internal model fields) gets
mapped to UX-presentable states. Downstream client code (frontend)
NEVER sees raw backend language.

Endpoint (Phase 13 canonical):
    POST /api/place-capsule
    Body: {"lat": float, "lng": float, "radius_m"?: int,
           "photo_id"?: str | null, "pipeline_run_id"?: str | null}
    Defaults: radius_m = 1500 if missing.
    Returns: CapsuleResponse JSON · always 200 on valid input.
             400 only on malformed JSON / out-of-range coords.

Mapping rules (per Phase 11.5 · real signal, not heuristic):

    CASE A · capsule + confidence >= 0.75 + NOT via_landmark_override
             → state="success", partial=false, source="direct"
    CASE B · capsule + (confidence < 0.75 OR via_landmark_override)
             → state="sparse_discovery", partial=true,
               source="landmark_override" | "direct"
    CASE C · no capsule
             → state="empty_zone", capsule=null, partial=false,
               source=null, confidence=null

DO NOT modify ranking, landmark override, grounding, or content
generation pipeline. Integration only. Pipeline is called as-is.
"""
from __future__ import annotations

import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django_ratelimit.decorators import ratelimit

from content_engine.models import PlaceCapsule
from content_engine.pipeline import PipelineResult, generate_place_capsule

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Phase 13 hardening · health header values for monitoring
# ---------------------------------------------------------------------------
# Response header `X-Kudos-Pipeline-Health` lets ops monitoring detect
# pipeline degradation without changing the UX response contract.
# Values:
#   "ok"        · capsule generated successfully (state=success|sparse)
#   "empty"     · clean suppression (state=empty_zone, no exception)
#   "degraded"  · pipeline raised unexpectedly · empty_zone served
#   "throttled" · request was rate-limited · 429 returned
_HEALTH_HEADER: str = "X-Kudos-Pipeline-Health"
_HEALTH_OK: str = "ok"
_HEALTH_EMPTY: str = "empty"
_HEALTH_DEGRADED: str = "degraded"
_HEALTH_THROTTLED: str = "throttled"
_HEALTH_BAD_REQUEST: str = "bad_request"  # H1 · validation 400 responses

# Phase 13 hardening · rate limiting
# 10 requests per minute per identity. Each call costs an Anthropic
# LLM request (~$0.001) plus Wikipedia/Wikidata API calls. Without a
# limit, a single bad actor or crawler can burn budget rapidly.
_RATE_LIMIT: str = "10/m"

# Phase 13 audit fix · C3: env-driven rate limit key so deploys
# behind a proxy can switch to a header-based identity. Otherwise
# `key="ip"` uses REMOTE_ADDR which is the proxy IP behind
# Cloudflare/Render/Nginx · ALL users share one bucket → broken.
#
# Examples:
#   RATELIMIT_KEY=ip                          (dev, direct exposure)
#   RATELIMIT_KEY=header:x-forwarded-for      (behind generic reverse proxy)
#   RATELIMIT_KEY=header:cf-connecting-ip     (behind Cloudflare)
#   RATELIMIT_KEY=header:x-real-ip            (behind Nginx with real_ip module)
#
# See django-ratelimit docs for full key format syntax.
_RATELIMIT_KEY: str = os.getenv("RATELIMIT_KEY", "ip")


# ---------------------------------------------------------------------------
# UX state mapping thresholds
# ---------------------------------------------------------------------------
_CONFIDENCE_SUCCESS_THRESHOLD: float = 0.75


# ---------------------------------------------------------------------------
# Input validation bounds (mirrors NormalizedInput schema downstream)
# ---------------------------------------------------------------------------
_DEFAULT_RADIUS_M: int = 1500
_RADIUS_MIN: int = 100
_RADIUS_MAX: int = 5000
_LAT_MIN: float = -90.0
_LAT_MAX: float = 90.0
_LNG_MIN: float = -180.0
_LNG_MAX: float = 180.0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _effective_rate_limit_identity(request: HttpRequest) -> str:
    """Resolve the SAME identity that django-ratelimit uses for the
    throttle bucket. Aligns forensic logs (rate_limited events) with
    the actual throttle decision · prevents misleading attribution.

    Supports the key formats we use:
        "ip"               → REMOTE_ADDR
        "header:<name>"    → request header value (leftmost entry if
                             comma-separated, e.g. XFF chains)

    Anything else falls back to REMOTE_ADDR to avoid silent surprises.
    """
    key = _RATELIMIT_KEY
    if key.startswith("header:"):
        header_name = key[len("header:"):].strip()
        # "x-forwarded-for" → "HTTP_X_FORWARDED_FOR"
        meta_key = "HTTP_" + header_name.upper().replace("-", "_")
        raw = request.META.get(meta_key, "")
        if raw:
            # Multi-value headers (XFF chain) · take leftmost (originator)
            return raw.split(",")[0].strip()
        # Header missing on this request · fallback to direct IP
        return request.META.get("REMOTE_ADDR", "unknown")
    # Default "ip" or unrecognized spec
    return request.META.get("REMOTE_ADDR", "unknown")


def _json_with_health(
    payload: dict[str, Any], health: str, status: int = 200,
) -> JsonResponse:
    """JsonResponse with X-Kudos-Pipeline-Health header set."""
    response = JsonResponse(payload, status=status)
    response[_HEALTH_HEADER] = health
    return response


# ---------------------------------------------------------------------------
# View · POST /api/place-capsule
# ---------------------------------------------------------------------------
@csrf_exempt
@require_POST
@ratelimit(key=_RATELIMIT_KEY, rate=_RATE_LIMIT, method="POST", block=False)
def place_capsule(request: HttpRequest) -> JsonResponse:
    """POST /api/place-capsule · run pipeline + return CapsuleResponse.

    Validation:
        - lat required, numeric, in [-90, 90]
        - lng required, numeric, in [-180, 180]
        - radius_m optional, default 1500, in [100, 5000] if provided

    Failure handling:
        - Rate limit exceeded → 429 rate_limited (X-Kudos-Pipeline-Health=throttled)
        - Malformed JSON body → 400 invalid_json
        - Missing/non-numeric coords → 400 invalid_coordinates
        - Out-of-range values → 400 coordinates_out_of_range
        - Pipeline raises unexpectedly → degrade to empty_zone (200, health=degraded)
        - Pipeline returns None → empty_zone (200, health=empty)
        - Capsule generated → 200, health=ok

    Rate limit (Phase 13 hardening):
        10 requests per minute per IP. block=False so we return a JSON
        429 instead of Django's default HTML 403 page. Preserves API
        contract for SPA clients.
    """
    # Phase 13 hardening · rate limit gate (JSON response, not Django HTML)
    if getattr(request, "limited", False):
        # Log the SAME identity used by the throttle bucket · so forensic
        # logs and rate limit decisions reference the same source.
        log.warning(
            "[place_capsule] rate_limited identity=%s key_spec=%s ua=%r",
            _effective_rate_limit_identity(request),
            _RATELIMIT_KEY,
            request.META.get("HTTP_USER_AGENT", "")[:120],
        )
        return _json_with_health(
            {"error": "rate_limited"},
            health=_HEALTH_THROTTLED,
            status=429,
        )

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return _json_with_health(
            {"error": "invalid_json"}, _HEALTH_BAD_REQUEST, status=400,
        )

    # lat / lng · required and numeric
    raw_lat = payload.get("lat")
    raw_lng = payload.get("lng")
    if raw_lat is None or raw_lng is None:
        return _json_with_health(
            {"error": "missing_coordinates"}, _HEALTH_BAD_REQUEST, status=400,
        )
    try:
        lat = float(raw_lat)
        lng = float(raw_lng)
    except (TypeError, ValueError):
        return _json_with_health(
            {"error": "invalid_coordinates"}, _HEALTH_BAD_REQUEST, status=400,
        )

    # Sane ranges
    if not (_LAT_MIN <= lat <= _LAT_MAX) or not (_LNG_MIN <= lng <= _LNG_MAX):
        return _json_with_health(
            {"error": "coordinates_out_of_range"},
            _HEALTH_BAD_REQUEST,
            status=400,
        )

    # radius_m · optional, default 1500
    raw_radius = payload.get("radius_m")
    if raw_radius is None:
        radius_m = _DEFAULT_RADIUS_M
    else:
        try:
            radius_m = int(raw_radius)
        except (TypeError, ValueError):
            return _json_with_health(
                {"error": "invalid_radius"}, _HEALTH_BAD_REQUEST, status=400,
            )
        if not (_RADIUS_MIN <= radius_m <= _RADIUS_MAX):
            return _json_with_health(
                {"error": "radius_out_of_range"},
                _HEALTH_BAD_REQUEST,
                status=400,
            )

    run_id = str(payload.get("pipeline_run_id") or f"api-{uuid.uuid4()}")
    photo_id = payload.get("photo_id") or None

    normalized_input = {
        "lat": lat,
        "lng": lng,
        "radius_m": radius_m,
        "timestamp": datetime.now(timezone.utc),
        "photo_id": photo_id,
        "pipeline_run_id": run_id,
    }

    # Pipeline call · observability timing + degraded health tracking
    started_at = time.perf_counter()
    pipeline_degraded = False
    result: PipelineResult
    try:
        result = generate_place_capsule(normalized_input)
    except Exception as exc:  # noqa: BLE001
        # Any unexpected pipeline exception → log internally, surface
        # empty_zone to the client. NEVER expose exception text.
        # The X-Kudos-Pipeline-Health header carries the "degraded"
        # signal so ops monitoring detects this without changing UX.
        log.error(
            "Pipeline crashed for run %s: %s", run_id, exc, exc_info=True,
        )
        pipeline_degraded = True
        result = PipelineResult(capsule=None, via_landmark_override=False)
    latency_ms = int((time.perf_counter() - started_at) * 1000)

    response_body = _translate_to_ux_response(
        result.capsule, result.via_landmark_override,
    )

    # Phase 13 · structured server log per request.
    # Lat/lng redacted to 2 decimals (~1km precision) for privacy ·
    # sufficient for debug (which zone produced the error) without
    # creating a per-user location trail.
    # cache_hit deferred · would require pipeline introspection which
    # is out of integration scope (DO NOT modify generation pipeline).
    confidence_log = response_body["meta"].get("confidence")
    confidence_str = (
        f"{confidence_log:.3f}" if isinstance(confidence_log, (int, float))
        else "null"
    )
    log.info(
        "[place_capsule] run_id=%s lat=%.2f lng=%.2f radius_m=%d "
        "state=%s confidence=%s landmark_override=%s latency_ms=%d "
        "degraded=%s",
        run_id, lat, lng, radius_m,
        response_body["state"], confidence_str,
        result.via_landmark_override, latency_ms,
        pipeline_degraded,
    )

    # Determine health header value · separates transport status (HTTP
    # 200) from application status (capsule / empty / degraded).
    if pipeline_degraded:
        health = _HEALTH_DEGRADED
    elif result.capsule is None:
        health = _HEALTH_EMPTY
    else:
        health = _HEALTH_OK

    return _json_with_health(response_body, health=health, status=200)


# Phase 13 backward-compat alias · the previous endpoint name was
# `/api/capsule/nearby` (Phase 11). New canonical endpoint is
# `/api/place-capsule`. Alias kept so any deployed client referencing
# the old path continues to work. Both call the same handler.
capsule_nearby = place_capsule


# ---------------------------------------------------------------------------
# Translator · backend → UX
# ---------------------------------------------------------------------------
def _translate_to_ux_response(
    capsule: PlaceCapsule | None,
    via_landmark_override: bool,
) -> dict[str, Any]:
    """Apply Phase 11 mapping rules · Phase 11.5 uses real pipeline signal.

    Pure function · no side effects.
    Inputs are the (capsule, via_landmark_override) pair emitted by
    `generate_place_capsule` PipelineResult tuple. No heuristic
    inference · the override signal is authoritative.
    """
    # CASE C · empty zone
    if capsule is None:
        return {
            "state": "empty_zone",
            "capsule": None,
            "meta": {
                "confidence": None,
                "partial": False,
                "source": None,
            },
        }

    confidence = float(capsule.confidence) if capsule.confidence is not None else 0.0

    # CASE A · success
    if confidence >= _CONFIDENCE_SUCCESS_THRESHOLD and not via_landmark_override:
        return {
            "state": "success",
            "capsule": _serialize_capsule(capsule),
            "meta": {
                "confidence": confidence,
                "partial": False,
                "source": "direct",
            },
        }

    # CASE B · sparse discovery
    return {
        "state": "sparse_discovery",
        "capsule": _serialize_capsule(capsule),
        "meta": {
            "confidence": confidence,
            "partial": True,
            "source": "landmark_override" if via_landmark_override else "direct",
        },
    }


def _serialize_capsule(capsule: PlaceCapsule) -> dict[str, Any]:
    """UX-safe capsule serialization.

    EXPOSES:
        id, entity_id, title, factual_anchor, context_block, source_refs

    OMITS (internal · not for client):
        content_hash, confidence_breakdown, generator_model,
        prompt_version, pipeline_run_id, created_at, updated_at.
    """
    return {
        "id": str(capsule.id),
        "entity_id": capsule.entity_id,
        "title": capsule.title,
        "factual_anchor": capsule.factual_anchor,
        "context_block": capsule.context_block,
        "source_refs": capsule.source_refs,
    }
