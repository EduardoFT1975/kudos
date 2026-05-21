"""
KUDOS Content Engine · V0 truth gate.

Deterministic, regex-only validation that an LLMDraft is safe to store.
No semantic models, no LLM-judge. Three gates:

    validate_forbidden_content(text) -> bool
        False if `text` contains any forbidden pattern: 1st/2nd person
        pronouns, emotional projections, identity claims, fabricated
        relationships, or speculation.

    validate_source_ids(draft, evidence_refs) -> bool
        False if any source_id echoed by the LLM is not in the verified
        compiled_refs source_ids.

    validate_sentence_grounding(text, evidence_refs) -> bool
        False if any sentence in `text` lacks ≥3 content-token overlap
        (length ≥ 4, stopwords removed) with the union of verified ref
        snippets. Lower bound for keyword grounding — V0 substitute for
        a true entailment check.

Also exports split_sentences(text) — used by the confidence module to
count evidence density.
"""
from __future__ import annotations

import re
from collections.abc import Iterable

from content_engine.schemas import LLMDraft, SourceRef


# ---------------------------------------------------------------------------
# Forbidden-content regexes (case-insensitive, unicode)
# ---------------------------------------------------------------------------
PRONOUN_RX = re.compile(
    r"\b("
    # Spanish 1st/2nd person
    r"yo|m[ií]|me|conmigo|t[uú]|ti|contigo|usted|vos|"
    r"nosotros|nosotras|nos|vosotros|vosotras|ustedes|"
    # Possessives
    r"mi|mis|m[ií]o|m[ií]a|m[ií]os|m[ií]as|"
    r"tu|tus|tuyo|tuya|tuyos|tuyas|"
    r"nuestro|nuestra|nuestros|nuestras|"
    r"vuestro|vuestra|vuestros|vuestras|"
    # English · standalone "i" removed: collides with Roman numeral "I"
    # in legitimate historical text (e.g. "siglo I", "Felipe II").
    r"me|my|mine|myself|"
    r"you|your|yours|yourself|yourselves|"
    r"we|us|our|ours|ourselves"
    r")\b",
    re.IGNORECASE | re.UNICODE,
)

EMOTION_RX = re.compile(
    r"\b("
    r"sentir[aá]s|sentir[ií]as|sentir[ée]|sentir[ií]a|"
    r"emocionar[aá]|emocionar[ií]a|emocionar[aá]s|"
    r"conmover[aá]|conmover[ií]a|"
    r"vibrar[aá]s|vibrar[ií]as|"
    r"feel|will\s+feel|would\s+feel|"
    r"move\s+you|moves\s+you|moved\s+you|"
    r"thrill|thrilled|thrilling"
    r")\b",
    re.IGNORECASE | re.UNICODE,
)

IDENTITY_RX = re.compile(
    r"\b("
    r"eres|sois|ser[aá]s|ser[ií]as|te\s+conviertes|te\s+vuelves|"
    r"you\s+are|you\s+become|you\s+will\s+be|you\s+would\s+be"
    r")\b",
    re.IGNORECASE | re.UNICODE,
)

RELATION_RX = re.compile(
    r"\b("
    r"tu\s+(abuelo|abuela|padre|madre|hermano|hermana|hijo|hija|familia|amigo|amiga|pareja)|"
    r"your\s+(grandfather|grandmother|father|mother|brother|sister|son|daughter|family|friend|partner)"
    r")\b",
    re.IGNORECASE | re.UNICODE,
)

SPECULATION_RX = re.compile(
    r"\b("
    r"podr[ií]a\s+haber|podr[ií]an\s+haber|quiz[aá]s?|tal\s+vez|"
    r"imagina|imagin[ae](?:te)?|tal\s+vez|acaso|"
    r"perhaps|maybe|might\s+have|could\s+have|"
    r"imagine|picture\s+this"
    r")\b",
    re.IGNORECASE | re.UNICODE,
)

_FORBIDDEN_PATTERNS: tuple[re.Pattern[str], ...] = (
    PRONOUN_RX,
    EMOTION_RX,
    IDENTITY_RX,
    RELATION_RX,
    SPECULATION_RX,
)


# ---------------------------------------------------------------------------
# Stopwords (ES + EN)
# ---------------------------------------------------------------------------
_STOPWORDS_ES: frozenset[str] = frozenset(
    {
        "el", "la", "los", "las", "un", "una", "unos", "unas",
        "de", "del", "al", "a", "en", "y", "o", "u", "e",
        "que", "como", "para", "por", "con", "sin", "sobre",
        "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas",
        "aquel", "aquella", "aquellos", "aquellas",
        "es", "son", "ser", "fue", "fueron", "era", "eran", "sido",
        "ha", "han", "hay", "haber", "hubo",
        "mas", "más", "muy", "tan", "ya", "no", "si", "sí",
        "le", "les", "lo", "se", "su", "sus",
        "donde", "cuando", "porque", "pero", "aunque",
        "entre", "hasta", "desde", "tras", "ante",
        "primero", "segundo", "tercero",
    }
)

