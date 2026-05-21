"""
KUDOS Content Engine · V0 schemas (Pydantic v2).

Frozen, validated data shapes that flow through the pipeline:

    NormalizedInput     · stage 1 output · validated user request
    WikidataCandidate   · stage 2 output · one row per nearby entity
    WinningEntity       · stage 3 output · selected entity after ranking
    SourceRef           · atomic citation (Wikidata or Wikipedia)
    EvidenceSet         · stage 5 output · trusted substrate for the LLM
    LLMDraft            · stage 6 output · what the LLM emitted

Trust boundary:
    EvidenceSet.compiled_refs  → VERIFIED data (server-fetched).
    LLMDraft.source_refs       → LLM-ECHOED data. Never trust its
                                 snippet/url/retrieved_at for storage,
                                 grounding, or confidence scoring.

Every model is frozen so downstream code cannot mutate stage outputs.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


# ---------------------------------------------------------------------------
# NormalizedInput · stage 1
# ---------------------------------------------------------------------------
class NormalizedInput(BaseModel):
    """Validated request entering the pipeline."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    radius_m: int = Field(..., ge=100, le=5000)
    timestamp: datetime
    photo_id: str | None = Field(default=None, max_length=128)
    pipeline_run_id: str = Field(..., min_length=1, max_length=128)


# ---------------------------------------------------------------------------
# WikidataCandidate · stage 2
# ---------------------------------------------------------------------------
_QID_RX: re.Pattern[str] = re.compile(r"^Q[1-9]\d*$")


class WikidataCandidate(BaseModel):
    """One Wikidata entity returned by the SPARQL `wikibase:around` query."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    entity_id: str = Field(..., min_length=2, max_length=32)
    label: str = Field(..., min_length=1, max_length=300)
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    distance_m: float = Field(..., ge=0.0)
    classes: tuple[str, ...] = Field(default_factory=tuple)
    sitelinks_count: int = Field(default=0, ge=0)
    has_es_wiki: bool = False
    has_en_wiki: bool = False

    @field_validator("entity_id")
    @classmethod
    def _validate_qid(cls, v: str) -> str:
        if not _QID_RX.match(v):
            raise ValueError(f"entity_id must match ^Q[1-9]\\d*$, got {v!r}")
        return v

    @field_validator("classes")
    @classmethod
    def _validate_classes(cls, v: tuple[str, ...]) -> tuple[str, ...]:
        for c in v:
            if not _QID_RX.match(c):
                raise ValueError(f"class entry must be a QID, got {c!r}")
        return v


# ---------------------------------------------------------------------------
# WinningEntity · stage 3
# ---------------------------------------------------------------------------
class WinningEntity(BaseModel):
    """The single entity selected by ranking · feeds enrichment + LLM."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    entity_id: str = Field(..., min_length=2, max_length=32)
    label: str = Field(..., min_length=1, max_length=300)
    distance_m: float = Field(..., ge=0.0)
    rank_score: float = Field(..., ge=0.0, le=1.0)
    classes: tuple[str, ...] = Field(default_factory=tuple)
    wikipedia_title_es: str | None = Field(default=None, max_length=300)
    wikipedia_title_en: str | None = Field(default=None, max_length=300)

    @field_validator("entity_id")
    @classmethod
    def _validate_qid(cls, v: str) -> str:
        if not _QID_RX.match(v):
            raise ValueError(f"entity_id must match ^Q[1-9]\\d*$, got {v!r}")
        return v


# ---------------------------------------------------------------------------
# SourceRef · atomic citation
# ---------------------------------------------------------------------------
SourceType = Literal["wikidata", "wikipedia"]


