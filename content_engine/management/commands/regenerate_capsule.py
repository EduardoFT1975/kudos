"""KUDOS · regenerate_capsule <id> · P3 hygiene re-run.

Flow:
  1. Look up PlaceCapsule by id (UUID or short prefix).
  2. Mark current row INVALID with reason "regenerated".
  3. Re-run the pipeline using the capsule's origin_lat/lng + a default
     radius (1500m · matches frontend default). The pipeline writes a
     new PlaceCapsule row with current hygiene/version metadata.
  4. Report old and new ids.

This does NOT delete history · old row stays in DB as INVALID for audit.
"""
from __future__ import annotations

import uuid

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone as djtz

from content_engine.models import PlaceCapsule
from content_engine.pipeline import generate_place_capsule


class Command(BaseCommand):
    help = "Regenerate a PlaceCapsule from its origin coords (invalidates old)."

    def add_arguments(self, parser) -> None:
        parser.add_argument("capsule_id", type=str,
                            help="UUID (or prefix) of PlaceCapsule to regenerate.")
        parser.add_argument("--radius-m", type=int, default=1500,
                            help="Radius used for new pipeline run.")
        parser.add_argument("--keep-old", action="store_true",
                            help="Do NOT mark old row INVALID (just append new).")

    def handle(self, *args, **options) -> None:
        raw_id: str = options["capsule_id"]
        radius_m: int = int(options["radius_m"])
        keep_old: bool = options["keep_old"]

        # Allow UUID prefix matching for convenience
        candidates = list(
            PlaceCapsule.objects.filter(id__startswith=raw_id)[:5]
        )
        if not candidates:
            raise CommandError(f"No PlaceCapsule found for id={raw_id!r}")
        if len(candidates) > 1:
            raise CommandError(
                f"Ambiguous id prefix {raw_id!r} · matches "
                f"{[str(c.id) for c in candidates]}"
            )
        old = candidates[0]

        if old.origin_lat is None or old.origin_lng is None:
            raise CommandError(
                f"Capsule {old.id} has no origin_lat/lng (pre-hygiene row). "
                "Cannot regenerate without coords."
            )

        self.stdout.write(
            f"Regenerating {old.id} :: {old.title!r} from "
            f"({old.origin_lat:.5f}, {old.origin_lng:.5f}) radius={radius_m}m"
        )

        if not keep_old:
            old.hygiene_status = "INVALID"
            old.invalidated_at = djtz.now()
            old.invalidation_reason = "regenerated"
            old.save(update_fields=[
                "hygiene_status", "invalidated_at", "invalidation_reason",
                "updated_at",
            ])
            self.stdout.write(self.style.WARNING(
                f"Old capsule {old.id} marked INVALID."
            ))

        result = generate_place_capsule(
            lat=old.origin_lat,
            lng=old.origin_lng,
            radius_m=radius_m,
            timestamp=djtz.now(),
            photo_id=None,
            pipeline_run_id=f"regen_{uuid.uuid4().hex[:12]}",
        )

        new_cap = result.capsule if result is not None else None
        if new_cap is None:
            self.stdout.write(self.style.ERROR(
                "Pipeline returned no capsule. Old row remains INVALID."
            ))
            return

        self.stdout.write(self.style.SUCCESS(
            f"New capsule {new_cap.id} :: {new_cap.title!r} "
            f"hygiene={new_cap.hygiene_status} "
            f"distance_m={new_cap.winner_distance_m}"
        ))
