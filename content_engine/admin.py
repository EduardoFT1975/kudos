"""KUDOS Content Engine · Django admin · P3 hygiene visibility."""
from __future__ import annotations

from django.contrib import admin, messages
from django.utils import timezone

from content_engine.models import GenerationAttempt, PlaceCapsule, WikidataGeoCache


@admin.register(PlaceCapsule)
class PlaceCapsuleAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "entity_id",
        "hygiene_status",
        "winner_distance_km",
        "origin_coords",
        "generation_version",
        "confidence",
        "created_at",
        "invalidated_at",
    )
    list_filter = ("hygiene_status", "generation_version", "created_at")
    search_fields = ("title", "entity_id", "id", "pipeline_run_id")
    readonly_fields = (
        "id", "content_hash", "entity_id", "confidence_breakdown",
        "generator_model", "prompt_version", "pipeline_run_id",
        "created_at", "updated_at",
    )
    list_per_page = 50
    ordering = ("-created_at",)
    actions = ("mark_valid", "mark_invalid", "mark_suspect")

    @admin.display(description="distance (km)", ordering="winner_distance_m")
    def winner_distance_km(self, obj: PlaceCapsule) -> str:
        if obj.winner_distance_m is None:
            return "—"
        return f"{obj.winner_distance_m / 1000.0:.2f}"

    @admin.display(description="origin lat,lng")
    def origin_coords(self, obj: PlaceCapsule) -> str:
        if obj.origin_lat is None or obj.origin_lng is None:
            return "—"
        return f"{obj.origin_lat:.4f}, {obj.origin_lng:.4f}"

    @admin.action(description="Mark selected as VALID")
    def mark_valid(self, request, queryset):
        n = queryset.update(
            hygiene_status="VALID",
            invalidated_at=None,
            invalidation_reason="",
        )
        self.message_user(request, f"{n} capsule(s) marked VALID.", messages.SUCCESS)

    @admin.action(description="Mark selected as SUSPECT")
    def mark_suspect(self, request, queryset):
        n = queryset.update(
            hygiene_status="SUSPECT",
            invalidated_at=None,
            invalidation_reason="admin_manual",
        )
        self.message_user(request, f"{n} capsule(s) marked SUSPECT.", messages.WARNING)

    @admin.action(description="Mark selected as INVALID")
    def mark_invalid(self, request, queryset):
        n = queryset.update(
            hygiene_status="INVALID",
            invalidated_at=timezone.now(),
            invalidation_reason="admin_manual",
        )
        self.message_user(request, f"{n} capsule(s) marked INVALID.", messages.WARNING)


@admin.register(GenerationAttempt)
class GenerationAttemptAdmin(admin.ModelAdmin):
    list_display = (
        "id", "status", "failure_class", "winner_entity_id",
        "input_lat", "input_lng", "confidence", "input_timestamp",
    )
    list_filter = ("status", "failure_class", "input_timestamp")
    search_fields = ("winner_entity_id", "pipeline_run_id", "id")
    readonly_fields = tuple(f.name for f in GenerationAttempt._meta.fields)
    ordering = ("-input_timestamp",)
    list_per_page = 50


@admin.register(WikidataGeoCache)
class WikidataGeoCacheAdmin(admin.ModelAdmin):
    list_display = (
        "cache_key", "status", "geohash6", "radius_bucket",
        "fetched_at", "expires_at",
    )
    list_filter = ("status",)
    search_fields = ("cache_key", "geohash6")
    ordering = ("-fetched_at",)
    list_per_page = 50
