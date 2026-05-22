"""KUDOS · debug_ranking · REAL pipeline trace per coord.

Calls live Wikipedia geosearch + Wikidata pageprops/enrichment + real
compute_rank_score + replicated select_winner arbitration so the table
below matches EXACTLY what production would produce for the same coord.

Usage:
    python manage.py debug_ranking --lat=37.70520 --lng=-5.27673 --radius=1500

NO mocks. NO simulation. NO assumed weights. All values come from the
actual ranking module so any later weight change is reflected here
without code edit.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from content_engine.clients.wikipedia import WikipediaClient
from content_engine.constants import (
    CITY_DEMOTION_DELTA,
    CITY_DEMOTION_PROXIMITY_TOLERANCE,
    RANK_AMBIGUITY_CLASS_MIN,
    RANK_AMBIGUITY_DELTA,
    RANK_AMBIGUITY_NOTABILITY_RATIO,
    RANK_THRESHOLD,
)
from content_engine.ranking import (
    CLASS_WEIGHTS,
    DEFAULT_CLASS_WEIGHT,
    _CITY_ADMIN_CLASSES,
    _HOSTILE_WATER_CLASSES,
    _LABEL_PREFIX_BONUS,
    _LABEL_SUBSTR_PENALTY,
    _LOCAL_POI_CLASSES,
    _NOTABILITY_SAT_SITELINKS,
    _SEMANTIC_BONUS,
    _SEMANTIC_PENALTY,
    _W_CLASS,
    _W_DIST,
    _W_NOTABILITY,
    compute_rank_score,
    is_locality,
)


def _per_class_breakdown(classes):
    rows = []
    for c in classes:
        if c in CLASS_WEIGHTS:
            rows.append((c, CLASS_WEIGHTS[c], "mapped"))
        else:
            rows.append((c, DEFAULT_CLASS_WEIGHT, "DEFAULT"))
    return rows


def _semantic_breakdown(label: str):
    delta = 0.0
    notes = []
    ll = (label or "").lower()
    fw = ll.split(maxsplit=1)[0] if ll else ""
    words = set(ll.split())
    if fw in _LABEL_PREFIX_BONUS:
        delta += _SEMANTIC_BONUS
        notes.append(f"prefix_bonus(first_word='{fw}')={_SEMANTIC_BONUS:+.2f}")
    elif words & _LABEL_PREFIX_BONUS:
        delta += _SEMANTIC_BONUS
        notes.append(f"word_bonus(any of {words & _LABEL_PREFIX_BONUS})={_SEMANTIC_BONUS:+.2f}")
    for substr in _LABEL_SUBSTR_PENALTY:
        if substr in ll:
            delta += _SEMANTIC_PENALTY
            notes.append(f"substr_penalty('{substr}')={_SEMANTIC_PENALTY:+.2f}")
            break
    return delta, notes


class Command(BaseCommand):
    help = "Trace REAL ranking pipeline for a coord (live geosearch + scores)."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--lat", type=float, required=True)
        parser.add_argument("--lng", type=float, required=True)
        parser.add_argument("--radius", type=int, default=1500,
                            help="Geosearch radius in meters (default 1500).")
        parser.add_argument("--lang", type=str, default="es",
                            help="es or en (default es).")

    def handle(self, *args, **options) -> None:
        lat: float = options["lat"]
        lng: float = options["lng"]
        radius_m: int = options["radius"]
        lang: str = options["lang"]

        self.stdout.write(self.style.NOTICE(
            f"=== DEBUG RANKING · lat={lat} lng={lng} radius={radius_m}m lang={lang} ==="
        ))
        self.stdout.write(
            f"Weights: dist={_W_DIST} class={_W_CLASS} notability={_W_NOTABILITY}"
        )
        self.stdout.write(
            f"Thresholds: RANK_THRESHOLD={RANK_THRESHOLD} "
            f"CITY_DEMOTION_DELTA={CITY_DEMOTION_DELTA} "
            f"PROXIMITY_TOL={CITY_DEMOTION_PROXIMITY_TOLERANCE}"
        )
        self.stdout.write("")

        # ---------------- STAGE 2 · geosearch ----------------
        client = WikipediaClient()
        result = client.geosearch(lat=lat, lng=lng, radius_m=radius_m, lang=lang)
        if not result.success:
            self.stdout.write(self.style.ERROR(
                f"Geosearch FAILED: {getattr(result, 'failure_reason', 'unknown')}"
            ))
            return

        candidates = list(result.candidates)
        if not candidates:
            self.stdout.write(self.style.WARNING(
                "Geosearch returned 0 candidates within radius. No winner possible."
            ))
            return

        self.stdout.write(self.style.SUCCESS(
            f"Geosearch returned {len(candidates)} candidate(s)."
        ))
        self.stdout.write("")

        # ---------------- STAGE 3 · score per candidate ----------------
        scored = []
        for i, c in enumerate(candidates):
            d_s = max(0.0, min(1.0, 1.0 - c.distance_m / radius_m if radius_m else 0))
            cls_rows = _per_class_breakdown(c.classes)
            c_s = max((w for _, w, _ in cls_rows), default=DEFAULT_CLASS_WEIGHT)
            n_s = min(c.sitelinks_count / _NOTABILITY_SAT_SITELINKS, 1.0)
            sem_d, sem_notes = _semantic_breakdown(c.label)
            total = compute_rank_score(c, radius_m)

            is_city = any(cc in _CITY_ADMIN_CLASSES for cc in c.classes)
            is_poi = any(cc in _LOCAL_POI_CLASSES for cc in c.classes)
            is_water = any(cc in _HOSTILE_WATER_CLASSES for cc in c.classes)
            is_loc = is_locality(c)

            scored.append({
                "idx": i, "cand": c, "d_s": d_s, "c_s": c_s, "n_s": n_s,
                "sem_d": sem_d, "sem_notes": sem_notes, "total": total,
                "cls_rows": cls_rows,
                "is_city": is_city, "is_poi": is_poi,
                "is_water": is_water, "is_locality": is_loc,
            })

        scored.sort(key=lambda r: (-round(r["total"], 2), len(r["cand"].label)))

        # ---------------- DUMP TABLE ----------------
        for rank, r in enumerate(scored, start=1):
            c = r["cand"]
            self.stdout.write(self.style.NOTICE(
                f"[{rank}] {c.entity_id} :: {c.label!r}"
            ))
            self.stdout.write(
                f"    distance_m={c.distance_m:.1f} "
                f"sitelinks_count={c.sitelinks_count} "
                f"classes={list(c.classes)}"
            )
            self.stdout.write(f"    distance_score={r['d_s']:.4f} ({_W_DIST} weight)")
            cls_str = ", ".join(
                f"{cid}={w:.2f}[{flag}]" for cid, w, flag in r["cls_rows"]
            ) or "no classes"
            self.stdout.write(
                f"    class_score={r['c_s']:.4f} ({_W_CLASS} weight) · {cls_str}"
            )
            self.stdout.write(
                f"    notability_score={r['n_s']:.4f} ({_W_NOTABILITY} weight)"
            )
            sem_note = "; ".join(r["sem_notes"]) if r["sem_notes"] else "none"
            self.stdout.write(
                f"    semantic_delta={r['sem_d']:+.4f} · {sem_note}"
            )
            self.stdout.write(self.style.SUCCESS(
                f"    FINAL rank_score = {r['total']:.4f}"
            ))
            flags = []
            if r["is_city"]: flags.append("CITY_ADMIN")
            if r["is_poi"]: flags.append("LOCAL_POI")
            if r["is_water"]: flags.append("HOSTILE_WATER")
            if r["is_locality"]: flags.append("LOCALITY")
            self.stdout.write(f"    flags: {flags or ['none']}")
            self.stdout.write("")

        # ---------------- ARBITRATION TRACE ----------------
        self.stdout.write(self.style.NOTICE("=== ARBITRATION ==="))
        top = scored[0]
        top_cand = top["cand"]
        top_score = top["total"]
        self.stdout.write(
            f"top candidate: {top_cand.entity_id} '{top_cand.label}' score={top_score:.4f}"
        )

        anti_city_triggered = False
        swap_target = None
        if top["is_city"]:
            self.stdout.write("anti-city dominance: TOP IS CITY_ADMIN · scanning POIs...")
            for cand_r in scored[1:]:
                gap = top_score - cand_r["total"]
                self.stdout.write(
                    f"  candidate {cand_r['cand'].entity_id} '{cand_r['cand'].label}' "
                    f"score={cand_r['total']:.4f} gap={gap:.4f}"
                )
                if gap >= CITY_DEMOTION_DELTA:
                    self.stdout.write(
                        f"    → gap {gap:.4f} >= CITY_DEMOTION_DELTA {CITY_DEMOTION_DELTA} · STOP"
                    )
                    break
                prox_limit = top_cand.distance_m * CITY_DEMOTION_PROXIMITY_TOLERANCE
                if cand_r["is_poi"] and cand_r["cand"].distance_m <= prox_limit:
                    self.stdout.write(self.style.SUCCESS(
                        f"    → POI within proximity {prox_limit:.1f}m · SWAP"
                    ))
                    anti_city_triggered = True
                    swap_target = cand_r
                    break
                else:
                    self.stdout.write(
                        f"    → not POI ({cand_r['is_poi']}) OR distance "
                        f"{cand_r['cand'].distance_m:.1f}m > limit {prox_limit:.1f}m · skip"
                    )
        else:
            self.stdout.write("anti-city dominance: TOP NOT CITY_ADMIN · no swap attempt")

        self.stdout.write(
            f"hostile-water reject: {'YES' if top['is_water'] else 'no'}"
        )
        self.stdout.write(
            f"low-rank reject: {'YES' if top_score < RANK_THRESHOLD else 'no'} "
            f"(score={top_score:.4f} threshold={RANK_THRESHOLD})"
        )

        ambiguity_triggered = False
        if len(scored) >= 2:
            second = scored[1]
            delta = top_score - second["total"]
            if delta < RANK_AMBIGUITY_DELTA:
                both_high_class = (
                    top["c_s"] >= RANK_AMBIGUITY_CLASS_MIN
                    and second["c_s"] >= RANK_AMBIGUITY_CLASS_MIN
                )
                ambiguity_triggered = both_high_class
                self.stdout.write(
                    f"ambiguity arbitration: delta={delta:.4f} < "
                    f"{RANK_AMBIGUITY_DELTA} · both_high_class={both_high_class}"
                )
            else:
                self.stdout.write(
                    f"ambiguity arbitration: delta={delta:.4f} >= "
                    f"{RANK_AMBIGUITY_DELTA} · skip"
                )

        self.stdout.write("")

        # ---------------- WINNER ----------------
        final = swap_target if swap_target else top
        winner_cand = final["cand"]
        self.stdout.write(self.style.SUCCESS("=== WINNER ==="))
        self.stdout.write(f"entity_id: {winner_cand.entity_id}")
        self.stdout.write(f"label: {winner_cand.label}")
        self.stdout.write(f"score: {final['total']:.4f}")
        self.stdout.write(f"distance_m: {winner_cand.distance_m:.1f}")
        self.stdout.write(f"classes: {list(winner_cand.classes)}")
        if swap_target:
            self.stdout.write("why won: anti-city dominance swap from top")
        else:
            self.stdout.write("why won: highest rank_score · no arbitration swap")

        self.stdout.write("")
        self.stdout.write(self.style.NOTICE("=== ARBITRATION FLAGS ==="))
        self.stdout.write(f"anti-city dominance triggered: "
                          f"{'YES' if anti_city_triggered else 'no'}")
        self.stdout.write(f"hostile-water reject: "
                          f"{'YES' if top['is_water'] else 'no'}")
        self.stdout.write(f"ambiguity arbitration: "
                          f"{'YES' if ambiguity_triggered else 'no'}")
        self.stdout.write(f"low-rank reject: "
                          f"{'YES' if top_score < RANK_THRESHOLD else 'no'}")
