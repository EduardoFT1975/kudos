"""KUDOS · seed_temporal_landmarks_rome · MVP Roma landmark fixtures.

Idempotent · update_or_create by (city, title) · safe to re-run.

Usage:
    python manage.py seed_temporal_landmarks_rome

Adds 4 canonical Roma landmarks: Colosseum, Forum Romanum, Circus
Maximus, Aurelian Walls. Coords are approximations from public sources.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from content_engine.models import TemporalLandmark


ROMA_SEED = [
    {
        "title": "Coliseo",
        "city": "Roma",
        "kind": "monument",
        "geometry_geojson": {
            "type": "Polygon",
            "coordinates": [[
                [12.4910, 41.8895],
                [12.4938, 41.8895],
                [12.4938, 41.8909],
                [12.4910, 41.8909],
                [12.4910, 41.8895],
            ]],
        },
        "start_year": 80,
        "end_year": None,
        "thumbnail_url": (
            "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/"
            "Colosseo_2020.jpg/320px-Colosseo_2020.jpg"
        ),
        "hero_image": (
            "https://upload.wikimedia.org/wikipedia/commons/d/de/"
            "Colosseo_2020.jpg"
        ),
        "metadata": {"era": "Imperio Romano", "uneso": True},
    },
    {
        "title": "Foro Romano",
        "city": "Roma",
        "kind": "ruin",
        "geometry_geojson": {
            "type": "Polygon",
            "coordinates": [[
                [12.4835, 41.8920],
                [12.4868, 41.8920],
                [12.4870, 41.8932],
                [12.4837, 41.8932],
                [12.4835, 41.8920],
            ]],
        },
        "start_year": -600,
        "end_year": None,
        "thumbnail_url": "",
        "hero_image": "",
        "metadata": {"era": "República + Imperio"},
    },
    {
        "title": "Circo Máximo",
        "city": "Roma",
        "kind": "ruin",
        "geometry_geojson": {
            "type": "Polygon",
            "coordinates": [[
                [12.4828, 41.8856],
                [12.4880, 41.8856],
                [12.4880, 41.8867],
                [12.4828, 41.8867],
                [12.4828, 41.8856],
            ]],
        },
        "start_year": -600,
        "end_year": 549,
        "thumbnail_url": "",
        "hero_image": "",
        "metadata": {"capacity": 150000},
    },
    {
        "title": "Murallas Aurelianas",
        "city": "Roma",
        "kind": "wall",
        "geometry_geojson": {
            "type": "LineString",
            "coordinates": [
                [12.4700, 41.9130],
                [12.5100, 41.9100],
                [12.5140, 41.8900],
                [12.5000, 41.8720],
                [12.4640, 41.8720],
                [12.4500, 41.8900],
                [12.4560, 41.9100],
                [12.4700, 41.9130],
            ],
        },
        "start_year": 271,
        "end_year": None,
        "thumbnail_url": "",
        "hero_image": "",
        "metadata": {"length_km": 19, "gates": 18},
    },
]


class Command(BaseCommand):
    help = "Seed Roma temporal landmarks (MVP · idempotent)."

    def handle(self, *args, **options) -> None:
        created = 0
        updated = 0
        for data in ROMA_SEED:
            obj, was_created = TemporalLandmark.objects.update_or_create(
                city=data["city"],
                title=data["title"],
                defaults={
                    "kind": data["kind"],
                    "geometry_geojson": data["geometry_geojson"],
                    "start_year": data["start_year"],
                    "end_year": data["end_year"],
                    "thumbnail_url": data.get("thumbnail_url", ""),
                    "clip_url": data.get("clip_url", ""),
                    "hero_image": data.get("hero_image", ""),
                    "ambience_url": data.get("ambience_url", ""),
                    "metadata": data.get("metadata", {}),
                },
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(
                    f"  created: {obj.city} · {obj.title} "
                    f"({obj.start_year}→{obj.end_year or '∞'})"
                ))
            else:
                updated += 1
                self.stdout.write(
                    f"  updated: {obj.city} · {obj.title} "
                    f"({obj.start_year}→{obj.end_year or '∞'})"
                )
        self.stdout.write(self.style.SUCCESS(
            f"\nDone · created={created} updated={updated} "
            f"total_in_db={TemporalLandmark.objects.count()}"
        ))
