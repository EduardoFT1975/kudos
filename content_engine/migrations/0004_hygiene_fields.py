"""KUDOS · P3 · per-capsule data hygiene classification.

All fields optional · existing rows backfill to hygiene_status=VALID
(safe default · operator must run invalidate_bad_capsules to reclassify
contaminated history).
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("content_engine", "0003_media_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="placecapsule",
            name="hygiene_status",
            field=models.CharField(
                choices=[
                    ("VALID", "VALID"),
                    ("SUSPECT", "SUSPECT"),
                    ("INVALID", "INVALID"),
                ],
                db_index=True,
                default="VALID",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="placecapsule",
            name="origin_lat",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="placecapsule",
            name="origin_lng",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="placecapsule",
            name="winner_distance_m",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="placecapsule",
            name="generation_version",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="placecapsule",
            name="invalidated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="placecapsule",
            name="invalidation_reason",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
    ]
