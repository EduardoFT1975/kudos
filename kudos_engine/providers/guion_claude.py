"""
KUDOS Engine — Generador de guion cinematográfico con Anthropic Claude.

Pide a Claude un guion de N escenas en formato JSON estricto, listo para
alimentar el pipeline. Cada escena trae:
  - title       : título corto (3-5 palabras)
  - narration   : texto a sincretizar con voz (1-2 frases, ritmo cinematográfico)
  - direction   : sugerencia de movimiento Ken Burns ("in" / "out" / "left" / "right" / "up")
  - search_hint : pista de búsqueda para Wikimedia ("Colosseum interior arches")
  - duration    : segundos sugeridos (la suma debe acercarse al objetivo)

Requiere variable de entorno ANTHROPIC_API_KEY.
Si no está disponible, hay un fallback offline con un guion plantilla.
"""

from __future__ import annotations

import json
import os
import re
from typing import Optional


SYSTEM_PROMPT = """Eres el guionista jefe de KUDOS, plataforma cultural global.
Generas guiones cinematográficos cortos para cápsulas de lugares del mundo.
Estilo: Apple Vision Pro + Netflix documental + David Attenborough.
Tono: épico, evocador, factual, sin clichés. Español neutro.
Estructura: 8 escenas para 45s · 5 escenas para 15s. Ritmo claro.
Cada narración debe poderse leer en voz alta en la duración asignada
(aprox. 14 palabras = 5 segundos a ritmo cinematográfico).
"""


USER_TEMPLATE = """Genera un guion para una cápsula KUDOS sobre:

  NOMBRE: {name}
  DURACIÓN OBJETIVO: {duration} segundos
  ESCENAS: {scenes}
  CONTEXTO CONOCIDO: {context}

Devuelve EXCLUSIVAMENTE un JSON válido con esta forma exacta:

{{
  "title": "Título cinematográfico del POI",
  "subtitle": "Subtítulo breve evocador",
  "scenes": [
    {{
      "title": "Apertura",
      "narration": "Texto narrador 1-2 frases ritmo cinematográfico.",
      "direction": "in",
      "search_hint": "pista de búsqueda Wikimedia en inglés",
      "duration": 2.5
    }}
    // ... etc
  ]
}}

REGLAS DURAS:
  - La suma de las `duration` debe estar entre {duration_min} y {duration_max}.
  - `direction` solo puede ser: "in", "out", "left", "right", "up", "down".
  - `narration` SIEMPRE en español, evita exclamaciones y comillas dobles.
  - `search_hint` SIEMPRE en inglés, palabras concretas (no frases largas).
  - No incluyas markdown, ni comentarios, ni texto fuera del JSON.
"""


def generate_script(
    name: str,
    duration_seconds: int = 15,
    scenes: int = 5,
    context: str = "",
    model: str = "claude-haiku-4-5-20251001",
) -> dict:
    """
    Devuelve dict con title/subtitle/scenes. Si no hay API key, usa fallback.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return _fallback_script(name, duration_seconds, scenes)

    try:
        import anthropic  # type: ignore
    except ImportError:
        print("[guion] anthropic no instalado — usando fallback")
        return _fallback_script(name, duration_seconds, scenes)

    client = anthropic.Anthropic(api_key=api_key)
    duration_min = duration_seconds - 1
    duration_max = duration_seconds + 1

    prompt = USER_TEMPLATE.format(
        name=name,
        duration=duration_seconds,
        scenes=scenes,
        context=context or "(sin contexto adicional)",
        duration_min=duration_min,
        duration_max=duration_max,
    )

    try:
        resp = client.messages.create(
            model=model,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(block.text for block in resp.content if hasattr(block, "text"))
        return _parse_json(text)
    except Exception as e:
        print(f"[guion] Claude falló ({e}) — usando fallback")
        return _fallback_script(name, duration_seconds, scenes)


def _parse_json(text: str) -> dict:
    """Extrae el primer objeto JSON del texto y lo parsea."""
    # Quitar fences ```json ... ``` si vinieran
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise ValueError(f"No se encontró JSON en la respuesta: {text[:200]}")
    return json.loads(m.group(0))


def _fallback_script(name: str, duration: int, scenes: int) -> dict:
    """
    Plantilla offline para cuando no hay API key. Genera un guion neutro
    con ritmo correcto. Es deliberadamente austero — la API es mucho mejor.
    """
    per_scene = duration / scenes
    templates = [
        ("Apertura", f"Existe un lugar donde el tiempo se detuvo: {name}.", "in"),
        ("Contexto", "Su historia atraviesa siglos.", "right"),
        ("Escala", "Sus dimensiones desafían lo posible.", "out"),
        ("Detalle", "Cada piedra guarda una memoria.", "left"),
        ("Significado", "Aquí cambió el curso de la civilización.", "in"),
        ("Legado", "Hoy sigue inspirando al mundo.", "up"),
        ("KUDOS", "Reconoce. Recuerda. Comparte.", "in"),
        ("Cierre", f"{name}. KUDOS.", "out"),
    ]
    if scenes < len(templates):
        templates = templates[:scenes-1] + [templates[-1]]
    elif scenes > len(templates):
        # repetir detalles intermedios
        extra = scenes - len(templates)
        for i in range(extra):
            templates.insert(-1, (f"Detalle {i+1}", "Cada rincón habla.", "left"))
    return {
        "title": name,
        "subtitle": "Un lugar que merece ser recordado",
        "scenes": [
            {
                "title": t[0],
                "narration": t[1],
                "direction": t[2],
                "search_hint": name,
                "duration": round(per_scene, 2),
            }
            for t in templates
        ],
    }