_STOPWORDS_EN: frozenset[str] = frozenset(
    {
        "the", "and", "for", "with", "from", "into", "onto", "upon",
        "this", "that", "these", "those", "such", "than",
        "have", "has", "had", "having", "been", "being",
        "are", "was", "were", "will", "would", "could", "should", "might",
        "while", "where", "when", "which", "what", "whom", "whose",
        "about", "above", "below", "after", "before", "between",
        "during", "through", "across", "without", "within",
        "also", "very", "just", "only", "more", "most", "less", "least",
        "first", "second", "third",
    }
)

_STOPWORDS: frozenset[str] = _STOPWORDS_ES | _STOPWORDS_EN


# ---------------------------------------------------------------------------
# Public utilities
# ---------------------------------------------------------------------------
_SENTENCE_SPLIT_RX = re.compile(r"(?<=[.!?])\s+(?=\S)")
_TOKEN_RX = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿñÑ0-9]+", re.UNICODE)


def split_sentences(text: str) -> list[str]:
    """Naive sentence splitter on .!? followed by whitespace + non-space."""
    if not text:
        return []
    raw = _SENTENCE_SPLIT_RX.split(text.strip())
    return [s.strip() for s in raw if s.strip()]


def _content_tokens(text: str) -> set[str]:
    """Lowercase tokens length ≥ 4, stopwords removed."""
    tokens = _TOKEN_RX.findall(text.lower())
    return {t for t in tokens if len(t) >= 4 and t not in _STOPWORDS}


# ---------------------------------------------------------------------------
# Gate 1 · forbidden content
# ---------------------------------------------------------------------------
def validate_forbidden_content(text: str) -> bool:
    """Return True if `text` is free of all forbidden patterns."""
    if not text:
        return True
    for pat in _FORBIDDEN_PATTERNS:
        if pat.search(text):
            return False
    return True


# ---------------------------------------------------------------------------
# Gate 2 · source_id whitelist
# ---------------------------------------------------------------------------
def validate_source_ids(
    draft: LLMDraft, evidence_refs: Iterable[SourceRef]
) -> bool:
    """Return True iff every draft source_id is in evidence compiled_refs."""
    allowed = {ref.source_id for ref in evidence_refs}
    if not allowed:
        return False
    for ref in draft.source_refs:
        if ref.source_id not in allowed:
            return False
    return True


# ---------------------------------------------------------------------------
# Gate 3 · sentence-level grounding
# ---------------------------------------------------------------------------
_GROUNDING_MIN_OVERLAP: int = 3


def validate_sentence_grounding(
    text: str, evidence_refs: Iterable[SourceRef]
) -> tuple[bool, list[int]]:
    """Return (passed, unsupported_indices).

    passed              · True iff every sentence shares >= required_overlap
                          content tokens (len>=4, stopwords removed) with the
                          union of verified ref snippets. required_overlap is
                          2 for sentences with <=6 content tokens, else 3.
    unsupported_indices · 0-based indices (in split_sentences order) of every
                          sentence that failed the overlap check. Empty when
                          passed is True. May be all indices when there is no
                          evidence corpus at all.
    """
    sentences = split_sentences(text)
    if not sentences:
        return (False, [])

    evidence_corpus: set[str] = set()
    for ref in evidence_refs:
        evidence_corpus |= _content_tokens(ref.snippet)

    if not evidence_corpus:
        return (False, list(range(len(sentences))))

    unsupported: list[int] = []
    for idx, sentence in enumerate(sentences):
        sent_tokens = _content_tokens(sentence)
        if not sent_tokens:
            unsupported.append(idx)
            continue
        # Phase 12 · graduated grounding threshold.
        # Very short sentences (e.g. "Está en Madrid") can only realistically
        # hit 1-2 content tokens after stopword stripping. Three-band logic
        # gives them an honest pass while keeping longer prose strict.
        #   <=4 content tokens · require 1 (was 2 · false-negative rate too high)
        #   5..8 content tokens · require 2 (was 6 boundary → 2)
        #   >8 content tokens · require 3 (unchanged)
        content_token_count = len(sent_tokens)
        if content_token_count <= 4:
            required_overlap = 1
        elif content_token_count <= 8:
            required_overlap = 2
        else:
            required_overlap = 3
        overlap = sent_tokens & evidence_corpus
        if len(overlap) < required_overlap:
            unsupported.append(idx)

    return (not unsupported, unsupported)
