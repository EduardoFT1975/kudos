"""
KUDOS Content Engine · LLM drafter client (Anthropic Claude Haiku 4.5).

Generates a place-capsule draft from a verified EvidenceSet using the
Anthropic Messages API with `tool_use` mode. The model is FORCED to emit
its draft as arguments to the `emit_place_capsule` tool — there is NO
text-mode fallback. If the model returns a text block instead of a tool
call (or returns malformed tool arguments), we raise LLMJSONFailError.

Public surface:
    class LLMDrafter
        def __init__(api_key: str | None = None, model: str | None = None,
                     timeout_s: float | None = None, max_retries: int = 1)
        def draft_place(evidence_set: EvidenceSet) -> LLMDraft

Exceptions:
    LLMTimeoutError    — request timed out
    LLMTransientError  — rate limit / connection / 5xx server error
    LLMJSONFailError   — non-retryable: 4xx, malformed tool args,
                         text-mode reply, or Pydantic validation fail
"""
from __future__ import annotations

import json
import logging
from typing import Any

import anthropic
from anthropic import (
    Anthropic,
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    RateLimitError,
)
from pydantic import ValidationError

from content_engine.constants import (
    LLM_LANGUAGE,
    LLM_TIMEOUT_S,
    MODEL_NAME,
    PROMPT_VERSION,
)
from content_engine.schemas import EvidenceSet, LLMDraft, normalize_snippet

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------
class LLMError(Exception):
    """Base class for LLM drafter failures."""


class LLMTimeoutError(LLMError):
    """Request timed out (anthropic.APITimeoutError)."""


class LLMTransientError(LLMError):
    """Retryable: rate limit, connection error, or 5xx server error."""


class LLMJSONFailError(LLMError):
    """Non-retryable: 4xx, missing/malformed tool_use, or invalid draft shape."""


# ---------------------------------------------------------------------------
# Tool definition · JSON Schema mirroring LLMDraft
# ---------------------------------------------------------------------------
_SOURCE_REF_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "index",
        "source_type",
        "source_id",
        "url",
        "retrieved_at",
        "snippet",
        "supports_sentence_indices",
    ],
    "properties": {
        "index": {"type": "integer", "minimum": 0},
        "source_type": {"type": "string", "enum": ["wikidata", "wikipedia"]},
        "source_id": {"type": "string", "minLength": 1},
        "url": {"type": "string", "pattern": "^https://"},
        "retrieved_at": {"type": "string"},
        "snippet": {"type": "string", "maxLength": 300},
        "supports_sentence_indices": {
            "type": "array",
            "items": {"type": "integer", "minimum": 0},
        },
    },
}

_EMIT_PLACE_CAPSULE_TOOL: dict[str, Any] = {
    "name": "emit_place_capsule",
    "description": (
        "Emit the final place-capsule draft. You MUST call this tool exactly "
        "once with the full draft. Do not reply with free text."
    ),
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["title", "factual_anchor", "context_block", "source_refs"],
        "properties": {
            "title": {"type": "string", "minLength": 1, "maxLength": 200},
            "factual_anchor": {
                "type": "string",
                "minLength": 20,
                "maxLength": 200,
            },
            "context_block": {
                "type": "string",
                "minLength": 60,
                "maxLength": 500,
            },
            "source_refs": {
                "type": "array",
                "minItems": 1,
                "items": _SOURCE_REF_SCHEMA,
            },
        },
    },
}


