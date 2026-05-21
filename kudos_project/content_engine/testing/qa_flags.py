"""
KUDOS Content Engine · Phase 12 QA heuristic flags.

Pure-function flag detection over per-test result rows. Flags are
ADVISORY · they surface suspicious patterns for review but do not
themselves determine PASS/WARN/FAIL verdicts (that mapping is in
the runner). A test can PASS its expected-mode check and still
emit flags worth investigating.

Each function takes a test_row dict and returns the flag string if
fired, or None otherwise. The runner aggregates fired flags per row.
"""
from __future__ import annotations

from typing import Any

# Sets used for FLAG_BAD_RURAL_WINNER. Conservative · easy to extend.
_HAMLET_CLASSES: frozenset[str] = frozenset({
    "Q532",       # village
    "Q3055118",   # lugar (Galician hamlet)
    "Q123705",    # neighborhood
    "Q840482",    # civil parish
    "Q3257518",   # concejo / parish
})
_LANDMARK_CLASSES: frozenset[str] = frozenset({
    "Q9259",      # UNESCO WHS
    "Q907116",    # Bien de Interés Cultural
    "Q23413",     # castle
    "Q33506",     # museum
    "Q2319498",   # landmark
    "Q33837",     # archaeological site
    "Q839954",    # archaeological feature
    "Q570116",    # tourist attraction
    "Q44613",     # monastery
})


# ---------------------------------------------------------------------------
# Individual flag detectors
# ---------------------------------------------------------------------------
def flag_low_confidence_high_notability(row: dict[str, Any]) -> str | None:
    """Winner has high sitelinks count but low confidence · suspect
    grounding gate is too strict or content depth is insufficient."""
    sitelinks = row.get("winner_sitelinks_count")
    confidence = row.get("confidence")
    if sitelinks is None or confidence is None:
        return None
    if sitelinks > 20 and confidence < 0.6:
        return "FLAG_LOW_CONFIDENCE_HIGH_NOTABILITY"
    return None


def flag_sparse_false_positive(row: dict[str, Any]) -> str | None:
    """UX state is sparse_discovery but override didn't fire · means
    low-confidence direct discovery was routed to sparse · confidence
    threshold may be miscalibrated."""
    if (
        row.get("ux_state") == "sparse_discovery"
        and row.get("via_landmark_override") is False
    ):
        return "FLAG_SPARSE_FALSE_POSITIVE"
    return None


def flag_override_false_negative(row: dict[str, Any]) -> str | None:
    """Override fired but UX state is success · contradicts mapping
    rule (override should always route to sparse_discovery). Indicates
    translator bug or stale code path."""
    if (
        row.get("via_landmark_override") is True
        and row.get("ux_state") == "success"
    ):
        return "FLAG_OVERRIDE_FALSE_NEGATIVE"
    return None


def flag_empty_false_positive(row: dict[str, Any]) -> str | None:
    """A non-trivial failure_class is set but UX is not empty_zone ·
    indicates the suppression path didn't propagate. Excludes the
    semantically OK cases: DEDUPE_HIT (approved capsule, not a real
    failure) and STORAGE_RACE_LOST (capsule still returned)."""
    failure_class = row.get("failure_class") or ""
    if not failure_class:
        return None
    if failure_class in {"DEDUPE_HIT", "STORAGE_RACE_LOST"}:
        return None
    if row.get("ux_state") != "empty_zone":
        return "FLAG_EMPTY_FALSE_POSITIVE"
    return None


def flag_bad_rural_winner(row: dict[str, Any]) -> str | None:
    """Winner is a hamlet-class entity AND the candidate pool also
    contains a landmark-class entity that lost. Suggests ranking
    favored proximity/admin classification over heritage signal."""
    winner_classes = row.get("winner_classes") or ()
    pool_classes_by_qid = row.get("pool_classes_by_qid") or {}
    winner_qid = row.get("winner_entity_id")
    if not winner_classes or not pool_classes_by_qid or not winner_qid:
        return None
    winner_is_hamlet = any(c in _HAMLET_CLASSES for c in winner_classes)
    if not winner_is_hamlet:
        return None
    for qid, classes in pool_classes_by_qid.items():
        if qid == winner_qid:
            continue
        if any(c in _LANDMARK_CLASSES for c in classes):
            return "FLAG_BAD_RURAL_WINNER"
    return None


# ---------------------------------------------------------------------------
# Aggregator
# ---------------------------------------------------------------------------
_ALL_FLAG_FNS = (
    flag_low_confidence_high_notability,
    flag_sparse_false_positive,
    flag_override_false_negative,
    flag_empty_false_positive,
    flag_bad_rural_winner,
)


def detect_flags(row: dict[str, Any]) -> list[str]:
    """Apply all flag detectors to a row · return list of fired flags."""
    out: list[str] = []
    for fn in _ALL_FLAG_FNS:
        flag = fn(row)
        if flag:
            out.append(flag)
    return out
