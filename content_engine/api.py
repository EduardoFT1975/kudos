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
from django.views.decorators.http import require_POST, require_GET
from django_ratelimit.decorators import ratelimit

from content_engine.models import GenerationAttempt, PlaceCapsule
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


# ---------------------------------------------------------------------------
# View · GET /api/capsules/viewport (P0 map layer)
# ---------------------------------------------------------------------------
@csrf_exempt
@require_GET
def capsules_viewport(request: HttpRequest) -> JsonResponse:
    """GET /api/capsules/viewport?bbox=minLng,minLat,maxLng,maxLat&limit=100

    Returns minimal capsule headers for markers in the requested viewport.
    Used by the MapExplorer to populate visible pins on map move/idle.

    Response shape:
      {
        "capsules": [
          {"id": "...", "title": "...", "lat": ..., "lng": ...,
           "thumbnail_url": "...", "image_url": "...", "entity_id": "..."},
          ...
        ],
        "count": N
      }
    """
    bbox_raw = (request.GET.get("bbox") or "").strip()
    if not bbox_raw:
        return JsonResponse({"error": "missing bbox"}, status=400)
    try:
        parts = [float(p) for p in bbox_raw.split(",")]
    except ValueError:
        return JsonResponse({"error": "invalid bbox numerics"}, status=400)
    if len(parts) != 4:
        return JsonResponse({"error": "bbox must be 4 numbers"}, status=400)
    min_lng, min_lat, max_lng, max_lat = parts
    # Sanity checks · prevents oversized queries
    if not (-180.0 <= min_lng <= 180.0 and -180.0 <= max_lng <= 180.0):
        return JsonResponse({"error": "lng out of range"}, status=400)
    if not (-90.0 <= min_lat <= 90.0 and -90.0 <= max_lat <= 90.0):
        return JsonResponse({"error": "lat out of range"}, status=400)
    if min_lat > max_lat or min_lng > max_lng:
        return JsonResponse({"error": "bbox min > max"}, status=400)

    try:
        limit = int(request.GET.get("limit") or "100")
    except ValueError:
        limit = 100
    limit = max(1, min(limit, 500))

    # P3 hygiene · default excludes INVALID. SUSPECT opt-in via flag.
    include_suspect = (request.GET.get("include_suspect") or "").lower() in (
        "1", "true", "yes",
    )
    allowed_status = ["VALID"]
    if include_suspect:
        allowed_status.append("SUSPECT")

    # ---- TEMP DEBUG · viewport queryset stage counts (P3.1) ---------------
    total_cap = PlaceCapsule.objects.count()
    total_app = GenerationAttempt.objects.filter(
        status=GenerationAttempt.STATUS_APPROVED, place_capsule__isnull=False,
    ).count()
    bbox_qs = GenerationAttempt.objects.filter(
        status=GenerationAttempt.STATUS_APPROVED,
        place_capsule__isnull=False,
        input_lat__gte=min_lat,
        input_lat__lte=max_lat,
        input_lng__gte=min_lng,
        input_lng__lte=max_lng,
    )
    bbox_count = bbox_qs.count()
    after_hygiene_count = bbox_qs.filter(
        place_capsule__hygiene_status__in=allowed_status,
    ).count()
    print(
        f"[VIEWPORT DEBUG] bbox=({min_lng:.4f},{min_lat:.4f})-"
        f"({max_lng:.4f},{max_lat:.4f}) "
        f"total_caps={total_cap} approved_attempts={total_app} "
        f"after_bbox={bbox_count} after_hygiene={after_hygiene_count} "
        f"allowed_status={allowed_status}"
    )
    # ---- END TEMP DEBUG ----------------------------------------------------

    qs = (
        GenerationAttempt.objects.filter(
            status=GenerationAttempt.STATUS_APPROVED,
            place_capsule__isnull=False,
            place_capsule__hygiene_status__in=allowed_status,
            input_lat__gte=min_lat,
            input_lat__lte=max_lat,
            input_lng__gte=min_lng,
            input_lng__lte=max_lng,
        )
        .select_related("place_capsule")
        .order_by("-input_timestamp")[: limit * 4]
    )

    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for att in qs:
        cap = att.place_capsule
        if cap is None:
            continue
        cap_id = str(cap.id)
        if cap_id in seen:
            continue
        seen.add(cap_id)
        out.append({
            "id": cap_id,
            "entity_id": cap.entity_id,
            "title": cap.title,
            "lat": att.input_lat,
            "lng": att.input_lng,
            "image_url": getattr(cap, "image_url", "") or "",
            "thumbnail_url": getattr(cap, "thumbnail_url", "") or "",
            "hygiene_status": getattr(cap, "hygiene_status", "VALID"),
        })
        if len(out) >= limit:
            break

    # ---- TEMP DEBUG · final serialized count -----------------------------
    print(
        f"[VIEWPORT DEBUG] serialized_returned={len(out)} "
        f"raw_qs_iterated={len(seen)}"
    )
    # ---- END TEMP DEBUG --------------------------------------------------
    return JsonResponse({"capsules": out, "count": len(out)}, status=200)


