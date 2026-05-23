"""KUDOS Echo Synthesis · LLM-backed cinematic narrative for a POI.

Public entry: ``synthesize_echo(entity_id, title, lat, lng, *, wikipedia_url)``.

Pipeline:
    1. Cache lookup (Django cache, 30-day TTL, key = `echo:{entity_id}`).
    2. Wikipedia REST fetch (ES preferred, EN fallback) for extract + image.
    3. Anthropic call (tool-use enforced JSON) for subtitle + micro_narrative
       + cultural_dna. Tone: cinematic, premium, evocador.
    4. Fallback (when ANTHROPIC_API_KEY missing OR LLM fails) derives a
       KUDOS-toned narrative from Wikipedia data + coord-based region DNA
       inference. Never raw encyclopedia dump.
    5. Cache write + structured log emit.

Source tags returned: "cache" | "llm" | "wikipedia_fallback" | "minimal_fallback".

Cost guards live in the calling view (rate-limit, char cap). This module
is pure: deterministic for same input modulo cache state.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any
from urllib.parse import quote

import httpx
from django.core.cache import cache

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_CACHE_TTL_S = 60 * 60 * 24 * 30  # 30 days
_WIKIPEDIA_TIMEOUT_S = 8.0
_LLM_TIMEOUT_S = 14.0
_LLM_MAX_TOKENS = 600
_LLM_MODEL = os.environ.get("KUDOS_ECHO_MODEL", "claude-haiku-4-5-20251001")
_USER_AGENT = "KUDOS-Echo/1.0 (https://kudos-40cq.onrender.com)"

# ---------------------------------------------------------------------------
# Region DNA · fallback when no LLM. Mirror del helper frontend.
# ---------------------------------------------------------------------------
_REGION_TABLE: list[tuple[tuple[float, float, float, float], str, list[str]]] = [
    # (lat_min, lat_max, lng_min, lng_max), name, dna
    ((41.8, 43.8, -9.4, -6.8), "Galicia",     ["Atlántico", "Mariscadores", "Granito", "Niebla", "Costa"]),
    ((41.0, 43.7, -3.5,  0.5), "Cantábrico",  ["Verde", "Costa", "Cordillera", "Niebla"]),
    ((36.0, 38.7, -7.5, -1.4), "Andalucía",   ["Mediterráneo", "Al-Ándalus", "Olivar", "Flamenco", "Sol"]),
    ((40.0, 41.6, -4.5, -2.5), "Castilla",    ["Meseta", "Trigo", "Catedrales", "Páramo"]),
    ((40.5, 42.9,  0.2,  3.5), "Catalunya",   ["Mediterráneo", "Pirineo", "Modernisme", "Costa Brava"]),
    ((41.5, 42.2, 12.2, 12.8), "Roma",        ["Imperio", "Mediterráneo", "Travertino", "Latín", "Eterna"]),
    ((36.5, 38.5, 22.0, 24.5), "Ática",       ["Egeo", "Mármol", "Mito", "Polis"]),
    ((29.5, 30.5, 30.5, 32.0), "Egipto",      ["Nilo", "Desierto", "Piedra", "Dinastía"]),
]


def _region_dna(lat: float, lng: float) -> tuple[str, list[str]]:
    for (lat_min, lat_max, lng_min, lng_max), name, dna in _REGION_TABLE:
        if lat_min <= lat <= lat_max and lng_min <= lng <= lng_max:
            return name, dna
    return "Paisaje", ["Memoria", "Tierra", "Tiempo"]


# ---------------------------------------------------------------------------
# Wikipedia REST · same endpoint el frontend usaba, ahora server-side.
# ---------------------------------------------------------------------------
def _fetch_wikipedia(title: str) -> dict[str, Any]:
    """Try ES → EN. Returns {extract, image_url, description, page_url, lang}
    or empty dict on total miss."""
    for lang in ("es", "en"):
        url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/" + quote(title, safe="")
        try:
            with httpx.Client(timeout=_WIKIPEDIA_TIMEOUT_S) as client:
                r = client.get(url, headers={"User-Agent": _USER_AGENT, "Accept": "application/json"})
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            log.info("Wikipedia fetch error [%s] %r: %s", lang, title, exc)
            continue
        if r.status_code != 200:
            continue
        try:
            j = r.json()
        except ValueError:
            continue
        extract = (j.get("extract") or "").strip()
        if len(extract) < 30:
            continue
        thumb = ((j.get("thumbnail") or {}).get("source")) if isinstance(j.get("thumbnail"), dict) else None
        orig = ((j.get("originalimage") or {}).get("source")) if isinstance(j.get("originalimage"), dict) else None
        return {
            "extract": extract,
            "image_url": thumb or orig or "",
            "description": (j.get("description") or "").strip(),
            "page_url": ((j.get("content_urls") or {}).get("desktop") or {}).get("page", ""),
            "lang": lang,
        }
    return {}


# ---------------------------------------------------------------------------
# LLM synthesis · Anthropic tool-use enforced JSON.
# ---------------------------------------------------------------------------
_ECHO_TOOL = {
    "name": "emit_echo",
    "description": "Emit a KUDOS cinematic Echo for a place. JSON only.",
    "input_schema": {
        "type": "object",
        "properties": {
            "subtitle": {
                "type": "string",
                "minLength": 30,
                "maxLength": 110,
                "description": "Una sola frase poética en español, evocadora, 40-100 chars. No descripción técnica.",
            },
            "micro_narrative": {
                "type": "string",
                "minLength": 80,
                "maxLength": 240,
                "description": "2-3 frases en español, tono cinematográfico, 80-220 chars. Sin enciclopedia, sin referencias a Wikipedia.",
            },
            "cultural_dna": {
                "type": "array",
                "items": {"type": "string", "minLength": 2, "maxLength": 24},
                "minItems": 3,
                "maxItems": 6,
                "description": "4-6 palabras únicas que destilan el ADN cultural del lugar (regiones, materiales, fenómenos, oficios).",
            },
        },
        "required": ["subtitle", "micro_narrative", "cultural_dna"],
    },
}

_SYSTEM_PROMPT = (
    "Eres KUDOS, motor narrativo de lugar. "
    "Recibes datos enciclopédicos de un sitio y emites SU ECO: "
    "una pieza cinematográfica breve en español que evoca su espíritu. "
    "Tono: contemplativo, denso, premium · como Borges narrando un mapa. "
    "Nada de 'Wikipedia dice', referencias bibliográficas, dates secas o "
    "fórmulas enciclopédicas. Solo el latido del lugar. "
    "Devuelves SOLO el JSON via tool_use. Nada más."
)


def _build_user_prompt(title: str, lat: float, lng: float, wiki: dict[str, Any]) -> str:
    parts = [
        f"Lugar: {title}",
        f"Coordenadas: {lat:.4f}, {lng:.4f}",
    ]
    if wiki.get("description"):
        parts.append(f"Etiqueta: {wiki['description']}")
    extract = wiki.get("extract") or ""
    if extract:
        # Truncate to keep token budget reasonable
        parts.append(f"Contexto enciclopédico (no copiar literal): {extract[:800]}")
    parts.append("\nSintetiza el Echo del lugar.")
    return "\n".join(parts)


def _call_anthropic(title: str, lat: float, lng: float, wiki: dict[str, Any]) -> dict[str, Any] | None:
    """Returns parsed tool_use input dict, or None if API key missing / call fails.
    Never raises into caller — fallback is the caller's responsibility."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        log.info("ECHO LLM_SKIP · no ANTHROPIC_API_KEY")
        return None
    try:
        import anthropic  # type: ignore
    except ImportError:
        log.warning("ECHO LLM_SKIP · anthropic SDK not installed")
        return None

    try:
        client = anthropic.Anthropic(api_key=api_key, timeout=_LLM_TIMEOUT_S)
        response = client.messages.create(
            model=_LLM_MODEL,
            max_tokens=_LLM_MAX_TOKENS,
            system=_SYSTEM_PROMPT,
            tools=[_ECHO_TOOL],
            tool_choice={"type": "tool", "name": "emit_echo"},
            messages=[{"role": "user", "content": _build_user_prompt(title, lat, lng, wiki)}],
        )
    except Exception as exc:  # broad · all Anthropic errors mapped to fallback
        log.warning("ECHO LLM_FAIL · %s: %s", type(exc).__name__, exc)
        return None

    for block in response.content or []:
        if getattr(block, "type", None) == "tool_use" and getattr(block, "name", None) == "emit_echo":
            raw = getattr(block, "input", None)
            if isinstance(raw, dict):
                return raw
            if isinstance(raw, str):
                try:
                    decoded = json.loads(raw)
                    if isinstance(decoded, dict):
                        return decoded
                except json.JSONDecodeError:
                    pass
    log.warning("ECHO LLM_FAIL · no tool_use block in response")
    return None