# ---------------------------------------------------------------------------
# Prompt blocks
# ---------------------------------------------------------------------------
_CONTRACT_BLOCK = """\
CONTRATO ESTRICTO (place capsule):
- Idioma de salida: {language}.
- title: nombre canónico del lugar (1-200 chars).
- factual_anchor: UNA frase fáctica derivable de las fuentes (20-200 chars).
- context_block: 2-3 frases que sitúen el lugar (60-500 chars).
- PROHIBIDO: pronombres en 1a/2a persona (yo, tú, nosotros, I, you, we...),
  emociones ("sentirás", "te emocionará"), juicios identitarios ("eres",
  "te conviertes"), relaciones inventadas ("tu abuelo", "tu familia"),
  especulación ("podría haber", "quizás", "tal vez", "imagina").
- Cada source_refs[i].index DEBE coincidir con su posición en el array.
- source_id DEBE pertenecer al EvidenceSet provisto. NO inventes URLs.
- supports_sentence_indices apunta a oraciones (0-indexed) de
  factual_anchor + context_block concatenados.
- Devuelve la respuesta ÚNICAMENTE invocando la tool `emit_place_capsule`.
  No escribas texto libre.

------------------------------------------------
GROUNDING RULES (STRICT)
1. NUNCA añadas hechos explicativos que no aparezcan literalmente en los
   snippets de evidencia.
2. NUNCA expandas nombres, títulos, mitología, identidades, roles o
   explicaciones históricas a menos que el texto exacto aparezca en la
   evidencia.
3. Si la evidencia dice:
       "Helios"
   Puedes escribir:
       "Helios"
   NO puedes escribir:
       "Helios, el dios Sol"
4. Prefiere la omisión antes que la expansión.
5. Operaciones permitidas:
   - compresión
   - reordenación
   - paráfrasis con el mismo contenido factual
   Operaciones prohibidas:
   - añadir cláusulas explicativas factuales
   - añadir aposiciones
   - enriquecer descripciones de entidades
   - completar con conocimiento del mundo
6. El draft debe permanecer ENTERAMENTE acotado a la evidencia.
------------------------------------------------
"""

_PLACE_PROMPT_TEMPLATE = """\
Vas a redactar una micro-cápsula sobre un lugar real.

ENTITY:
- label: {label}
- entity_id: {entity_id}
- distance_m: {distance_m}

WIKIPEDIA SUMMARY ({wiki_lang}):
\"\"\"{wiki_summary}\"\"\"

EVIDENCE REFS (los únicos source_id válidos):
{refs_block}

Genera el draft invocando la tool `emit_place_capsule`."""

_STRICTER_SUFFIX = """\

ATENCIÓN — segundo intento. El primer intento falló validación.
- NO uses pronombres personales ni emociones.
- NO inventes nada que no esté en el EvidenceSet.
- Verifica que cada source_refs[i].index == i.
- Verifica que cada source_id aparezca en EVIDENCE REFS arriba.
- Devuelve la respuesta exclusivamente como tool_use de
  `emit_place_capsule`, sin texto adicional.
"""


def _format_refs_block(evidence_set: EvidenceSet) -> str:
    lines: list[str] = []
    for ref in evidence_set.compiled_refs:
        lines.append(
            f"  [{ref.index}] source_id={ref.source_id} "
            f"type={ref.source_type} url={ref.url}"
        )
    return "\n".join(lines) if lines else "  (none)"


def _build_prompt(evidence_set: EvidenceSet, *, stricter: bool) -> str:
    winner = evidence_set.winning_entity
    wiki_summary = (evidence_set.wikipedia_summary or "").strip()
    wiki_lang = "es" if winner.wikipedia_title_es else "en"
    base = _PLACE_PROMPT_TEMPLATE.format(
        label=winner.label,
        entity_id=winner.entity_id,
        distance_m=int(round(winner.distance_m)),
        wiki_lang=wiki_lang,
        wiki_summary=wiki_summary or "(sin extracto disponible)",
        refs_block=_format_refs_block(evidence_set),
    )
    if stricter:
        return base + _STRICTER_SUFFIX
    return base


def _build_system(*, stricter: bool) -> str:
    contract = _CONTRACT_BLOCK.format(language=LLM_LANGUAGE)
    header = (
        f"Eres el redactor de cápsulas de KUDOS. Prompt version: "
        f"{PROMPT_VERSION}. Modelo: {MODEL_NAME}.\n\n"
    )
    return header + contract


def _normalize_payload_snippets(payload: dict[str, Any]) -> None:
    """Mutate payload in place · normalize source_refs[i].snippet to
    fit SourceRef.snippet max_length=300. Defensive against LLM
    fabricated snippets that exceed the documented cap."""
    refs = payload.get("source_refs")
    if not isinstance(refs, list):
        return
    for ref in refs:
        if not isinstance(ref, dict):
            continue
        raw = ref.get("snippet")
        if isinstance(raw, str):
            ref["snippet"] = normalize_snippet(raw)


