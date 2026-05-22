"""KUDOS · invalidate_bad_capsules · P3 data hygiene cleanup.

Marks (or deletes) PlaceCapsule rows whose winner→origin distance
exceeds a threshold OR whose pre-fix generation predates a date.

Default: DRY RUN · reports counts · no DB writes.
Flags:
    --force                  · actually apply changes
    --delete                 · hard delete (default = mark INVALID)
    --distance-km=10         · threshold (winner_distance_m > km*1000)
    --before=YYYY-MM-DD      · only capsules created before this date

Examples:
    python manage.py invalidate_bad_capsules
    python manage.py invalidate_bad_capsules --force --distance-km=10
    python manage.py invalidate_bad_capsules --force --before=2026-05-22
    python manage.py invalidate_bad_capsules --force --delete
"""
from __future__ import annotations

from datetime import datetime, timezone

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone as djtz

from content_engine.models import PlaceCapsule


class Command(BaseCommand):
    help = "Mark or delete contaminated PlaceCapsule rows (P3 hygiene)."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--force", action="store_true",
                            help="Apply changes (default = dry run).")
        parser.add_argument("--delete", action="store_true",
                            help="Hard delete instead of marking INVALID.")
        parser.add_argument("--distance-km", type=float, default=10.0,
                            help="Reject when winner_distance_m > km*1000.")
        parser.add_argument("--before", type=str, default="",
                            help="Only capsules created before YYYY-MM-DD.")
        parser.add_argument("--reason", type=str, default="invalidate_bad_capsules",
                            help="invalidation_reason label written to row.")

    def handle(self, *args, **options) -> None:
        force: bool = options["force"]
        delete: bool = options["delete"]
        distance_km: float = options["distance_km"]
        before_raw: str = options["before"]
        reason: str = options["reason"]

        threshold_m = distance_km * 1000.0

        qs = PlaceCapsule.objects.all()

        before_dt = None
        if before_raw:
            try:
                before_dt = datetime.strptime(before_raw, "%Y-%m-%d").replace(
                    tzinfo=timezone.utc
                )
            except ValueError as exc:
                raise CommandError(f"--before must be YYYY-MM-DD: {exc}") from exc
            qs = qs.filter(created_at__lt=before_dt)

        # Distance filter · NULL winner_distance_m treated as suspect-pre-fix
        # (created before hygiene tracking). Include unless caller restricts.
        from django.db.models import Q
        qs_distant = qs.filter(
            Q(winner_distance_m__gt=threshold_m)
        )
        qs_pre_hygiene = qs.filter(winner_distance_m__isnull=True)

        total = qs.count()
        distant_count = qs_distant.count()
        pre_count = qs_pre_hygiene.count()

        self.stdout.write(f"Total capsules in scope: {total}")
        self.stdout.write(
            f"Distant (>{distance_km:.1f}km): {distant_count}"
        )
        self.stdout.write(
            f"Pre-hygiene (winner_distance_m=NULL): {pre_count}"
        )

        target = qs_distant
        target_count = distant_count
        if not target_count:
            self.stdout.write(self.style.SUCCESS("Nothing to invalidate."))
            return

        if not force:
            self.stdout.write(self.style.WARNING(
                f"DRY RUN · would affect {target_count} capsule(s). "
                f"Re-run with --force to apply."
            ))
            for cap in target[:10]:
                d = cap.winner_distance_m
                self.stdout.write(
                    f"  {cap.id}  {cap.title!r}  "
                    f"distance={d:.0f}m  status={cap.hygiene_status}"
                )
            if target_count > 10:
                self.stdout.write(f"  ... and {target_count - 10} more")
            return

        if delete:
            ids = list(target.values_list("id", flat=True))
            deleted, _ = target.delete()
            self.stdout.write(self.style.SUCCESS(
                f"Hard-deleted {deleted} capsule(s)."
            ))
            for cid in ids[:10]:
                self.stdout.write(f"  removed {cid}")
        else:
            updated = target.update(
                hygiene_status="INVALID",
                invalidated_at=djtz.now(),
                invalidation_reason=reason,
            )
            self.stdout.write(self.style.SUCCESS(
                f"Marked {updated} capsule(s) as INVALID."
            ))