# ---------------------------------------------------------------------------
# Fallback synthesis · KUDOS tone derivado de Wikipedia + region table.
# ---------------------------------------------------------------------------
_POETIC_FALLBACKS_SUBTITLE = [
    "Un eco que el lugar nunca llegó a callar.",
    "Donde el tiempo dobla la esquina y mira atrás.",
    "Lo que el lugar recuerda cuando nadie lo escucha.",
    "Aquí algo respira más despacio que el presente.",
    "El paisaje guarda nombres que no pronuncia.",
    "Una memoria que sigue caminando entre estos pasos.",
]


def _hash_pick(seed: str, options: list[str]) -> str:
    h = 7
    for c in seed:
        h = (h * 31 + ord(c)) & 0xFFFFFFFF
    return options[h % len(options)]


def _trim_to_sentence(text: str, max_len: int) -> str:
    text = text.strip()
    if len(text) <= max_len:
        return text
    # Try sentence boundary backwards from max_len
    window = text[:max_len]
    last_stop = max(window.rfind(". "), window.rfind("! "), window.rfind("? "))
    if last_stop > 80:
        return text[:last_stop + 1].strip()
    return window.rstrip() + " …"


def _fallback_synth(
    title: str,
    lat: float,
    lng: float,
    wiki: dict[str, Any],
) -> dict[str, Any]:
    region_name, region_dna = _region_dna(lat, lng)

    # Subtitle · si description de Wikipedia es corta y poética la usamos,
    # else fallback rotado deterministicamente.
    desc = (wiki.get("description") or "").strip()
    if 20 <= len(desc) <= 90 and "wikipedia" not in desc.lower():
        subtitle = desc[0].upper() + desc[1:] if desc else ""
    else:
        subtitle = _hash_pick(title, _POETIC_FALLBACKS_SUBTITLE)

    # Micro narrative · primer sentence/párrafo del extract, trimmed.
    extract = (wiki.get("extract") or "").strip()
    if extract:
        narrative = _trim_to_sentence(extract, 220)
    else:
        narrative = (
            f"En {region_name}, este lugar continúa siendo un latido del paisaje. "
            "Su nombre dice menos que su silencio."
        )

    # Cultural DNA · region table + title-derived hint si aparece.
    dna = [region_name] + region_dna[:5]
    dna = list(dict.fromkeys(dna))[:6]

    return {
        "subtitle": subtitle,
        "micro_narrative": narrative,
        "cultural_dna": dna,
    }


