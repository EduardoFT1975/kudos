"""KUDOS Content Engine · URL routing.

Phase 13 canonical endpoint: `POST /api/place-capsule/` (trailing slash,
Django convention with APPEND_SLASH=True).
Back-compat aliases sin trailing slash + Phase 11 nearby path.

P0.8 fix · `OPTIONS /api/place-capsule` devolvía 404 en producción Render
(posiblemente por normalización de URL en el proxy). Registramos AMBAS
variantes (con y sin slash) para que cualquier cliente / proxy resuelva
sin redirects. Frontend se actualiza al canonical con slash en este
mismo deploy.
"""
from __future__ import annotations

from django.urls import path

from content_engine.api import (
    capsule_nearby,
    capsules_debug_count,
    capsules_viewport,
    landmarks_viewport,
    local_capsules_generate,
    place_capsule,
)

app_name = "content_engine"

urlpatterns = [
    # Phase 13 canonical (Django default · trailing slash)
    path("api/place-capsule/", place_capsule, name="place_capsule"),
    # Back-compat: no trailing slash (older clients still in flight)
    path("api/place-capsule", place_capsule, name="place_capsule_noslash"),
    # Phase 11 back-compat alias (with + without slash)
    path("api/capsule/nearby/", capsule_nearby, name="capsule_nearby"),
    path("api/capsule/nearby", capsule_nearby, name="capsule_nearby_noslash"),
    # P0 map layer · viewport bbox query for visible capsule markers
    path("api/capsules/viewport/", capsules_viewport, name="capsules_viewport"),
    path("api/capsules/viewport", capsules_viewport, name="capsules_viewport_noslash"),
    # P3.1 TEMP · DB inventory diagnostic for viewport empty-payload debug
    path("api/debug/capsules-count/", capsules_debug_count, name="capsules_debug_count"),
    path("api/debug/capsules-count",  capsules_debug_count, name="capsules_debug_count_noslash"),
    # P3 · Temporal landmarks viewport (year-filtered GeoJSON)
    path("api/landmarks/viewport/", landmarks_viewport, name="landmarks_viewport"),
    path("api/landmarks/viewport",  landmarks_viewport, name="landmarks_viewport_noslash"),
    # Local Capsule Generator (MVP · Phase 1 · no-LLM Wikidata POIs)
    path("api/local-capsules/", local_capsules_generate, name="local_capsules"),
    path("api/local-capsules",  local_capsules_generate, name="local_capsules_noslash"),
]