# ---------------------------------------------------------------------------
# LLMDrafter
# ---------------------------------------------------------------------------
class LLMDrafter:
    """Anthropic-backed drafter. Tool-mode only · no text fallback."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout_s: float | None = None,
        max_retries: int = 1,
    ) -> None:
        self._model = model or MODEL_NAME
        self._timeout_s = float(timeout_s) if timeout_s is not None else float(LLM_TIMEOUT_S)
        self._max_retries = max(0, int(max_retries))
        self._client = Anthropic(api_key=api_key, timeout=self._timeout_s)

    # ------------------------------------------------------------------ API
    def draft_place(self, evidence_set: EvidenceSet) -> LLMDraft:
        """Generate a place-capsule draft. Raises LLM*Error on failure."""
        last_validation_error: ValidationError | None = None
        last_fail: LLMJSONFailError | None = None

        for attempt in range(self._max_retries + 1):
            stricter = attempt > 0
            system_prompt = _build_system(stricter=stricter)
            user_prompt = _build_prompt(evidence_set, stricter=stricter)

            try:
                payload = self._call_llm(system_prompt, user_prompt)
            except (LLMTimeoutError, LLMTransientError):
                # Transient + timeout do not consume a "stricter" retry slot
                # by design: same prompt would be sent. We propagate up so the
                # pipeline can decide. Only LLMJSONFailError triggers the
                # stricter retry loop here.
                raise

            # Pre-validation snippet normalization · the LLM is told the
            # 300-char cap on source_refs[i].snippet in the tool schema
            # but does not enforce it. Pydantic SourceRef construction
            # would otherwise fail, surfacing as tuple validation on
            # LLMDraft.source_refs. Truncate at the boundary so the
            # schema stays strict without burning a stricter-retry slot
            # on a near-miss the model can't fix anyway.
            _normalize_payload_snippets(payload)

            try:
                draft = LLMDraft.model_validate(payload)
            except ValidationError as exc:
                last_validation_error = exc
                last_fail = LLMJSONFailError(
                    f"LLMDraft validation failed on attempt {attempt + 1}: {exc}"
                )
                log.warning(
                    "LLMDrafter validation failed (attempt %d/%d): %s",
                    attempt + 1,
                    self._max_retries + 1,
                    exc,
                )
                continue

            return draft

        assert last_fail is not None
        raise last_fail from last_validation_error

    # -------------------------------------------------------------- internal
    def _call_llm(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        """One round-trip. Returns raw tool input dict. Tool-use ONLY."""
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=1024,
                system=system_prompt,
                tools=[_EMIT_PLACE_CAPSULE_TOOL],
                tool_choice={"type": "tool", "name": "emit_place_capsule"},
                messages=[{"role": "user", "content": user_prompt}],
            )
        except APITimeoutError as exc:
            raise LLMTimeoutError(f"Anthropic request timed out: {exc}") from exc
        except RateLimitError as exc:
            raise LLMTransientError(f"Anthropic rate limit: {exc}") from exc
        except APIConnectionError as exc:
            raise LLMTransientError(f"Anthropic connection error: {exc}") from exc
        except APIStatusError as exc:
            status = getattr(exc, "status_code", None)
            if status is not None and 500 <= int(status) < 600:
                raise LLMTransientError(
                    f"Anthropic server error {status}: {exc}"
                ) from exc
            raise LLMJSONFailError(
                f"Anthropic non-retryable status {status}: {exc}"
            ) from exc
        except anthropic.AnthropicError as exc:
            raise LLMJSONFailError(f"Anthropic SDK error: {exc}") from exc

        for block in response.content or []:
            if getattr(block, "type", None) == "tool_use":
                if getattr(block, "name", None) != "emit_place_capsule":
                    raise LLMJSONFailError(
                        f"Unexpected tool_use name: {getattr(block, 'name', None)!r}"
                    )
                raw_input = getattr(block, "input", None)
                if isinstance(raw_input, dict):
                    return raw_input
                if isinstance(raw_input, str):
                    try:
                        decoded = json.loads(raw_input)
                    except json.JSONDecodeError as exc:
                        raise LLMJSONFailError(
                            f"tool_use input was a string but not valid JSON: {exc}"
                        ) from exc
                    if not isinstance(decoded, dict):
                        raise LLMJSONFailError(
                            "tool_use input decoded to non-object JSON"
                        )
                    return decoded
                raise LLMJSONFailError(
                    f"tool_use input had unexpected type: {type(raw_input).__name__}"
                )

        # No tool_use block · the model replied with text (or empty). This is
        # the unsafe-fallback hole we explicitly close: never trust free text.
        stop_reason = getattr(response, "stop_reason", None)
        raise LLMJSONFailError(
            f"Anthropic response contained no tool_use block "
            f"(stop_reason={stop_reason!r})"
        )
