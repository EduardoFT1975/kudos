"""KUDOS · P3 · TemporalLandmark · historical overlay table."""
import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("content_engine", "0004_hygiene_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="TemporalLandmark",
            fields=[
                ("id", models.UUIDField(
                    default=uuid.uuid4, editable=False, primary_key=True,
                    serialize=False,
                )),
                ("title", models.CharField(max_length=200)),
                ("city", models.CharField(db_index=True, max_length=120)),
                ("kind", models.CharField(
                    choices=[
                        ("monument", "monument"),
                        ("ruin", "ruin"),
                        ("wall", "wall"),
                        ("street", "street"),
                        ("building", "building"),
                        ("other", "other"),
                    ],
                    default="other",
                    max_length=32,
                )),
                ("geometry_geojson", models.JSONField()),
                ("start_year", models.IntegerField(db_index=True)),
                ("end_year", models.IntegerField(
                    blank=True, db_index=True, null=True,
                )),
                ("bbox_min_lat", models.FloatField(db_index=True, default=0.0)),
                ("bbox_min_lng", models.FloatField(db_index=True, default=0.0)),
                ("bbox_max_lat", models.FloatField(db_index=True, default=0.0)),
                ("bbox_max_lng", models.FloatField(db_index=True, default=0.0)),
                ("thumbnail_url", models.TextField(blank=True, default="")),
                ("clip_url", models.TextField(blank=True, default="")),
                ("hero_image", models.TextField(blank=True, default="")),
                ("ambience_url", models.TextField(blank=True, default="")),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="temporallandmark",
            index=models.Index(
                fields=["city", "start_year"],
                name="ce_temporal_city_start_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="temporallandmark",
            index=models.Index(
                fields=["bbox_min_lat", "bbox_max_lat"],
                name="ce_temporal_lat_bbox_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="temporallandmark",
            index=models.Index(
                fields=["bbox_min_lng", "bbox_max_lng"],
                name="ce_temporal_lng_bbox_idx",
            ),
        ),
    ]
