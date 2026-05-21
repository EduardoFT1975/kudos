"""
KUDOS Content Engine · Phase 12 master smoke map runner.

Single command that exercises the entire MASTER_TEST_MAP battery,
captures per-test metrics, applies QA heuristic flags, renders a
console summary, and writes JSON + CSV reports to disk.

Usage:
    python manage.py run_master_smoke_map
    python manage.py run_master_smoke_map --group B
    python manage.py run_master_smoke_map --limit 5
    python manage.py run_master_smoke_map --output-dir /tmp/kudos-reports

DOES NOT modify pipeline, ranking, UX, API, or DB schema. Pure
read-only harness over the existing production path. Reuses the
same translator the live API uses
(`content_engine.api._translate_to_ux_response`) so harness
classification matches API classification byte-for-byte.

Verdict taxonomy (per-test):
    PASS · actual UX state matches expected_mode
    WARN · UX state degraded from expected but still serviceable
    FAIL · UX state contradicts expected (e.g. landmark expected,
           empty_zone returned)

Flags are advisory and surfaced separately · they do not affect
the verdict directly.
"""
from __future__ import annotations

import csv
import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand

from content_engine.api import _translate_to_ux_response
from content_engine.geocache import cache_lookup
from content_engine.hashing import cache_key_for
from content_engine.models import GenerationAttempt
from content_engine.pipeline import generate_place_capsule
from content_engine.testing.master_test_map import (
    GROUP_LABELS,
    MASTER_TEST_MAP,
    TestCase,
)
from content_engine.testing.qa_flags import detect_flags


_CONFIDENCE_BUCKETS = (
    ("0.00-0.25", 0.00, 0.25),
    ("0.25-0.50", 0.25, 0.50),
    ("0.50-0.75", 0.50, 0.75),
    ("0.75-1.00", 0.75, 1.0001),
)


