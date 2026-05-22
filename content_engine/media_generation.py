"""
KUDOS Content Engine · P2.6 generative visual fallback.

Pure functions. NO external API calls. NO async jobs. NO image generation
services. Procedurally composes a branded SVG hero from capsule metadata
and returns it as a base64 data URI suitable for direct <img src=>.

Why procedural SVG instead of LLM-generated images:
  - Zero dependencia externa · cero coste por capsule · zero latencia
    adicional (~1ms render)
  - Zero hallucination · solo composición visual, no contenido factual
  - Determinístico · misma capsule = mismo hero
  - Brand-locked · siempre KUDOS visual identity
  - Future-upgradeable · cuando integremos un image API real, swap
    `render_procedural_hero_svg` por la llamada async sin tocar el
    serializer

Output fields injected into API response:
  - generated_fallback_url · data:image/svg+xml;base64,...
  - hero_prompt · descriptive string (documenta intent visual · usable
    si más adelante alimentamos un image API real)
  - hero_style · estilo visual derivado de las clases de la entity
"""
from __future__ import annotations

import base64
from typing import Any

# ---------------------------------------------------------------------------
# Style selection from entity classes · pure heuristic
# ---------------------------------------------------------------------------

_RELIGIOUS_CLASSES: frozenset[str] = frozenset({
    "Q9135", "Q1289664", "Q317557", "Q1144991", "Q120560", "Q1370598",
    "Q108983", "Q16970", "Q44613", "Q2074737", "Q44539", "Q24398318",
})
_LOCALITY_CLASSES: frozenset[str] = frozenset({
    "Q532", "Q515", "Q5119", "Q15284", "Q3957", "Q123705", "Q3055118",
    "Q840482", "Q3257518", "Q1107656", "Q486972",
})
_MUSEUM_CLASSES: frozenset[str] = frozenset({"Q33506"})
_WATER_CLASSES: frozenset[str] = frozenset({"Q4022", "Q23442", "Q34763"})
_MOUNTAIN_CLASSES: frozenset[str] = frozenset({"Q4989906", "Q8502"})
_ARCH_CLASSES: frozenset[str] = frozenset({
    "Q23413", "Q33837", "Q839954", "Q570116", "Q2319498", "Q41176",
    "Q811979", "Q174782", "Q9259",
})

# Style → (base_hue, accent_hue_offset, silhouette_key, label)
_STYLE_TABLE: dict[str, tuple[int, int, str, str]] = {
    "religious-warm":  (32,  -10, "spire",     "Atmósfera devocional"),
    "rural-dusk":      (28,  220, "horizon",   "Crepúsculo rural"),
    "urban-night":     (260,  40, "skyline",   "Noche urbana"),
    "museum-cool":     (200, -40, "column",    "Cámara contemplativa"),
    "water-blue":      (200,  60, "horizon",   "Reflejo de agua"),
    "mountain-vast":   (220,  40, "peak",      "Horizonte montañoso"),
    "monument-night":  (280,  60, "monolith",  "Monumento nocturno"),
    "memory-aurora":   (260,  80, "aurora",    "Memoria latente"),
}


def select_hero_style(classes: tuple[str, ...] | list[str]) -> str:
    """Pick a visual style key from entity classes. Falls back to
    'memory-aurora' when no class matches the table.
    """
    cs = set(classes or ())
    if cs & _RELIGIOUS_CLASSES:
        return "religious-warm"
    if cs & _MUSEUM_CLASSES:
        return "museum-cool"
    if cs & _LOCALITY_CLASSES:
        return "rural-dusk"
    if cs & _WATER_CLASSES:
        return "water-blue"
    if cs & _MOUNTAIN_CLASSES:
        return "mountain-vast"
    if cs & _ARCH_CLASSES:
        return "monument-night"
    return "memory-aurora"


def _hash_to_int(s: str) -> int:
    """Deterministic 31-prime hash. Range positive int."""
    h = 0
    for ch in (s or ""):
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return h


# ---------------------------------------------------------------------------
# Prompt builder · descriptive string usable by future image API
# ---------------------------------------------------------------------------

