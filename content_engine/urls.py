"""KUDOS Content Engine · URL routing.

Phase 13 canonical endpoint: `POST /api/place-capsule`.
Phase 11 alias preserved: `POST /api/capsule/nearby` (back-compat for
any pre-Phase-13 client). Both routes hit the same view.
"""
from __future__ import annotations

from django.urls import path

from content_engine.api import capsule_nearby, place_capsule

app_name = "content_engine"

urlpatterns = [
    # Phase 13 canonical
    path("api/place-capsule", place_capsule, name="place_capsule"),
    # Phase 11 back-compat alias
    path("api/capsule/nearby", capsule_nearby, name="capsule_nearby"),
]
