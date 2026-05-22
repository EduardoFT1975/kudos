"""
KUDOS Content Engine · V0 sync orchestrator.

Public entry point:

    generate_place_capsule(normalized_input: dict) -> PlaceCapsule | None

Nine deterministic stages. Each failure path writes ONE GenerationAttempt
row with a specific failure_class. On approval, a PlaceCapsule row plus a
linked GenerationAttempt row are written inside a single transaction.

Trust boundary (critical):
    EvidenceSet.compiled_refs  → VERIFIED (server-fetched). Used for
        storage, grounding validation, and confidence scoring.
    LLMDraft.source_refs       → ECHOED (model output). Used for nothing
        except validating that the model cited only allowed source_ids.

Stages:
    1. normalize          · dict → NormalizedInput
    2. retrieve           · Wikipedia GeoSearch + pageprops QID resolution
                            (cache-first · canonical candidates only)
    3. rank               · select_winner
    4. dedupe             · content_hash hit returns existing capsule
    5. wikipedia_enrich   · optional summary (graceful None)
    6. llm_draft          · Anthropic tool_use draft
    7. truth_gate         · 3 deterministic gates
    8. confidence         · 0.30/0.40/0.30 weighted score
    9. store              · dual-table atomic write
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, NamedTuple

from django.conf import settings
from django.db import IntegrityError, transaction
from pydantic import ValidationError

from content_engine.clients.anthropic import (
    LLMDrafter,
    LLMJSONFailError,
    LLMTimeoutError,
    LLMTransientError,
)
# NOTE: `WikidataClient` + Retrieval*Error are kept as latent enrichment
# imports · primary retrieval path no longer uses them (replaced by
# WikipediaClient.geosearch in Stage 2).
from content_engine.clients.wikidata import (
    RetrievalClientError,
    RetrievalParseError,
    RetrievalTimeoutError,
    WikidataClient,
)
from content_engine.clients.wikipedia import WikipediaClient
from content_engine.confidence import compute_confidence
from content_engine.constants import MODEL_NAME, PROMPT_VERSION
from content_engine.geocache import (
    cache_lookup,
    cache_write_fresh,
    cache_write_negative,
    deserialize_candidates,
)
from content_engine.hashing import (
    cache_key_for,
    compute_content_hash,
    geo_bucket,
    radius_bucket as radius_bucket_for,
)
from content_engine.landmarks import (
    build_landmark_candidates,
    find_nearby_landmarks,
)
from content_engine.models import GenerationAttempt, PlaceCapsule, WikidataGeoCache
from content_engine.ranking import (
    compute_rank_score,
    select_nearest_locality,
    select_winner,
)
from content_engine.schemas import (
    EvidenceSet,
    GeosearchResult,
    LLMDraft,
    NormalizedInput,
    SourceRef,
    WinningEntity,
    normalize_snippet,
)
from content_engine.truth_gate import (
    validate_forbidden_content,
    validate_source_ids,
    validate_sentence_grounding,
)

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Failure class strings (audit log)
# ---------------------------------------------------------------------------
_FC_INPUT_INVALID = "INPUT_INVALID"
_FC_WIKIDATA_TIMEOUT = "WIKIDATA_TIMEOUT"
_FC_WIKIDATA_CLIENT_ERROR = "WIKIDATA_CLIENT_ERROR"
_FC_WIKIDATA_PARSE_ERROR = "WIKIDATA_PARSE_ERROR"
_FC_NO_CANDIDATES = "NO_CANDIDATES"
_FC_LOW_RANK = "LOW_RANK"
_FC_AMBIGUOUS_WINNER = "AMBIGUOUS_WINNER"
_FC_DISTANT_WINNER = "DISTANT_WINNER"      # P2.4 · winner > MAX distance · rejected
_FC_LOCALITY_FALLBACK = "LOCALITY_FALLBACK"  # P2.4 · used locality fallback (telemetry)
_FC_HYGIENE_GATE = "HYGIENE_GATE"            # P3 · hard gate rejected store

# P2.4 · distance ceiling para winner aceptado.
_MAX_WINNER_DISTANCE_M = 10000

# P3 · hygiene tiers
_HYGIENE_VALID_M = 3000
_HYGIENE_SUSPECT_M = 10000
_GENERATION_VERSION = "P3.0"


def _hygiene_for(distance_m: float) -> str:
    """Classify capsule hygiene by winner→origin distance."""
    if distance_m <= _HYGIENE_VALID_M:
        return "VALID"
    if distance_m <= _HYGIENE_SUSPECT_M:
        return "SUSPECT"
    return "INVALID"
_FC_LLM_TIMEOUT = "LLM_TIMEOUT"
_FC_LLM_TRANSIENT = "LLM_TRANSIENT"
_FC_LLM_JSON_FAIL = "LLM_JSON_FAIL"
_FC_FORBIDDEN_CONTENT = "FORBIDDEN_CONTENT"
_FC_INVALID_SOURCE_IDS = "INVALID_SOURCE_IDS"
_FC_UNGROUNDED = "UNGROUNDED"
_FC_STORAGE_RACE_LOST = "STORAGE_RACE_LOST"
_FC_DEDUPE_HIT = "DEDUPE_HIT"
_FC_HOSTILE_EMPTY = "HOSTILE_EMPTY"  # Phase 12 · top is abstract water body


# ---------------------------------------------------------------------------
# PipelineResult · Phase 11.5 truth signal for via_landmark_override
# ---------------------------------------------------------------------------
class PipelineResult(NamedTuple):
    """Return shape of `generate_place_capsule`.

    `via_landmark_override` is TRUE iff the winning entity was injected
    via the Phase 9 landmark override path during THIS run. It is FALSE
    when:
      - The capsule was produced by standard geosearch retrieval.
      - The capsule is None (no winner, nothing to attribute).
      - The winning entity happens to also exist in the registry but
        was reached by standard geosearch (no injection fired).

    The signal is computed from the per-run `injected_qids` set inside
    `generate_place_capsule`, not from any post-hoc QID-in-registry
    heuristic. This is the authoritative signal for the API translator.
    """

    capsule: PlaceCapsule | None
    via_landmark_override: bool


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def generate_place_capsule(
    normalized_input: dict,
    *,
    wikipedia_client: WikipediaClient | None = None,
    wikidata_client: WikidataClient | None = None,
    bypass_cache: bool = False,
) -> PipelineResult:
    """Run the 9-stage pipeline. Returns PipelineResult(capsule, via_landmark_override).

    `wikipedia_client` is the injection hook for Stage 2 (primary
    retrieval) and Stage 5 (summary enrichment). When None, a real
    `WikipediaClient()` is instantiated and shared across both stages.
    Any object honoring the duck-typed contract is accepted:
        - geosearch(lat, lng, radius_m, lang) -> GeosearchResult
        - get_summary(title, lang) -> dict | None

    `wikidata_client` is retained vestigially for API back-compat. The
    primary retrieval path no longer uses Wikidata SPARQL. Reserved for
    future enrichment hooks.

    `bypass_cache` skips the WikidataGeoCache layer entirely (no reads,
    no writes). Used by fixture smoke mode so synthetic candidates do
    not pollute the cache table.

    Return shape (Phase 11.5):
        PipelineResult.capsule              · PlaceCapsule | None
        PipelineResult.via_landmark_override · True iff the winning
            entity was reached via Phase 9 landmark injection in THIS
            run. False on success-by-geosearch, dedupe-hit-by-geosearch,
            and on any None capsule (no winner to attribute).
    """
    # Per-run authoritative tracking of QIDs introduced via landmark
    # injection. Captured by the `_result` closure so every return
    # site emits the truth signal without inference.
    injected_qids: set[str] = set()

    def _result(capsule: PlaceCapsule | None) -> PipelineResult:
        if capsule is None:
            return PipelineResult(capsule=None, via_landmark_override=False)
        return PipelineResult(
            capsule=capsule,
            via_landmark_override=capsule.entity_id in injected_qids,
        )

    # Stage 1 · normalize ----------------------------------------------------
    try:
        normalized = NormalizedInput.model_validate(normalized_input)
    except ValidationError as exc:
        log.warning("Pipeline INPUT_INVALID: %s", exc)
        _record_pre_normalize_failure(normalized_input, _FC_INPUT_INVALID)
        return _result(None)

    # Shared Wikipedia client · used by Stage 2 and Stage 5
    wp_client = wikipedia_client if wikipedia_client is not None else WikipediaClient()
    _ = wikidata_client  # vestigial · primary path no longer uses Wikidata

    # Stage 2 · retrieve (cache-first · Wikipedia GeoSearch + pageprops) ----
    use_cache = not bypass_cache and getattr(
        settings, "CONTENT_ENGINE_GEOCACHE_ENABLED", True
    )
    cache_k = ""
    gh6 = ""
    rb = ""
    entry: WikidataGeoCache | None = None
    if use_cache:
        cache_k = cache_key_for(normalized.lat, normalized.lng, normalized.radius_m)
        gh6 = geo_bucket(normalized.lat, normalized.lng)
        rb = radius_bucket_for(normalized.radius_m)
        entry = cache_lookup(cache_k)

    now = datetime.now(timezone.utc)
    candidates: list = []
    served_from_cache = False

    # Branch A · fresh hit
    if (
        entry is not None
        and entry.status == WikidataGeoCache.STATUS_FRESH
        and now < entry.stale_after
    ):
        candidates = deserialize_candidates(entry.candidates)
        served_from_cache = True
        log.info("Geocache FRESH hit: %s (%d candidates)", cache_k, len(candidates))

    # Branch B · negative hit · suppress without upstream call
    elif (
        entry is not None
        and entry.status == WikidataGeoCache.STATUS_NEGATIVE
        and now < entry.expires_at
    ):
        log.info(
            "Geocache NEGATIVE hit: %s (reason=%r)",
            cache_k, entry.failure_reason,
        )
        _record_suppressed(normalized, _FC_WIKIDATA_CLIENT_ERROR)
        return _result(None)

    # Branch C/D/E · miss, expired-fresh, or expired-negative → live retrieve
    if not served_from_cache:
        result: GeosearchResult = wp_client.geosearch_with_fallback(
            normalized.lat, normalized.lng, normalized.radius_m
        )
        if not result.success:
            # Case D · upstream failure (HTTP, JSON, or pageprops batch)
            log.warning(
                "Pipeline GeoSearch failure: %s", result.failure_reason,
            )
            recovered = _handle_geosearch_failure(
                normalized=normalized,
                entry=entry,
                use_cache=use_cache,
                cache_k=cache_k,
                gh6=gh6,
                rb=rb,
                failure_reason=result.failure_reason or "UNKNOWN",
                failure_class=_FC_WIKIDATA_CLIENT_ERROR,
            )
            if recovered is None:
                return _result(None)
            candidates = recovered
        else:
            # Cases A/B/C · success · candidates may be empty (B or C)
            candidates = list(result.candidates)
            if use_cache:
                cache_write_fresh(cache_k, gh6, rb, candidates)
                log.info(
                    "Geocache write FRESH: %s (%d candidates)",
                    cache_k, len(candidates),
                )

    # Stage 2.5 · landmark override · SPARSE + MISSING_LANDMARK triggers
    # Inject curated landmarks into the pool when either:
    #   (A) SPARSE             · geosearch returned < 2 candidates.
    #   (B) MISSING_LANDMARK   · a known registry landmark is within its
    #                            capture radius but absent from the pool ·
    #                            recovers cases like Las Médulas where the
    #                            pool is non-sparse but the canonical
    #                            entity is missing.
    # Fixture mode (bypass_cache) skipped so synthetic runs stay deterministic.
    # Idempotency preserved by exclude_qids inside _try_landmark_injection.
    if not bypass_cache:
        pool_sparse = len(candidates) < 2
        missing_landmark = False
        if not pool_sparse:
            pool_qids = {c.entity_id for c in candidates}
            for lm in find_nearby_landmarks(normalized.lat, normalized.lng):
                if lm.qid not in pool_qids:
                    missing_landmark = True
                    break
        if pool_sparse or missing_landmark:
            trigger_label = "SPARSE" if pool_sparse else "MISSING_LANDMARK"
            injected_qids |= _try_landmark_injection(
                candidates,
                normalized.lat,
                normalized.lng,
                wp_client,
                trigger=trigger_label,
            )

    if not candidates:
        # Cases B and C collapse here intentionally · both mean "no
        # canonical content here" and the fresh-empty cache row above
        # records the legitimate-empty outcome for 7 days.
        _record_suppressed(normalized, _FC_NO_CANDIDATES)
        return _result(None)

    # Stage 3 · rank ---------------------------------------------------------
    # TEMP DEBUG · candidate ranking inspection (rank_score computed for
    # display only · select_winner re-derives it internally, no side effects)
    if not candidates:
        print("CANDIDATE DEBUG: no candidates")
    else:
        print("CANDIDATE DEBUG")
        for i, c in enumerate(candidates):
            cls_str = ",".join(c.classes) if c.classes else "-"
            score = compute_rank_score(c, normalized.radius_m)
            print(
                f"[{i}] {c.entity_id} :: {c.label} :: {cls_str} :: "
                f"{c.distance_m:.1f} :: {c.sitelinks_count} :: {score:.4f}"
            )
    # END TEMP DEBUG
    winner, fail = select_winner(candidates, normalized.radius_m)

    # Stage 3.5 · landmark override · LOW_RANK / AMBIGUOUS_WINNER trigger
    # Only fires if SPARSE trigger didn't already inject (idempotent · we
    # never want to inject the same registry twice in one pipeline run).
    if (
        winner is None
        and fail in {"LOW_RANK", "AMBIGUOUS_WINNER", "NO_CANDIDATES"}
        and not injected_qids
        and not bypass_cache
    ):
        newly_injected = _try_landmark_injection(
            candidates,
            normalized.lat,
            normalized.lng,
            wp_client,
            trigger=fail or "LOW_RANK",
        )
        if newly_injected:
            injected_qids |= newly_injected
            winner, fail = select_winner(candidates, normalized.radius_m)

    # P2.4 · distance gate · reject distant winners (anti-substitution rule).
    # Prevents pipeline from serving Palma del Río when user is in León (or
    # similar coord-drift cases). MediaWiki gsradius caps at 10km · si
    # geosearch devuelve un winner más lejos que MAX, es señal de drift.
    if winner is not None and winner.distance_m > _MAX_WINNER_DISTANCE_M:
        log.info(
            "winner rejected DISTANT_WINNER: %s :: %s :: %.0fm > %dm",
            winner.entity_id, winner.label, winner.distance_m,
            _MAX_WINNER_DISTANCE_M,
        )
        winner = None
        fail = _FC_DISTANT_WINNER

    # P2.4 · locality fallback · si no hay winner notable cercano, usar la
    # localidad/municipio donde físicamente está el usuario. Magaz de Abajo
    # devuelve "Magaz de Abajo" (no empty_zone). Solo aplica a pools
    # válidos · no se inventan candidatos · NO se hace re-fetch.
    if winner is None and candidates:
        nearest_locality = select_nearest_locality(candidates)
        if (
            nearest_locality is not None
            and nearest_locality.distance_m <= _MAX_WINNER_DISTANCE_M
        ):
            log.info(
                "locality fallback used: %s :: %s :: %.0fm",
                nearest_locality.entity_id,
                nearest_locality.label,
                nearest_locality.distance_m,
            )
            rank_score = compute_rank_score(nearest_locality, normalized.radius_m)
            # P2.4 · WinningEntity construction · solo campos válidos del
            # schema. wikipedia_title_es default = label (best guess para
            # ES Wikipedia · Stage 5 hace 404-silent si no existe la page).
            # wikipedia_title_en omitido (None default).
            winner = WinningEntity(
                entity_id=nearest_locality.entity_id,
                label=nearest_locality.label,
                distance_m=nearest_locality.distance_m,
                rank_score=rank_score,
                classes=nearest_locality.classes,
                wikipedia_title_es=(
                    nearest_locality.label if nearest_locality.has_es_wiki else None
                ),
                wikipedia_title_en=(
                    nearest_locality.label if nearest_locality.has_en_wiki else None
                ),
            )
            fail = None

    if winner is not None:
        print(
            f"winner candidate chosen: {winner.entity_id} :: "
            f"{winner.label} :: rank_score={winner.rank_score:.4f}"
        )
    if winner is None:
        fc = fail or _FC_LOW_RANK
        if fc == "NO_CANDIDATES":
            fc = _FC_NO_CANDIDATES
        _record_suppressed(normalized, fc)
        return _result(None)

    # Stage 4 · dedupe -------------------------------------------------------
    content_hash = compute_content_hash(
        entity_id=winner.entity_id,
        lat=normalized.lat,
        lng=normalized.lng,
        radius_m=normalized.radius_m,
        prompt_version=PROMPT_VERSION,
    )
    existing = PlaceCapsule.objects.filter(content_hash=content_hash).first()
    if existing is not None:
        _record_dedupe_hit(normalized, winner, existing)
        return _result(existing)

    # Stage 5 · wikipedia enrich (reuses shared wp_client from Stage 2) -----
    wiki_summary_text: str | None = None
    wiki_ref: SourceRef | None = None
    # P2 · media enrichment captured from REST summary (zero extra HTTP).
    media_image_url: str = ""
    media_thumbnail_url: str = ""
    media_caption: str = ""
    media_source_label: str = ""
    last_attempt_title: str = ""
    last_attempt_lang: str = "es"
    for lang, title in _wiki_title_attempts(winner):
        if not title:
            continue
        last_attempt_title = title
        last_attempt_lang = lang
        summary = wp_client.get_summary(title, lang=lang)
        if summary is None:
            continue
        wiki_summary_text = summary["extract"]
        media_image_url = summary.get("image_url", "") or ""
        media_thumbnail_url = summary.get("thumbnail_url", "") or ""
        media_caption = summary.get("description", "") or ""
        if media_image_url or media_thumbnail_url:
            media_source_label = "Wikipedia"
        wiki_ref = SourceRef(
            index=1,
            source_type="wikipedia",
            source_id=f"{lang}:{summary['title']}",
            url=summary["page_url"],
            retrieved_at=datetime.now(timezone.utc),
            snippet=normalize_snippet(summary["extract"]),
            supports_sentence_indices=(),
        )
        break

    # P2.5 · media fallback chain · si Wikipedia REST summary no expone
    # imagen (común en stubs y municipios pequeños):
    #   1. prop=pageimages contra el mismo título · a veces sí cubre
    #   2. Wikidata P18 (image claim) → Commons FilePath redirect
    # Solo se activan cuando media_image_url sigue vacío tras Stage 5
    # principal. Cada paso es transport-safe (never raises).
    if not media_image_url and last_attempt_title:
        pi = wp_client.get_pageimages(last_attempt_title, lang=last_attempt_lang)
        if pi:
            media_image_url = pi.get("image_url", "") or media_image_url
            media_thumbnail_url = (
                pi.get("thumbnail_url", "") or media_thumbnail_url
            )
            if media_image_url or media_thumbnail_url:
                media_source_label = "Wikipedia"
    if not media_image_url and not media_thumbnail_url:
        commons_url = wp_client.get_entity_image(winner.entity_id)
        if commons_url:
            media_image_url = commons_url
            if not media_thumbnail_url:
                media_thumbnail_url = commons_url
            media_source_label = "Wikidata Commons"

    # Build verified ref set · wikidata entity is always ref[0]
    wikidata_ref = SourceRef(
        index=0,
        source_type="wikidata",
        source_id=winner.entity_id,
        url=f"https://www.wikidata.org/wiki/{winner.entity_id}",
        retrieved_at=datetime.now(timezone.utc),
        snippet=normalize_snippet(f"{winner.label} (Wikidata {winner.entity_id})"),
        supports_sentence_indices=(),
    )
    compiled_refs: tuple[SourceRef, ...]
    if wiki_ref is not None:
        compiled_refs = (wikidata_ref, wiki_ref)
    else:
        compiled_refs = (wikidata_ref,)

    try:
        evidence_set = EvidenceSet(
            winning_entity=winner,
            wikipedia_summary=wiki_summary_text,
            compiled_refs=compiled_refs,
        )
    except ValidationError as exc:
        log.warning("Pipeline EvidenceSet build failed: %s", exc)
        _record_suppressed(normalized, _FC_WIKIDATA_PARSE_ERROR, winner=winner)
        return _result(None)

    # Stage 6 · llm draft ----------------------------------------------------
    drafter = LLMDrafter()
    try:
        draft = drafter.draft_place(evidence_set)
    except LLMTimeoutError as exc:
        log.warning("Pipeline LLM_TIMEOUT: %s", exc)
        _record_suppressed(normalized, _FC_LLM_TIMEOUT, winner=winner)
        return _result(None)
    except LLMTransientError as exc:
        log.warning("Pipeline LLM_TRANSIENT: %s", exc)
        _record_suppressed(normalized, _FC_LLM_TRANSIENT, winner=winner)
        return _result(None)
    except LLMJSONFailError as exc:
        log.warning("Pipeline LLM_JSON_FAIL: %s", exc)
        _record_suppressed(normalized, _FC_LLM_JSON_FAIL, winner=winner)
        return _result(None)

    # Stage 7 · truth gate ---------------------------------------------------
    body_text = f"{draft.factual_anchor} {draft.context_block}"
    if not validate_forbidden_content(body_text):
        _record_suppressed(normalized, _FC_FORBIDDEN_CONTENT, winner=winner)
        return _result(None)

    if not validate_source_ids(draft, evidence_set.compiled_refs):
        _record_suppressed(normalized, _FC_INVALID_SOURCE_IDS, winner=winner)
        return _result(None)

    verified_refs = _verified_refs_for_grounding(
        draft.source_refs, evidence_set.compiled_refs
    )
    # Grounding evidence · full Wikipedia summary bypasses SourceRef.snippet
    # 300-char cap via _FullRef duck-type. Storage (Stage 9) keeps
    # verified_refs; response output keeps draft.source_refs.
    grounding_refs: list = []
    for ref in evidence_set.compiled_refs:
        if ref.source_type == "wikidata":
            grounding_refs.append(ref)
    if evidence_set.wikipedia_summary:
        grounding_refs.append(_FullRef(evidence_set.wikipedia_summary))
    ok, unsupported = validate_sentence_grounding(body_text, grounding_refs)
    if not ok:
        _record_suppressed(normalized, _FC_UNGROUNDED, winner=winner)
        return _result(None)

    # Stage 8 · confidence ---------------------------------------------------
    confidence, breakdown = compute_confidence(evidence_set.compiled_refs, draft)

    # Stage 9 · store --------------------------------------------------------
    try:
        stored = _store_approved(            normalized=normalized,
            winner=winner,
            draft=draft,
            verified_refs=verified_refs,
            content_hash=content_hash,
            confidence=confidence,
            breakdown=breakdown,
            media_image_url=media_image_url,
            media_thumbnail_url=media_thumbnail_url,
            media_caption=media_caption,
            media_source_label=media_source_label,
        )
        return _result(stored)
    except IntegrityError as exc:
        log.warning("Pipeline STORAGE_RACE_LOST: %s", exc)
        existing = PlaceCapsule.objects.filter(content_hash=content_hash).first()
        if existing is not None:
            _record_suppressed(
                normalized,
                _FC_STORAGE_RACE_LOST,
                winner=winner,
                confidence=confidence,
            )
            return _result(existing)
        _record_suppressed(
            normalized,
            _FC_STORAGE_RACE_LOST,
            winner=winner,
            confidence=confidence,
        )
        return _result(None)
    except ValueError as exc:
        # P3 hygiene hard gate rejected the store.
        log.warning("Pipeline HYGIENE_GATE: %s", exc)
        _record_suppressed(
            normalized, _FC_HYGIENE_GATE, winner=winner, confidence=confidence,
        )
        return _result(None)


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------
def _store_approved(
    *,
    normalized: NormalizedInput,
    winner: WinningEntity,
    draft: LLMDraft,
    verified_refs: list[SourceRef],
    content_hash: str,
    confidence: float,
    breakdown: dict,
    media_image_url: str = "",
    media_thumbnail_url: str = "",
    media_caption: str = "",
    media_source_label: str = "",
) -> PlaceCapsule:
    """Single atomic dual-write: PlaceCapsule + GenerationAttempt.

    P3 hygiene · hard gate · winner > _MAX_WINNER_DISTANCE_M raises
    ValueError. Caller (run_pipeline) treats as suppressed.
    """
    # P3 · HARD GATE · no poisoned insert
    if winner.distance_m > _MAX_WINNER_DISTANCE_M:
        raise ValueError(
            f"hygiene gate: winner distance "
            f"{winner.distance_m:.0f}m > {_MAX_WINNER_DISTANCE_M}m"
        )

    hygiene_status = _hygiene_for(winner.distance_m)
    if media_source_label:
        media_source = media_source_label
    elif media_image_url:
        media_source = "Wikipedia"
    else:
        media_source = ""
    with transaction.atomic():
        capsule = PlaceCapsule.objects.create(
            content_hash=content_hash,
            entity_id=winner.entity_id,
            title=draft.title,
            factual_anchor=draft.factual_anchor,
            context_block=draft.context_block,
            source_refs=[_serialize_ref(r) for r in verified_refs],
            confidence=confidence,
            confidence_breakdown=breakdown,
            generator_model=MODEL_NAME,
            prompt_version=PROMPT_VERSION,
            pipeline_run_id=normalized.pipeline_run_id,
            image_url=media_image_url,
            thumbnail_url=media_thumbnail_url,
            gallery=[],
            video_url="",
            media_source=media_source,
            media_caption=media_caption,
            hygiene_status=hygiene_status,
            origin_lat=normalized.lat,
            origin_lng=normalized.lng,
            winner_distance_m=winner.distance_m,
            generation_version=_GENERATION_VERSION,
        )
        GenerationAttempt.objects.create(
            status=GenerationAttempt.STATUS_APPROVED,
            failure_class="",
            place_capsule=capsule,
            input_lat=normalized.lat,
            input_lng=normalized.lng,
            input_radius_m=normalized.radius_m,
            input_timestamp=normalized.timestamp,
            input_photo_id=normalized.photo_id or "",
            pipeline_run_id=normalized.pipeline_run_id,
            winner_entity_id=winner.entity_id,
            winner_rank_score=winner.rank_score,
            confidence=confidence,
            generator_model=MODEL_NAME,
            prompt_version=PROMPT_VERSION,
        )
    return capsule


def _record_suppressed(
    normalized: NormalizedInput,
    failure_class: str,
    *,
    winner: WinningEntity | None = None,
    confidence: float | None = None,
) -> None:
    """Write a single suppressed GenerationAttempt row. Never raises."""
    try:
        GenerationAttempt.objects.create(
            status=GenerationAttempt.STATUS_SUPPRESSED,
            failure_class=failure_class,
            place_capsule=None,
            input_lat=normalized.lat,
            input_lng=normalized.lng,
            input_radius_m=normalized.radius_m,
            input_timestamp=normalized.timestamp,
            input_photo_id=normalized.photo_id or "",
            pipeline_run_id=normalized.pipeline_run_id,
            winner_entity_id=winner.entity_id if winner else "",
            winner_rank_score=winner.rank_score if winner else None,
            confidence=confidence,
            generator_model=MODEL_NAME,
            prompt_version=PROMPT_VERSION,
        )
    except Exception as exc:  # noqa: BLE001
        log.error("Failed to record suppressed attempt (%s): %s", failure_class, exc)


def _record_dedupe_hit(
    normalized: NormalizedInput,
    winner: WinningEntity,
    existing: PlaceCapsule,
) -> None:
    """Approved attempt pointing to the pre-existing capsule."""
    try:
        GenerationAttempt.objects.create(
            status=GenerationAttempt.STATUS_APPROVED,
            failure_class=_FC_DEDUPE_HIT,
            place_capsule=existing,
            input_lat=normalized.lat,
            input_lng=normalized.lng,
            input_radius_m=normalized.radius_m,
            input_timestamp=normalized.timestamp,
            input_photo_id=normalized.photo_id or "",
            pipeline_run_id=normalized.pipeline_run_id,
            winner_entity_id=winner.entity_id,
            winner_rank_score=winner.rank_score,
            confidence=existing.confidence,
            generator_model=MODEL_NAME,
            prompt_version=PROMPT_VERSION,
        )
    except Exception as exc:  # noqa: BLE001
        log.error("Failed to record dedupe-hit attempt: %s", exc)


def _record_pre_normalize_failure(
    raw_input: dict, failure_class: str
) -> None:
    """Best-effort audit row when NormalizedInput validation failed.
    Echoes whatever is parseable from the raw dict; uses neutral defaults
    for fields that are required by the schema."""
    try:
        lat = float(raw_input.get("lat") or 0.0)
    except (TypeError, ValueError):
        lat = 0.0
    try:
        lng = float(raw_input.get("lng") or 0.0)
    except (TypeError, ValueError):
        lng = 0.0
    try:
        radius_m = int(raw_input.get("radius_m") or 0)
    except (TypeError, ValueError):
        radius_m = 0
    ts_raw = raw_input.get("timestamp")
    if isinstance(ts_raw, datetime):
        ts = ts_raw
    else:
        ts = datetime.now(timezone.utc)
    run_id = str(raw_input.get("pipeline_run_id") or "unknown")
    photo_id = str(raw_input.get("photo_id") or "")

    try:
        GenerationAttempt.objects.create(
            status=GenerationAttempt.STATUS_SUPPRESSED,
            failure_class=failure_class,
            place_capsule=None,
            input_lat=lat,
            input_lng=lng,
            input_radius_m=radius_m,
            input_timestamp=ts,
            input_photo_id=photo_id,
            pipeline_run_id=run_id,
            winner_entity_id="",
            winner_rank_score=None,
            confidence=None,
            generator_model=MODEL_NAME,
            prompt_version=PROMPT_VERSION,
        )
    except Exception as exc:  # noqa: BLE001
        log.error("Failed to record pre-normalize failure: %s", exc)


# ---------------------------------------------------------------------------
# Stage 2.5 / 3.5 helper · landmark override injection
# ---------------------------------------------------------------------------
def _try_landmark_injection(
    candidates: list,
    query_lat: float,
    query_lng: float,
    wp_client: Any,
    trigger: str,
) -> set[str]:
    """Attempt to inject curated landmark candidates into the pool.

    Returns the set of QIDs that were actually injected during this
    call. Empty set when nothing was injected (no nearby landmarks,
    all already in pool, or build failure). Caller unions this set
    into a per-run `injected_qids` tracker · the membership of the
    final winner's QID in that set is the authoritative
    `via_landmark_override` signal.

    Triggered from two call sites in generate_place_capsule:
      - Stage 2.5 (SPARSE)         · pool < 2 after geosearch + fallback.
      - Stage 3.5 (LOW_RANK /
                   AMBIGUOUS_WINNER /
                   NO_CANDIDATES)  · winner could not be selected.

    Idempotent guard: caller checks if `injected_qids` is already
    non-empty before invoking the Stage 3.5 path · we never inject
    the same registry twice in one run.
    """
    nearby = find_nearby_landmarks(query_lat, query_lng)
    if not nearby:
        return set()
    existing_qids = {c.entity_id for c in candidates}
    lm_candidates = build_landmark_candidates(
        nearby,
        query_lat,
        query_lng,
        wp_client,
        exclude_qids=existing_qids,
    )
    if not lm_candidates:
        return set()
    pool_before = len(candidates)
    candidates.extend(lm_candidates)
    injected_set = {c.entity_id for c in lm_candidates}
    print(
        f"LANDMARK OVERRIDE DEBUG trigger={trigger} "
        f"pool_before={pool_before} injected={len(lm_candidates)} "
        f"pool_after={len(candidates)}"
    )
    return injected_set


# ---------------------------------------------------------------------------
# Stage 2 helper · GeoSearch failure with optional fail-open from cache
# ---------------------------------------------------------------------------
def _handle_geosearch_failure(
    *,
    normalized: NormalizedInput,
    entry: WikidataGeoCache | None,
    use_cache: bool,
    cache_k: str,
    gh6: str,
    rb: str,
    failure_reason: str,
    failure_class: str,
) -> list | None:
    """Centralised retrieval-failure handling for Stage 2.

    Triggered when `WikipediaClient.geosearch` returns success=False
    (HTTP, JSON, or pageprops batch failure).

    Always writes a negative cache row (5 min TTL) when the cache layer
    is active. Then, per the locked V0 spec + amendment #1:

        Fail-open only if `entry.status == "fresh"` AND `entry.candidates`.
        Negative cache rows (status=="negative") MUST NOT trigger fail-open
        even though their candidates list happens to be empty.

    Returns:
        list[WikidataCandidate]  · fail-open stale serve (pipeline continues)
        None                     · suppression already recorded (return None up)
    """
    if use_cache:
        cache_write_negative(cache_k, gh6, rb, failure_reason)
        log.info("Geocache write NEGATIVE: %s (reason=%r)", cache_k, failure_reason)

    if (
        use_cache
        and entry is not None
        and entry.status == WikidataGeoCache.STATUS_FRESH
        and entry.candidates
    ):
        stale = deserialize_candidates(entry.candidates)
        log.info(
            "Geocache FAIL-OPEN · serving stale: %s (%d candidates)",
            cache_k, len(stale),
        )
        return stale

    _record_suppressed(normalized, failure_class)
    return None


# ---------------------------------------------------------------------------
# Trust-boundary helpers
# ---------------------------------------------------------------------------
class _FullRef:
    """Minimal duck-typed evidence carrier for Stage 7 grounding only.

    SourceRef.snippet is capped at 300 chars by schema · for grounding we
    need the FULL Wikipedia summary text (which lives untruncated on
    evidence_set.wikipedia_summary). validate_sentence_grounding only
    reads `.snippet`, so a 2-line wrapper bypasses the schema cap without
    touching storage, response output, or compiled_refs.
    """

    __slots__ = ("snippet",)

    def __init__(self, snippet: str) -> None:
        self.snippet = snippet


def _verified_refs_for_grounding(
    draft_refs: tuple[SourceRef, ...],
    evidence_refs: tuple[SourceRef, ...],
) -> list[SourceRef]:
    """Substitute verified snippet/url/retrieved_at from compiled_refs
    while preserving the LLM's `supports_sentence_indices` mapping.

    For each draft ref whose source_id matches an evidence ref, emit a
    new SourceRef using the evidence ref's authoritative fields plus the
    draft ref's index and sentence-index mapping. Drops refs that do not
    match any evidence ref (validate_source_ids should have already
    caught this; defensive)."""
    evidence_by_id: dict[str, SourceRef] = {
        r.source_id: r for r in evidence_refs
    }
    verified: list[SourceRef] = []
    for d in draft_refs:
        ev = evidence_by_id.get(d.source_id)
        if ev is None:
            continue
        verified.append(
            SourceRef(
                index=d.index,
                source_type=ev.source_type,
                source_id=ev.source_id,
                url=ev.url,
                retrieved_at=ev.retrieved_at,
                snippet=normalize_snippet(ev.snippet),
                supports_sentence_indices=d.supports_sentence_indices,
            )
        )
    return verified


def _serialize_ref(ref: SourceRef) -> dict[str, Any]:
    return {
        "index": ref.index,
        "source_type": ref.source_type,
        "source_id": ref.source_id,
        "url": ref.url,
        "retrieved_at": ref.retrieved_at.isoformat(),
        "snippet": ref.snippet,
        "supports_sentence_indices": list(ref.supports_sentence_indices),
    }


def _wiki_title_attempts(winner: WinningEntity) -> list[tuple[str, str | None]]:
    """Order Wikipedia fetch attempts · Spanish first, English second."""
    return [
        ("es", winner.wikipedia_title_es),
        ("en", winner.wikipedia_title_en),
    ]
