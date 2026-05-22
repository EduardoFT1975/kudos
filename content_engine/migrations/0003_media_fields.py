"""KUDOS · P2 · add media enrichment fields to PlaceCapsule.

All fields optional · blank/default empty · no breaking schema change.
Existing rows backfill to empty values.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("content_engine", "0002_wikidatageocache"),
    ]

    operations = [
        migrations.AddField(
            model_name="placecapsule",
            name="image_url",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="placecapsule",
            name="thumbnail_url",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="placecapsule",
            name="gallery",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="placecapsule",
            name="video_url",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="placecapsule",
            name="media_source",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="placecapsule",
            name="media_caption",
            field=models.TextField(blank=True, default=""),
        ),
    ]
