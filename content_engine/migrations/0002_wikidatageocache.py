"""
KUDOS Content Engine · migration 0002 · WikidataGeoCache.

Adds the V0 cache-first retrieval table. Pure additive — no existing
rows touched. Pipeline behavior is controlled by the
CONTENT_ENGINE_GEOCACHE_ENABLED settings flag, so this migration is
safe to apply before the pipeline starts using the table.
"""
from __future__ import annotations

import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("content_engine", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="WikidataGeoCache",
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
                ("cache_key", models.CharField(max_length=128, unique=True)),
                ("geohash6", models.CharField(db_index=True, max_length=12)),
                ("radius_bucket", models.CharField(max_length=16)),
                ("candidates", models.JSONField(default=list)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("fresh", "fresh"),
                            ("negative", "negative"),
                        ],
                        max_length=16,
                    ),
                ),
                ("fetched_at", models.DateTimeField()),
                ("stale_after", models.DateTimeField()),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("failure_reason", models.CharField(blank=True, default="", max_length=200)),
                ("cache_schema_version", models.IntegerField(default=1)),
            ],
            options={},
        ),
        migrations.AddIndex(
            model_name="wikidatageocache",
            index=models.Index(
                fields=["status", "expires_at"],
                name="ce_geocache_status_idx",
            ),
        ),
    ]