def build_hero_prompt(
    *,
    title: str,
    context_block: str,
    classes: tuple[str, ...] | list[str],
    locality: str = "",
) -> str:
    """Compose a hero prompt that documents visual intent. Saved as
    diagnostic field. Future image-generation worker can consume this
    directly without inventing new prompt logic.
    """
    style = select_hero_style(classes)
    style_phrase = _STYLE_TABLE.get(style, _STYLE_TABLE["memory-aurora"])[3]
    parts: list[str] = [
        f"Cinematic memory hero for '{title}'",
    ]
    if locality:
        parts.append(f"in {locality}")
    parts.append(f"style: {style_phrase}")
    parts.append(
        "atmosphere: dark navy base, aurora gradient, dust particles, "
        "soft horizon, KUDOS purple accent (#a78bfa), 16:9 cinematic"
    )
    return " · ".join(parts)


# ---------------------------------------------------------------------------
# Procedural SVG renderer · returns raw SVG string
# ---------------------------------------------------------------------------

def _svg_silhouette(key: str, hue: int) -> str:
    """Return SVG group for the silhouette band (bottom 35% of canvas)."""
    color = f"hsl({hue}, 22%, 8%)"
    if key == "spire":
        return (
            f'<g fill="{color}" opacity="0.85">'
            '<polygon points="0,720 0,560 200,560 230,520 260,560 460,560 '
            '500,540 540,560 1280,560 1280,720" />'
            '<rect x="608" y="380" width="64" height="180" />'
            '<polygon points="600,380 640,320 680,380" />'
            '</g>'
        )
    if key == "skyline":
        return (
            f'<g fill="{color}" opacity="0.88">'
            '<rect x="0" y="540" width="1280" height="180" />'
            '<rect x="120" y="440" width="60" height="100" />'
            '<rect x="220" y="400" width="80" height="140" />'
            '<rect x="340" y="460" width="50" height="80" />'
            '<rect x="450" y="380" width="100" height="160" />'
            '<rect x="600" y="420" width="70" height="120" />'
            '<rect x="720" y="360" width="90" height="180" />'
            '<rect x="860" y="440" width="60" height="100" />'
            '<rect x="970" y="400" width="80" height="140" />'
            '<rect x="1100" y="460" width="60" height="80" />'
            '</g>'
        )
    if key == "column":
        return (
            f'<g fill="{color}" opacity="0.85">'
            '<rect x="0" y="600" width="1280" height="120" />'
            '<rect x="380" y="280" width="40" height="320" />'
            '<rect x="540" y="280" width="40" height="320" />'
            '<rect x="700" y="280" width="40" height="320" />'
            '<rect x="860" y="280" width="40" height="320" />'
            '<rect x="340" y="260" width="600" height="30" />'
            '</g>'
        )
    if key == "peak":
        return (
            f'<g fill="{color}" opacity="0.88">'
            '<polygon points="0,720 0,520 220,420 380,500 520,360 700,500 '
            '880,380 1060,500 1280,440 1280,720" />'
            '</g>'
        )
    if key == "monolith":
        return (
            f'<g fill="{color}" opacity="0.85">'
            '<rect x="0" y="580" width="1280" height="140" />'
            '<rect x="560" y="240" width="160" height="340" />'
            '</g>'
        )
    if key == "aurora":
        return ""  # pure atmospheric · no silhouette
    # horizon (default)
    return (
        f'<g fill="{color}" opacity="0.78">'
        '<path d="M0,720 L0,560 Q 320,520 640,560 T 1280,560 L 1280,720 Z" />'
        '</g>'
    )