# ---------------------------------------------------------------------------
# Public entry · synthesize_echo
# ---------------------------------------------------------------------------
def synthesize_echo(
    entity_id: str,
    title: str,
    lat: float,
    lng: float,
    *,
    wikipedia_url_es: str = "",
    wikipedia_url_en: str = "",
    wikidata_url: str = "",
    bypass_cache: bool = False,
) -> dict[str, Any]:
    """Return a synthesized KUDOS Echo dict for the POI.

    Response shape:
        {
          "title": str, "subtitle": str, "micro_narrative": str,
          "cultural_dna": [str, ...], "hero_image": str | "",
          "wikipedia_url": str, "source": "cache" | "llm" | "wikipedia_fallback" | "minimal_fallback",
        }
    """
    cache_key = f"echo:v1:{entity_id}" if entity_id else f"echo:v1:title:{title}"
    if not bypass_cache:
        hit = cache.get(cache_key)
        if isinstance(hit, dict):
            log.info("ECHO CACHE_HIT %s", cache_key)
            return {**hit, "source": "cache"}

    log.info("ECHO CACHE_MISS %s", cache_key)

    # Wikipedia · used by BOTH LLM (as context) and fallback (as substrate).
    wiki = _fetch_wikipedia(title)

    # LLM path
    llm_out = _call_anthropic(title, lat, lng, wiki)
    if llm_out is not None:
        result = {
            "title": title,
            "subtitle": (llm_out.get("subtitle") or "").strip(),
            "micro_narrative": (llm_out.get("micro_narrative") or "").strip(),
            "cultural_dna": [
                str(x).strip() for x in (llm_out.get("cultural_dna") or []) if str(x).strip()
            ][:6],
            "hero_image": wiki.get("image_url", ""),
            "wikipedia_url": wiki.get("page_url") or wikipedia_url_es or wikipedia_url_en or "",
            "wikidata_url": wikidata_url,
            "source": "llm",
        }
        cache.set(cache_key, result, _CACHE_TTL_S)
        log.info("ECHO LLM_OK %s", cache_key)
        return result

    # Fallback path
    fb = _fallback_synth(title, lat, lng, wiki)
    has_wiki = bool(wiki.get("extract"))
    result = {
        "title": title,
        "subtitle": fb["subtitle"],
        "micro_narrative": fb["micro_narrative"],
        "cultural_dna": fb["cultural_dna"],
        "hero_image": wiki.get("image_url", ""),
        "wikipedia_url": wiki.get("page_url") or wikipedia_url_es or wikipedia_url_en or "",
        "wikidata_url": wikidata_url,
        "source": "wikipedia_fallback" if has_wiki else "minimal_fallback",
    }
    # Cache fallback too · shorter TTL so we retry LLM eventually
    cache.set(cache_key, result, 60 * 60 * 6)  # 6h
    log.info("ECHO FALLBACK %s (has_wiki=%s)", cache_key, has_wiki)
    return result
