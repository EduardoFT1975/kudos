"""
KUDOS Engine — Cálculo del importance_score de un POI.

importance_score = puntuación 0-100 que decide qué tipo de cápsula merece
cada POI. La fórmula combina señales objetivas (UNESCO, visitantes, alcance
en Wikipedia) con la confianza del análisis de Anthropic (echo de KUDOS MIND).

Salida: int 0..100.  La función `to_tier` convierte ese score en S/A/B/C.

Decisión de diseño:
  - Cualquier señal puede faltar y la función sigue funcionando.
  - Cada bloque está acotado para que ningún factor monopolice el resultado.
  - El reparto es deliberadamente más generoso para UNESCO + visitantes,
    que son las señales menos ruidosas.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional


Tier = Literal["S", "A", "B", "C"]


@dataclass
class PoiSignals:
    """Señales de un POI. Todos los campos son opcionales (default = 0/False)."""

    unesco: bool = False
    """¿Es Patrimonio de la Humanidad UNESCO o equivalente?"""

    annual_visitors: int = 0
    """Visitantes anuales conocidos (turismo oficial / wikipedia)."""

    wikipedia_languages: int = 0
    """Número de versiones idiomáticas del artículo en Wikipedia."""

    anthropic_confidence: float = 0.0
    """Confianza 0.0-1.0 que devuelve el echo de Anthropic (KUDOS MIND)."""

    is_world_icon: bool = False
    """Override manual: lo marcamos a mano para los ~30 iconos del planeta."""

    is_basic_poi: bool = False
    """Override manual para POIs que sabemos que son ficha mínima (papelera de un parque)."""


def compute_score(s: PoiSignals) -> int:
    """Devuelve un entero 0-100. Saturado por arriba y por abajo."""

    # Override fuerte: iconos del mundo siempre Tier S
    if s.is_world_icon:
        return 100
    if s.is_basic_poi:
        return 5

    # UNESCO: 40 puntos
    unesco_pts = 40 if s.unesco else 0

    # Visitantes: hasta 30 puntos. 1M visitantes/año = 30 pts.
    # Escala lineal con techo en 1M para no premiar exceso.
    visitors_pts = min(30, s.annual_visitors / 33_333)

    # Wikipedia: 2 pts por idioma, techo 20 pts (10 idiomas)
    wiki_pts = min(20, s.wikipedia_languages * 2)

    # Anthropic confidence: 0-10 pts
    ai_pts = max(0.0, min(10.0, s.anthropic_confidence * 10))

    total = unesco_pts + visitors_pts + wiki_pts + ai_pts
    return max(0, min(100, int(round(total))))


def to_tier(score: int) -> Tier:
    """Convierte un score 0-100 al tier correspondiente."""
    if score >= 75:
        return "S"
    if score >= 45:
        return "A"
    if score >= 20:
        return "B"
    return "C"


def tier_recipe(tier: Tier) -> dict:
    """
    Receta de qué genera el motor para cada tier.

    Esto es lo que `pipeline.py` consulta para saber qué hacer:
      - duration_seconds: longitud objetivo de la cápsula (None = sin cápsula)
      - scenes: número de escenas a generar
      - generate_voice: ¿hace falta narración?
      - generate_music: ¿hace falta música?
      - rich_card: ¿generamos también ficha enriquecida (timeline, galería, fuentes)?
    """

    recipes = {
        "S": {
            "duration_seconds": 45,
            "scenes": 8,
            "generate_voice": True,
            "generate_music": True,
            "rich_card": True,
            "min_photos": 10,
        },
        "A": {
            "duration_seconds": 15,
            "scenes": 5,
            "generate_voice": True,
            "generate_music": True,
            "rich_card": True,
            "min_photos": 6,
        },
        "B": {
            "duration_seconds": None,   # ficha rica sin vídeo
            "scenes": 0,
            "generate_voice": False,
            "generate_music": False,
            "rich_card": True,
            "min_photos": 3,
        },
        "C": {
            "duration_seconds": None,   # ficha mínima
            "scenes": 0,
            "generate_voice": False,
            "generate_music": False,
            "rich_card": False,
            "min_photos": 1,
        },
    }
    return recipes[tier]
