"""
KUDOS Engine — Clasificación de POIs en tiers (S / A / B / C).

Capa de aplicación sobre `score.py`. Acepta un dict de POI tal como viene
del CSV de kudos_app/data/lugares.csv o del store de la experiencia y
devuelve tier + recipe + razonamiento humano.

Ejemplo:
    >>> from kudos_engine.tier import classify_poi
    >>> classify_poi({
    ...     "name": "Coliseo de Roma",
    ...     "unesco": True,
    ...     "annual_visitors": 7_600_000,
    ...     "wikipedia_languages": 130,
    ...     "anthropic_confidence": 0.95,
    ... })
    {'tier': 'S', 'score': 100, 'recipe': {...}, 'rationale': '...'}
"""

from __future__ import annotations

from typing import Any

from .score import PoiSignals, Tier, compute_score, tier_recipe, to_tier


# Override manual: lista de POIs que SIEMPRE son Tier S (iconos del planeta).
# Si añades aquí un POI, no necesita señales: cápsula 45" automática.
WORLD_ICONS = {
    "Coliseo de Roma",
    "Machu Picchu",
    "Taj Mahal",
    "Pirámides de Giza",
    "Gran Muralla China",
    "Petra",
    "Cristo Redentor",
    "Chichén Itzá",
    "Acrópolis de Atenas",
    "Stonehenge",
    "Angkor Wat",
    "Sagrada Familia",
    "Alhambra",
    "Torre Eiffel",
    "Estatua de la Libertad",
    "Catedral de Notre-Dame",
    "Empire State Building",
    "Cataratas del Niágara",
    "Gran Cañón",
    "Mont Saint-Michel",
    "Castillo de Neuschwanstein",
    "Plaza Roja",
    "Ópera de Sídney",
    "Burj Khalifa",
    "Capilla Sixtina",
    "Catedral de Santiago de Compostela",
    "Mezquita-Catedral de Córdoba",
    "El Escorial",
    "Catedral de Sevilla",
    "Catedral de Burgos",
}


def _normalize_signals(poi: dict[str, Any]) -> PoiSignals:
    """Convierte un dict POI a `PoiSignals` con valores por defecto sensatos."""

    name = (poi.get("name") or "").strip()

    return PoiSignals(
        unesco=bool(poi.get("unesco") or poi.get("is_unesco") or poi.get("patrimonio")),
        annual_visitors=int(poi.get("annual_visitors") or poi.get("visitantes_anuales") or 0),
        wikipedia_languages=int(poi.get("wikipedia_languages") or poi.get("wiki_idiomas") or 0),
        anthropic_confidence=float(poi.get("anthropic_confidence") or poi.get("ai_confidence") or 0.0),
        is_world_icon=name in WORLD_ICONS or bool(poi.get("is_world_icon")),
        is_basic_poi=bool(poi.get("is_basic_poi")),
    )


def classify_poi(poi: dict[str, Any]) -> dict[str, Any]:
    """
    Clasifica un POI.

    Devuelve un dict con:
      - tier: 'S' | 'A' | 'B' | 'C'
      - score: 0-100
      - recipe: dict con qué generar (ver score.tier_recipe)
      - rationale: explicación humana en español de por qué ese tier
    """

    signals = _normalize_signals(poi)
    score = compute_score(signals)
    tier: Tier = to_tier(score)
    recipe = tier_recipe(tier)

    # Construir explicación humana
    parts = []
    if signals.is_world_icon:
        parts.append("Reconocido como icono del planeta")
    if signals.unesco:
        parts.append("Patrimonio UNESCO (+40)")
    if signals.annual_visitors:
        visitor_pts = min(30, int(signals.annual_visitors / 33_333))
        parts.append(f"{signals.annual_visitors:,} visitantes/año (+{visitor_pts})")
    if signals.wikipedia_languages:
        wiki_pts = min(20, signals.wikipedia_languages * 2)
        parts.append(f"{signals.wikipedia_languages} idiomas en Wikipedia (+{wiki_pts})")
    if signals.anthropic_confidence > 0:
        ai_pts = round(signals.anthropic_confidence * 10, 1)
        parts.append(f"confianza Anthropic {signals.anthropic_confidence:.2f} (+{ai_pts})")
    if not parts:
        parts.append("Sin señales conocidas — ficha mínima")

    rationale = " · ".join(parts)
    label = {
        "S": f"Tier S (cápsula 45'') — {rationale}",
        "A": f"Tier A (cápsula 15'') — {rationale}",
        "B": f"Tier B (ficha rica sin vídeo) — {rationale}",
        "C": f"Tier C (ficha mínima) — {rationale}",
    }[tier]

    return {
        "tier": tier,
        "score": score,
        "recipe": recipe,
        "rationale": label,
    }


def classify_batch(pois: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Clasifica una lista de POIs. Útil para ejecutar sobre lugares.csv."""

    out = []
    for poi in pois:
        result = classify_poi(poi)
        result["name"] = poi.get("name", "")
        out.append(result)
    return out