# ---------------------------------------------------------------------------
# View · GET /api/debug/capsules-count (P3.1 inventory · TEMP)
# ---------------------------------------------------------------------------
@csrf_exempt
@require_GET
def capsules_debug_count(request: HttpRequest) -> JsonResponse:
    """GET /api/debug/capsules-count

    DB inventory diagnostic · no params · returns counts grouped by
    hygiene status, attempt linkage, and bbox tests for canonical regions.
    Temporary endpoint · safe to remove once viewport behavior validated.
    """
    from django.db.models import Count

    total_cap = PlaceCapsule.objects.count()

    by_hygiene_qs = PlaceCapsule.objects.values("hygiene_status").annotate(n=Count("id"))
    by_hygiene = {row["hygiene_status"] or "NULL": row["n"] for row in by_hygiene_qs}

    null_hygiene = PlaceCapsule.objects.filter(hygiene_status__isnull=True).count()
    null_winner_distance = PlaceCapsule.objects.filter(
        winner_distance_m__isnull=True,
    ).count()

    approved_attempts = GenerationAttempt.objects.filter(
        status=GenerationAttempt.STATUS_APPROVED,
    ).count()
    linked_attempts = GenerationAttempt.objects.filter(
        status=GenerationAttempt.STATUS_APPROVED,
        place_capsule__isnull=False,
    ).count()

    def _bbox_count(min_lat, min_lng, max_lat, max_lng) -> int:
        return GenerationAttempt.objects.filter(
            status=GenerationAttempt.STATUS_APPROVED,
            place_capsule__isnull=False,
            input_lat__gte=min_lat, input_lat__lte=max_lat,
            input_lng__gte=min_lng, input_lng__lte=max_lng,
        ).count()

    bbox_tests = {
        "world":           _bbox_count(-90,  -180, 90,  180),
        "europe":          _bbox_count( 35,   -15, 70,   45),
        "iberia":          _bbox_count( 35,   -10, 45,    5),
        "madrid_1deg":     _bbox_count( 39.9, -4.2, 40.9, -3.2),
        "rome_1deg":       _bbox_count( 41.4, 12.0, 42.4, 13.0),
        "spain_andalucia": _bbox_count( 36,   -7.5, 38.5, -1.5),
    }

    # Sample first 10 approved attempts · raw input coords + capsule id
    sample = list(
        GenerationAttempt.objects.filter(
            status=GenerationAttempt.STATUS_APPROVED,
            place_capsule__isnull=False,
        ).select_related("place_capsule")
        .order_by("-input_timestamp")[:10]
        .values(
            "input_lat", "input_lng",
            "place_capsule__id",
            "place_capsule__title",
            "place_capsule__hygiene_status",
            "place_capsule__winner_distance_m",
        )
    )
    sample_out = [
        {
            "lat": s["input_lat"],
            "lng": s["input_lng"],
            "capsule_id": str(s["place_capsule__id"]),
            "title": s["place_capsule__title"],
            "hygiene": s["place_capsule__hygiene_status"],
            "winner_distance_m": s["place_capsule__winner_distance_m"],
        }
        for s in sample
    ]

    return JsonResponse({
        "total_capsules": total_cap,
        "by_hygiene": by_hygiene,
        "null_hygiene": null_hygiene,
        "null_winner_distance": null_winner_distance,
        "approved_attempts": approved_attempts,
        "linked_attempts": linked_attempts,
        "bbox_tests": bbox_tests,
        "sample_attempts": sample_out,
    }, status=200)


