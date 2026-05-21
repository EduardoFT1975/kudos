"""
KUDOS Content Engine · smoke test management command.

End-to-end sanity check for `generate_place_capsule`. By default calls
the real pipeline against live Wikipedia GeoSearch + pageprops, the
Wikipedia summary REST endpoint, and the Anthropic API.

FIXTURE MODE (--fixture):
    Bypasses live Wikipedia GeoSearch + summary by injecting a hardcoded
    `_FixtureWikipediaClient` that returns the Colosseum (Q10285) as the
    sole canonical candidate plus a canned summary. Anthropic still goes
    live. This mode removes Wikipedia from the smoke path entirely.

Usage examples:

    # Default · Colosseum, Rome (live Wikipedia)
    python manage.py smoke_place_capsule

    # Fixture mode · skip live Wikipedia, exercise everything downstream
    python manage.py smoke_place_capsule --fixture

    # Custom coordinates
    python manage.py smoke_place_capsule --lat 41.8902 --lng 12.4922 --radius-m 300

    # Custom run id (for inspecting the resulting GenerationAttempt row)
    python manage.py smoke_place_capsule --run-id manual-2026-05-19

Exit codes:
    0 · pipeline returned a PlaceCapsule (approved or dedupe-hit)
    1 · pipeline returned None (a suppressed GenerationAttempt was written)
"""
from __future__ import annotations

import json
import sys
import uuid
from datetime import datetime, timezone
from typing import Any

from django.core.management.base import BaseCommand

from content_engine.models import GenerationAttempt
from content_engine.pipeline import generate_place_capsule
from content_engine.schemas import GeosearchResult, WikidataCandidate

# Default: Colosseum, Rome
_DEFAULT_LAT: float = 41.8902
_DEFAULT_LNG: float = 12.4922
_DEFAULT_RADIUS_M: int = 300


# ---------------------------------------------------------------------------
# Fixture Wikipedia client · returns the Colosseum (Q10285) as canonical
# ---------------------------------------------------------------------------
_FIXTURE_SUMMARY: dict[str, Any] = {
    "title": "Coliseo",
    "extract": (
        "El Coliseo es un anfiteatro de la época del Imperio romano, "
        "construido en el siglo I en el centro de la ciudad de Roma. "
        "Originalmente fue conocido como Anfiteatro Flavio."
    ),
    "page_url": "https://es.wikipedia.org/wiki/Coliseo",
}


class _FixtureWikipediaClient:
    """Stand-in for WikipediaClient that returns a deterministic canonical
    candidate plus a canned summary. Duck-typed against the contract used
    by pipeline.generate_place_capsule:
        - geosearch(lat, lng, radius_m, lang) -> GeosearchResult
        - get_summary(title, lang) -> dict | None
    """

    def geosearch(
        self,
        lat: float,
        lng: float,
        radius_m: int,
        lang: str = "es",
    ) -> GeosearchResult:
        return GeosearchResult(
            success=True,
            candidates=(
                WikidataCandidate(
                    entity_id="Q10285",  # Colosseum
                    label="Coliseo",
                    lat=41.8902,
                    lng=12.4922,
                    distance_m=0.0,
                    classes=(),
                    sitelinks_count=1,
                    has_es_wiki=(lang == "es"),
                    has_en_wiki=(lang == "en"),
                ),
            ),
        )

    def geosearch_with_fallback(
        self,
        lat: float,
        lng: float,
        radius_m: int,
    ) -> GeosearchResult:
        # Fixture always returns one canonical ES candidate · no fallback
        # actually triggered. Delegate to ES geosearch to preserve the
        # GeosearchResult shape the pipeline expects.
        return self.geosearch(lat, lng, radius_m, lang="es")

    def get_summary(
        self, title: str, lang: str = "es"
    ) -> dict[str, Any] | None:
        return dict(_FIXTURE_SUMMARY)