class Command(BaseCommand):
    help = "Run the master test map · automated KUDOS product validation harness."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--group",
            type=str,
            default=None,
            help="Filter to a single group letter (A/B/C/D/E).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Run only the first N tests (after group filter).",
        )
        parser.add_argument(
            "--output-dir",
            type=str,
            default=None,
            help="Directory for JSON/CSV reports. Default: <BASE_DIR>/reports/",
        )
        parser.add_argument(
            "--no-reports",
            action="store_true",
            default=False,
            help="Skip writing JSON/CSV files · console output only.",
        )

    # ------------------------------------------------------------------ run
    def handle(self, *args, **options) -> None:
        group_filter = options.get("group")
        limit = options.get("limit")
        output_dir = options.get("output_dir") or str(
            Path(settings.BASE_DIR) / "reports"
        )
        write_reports = not options.get("no_reports")

        tests = list(MASTER_TEST_MAP)
        if group_filter:
            tests = [t for t in tests if t.group == group_filter.upper()]
        if limit is not None:
            tests = tests[:limit]

        if not tests:
            self.stdout.write(self.style.WARNING("No tests match filter."))
            return

        started_at = datetime.now(timezone.utc)
        run_id_prefix = started_at.strftime("master-%Y%m%d-%H%M%S")

        self._print_banner(len(tests), group_filter, limit, started_at)

        results: list[dict[str, Any]] = []
        for i, test in enumerate(tests, start=1):
            run_id = f"{run_id_prefix}-{i:03d}"
            self._print_test_start(i, len(tests), test)
            row = self._run_one(test, run_id)
            results.append(row)
            self._print_test_line(row)

        finished_at = datetime.now(timezone.utc)
        duration_s = (finished_at - started_at).total_seconds()

        self._print_summary(results, duration_s, started_at)

        if write_reports:
            os.makedirs(output_dir, exist_ok=True)
            stamp = started_at.strftime("%Y%m%d_%H%M%S")
            json_path = os.path.join(output_dir, f"master_smoke_{stamp}.json")
            csv_path = os.path.join(output_dir, f"master_smoke_{stamp}.csv")
            self._write_json_report(
                json_path, results, started_at, finished_at, duration_s,
                group_filter, limit,
            )
            self._write_csv_report(csv_path, results)
            self.stdout.write("")
            self.stdout.write(self.style.MIGRATE_HEADING("Reports written:"))
            self.stdout.write(f"  {json_path}")
            self.stdout.write(f"  {csv_path}")

    # ----------------------------------------------------------- per-test
    def _run_one(self, test: TestCase, run_id: str) -> dict[str, Any]:
        normalized_input = {
            "lat": test.lat,
            "lng": test.lng,
            "radius_m": test.radius_m,
            "timestamp": datetime.now(timezone.utc),
            "photo_id": None,
            "pipeline_run_id": run_id,
        }
        start = time.perf_counter()
        latency_ms: int
        result_obj = None
        pipeline_exception: str | None = None
        try:
            result_obj = generate_place_capsule(normalized_input)
        except Exception as exc:  # noqa: BLE001
            pipeline_exception = f"{type(exc).__name__}: {exc}"
        latency_ms = int((time.perf_counter() - start) * 1000)

        capsule = result_obj.capsule if result_obj is not None else None
        via_landmark_override = (
            bool(result_obj.via_landmark_override) if result_obj is not None else False
        )

        # Read failure_class from the GenerationAttempt audit row
        attempt = (
            GenerationAttempt.objects
            .filter(pipeline_run_id=run_id)
            .order_by("-created_at")
            .first()
        )
        failure_class = (attempt.failure_class or None) if attempt else None
        if failure_class == "":
            failure_class = None
        winner_rank_score = attempt.winner_rank_score if attempt else None

        # Translate via the production API translator · ensures harness
        # classification matches what the live API returns byte-for-byte.
        ux_response = _translate_to_ux_response(capsule, via_landmark_override)
        ux_state = ux_response["state"]
        ux_source = ux_response["meta"]["source"]
        ux_confidence = ux_response["meta"]["confidence"]

        # Pool introspection via cache (best-effort, may be unavailable
        # if bypass_cache was used or cache is cold). Used for QA flags.
        winner_sitelinks_count: int | None = None
        winner_classes: tuple[str, ...] = ()
        pool_classes_by_qid: dict[str, list[str]] = {}
        candidate_count: int | None = None
        try:
            entry = cache_lookup(
                cache_key_for(test.lat, test.lng, test.radius_m)
            )
            if entry is not None and entry.candidates:
                candidate_count = len(entry.candidates)
                for cand_dict in entry.candidates:
                    qid = cand_dict.get("entity_id")
                    cls = list(cand_dict.get("classes") or [])
                    if qid:
                        pool_classes_by_qid[qid] = cls
                    if (
                        capsule is not None
                        and qid == capsule.entity_id
                    ):
                        winner_sitelinks_count = cand_dict.get("sitelinks_count")
                        winner_classes = tuple(cls)
        except Exception:  # noqa: BLE001  · cache lookup must not break harness
            pass

        row: dict[str, Any] = {
            "label": test.label,
            "group": test.group,
            "expected_mode": test.expected_mode,
            "input": {
                "lat": test.lat,
                "lng": test.lng,
                "radius_m": test.radius_m,
            },
            "candidate_count": candidate_count,
            "winner_entity_id": capsule.entity_id if capsule else None,
            "winner_title": capsule.title if capsule else None,
            "winner_classes": list(winner_classes),
            "winner_sitelinks_count": winner_sitelinks_count,
            "rank_score": winner_rank_score,
            "confidence": ux_confidence,
            "via_landmark_override": via_landmark_override,
            "failure_class": failure_class,
            "ux_state": ux_state,
            "ux_source": ux_source,
            "latency_ms": latency_ms,
            "pool_classes_by_qid": pool_classes_by_qid,
            "pipeline_exception": pipeline_exception,
            "run_id": run_id,
        }
        row["verdict"] = self._verdict_for(test.expected_mode, row)
        row["flags"] = detect_flags(row)
        return row

    # ----------------------------------------------------- verdict mapping
    @staticmethod
    def _verdict_for(expected_mode: str, row: dict[str, Any]) -> str:
        ux = row.get("ux_state")
        source = row.get("ux_source")

        if expected_mode == "empty":
            return "PASS" if ux == "empty_zone" else "FAIL"

        if expected_mode == "direct_landmark":
            if ux == "success":
                return "PASS"
            if ux == "sparse_discovery":
                return "WARN"
            return "FAIL"

        if expected_mode == "sparse_override":
            if ux == "sparse_discovery" and source == "landmark_override":
                return "PASS"
            if ux == "sparse_discovery":
                return "WARN"
            if ux == "success":
                return "WARN"
            return "FAIL"

        if expected_mode in {"urban_generic", "rural_generic"}:
            if ux in {"success", "sparse_discovery"}:
                return "PASS"
            # Rural is allowed to gracefully return empty_zone
            if expected_mode == "rural_generic" and ux == "empty_zone":
                return "WARN"
            return "FAIL"

        return "WARN"  # unknown expected_mode

    # ------------------------------------------------------ console output
    def _print_banner(
        self,
        n: int,
        group_filter: str | None,
        limit: int | None,
        started_at: datetime,
    ) -> None:
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.MIGRATE_HEADING(
            "KUDOS · MASTER SMOKE MAP"
        ))
        self.stdout.write("=" * 70)
        self.stdout.write(f"Started:    {started_at.isoformat()}")
        self.stdout.write(f"Tests:      {n}")
        if group_filter:
            self.stdout.write(f"Group:      {group_filter}")
        if limit:
            self.stdout.write(f"Limit:      {limit}")
        self.stdout.write("")

    def _print_test_start(self, i: int, n: int, test: TestCase) -> None:
        self.stdout.write(
            f"[{i:02d}/{n:02d}] {test.group} · {test.label} "
            f"(r={test.radius_m}m, expected={test.expected_mode})"
        )

    def _print_test_line(self, row: dict[str, Any]) -> None:
        verdict = row["verdict"]
        style = (
            self.style.SUCCESS if verdict == "PASS"
            else self.style.WARNING if verdict == "WARN"
            else self.style.ERROR
        )
        winner = row.get("winner_entity_id") or "-"
        title = row.get("winner_title") or "-"
        conf = row.get("confidence")
        conf_str = f"{conf:.2f}" if conf is not None else "----"
        ux = row.get("ux_state") or "-"
        source = row.get("ux_source") or "-"
        latency = row.get("latency_ms")
        flags = row.get("flags") or []
        flag_str = f" flags={','.join(flags)}" if flags else ""
        self.stdout.write(
            f"        {style(verdict)}  winner={winner} ({title[:32]})  "
            f"conf={conf_str}  ux={ux}/{source}  {latency}ms{flag_str}"
        )

    def _print_summary(
        self,
        results: list[dict[str, Any]],
        duration_s: float,
        started_at: datetime,
    ) -> None:
        self.stdout.write("")
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.MIGRATE_HEADING("SUMMARY"))
        self.stdout.write("=" * 70)

        total = len(results)
        verdicts = [r["verdict"] for r in results]
        p = verdicts.count("PASS")
        w = verdicts.count("WARN")
        f = verdicts.count("FAIL")
        self.stdout.write(
            f"  Total: {total}  "
            f"PASS: {self.style.SUCCESS(str(p))}  "
            f"WARN: {self.style.WARNING(str(w))}  "
            f"FAIL: {self.style.ERROR(str(f))}"
        )
        self.stdout.write(f"  Duration: {duration_s:.1f}s")

        # By group
        self.stdout.write("")
        self.stdout.write("  By group:")
        for group_letter, group_label in GROUP_LABELS.items():
            group_rows = [r for r in results if r["group"] == group_letter]
            if not group_rows:
                continue
            gp = sum(1 for r in group_rows if r["verdict"] == "PASS")
            gw = sum(1 for r in group_rows if r["verdict"] == "WARN")
            gf = sum(1 for r in group_rows if r["verdict"] == "FAIL")
            self.stdout.write(
                f"    {group_letter} {group_label:<22}  "
                f"PASS:{gp:>2}  WARN:{gw:>2}  FAIL:{gf:>2}"
            )

        # Confidence distribution
        self.stdout.write("")
        self.stdout.write("  Confidence distribution:")
        confidences = [r["confidence"] for r in results if r["confidence"] is not None]
        bucket_counts = {label: 0 for label, _, _ in _CONFIDENCE_BUCKETS}
        for c in confidences:
            for label, lo, hi in _CONFIDENCE_BUCKETS:
                if lo <= c < hi:
                    bucket_counts[label] += 1
                    break
        max_bucket = max(bucket_counts.values()) if bucket_counts else 0
        for label, lo, hi in _CONFIDENCE_BUCKETS:
            count = bucket_counts[label]
            bar = "#" * int(40 * count / max_bucket) if max_bucket else ""
            self.stdout.write(f"    {label}  {count:>3}  {bar}")
        nulls = len(results) - len(confidences)
        if nulls:
            self.stdout.write(f"    (no confidence) {nulls:>3}  (empty_zone runs)")

        # Flags fired
        self.stdout.write("")
        self.stdout.write("  Flags fired:")
        flag_summary: dict[str, list[str]] = {}
        for r in results:
            for flag in r.get("flags") or []:
                flag_summary.setdefault(flag, []).append(r["label"])
        if not flag_summary:
            self.stdout.write("    (none)")
        else:
            for flag, labels in sorted(flag_summary.items()):
                self.stdout.write(f"    {flag} · {len(labels)} case(s)")
                for lbl in labels:
                    self.stdout.write(f"      - {lbl}")

        # Failures detail
        fail_rows = [r for r in results if r["verdict"] == "FAIL"]
        if fail_rows:
            self.stdout.write("")
            self.stdout.write(self.style.ERROR("  FAIL details:"))
            for r in fail_rows:
                exc = r.get("pipeline_exception")
                if exc:
                    self.stdout.write(
                        f"    - {r['label']}  pipeline_exception={exc}"
                    )
                else:
                    self.stdout.write(
                        f"    - {r['label']}  expected={r['expected_mode']}  "
                        f"got ux={r['ux_state']}/{r['ux_source']}  "
                        f"failure_class={r.get('failure_class')}"
                    )

    # ---------------------------------------------------- report writers
    @staticmethod
    def _write_json_report(
        path: str,
        results: list[dict[str, Any]],
        started_at: datetime,
        finished_at: datetime,
        duration_s: float,
        group_filter: str | None,
        limit: int | None,
    ) -> None:
        verdicts = [r["verdict"] for r in results]
        by_group: dict[str, dict[str, int]] = {}
        for r in results:
            g = r["group"]
            by_group.setdefault(g, {"pass": 0, "warn": 0, "fail": 0})
            by_group[g][r["verdict"].lower()] += 1

        bucket_counts: dict[str, int] = {label: 0 for label, _, _ in _CONFIDENCE_BUCKETS}
        for r in results:
            c = r.get("confidence")
            if c is None:
                continue
            for label, lo, hi in _CONFIDENCE_BUCKETS:
                if lo <= c < hi:
                    bucket_counts[label] += 1
                    break

        flags_summary: dict[str, int] = {}
        for r in results:
            for flag in r.get("flags") or []:
                flags_summary[flag] = flags_summary.get(flag, 0) + 1

        payload = {
            "schema_version": 1,
            "started_at": started_at.isoformat(),
            "finished_at": finished_at.isoformat(),
            "duration_s": duration_s,
            "filters": {
                "group": group_filter,
                "limit": limit,
            },
            "total_tests": len(results),
            "summary": {
                "pass": verdicts.count("PASS"),
                "warn": verdicts.count("WARN"),
                "fail": verdicts.count("FAIL"),
                "by_group": by_group,
            },
            "confidence_buckets": bucket_counts,
            "flags_summary": flags_summary,
            "tests": results,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, default=str, ensure_ascii=False)

    @staticmethod
    def _write_csv_report(path: str, results: list[dict[str, Any]]) -> None:
        with open(path, "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "label", "group", "expected_mode",
                "lat", "lng", "radius_m",
                "winner_entity_id", "winner_title",
                "confidence", "rank_score",
                "ux_state", "ux_source",
                "via_landmark_override", "failure_class",
                "candidate_count", "latency_ms",
                "verdict", "flags",
            ])
            for r in results:
                writer.writerow([
                    r["label"],
                    r["group"],
                    r["expected_mode"],
                    r["input"]["lat"],
                    r["input"]["lng"],
                    r["input"]["radius_m"],
                    r.get("winner_entity_id") or "",
                    r.get("winner_title") or "",
                    "" if r.get("confidence") is None else f"{r['confidence']:.4f}",
                    "" if r.get("rank_score") is None else f"{r['rank_score']:.4f}",
                    r.get("ux_state") or "",
                    r.get("ux_source") or "",
                    r.get("via_landmark_override"),
                    r.get("failure_class") or "",
                    r.get("candidate_count") if r.get("candidate_count") is not None else "",
                    r.get("latency_ms") or "",
                    r["verdict"],
                    ";".join(r.get("flags") or []),
                ])