def _serialize_capsule(capsule: PlaceCapsule) -> dict[str, Any]:
    """UX-safe capsule serialization.

    EXPOSES:
        id, entity_id, title, factual_anchor, context_block, source_refs
        + P2 media fields (optional · only when present):
        image_url, thumbnail_url, gallery, video_url, media_source,
        media_caption, media_debug (temporary diagnostic)

    OMITS (internal · not for client):
        content_hash, confidence_breakdown, generator_model,
        prompt_version, pipeline_run_id, created_at, updated_at.
    """
    payload: dict[str, Any] = {
        "id": str(capsule.id),
        "entity_id": capsule.entity_id,
        "title": capsule.title,
        "factual_anchor": capsule.factual_anchor,
        "context_block": capsule.context_block,
        "source_refs": capsule.source_refs,
    }

    # P2 · media fields · only emit non-empty values · keeps wire payload
    # tight for capsules without media (e.g., older rows pre-migration).
    image_url = getattr(capsule, "image_url", "") or ""
    thumbnail_url = getattr(capsule, "thumbnail_url", "") or ""
    gallery = getattr(capsule, "gallery", []) or []
    video_url = getattr(capsule, "video_url", "") or ""
    media_source = getattr(capsule, "media_source", "") or ""
    media_caption = getattr(capsule, "media_caption", "") or ""

    if image_url:
        payload["image_url"] = image_url
    if thumbnail_url:
        payload["thumbnail_url"] = thumbnail_url
    if gallery:
        payload["gallery"] = gallery
    if video_url:
        payload["video_url"] = video_url
    if media_source:
        payload["media_source"] = media_source
    if media_caption:
        payload["media_caption"] = media_caption

    # P2.6 · Generative visual fallback · siempre se computa (pure +
    # ~1ms). Cuando documentary media existe, frontend prioriza image_url.
    # Cuando no, el frontend cascade lo recoge via generated_fallback_url
    # (que el client puede mapear a image_url si quiere).
    try:
        from content_engine.media_generation import build_generated_fallback
        gen = build_generated_fallback(capsule)
        payload["hero_prompt"] = gen["hero_prompt"]
        payload["hero_style"] = gen["hero_style"]
        payload["generated_fallback_url"] = gen["generated_fallback_url"]
        # Si documentary chain no entregó imagen, promovemos el procedural
        # a image_url + thumbnail_url para que el frontend cascade existente
        # lo consuma sin cambios.
        if not image_url:
            payload["image_url"] = gen["generated_fallback_url"]
            payload["thumbnail_url"] = gen["generated_fallback_url"]
            if not media_source:
                payload["media_source"] = "KUDOS Generated"
    except Exception:  # noqa: BLE001
        # Generación nunca debe romper la respuesta · degradamos a campos
        # documentary tal cual estaban.
        pass

    # P2 / P2.6 debug · "REAL" cuando documentary OK · "GENERATED" cuando
    # solo procedural · "NONE" si todo falló (no debería ocurrir post-P2.6).
    if image_url:
        payload["media_debug"] = "REAL"
    elif payload.get("generated_fallback_url"):
        payload["media_debug"] = "GENERATED"
    else:
        payload["media_debug"] = "NONE"

    # P3 hygiene · diagnostic fields · always emitted when present
    hygiene = getattr(capsule, "hygiene_status", None)
    if hygiene:
        payload["hygiene_status"] = hygiene
    wdm = getattr(capsule, "winner_distance_m", None)
    if isinstance(wdm, (int, float)):
        payload["winner_distance_km"] = round(wdm / 1000.0, 2)
    gen_v = getattr(capsule, "generation_version", "") or ""
    if gen_v:
        payload["generation_version"] = gen_v

    return payload
