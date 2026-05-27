"""KUDOS Content Engine · URL routing.

Phase 13 canonical endpoint: `POST /api/place-capsule/` (trailing slash,
Django convention with APPEND_SLASH=True).
Back-compat aliases sin trailing slash + Phase 11 nearby path.
"""
from __future__ import annotations

from django.urls import path

from content_engine.api import (
    echo_share_count,
    echo_share_track,
    capsule_nearby,
    capsules_debug_count,
    capsules_viewport,
    echo_synthesize,
    landmarks_viewport,
    local_capsules_generate,
    place_capsule,
)

app_name = "content_engine"

urlpatterns = [
    # Phase 13 canonical (Django default · trailing slash)
    path("api/place-capsule/", place_capsule, name="place_capsule"),
    path("api/place-capsule", place_capsule, name="place_capsule_noslash"),
    # Phase 11 back-compat alias
    path("api/capsule/nearby/", capsule_nearby, name="capsule_nearby"),
    path("api/capsule/nearby", capsule_nearby, name="capsule_nearby_noslash"),
    # P0 viewport bbox query for visible capsule markers
    path("api/capsules/viewport/", capsules_viewport, name="capsules_viewport"),
    path("api/capsules/viewport", capsules_viewport, name="capsules_viewport_noslash"),
    # P3.1 TEMP · DB inventory diagnostic
    path("api/debug/capsules-count/", capsules_debug_count, name="capsules_debug_count"),
    path("api/debug/capsules-count", capsules_debug_count, name="capsules_debug_count_noslash"),
    # P3 · Temporal landmarks viewport (year-filtered GeoJSON)
    path("api/landmarks/viewport/", landmarks_viewport, name="landmarks_viewport"),
    path("api/landmarks/viewport", landmarks_viewport, name="landmarks_viewport_noslash"),
    # Local Capsule Generator (MVP · Phase 1 · no-LLM Wikidata POIs)
    path("api/local-capsules/", local_capsules_generate, name="local_capsules"),
    path("api/local-capsules", local_capsules_generate, name="local_capsules_noslash"),
    # Echo synthesis · Phase 3 · LLM cinematic narrative per POI
    path("api/echo/synthesize/", echo_synthesize, name="echo_synthesize"),
    path("api/echo/synthesize", echo_synthesize, name="echo_synthesize_noslash"),
    # Phase 3 viral · share tracking + counter (real social proof)
    path("api/echo/share/", echo_share_track, name="echo_share_track"),
    path("api/echo/share", echo_share_track, name="echo_share_track_noslash"),
    path("api/echo/share-count/", echo_share_count, name="echo_share_count"),
    path("api/echo/share-count", echo_share_count, name="echo_share_count_noslash"),
]
