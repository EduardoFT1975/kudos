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