class SourceRef(BaseModel):
    """One citation. Used both in EvidenceSet.compiled_refs (verified)
    and LLMDraft.source_refs (echoed). Same shape, different trust."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    index: int = Field(..., ge=0)
    source_type: SourceType
    source_id: str = Field(..., min_length=1, max_length=300)
    url: str = Field(..., pattern=r"^https://", max_length=2000)
    retrieved_at: datetime
    snippet: str = Field(..., max_length=300)
    supports_sentence_indices: tuple[int, ...] = Field(default_factory=tuple)

    @field_validator("supports_sentence_indices")
    @classmethod
    def _validate_sentence_indices(cls, v: tuple[int, ...]) -> tuple[int, ...]:
        for i in v:
            if i < 0:
                raise ValueError(f"sentence index must be >= 0, got {i}")
        return v


# ---------------------------------------------------------------------------
# EvidenceSet · stage 5 · trusted substrate
# ---------------------------------------------------------------------------
class EvidenceSet(BaseModel):
    """Server-verified evidence handed to the LLM. compiled_refs is the
    ONLY authoritative ref list — LLM may echo it back in its draft, but
    storage and grounding must always use compiled_refs."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    winning_entity: WinningEntity
    wikipedia_summary: str | None = None
    compiled_refs: tuple[SourceRef, ...] = Field(..., min_length=1)

    @model_validator(mode="after")
    def _validate_indices(self) -> "EvidenceSet":
        for pos, ref in enumerate(self.compiled_refs):
            if ref.index != pos:
                raise ValueError(
                    f"compiled_refs[{pos}].index must equal {pos}, got {ref.index}"
                )
        # Unique source_id within the set
        seen: set[str] = set()
        for ref in self.compiled_refs:
            if ref.source_id in seen:
                raise ValueError(f"duplicate source_id in compiled_refs: {ref.source_id!r}")
            seen.add(ref.source_id)
        return self

    @property
    def allowed_source_ids(self) -> frozenset[str]:
        return frozenset(ref.source_id for ref in self.compiled_refs)


# ---------------------------------------------------------------------------
# LLMDraft · stage 6 · what the model emitted
# ---------------------------------------------------------------------------
class LLMDraft(BaseModel):
    """Raw draft returned by the LLM. Substrate is ECHOED, not verified."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    title: str = Field(..., min_length=1, max_length=200)
    factual_anchor: str = Field(..., min_length=20, max_length=200)
    context_block: str = Field(..., min_length=60, max_length=500)
    source_refs: tuple[SourceRef, ...] = Field(..., min_length=1)

    @model_validator(mode="after")
    def _validate_index_positions(self) -> "LLMDraft":
        for pos, ref in enumerate(self.source_refs):
            if ref.index != pos:
                raise ValueError(
                    f"source_refs[{pos}].index must equal {pos}, got {ref.index}"
                )
        return self


# ---------------------------------------------------------------------------
# Snippet normalization · builder-side contract for SourceRef.snippet
# ---------------------------------------------------------------------------
def normalize_snippet(text: str, max_len: int = 300) -> str:
    """Normalize + hard truncate to <= max_len codepoints, UTF-8 safe.

    Per V0 builder contract: every SourceRef.snippet MUST pass through
    this BEFORE the SourceRef is constructed. Schema validation
    (max_length=300) stays strict; builders become compliant.

    Apply at:
      - pipeline.py · Stage 5 wikidata/wikipedia ref construction
      - pipeline.py · _verified_refs_for_grounding rebuild
      - clients/anthropic.py · pre-validation of LLM-echoed source_refs
        (Pydantic constructs SourceRef instances during model_validate;
         the LLM cannot be trusted to honor the 300-char cap)

    Rules (matches Eiffel-bug spec):
      - Collapse whitespace runs (newlines/tabs/multiples → single space).
      - If len <= max_len - 3, return as-is.
      - Else slice to (max_len - 3), prefer word-boundary trim via
        rsplit(' ', 1), append U+2026 ellipsis (1 codepoint).
      - Worst case: max_len - 3 + 1 = max_len - 2 <= max_len. Always safe.
    """
    if not text:
        return ""
    t = " ".join(text.split())
    soft_budget = max_len - 3
    if len(t) <= soft_budget:
        return t
    cut = t[:soft_budget]
    parts = cut.rsplit(" ", 1)
    word_safe = parts[0] if len(parts) > 1 and parts[0] else cut
    return word_safe.rstrip() + "…"


# ---------------------------------------------------------------------------
# GeosearchResult · Stage 2 retrieval contract
# ---------------------------------------------------------------------------
class GeosearchResult(BaseModel):
    """Result of `WikipediaClient.geosearch(...)`.

    The `success` flag is authoritative. Empty `candidates` may mean either:

        success=True   · upstream succeeded but no canonical candidates
                         (legitimate empty area OR all pages without QID).
        success=False  · upstream failure (HTTP, JSON, or pageprops batch).

    Pipeline Stage 2 branches on `success` alone to decide between
    fresh-empty cache + NO_CANDIDATES suppression vs negative cache +
    fail-open. NEVER infer outcome from candidate count.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    candidates: tuple[WikidataCandidate, ...] = ()
    success: bool
    failure_reason: str = Field(default="", max_length=200)
