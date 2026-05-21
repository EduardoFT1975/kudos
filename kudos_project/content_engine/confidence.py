"""
KUDOS Content Engine · V0 confidence scoring.

Deterministic 0.0–1.0 score with three locked components:

    confidence = 0.30 * source_count_score
               + 0.40 * reliability_avg_score
               + 0.30 * evidence_density_score

Inputs:
    verified_refs · EvidenceSet.compiled_refs (server-fetched).
                    NEVER pass LLMDraft.source_refs · those are echoed.
    draft         · validated LLMDraft (used for evidence density only:
                    sentences in factual_anchor + context_block).

Components:
    source_count_score
        Number of UNIQUE source_types in verified_refs, saturated at 2
        (wikidata + wikipedia is the max in V0). count / 2.

    reliability_avg_score
        Mean of per-ref reliability scores ÷ 5.
        Reliability map: wikidata = 5, wikipedia = 4.

    evidence_density_score
        Ratio of grounded sentences to total sentences in the draft body.
        A sentence is "grounded" if its content tokens (len≥4, stopwords
        removed) overlap by ≥3 with the union of verified ref snippets.
        Mirrors truth_gate.validate_sentence_grounding semantics.

Returns:
    (confidence: float, breakdown: dict)
"""
from __future__ import annotations

from collections.abc import Iterable

from content_engine.schemas import LLMDraft, SourceRef
from content_engine.truth_gate import split_sentences

# Phase 12 · re-weighted for mid-band realism.
# Old weights (0.30 / 0.40 / 0.30) saturated successful capsules at
# 0.85-0.95 because source_count and reliability are almost always
# both near-max (wikidata + wikipedia, 5/5 and 4/5 reliability). The
# only swing factor was evidence_density, but its 0.30 weight wasn't
# enough to pull mid-quality capsules into the 0.55-0.75 band.
# New weights shift mass to evidence_density (0.50) · capsules with
# thin Wikipedia coverage or partial grounding now land in the
# diagnostic mid-band instead of all clustering at 0.85+.
_W_SOURCE_COUNT: float = 0.20
_W_RELIABILITY: float = 0.30
_W_EVIDENCE_DENSITY: float = 0.50

# Reliability map (out of 5)
_RELIABILITY_MAX: float = 5.0
_RELIABILITY_MAP: dict[str, int] = {
    "wikidata": 5,
    "wikipedia": 4,
}

# Source count saturates at 2 unique source_types
_SOURCE_COUNT_TARGET: float = 2.0

# Grounding threshold (mirrors truth_gate)
_GROUNDING_MIN_OVERLAP: int = 3


# ---------------------------------------------------------------------------
# Token helpers (kept local to avoid coupling to truth_gate internals)
# ---------------------------------------------------------------------------
import re

_TOKEN_RX = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿñÑ0-9]+", re.UNICODE)
_STOPWORDS: frozenset[str] = frozenset(
    {
        # ES
        "el", "la", "los", "las", "un", "una", "unos", "unas",
        "de", "del", "al", "en", "que", "como", "para", "por",
        "con", "sin", "sobre", "este", "esta", "estos", "estas",
        "ese", "esa", "esos", "esas", "aquel", "aquella",
        "es", "son", "ser", "fue", "fueron", "era", "eran",
        "ha", "han", "hay", "haber", "hubo",
        "mas", "muy", "tan", "ya", "no", "si",
        "le", "les", "lo", "se", "su", "sus",
        "donde", "cuando", "porque", "pero", "aunque",
        "entre", "hasta", "desde", "tras", "ante",
        "primero", "segundo", "tercero",
        # EN
        "the", "and", "for", "with", "from", "into", "onto",
        "this", "that", "these", "those", "such", "than",
        "have", "has", "had", "having", "been", "being",
        "are", "was", "were", "will", "would", "could", "should",
        "while", "where", "when", "which", "what", "whom", "whose",
        "about", "above", "below", "after", "before", "between",
        "during", "through", "across", "without", "within",
        "also", "very", "just", "only", "more", "most", "less", "least",
        "first", "second", "third",
    }
)


def _content_tokens(text: str) -> set[str]:
    tokens = _TOKEN_RX.findall(text.lower())
    return {t for t in tokens if len(t) >= 4 and t not in _STOPWORDS}


# ---------------------------------------------------------------------------
# Components
# ---------------------------------------------------------------------------
def _source_count_score(verified_refs: Iterable[SourceRef]) -> float:
    types = {ref.source_type for ref in verified_refs}
    return min(len(types) / _SOURCE_COUNT_TARGET, 1.0)


def _reliability_avg_score(verified_refs: Iterable[SourceRef]) -> float:
    refs = list(verified_refs)
    if not refs:
        return 0.0
    total = 0.0
    for ref in refs:
        total += float(_RELIABILITY_MAP.get(ref.source_type, 0))
    avg = total / len(refs)
    return min(avg / _RELIABILITY_MAX, 1.0)


def _evidence_density_score(
    draft: LLMDraft, verified_refs: Iterable[SourceRef]
) -> float:
    body = f"{draft.factual_anchor} {draft.context_block}".strip()
    sentences = split_sentences(body)
    if not sentences:
        return 0.0
    corpus: set[str] = set()
    for ref in verified_refs:
        corpus |= _content_tokens(ref.snippet)
    if not corpus:
        return 0.0
    grounded = 0
    for sentence in sentences:
        sent_tokens = _content_tokens(sentence)
        if not sent_tokens:
            continue
        if len(sent_tokens & corpus) >= _GROUNDING_MIN_OVERLAP:
            grounded += 1
    return grounded / len(sentences)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def compute_confidence(
    verified_refs: Iterable[SourceRef], draft: LLMDraft
) -> tuple[float, dict]:
    """Return (confidence, breakdown).

    `verified_refs` MUST be EvidenceSet.compiled_refs. Do not pass
    LLMDraft.source_refs · those are echoed by the model.
    """
    refs = tuple(verified_refs)
    src_count = _source_count_score(refs)
    reliability = _reliability_avg_score(refs)
    density = _evidence_density_score(draft, refs)

    confidence = (
        _W_SOURCE_COUNT * src_count
        + _W_RELIABILITY * reliability
        + _W_EVIDENCE_DENSITY * density
    )
    # Clamp for numerical safety (components are already in [0,1]).
    if confidence < 0.0:
        confidence = 0.0
    elif confidence > 1.0:
        confidence = 1.0

    breakdown = {
        "weights": {
            "source_count": _W_SOURCE_COUNT,
            "reliability_avg": _W_RELIABILITY,
            "evidence_density": _W_EVIDENCE_DENSITY,
        },
        "components": {
            "source_count_score": src_count,
            "reliability_avg_score": reliability,
            "evidence_density_score": density,
        },
        "inputs": {
            "verified_ref_count": len(refs),
            "verified_source_types": sorted({r.source_type for r in refs}),
        },
    }
    return confidence, breakdown