def render_procedural_hero_svg(
    *,
    title: str,
    locality: str,
    classes: tuple[str, ...] | list[str],
    entity_id: str,
) -> str:
    """Compose a cinematic 1280x720 SVG hero. Deterministic per entity_id.
    Pure string composition · zero IO.
    """
    style = select_hero_style(classes)
    base_hue, accent_offset, silhouette_key, _label = _STYLE_TABLE.get(
        style, _STYLE_TABLE["memory-aurora"]
    )
    # Deterministic hue perturbation per entity · keeps style range while
    # making each capsule visually unique.
    perturbation = _hash_to_int(entity_id) % 30 - 15
    primary_hue = (base_hue + perturbation) % 360
    accent_hue = (primary_hue + accent_offset) % 360

    # Particle field · 12 deterministic dots (positions seeded from id hash)
    seed = _hash_to_int(entity_id)
    particles: list[str] = []
    for i in range(12):
        s = (seed + i * 2654435761) & 0xFFFFFFFF
        x = 80 + (s % 1120)
        y = 60 + ((s >> 10) % 400)
        r = 0.6 + ((s >> 20) & 0x7) * 0.18
        particles.append(
            f'<circle cx="{x}" cy="{y}" r="{r:.1f}" fill="#f8fafc" opacity="0.55" />'
        )
    particles_svg = "\n    ".join(particles)

    silhouette_svg = _svg_silhouette(silhouette_key, primary_hue)

    # Title escaping for SVG · only minimal chars
    safe_title = (
        (title or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    )
    safe_locality = (
        (locality or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    )

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" role="img" aria-label="KUDOS · {safe_title}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="hsl({primary_hue}, 38%, 14%)" />
      <stop offset="55%" stop-color="hsl({primary_hue}, 28%, 8%)" />
      <stop offset="100%" stop-color="#050a1f" />
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="hsl({accent_hue}, 70%, 55%)" stop-opacity="0.30" />
      <stop offset="100%" stop-color="#050a1f" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="aurora-a" cx="22%" cy="72%" r="48%">
      <stop offset="0%" stop-color="hsl({primary_hue}, 60%, 50%)" stop-opacity="0.20" />
      <stop offset="100%" stop-color="#050a1f" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="aurora-b" cx="78%" cy="28%" r="42%">
      <stop offset="0%" stop-color="hsl({accent_hue}, 60%, 55%)" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#050a1f" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)" />
  <rect width="1280" height="720" fill="url(#halo)" />
  <rect width="1280" height="720" fill="url(#aurora-a)" />
  <rect width="1280" height="720" fill="url(#aurora-b)" />
  <g opacity="0.65">
    {particles_svg}
  </g>
  {silhouette_svg}
  <g transform="translate(64 64)" opacity="0.9">
    <circle cx="9" cy="9" r="6" fill="#a78bfa" />
    <text x="26" y="14" fill="#f8fafc" fill-opacity="0.82" font-family="ui-serif, Georgia, serif" font-weight="300" font-size="16" letter-spacing="6">KUDOS</text>
  </g>
  <text x="64" y="640" fill="#f8fafc" fill-opacity="0.88" font-family="ui-serif, Georgia, serif" font-weight="300" font-size="44" letter-spacing="1">{safe_title}</text>
  <text x="64" y="672" fill="#f8fafc" fill-opacity="0.5" font-family="ui-monospace, monospace" font-size="13" letter-spacing="4">{safe_locality}</text>
</svg>'''


def render_procedural_hero_data_uri(
    *,
    title: str,
    locality: str,
    classes: tuple[str, ...] | list[str],
    entity_id: str,
) -> str:
    """Return data:image/svg+xml;base64,<...> ready for <img src=>."""
    svg = render_procedural_hero_svg(
        title=title,
        locality=locality,
        classes=classes,
        entity_id=entity_id,
    )
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


# ---------------------------------------------------------------------------
# Top-level convenience · capsule dict in, fields out
# ---------------------------------------------------------------------------

def build_generated_fallback(capsule: Any) -> dict[str, str]:
    """Compose all P2.6 fields for a capsule. Pure · safe to call always.
    Returns dict with:
      hero_prompt · str
      hero_style · str
      generated_fallback_url · str (data URI)
    """
    title = getattr(capsule, "title", "") or ""
    context = getattr(capsule, "context_block", "") or ""
    entity_id = getattr(capsule, "entity_id", "") or ""
    # classes may not be stored on PlaceCapsule · derive empty when missing
    classes = getattr(capsule, "classes", None) or ()
    # locality hint from media_caption (Wikidata description) when available
    locality = getattr(capsule, "media_caption", "") or ""

    style = select_hero_style(classes)
    prompt = build_hero_prompt(
        title=title, context_block=context, classes=classes, locality=locality
    )
    data_uri = render_procedural_hero_data_uri(
        title=title, locality=locality, classes=classes, entity_id=entity_id
    )
    return {
        "hero_prompt": prompt,
        "hero_style": style,
        "generated_fallback_url": data_uri,
    }
