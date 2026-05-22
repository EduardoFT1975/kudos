"""
KUDOS Content Engine · V0 persistence layer (Django ORM).

Two tables, dual-write per pipeline run inside a single transaction:

    PlaceCapsule
        Approved capsules only. content_hash is UNIQUE — it is the
        deduplication key (entity_id + geohash6 + radius_bucket +
        prompt_version). source_refs and confidence_breakdown are
        JSONField for V0 simplicity.

    GenerationAttempt
        Audit log. ONE row per pipeline run, regardless of outcome.
        - status = "approved"  → place_capsule FK set, failure_class blank
        - status = "suppressed" → place_capsule NULL, failure_class set
        Input fields are echoed so a run is fully reproducible from the
        attempt row alone.
"""
from __future__ import annotations

import uuid

from django.db import models


# ---------------------------------------------------------------------------
# PlaceCapsule · approved capsules
# ---------------------------------------------------------------------------
class PlaceCapsule(models.Model):
    """An approved place-capsule. Storage-side trusted substrate."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Dedup key + provenance
    content_hash = models.CharField(max_length=64, unique=True, db_index=True)
    entity_id = models.CharField(max_length=32, db_index=True)

    # Draft body
    title = models.CharField(max_length=200)
    factual_anchor = models.CharField(max_length=200)
    context_block = models.TextField()

    # Verified citation set (from EvidenceSet.compiled_refs, not LLM echo)
    source_refs = models.JSONField()

    # Confidence
    confidence = models.FloatField()
    confidence_breakdown = models.JSONField()

    # Generator provenance
    generator_model = models.CharField(max_length=128)
    prompt_version = models.CharField(max_length=32)
    pipeline_run_id = models.CharField(max_length=128, db_index=True)

    # P2 · Media enrichment (Wikipedia REST summary · zero extra fetch).
    image_url = models.TextField(blank=True, default="")
    thumbnail_url = models.TextField(blank=True, default="")
    gallery = models.JSONField(blank=True, default=list)
    video_url = models.TextField(blank=True, default="")
    media_source = models.CharField(max_length=128, blank=True, default="")
    media_caption = models.TextField(blank=True, default="")

    # P3 · Hygiene · per-capsule data quality classification
    HYGIENE_VALID = "VALID"
    HYGIENE_SUSPECT = "SUSPECT"
    HYGIENE_INVALID = "INVALID"
    HYGIENE_CHOICES = (
        (HYGIENE_VALID, "VALID"),
        (HYGIENE_SUSPECT, "SUSPECT"),
        (HYGIENE_INVALID, "INVALID"),
    )
    hygiene_status = models.CharField(
        max_length=16, choices=HYGIENE_CHOICES, default=HYGIENE_VALID, db_index=True,
    )
    origin_lat = models.FloatField(null=True, blank=True)
    origin_lng = models.FloatField(null=True, blank=True)
    winner_distance_m = models.FloatField(null=True, blank=True)
    generation_version = models.CharField(max_length=32, blank=True, default="")
    invalidated_at = models.DateTimeField(null=True, blank=True)
    invalidation_reason = models.CharField(max_length=128, blank=True, default="")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "content_engine"
        indexes = [
            models.Index(fields=["entity_id"]),
            models.Index(fields=["confidence"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"PlaceCapsule<{self.entity_id} · {self.title}>"


# ---------------------------------------------------------------------------
# GenerationAttempt · audit log (every run)
# ---------------------------------------------------------------------------
class GenerationAttempt(models.Model):
    """One row per pipeline run. Captures inputs, outcome, and FK to the
    PlaceCapsule when approved."""

    STATUS_APPROVED = "approved"
    STATUS_SUPPRESSED = "suppressed"
    STATUS_CHOICES = (
        (STATUS_APPROVED, "approved"),
        (STATUS_SUPPRESSED, "suppressed"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Outcome
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, db_index=True)
    failure_class = models.CharField(max_length=64, blank=True, default="")

    # Link to approved capsule (NULL on suppressed runs)
    place_capsule = models.ForeignKey(
        PlaceCapsule,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="attempts",
    )

    # Echo of normalized input · reproducibility
    input_lat = models.FloatField()
    input_lng = models.FloatField()
    input_radius_m = models.IntegerField()
    input_timestamp = models.DateTimeField()
    input_photo_id = models.CharField(max_length=128, blank=True, default="")
    pipeline_run_id = models.CharField(max_length=128, db_index=True)

    # Winner snapshot (may be blank if pipeline failed before ranking)
    winner_entity_id = models.CharField(max_length=32, blank=True, default="")
    winner_rank_score = models.FloatField(null=True, blank=True)

    # Confidence (may be null if pipeline failed before scoring)
    confidence = models.FloatField(null=True, blank=True)

    # Generator provenance (echoed even on failure for forensics)
    generator_model = models.CharField(max_length=128, blank=True, default="")
    prompt_version = models.CharField(max_length=32, blank=True, default="")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "content_engine"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["pipeline_run_id"]),
            models.Index(fields=["failure_class"]),
            models.Index(fields=["winner_entity_id"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        tag = self.failure_class or "OK"
        return f"GenerationAttempt<{self.status} · {tag} · {self.pipeline_run_id}>"


# ---------------------------------------------------------------------------
# WikidataGeoCache · V0 (cache-first Wikidata retrieval)
# ---------------------------------------------------------------------------
class WikidataGeoCache(models.Model):
    """One row per (geohash6, radius_bucket) query scope. Status is either
    `fresh` (live SPARQL succeeded; `candidates` may be empty list) or
    `negative` (live SPARQL failed; suppress without retry for 5 minutes)."""

    STATUS_FRESH = "fresh"
    STATUS_NEGATIVE = "negative"
    STATUS_CHOICES = (
        (STATUS_FRESH, "fresh"),
        (STATUS_NEGATIVE, "negative"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Lookup key + components
    cache_key = models.CharField(max_length=128, unique=True)
    geohash6 = models.CharField(max_length=12, db_index=True)
    radius_bucket = models.CharField(max_length=16)

    # Payload (list of serialized WikidataCandidate dicts)
    candidates = models.JSONField(default=list)

    # Lifecycle
    status = models.CharField(max_length=16, choices=STATUS_CHOICES)
    fetched_at = models.DateTimeField()
    stale_after = models.DateTimeField()
    expires_at = models.DateTimeField(db_index=True)

    # Diagnostics
    failure_reason = models.CharField(max_length=200, blank=True, default="")
    cache_schema_version = models.IntegerField(default=1)

    class Meta:
        app_label = "content_engine"
        indexes = [
            models.Index(fields=["status", "expires_at"]),
        ]

    def __str__(self) -> str:
        return f"WikidataGeoCache<{self.cache_key} · {self.status}>"


# ---------------------------------------------------------------------------
# TemporalLandmark · P3 historical map layer · viewport+year filtered
# ---------------------------------------------------------------------------
class TemporalLandmark(models.Model):
    """A historical landmark with geometry + temporal validity window.

    Used by /api/landmarks/viewport/ to render time-filtered overlays
    on the KUDOS map (polygons/lines that appear/disappear with year).
    """

    KIND_MONUMENT = "monument"
    KIND_RUIN = "ruin"
    KIND_WALL = "wall"
    KIND_STREET = "street"
    KIND_BUILDING = "building"
    KIND_OTHER = "other"
    KIND_CHOICES = (
        (KIND_MONUMENT, "monument"),
        (KIND_RUIN, "ruin"),
        (KIND_WALL, "wall"),
        (KIND_STREET, "street"),
        (KIND_BUILDING, "building"),
        (KIND_OTHER, "other"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    city = models.CharField(max_length=120, db_index=True)
    kind = models.CharField(max_length=32, choices=KIND_CHOICES, default=KIND_OTHER)
    geometry_geojson = models.JSONField()
    start_year = models.IntegerField(db_index=True)
    end_year = models.IntegerField(null=True, blank=True, db_index=True)
    # Precomputed bbox · enables fast viewport filtering without PostGIS
    bbox_min_lat = models.FloatField(db_index=True, default=0.0)
    bbox_min_lng = models.FloatField(db_index=True, default=0.0)
    bbox_max_lat = models.FloatField(db_index=True, default=0.0)
    bbox_max_lng = models.FloatField(db_index=True, default=0.0)
    thumbnail_url = models.TextField(blank=True, default="")
    clip_url = models.TextField(blank=True, default="")
    hero_image = models.TextField(blank=True, default="")
    ambience_url = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "content_engine"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["city", "start_year"]),
            models.Index(fields=["bbox_min_lat", "bbox_max_lat"]),
            models.Index(fields=["bbox_min_lng", "bbox_max_lng"]),
        ]

    def __str__(self) -> str:
        return f"TemporalLandmark<{self.city} · {self.title}>"

    def save(self, *args, **kwargs):
        # Auto-compute bbox from geometry on every save · ensures admin
        # edits + seed commands always have correct viewport filters.
        if self.geometry_geojson:
            bbox = self._compute_bbox(self.geometry_geojson)
            if bbox is not None:
                self.bbox_min_lat, self.bbox_min_lng = bbox[0], bbox[1]
                self.bbox_max_lat, self.bbox_max_lng = bbox[2], bbox[3]
        super().save(*args, **kwargs)

    @staticmethod
    def _compute_bbox(geom):
        """Return (min_lat, min_lng, max_lat, max_lng) from any GeoJSON
        geometry coords (Point/LineString/Polygon/MultiPolygon)."""
        coords_collected = []

        def walk(node):
            if not isinstance(node, list):
                return
            if (
                len(node) >= 2
                and isinstance(node[0], (int, float))
                and isinstance(node[1], (int, float))
            ):
                coords_collected.append((float(node[0]), float(node[1])))
                return
            for sub in node:
                walk(sub)

        walk(geom.get("coordinates", []))
        if not coords_collected:
            return None
        lngs = [c[0] for c in coords_collected]
        lats = [c[1] for c in coords_collected]
        return (min(lats), min(lngs), max(lats), max(lngs))
