"""
KUDOS Content Engine · initial migration.

Creates PlaceCapsule (approved capsules, content_hash unique) and
GenerationAttempt (per-run audit log, FK to PlaceCapsule on success).
"""
from __future__ import annotations

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="PlaceCapsule",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("content_hash", models.CharField(db_index=True, max_length=64, unique=True)),
                ("entity_id", models.CharField(db_index=True, max_length=32)),
                ("title", models.CharField(max_length=200)),
                ("factual_anchor", models.CharField(max_length=200)),
                ("context_block", models.TextField()),
                ("source_refs", models.JSONField()),
                ("confidence", models.FloatField()),
                ("confidence_breakdown", models.JSONField()),
                ("generator_model", models.CharField(max_length=128)),
                ("prompt_version", models.CharField(max_length=32)),
                ("pipeline_run_id", models.CharField(db_index=True, max_length=128)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="placecapsule",
            index=models.Index(fields=["entity_id"], name="ce_placecap_entity_idx"),
        ),
        migrations.AddIndex(
            model_name="placecapsule",
            index=models.Index(fields=["confidence"], name="ce_placecap_confid_idx"),
        ),
        migrations.CreateModel(
            name="GenerationAttempt",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("approved", "approved"),
                            ("suppressed", "suppressed"),
                        ],
                        db_index=True,
                        max_length=16,
                    ),
                ),
                ("failure_class", models.CharField(blank=True, default="", max_length=64)),
                ("input_lat", models.FloatField()),
                ("input_lng", models.FloatField()),
                ("input_radius_m", models.IntegerField()),
                ("input_timestamp", models.DateTimeField()),
                ("input_photo_id", models.CharField(blank=True, default="", max_length=128)),
                ("pipeline_run_id", models.CharField(db_index=True, max_length=128)),
                ("winner_entity_id", models.CharField(blank=True, default="", max_length=32)),
                ("winner_rank_score", models.FloatField(blank=True, null=True)),
                ("confidence", models.FloatField(blank=True, null=True)),
                ("generator_model", models.CharField(blank=True, default="", max_length=128)),
                ("prompt_version", models.CharField(blank=True, default="", max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "place_capsule",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="attempts",
                        to="content_engine.placecapsule",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="generationattempt",
            index=models.Index(fields=["status"], name="ce_genatt_status_idx"),
        ),
        migrations.AddIndex(
            model_name="generationattempt",
            index=models.Index(fields=["pipeline_run_id"], name="ce_genatt_runid_idx"),
        ),
        migrations.AddIndex(
            model_name="generationattempt",
            index=models.Index(fields=["failure_class"], name="ce_genatt_failcls_idx"),
        ),
        migrations.AddIndex(
            model_name="generationattempt",
            index=models.Index(fields=["winner_entity_id"], name="ce_genatt_winner_idx"),
        ),
    ]