class Command(BaseCommand):
    help = "Run the V0 place-capsule pipeline end-to-end against real upstreams."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--lat", type=float, default=_DEFAULT_LAT)
        parser.add_argument("--lng", type=float, default=_DEFAULT_LNG)
        parser.add_argument(
            "--radius-m",
            type=int,
            default=_DEFAULT_RADIUS_M,
            dest="radius_m",
        )
        parser.add_argument(
            "--run-id",
            type=str,
            default="",
            dest="run_id",
            help="Optional pipeline_run_id. Auto-generated if omitted.",
        )
        parser.add_argument(
            "--photo-id",
            type=str,
            default="",
            dest="photo_id",
            help="Optional photo_id echo.",
        )
        parser.add_argument(
            "--fixture",
            action="store_true",
            default=False,
            dest="fixture",
            help=(
                "Bypass live Wikipedia GeoSearch with an inline fixture "
                "client (Colosseum Q10285) plus canned summary. Anthropic "
                "still goes live."
            ),
        )
        parser.add_argument(
            "--fail-fast-429",
            action="store_true",
            default=False,
            dest="fail_fast_429",
            help=(
                "DEPRECATED in V0 primary path · no-op. Kept for operator "
                "back-compat (previously gated Wikidata SPARQL retry sleep)."
            ),
        )

    def handle(self, *args, **options) -> None:
        lat: float = options["lat"]
        lng: float = options["lng"]
        radius_m: int = options["radius_m"]
        run_id: str = options["run_id"] or f"smoke-{uuid.uuid4()}"
        photo_id: str = options["photo_id"]
        fixture: bool = options["fixture"]
        fail_fast_429: bool = options["fail_fast_429"]

        self.stdout.write(self.style.MIGRATE_HEADING("KUDOS · Content Engine smoke test"))
        self.stdout.write(f"  lat            = {lat}")
        self.stdout.write(f"  lng            = {lng}")
        self.stdout.write(f"  radius_m       = {radius_m}")
        self.stdout.write(f"  pipeline_run_id= {run_id}")
        if photo_id:
            self.stdout.write(f"  photo_id       = {photo_id}")
        if fixture:
            self.stdout.write(self.style.WARNING(
                "  mode           = FIXTURE · cache bypass ON"
            ))
        elif fail_fast_429:
            self.stdout.write(self.style.WARNING(
                "  mode           = LIVE · --fail-fast-429 (V0 no-op)"
            ))
        self.stdout.write("")

        normalized_input = {
            "lat": lat,
            "lng": lng,
            "radius_m": radius_m,
            "timestamp": datetime.now(timezone.utc),
            "photo_id": photo_id or None,
            "pipeline_run_id": run_id,
        }

        wp_client: Any = _FixtureWikipediaClient() if fixture else None
        result = generate_place_capsule(
            normalized_input,
            wikipedia_client=wp_client,
            bypass_cache=fixture,
        )
        capsule = result.capsule
        via_landmark_override = result.via_landmark_override

        if capsule is None:
            self.stdout.write(self.style.ERROR("Result: None (suppressed)"))
            attempt = (
                GenerationAttempt.objects.filter(pipeline_run_id=run_id)
                .order_by("-created_at")
                .first()
            )
            if attempt is not None:
                self.stdout.write("Latest GenerationAttempt for this run:")
                self.stdout.write(
                    json.dumps(
                        {
                            "id": str(attempt.id),
                            "status": attempt.status,
                            "failure_class": attempt.failure_class,
                            "winner_entity_id": attempt.winner_entity_id,
                            "winner_rank_score": attempt.winner_rank_score,
                            "confidence": attempt.confidence,
                        },
                        indent=2,
                        default=str,
                    )
                )
            else:
                self.stdout.write("(no GenerationAttempt row found for this run_id)")
            sys.exit(1)

        self.stdout.write(self.style.SUCCESS("Result: PlaceCapsule approved"))
        self.stdout.write(
            json.dumps(
                {
                    "id": str(capsule.id),
                    "content_hash": capsule.content_hash,
                    "entity_id": capsule.entity_id,
                    "title": capsule.title,
                    "factual_anchor": capsule.factual_anchor,
                    "context_block": capsule.context_block,
                    "confidence": capsule.confidence,
                    "confidence_breakdown": capsule.confidence_breakdown,
                    "source_refs": capsule.source_refs,
                    "generator_model": capsule.generator_model,
                    "prompt_version": capsule.prompt_version,
                    "pipeline_run_id": capsule.pipeline_run_id,
                    "via_landmark_override": via_landmark_override,
                },
                indent=2,
                default=str,
            )
        )
        sys.exit(0)
