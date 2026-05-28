"""
KUDOS Engine — CLI.

Uso:
  python -m kudos_engine generate --poi "Coliseo de Roma"
  python -m kudos_engine generate --poi rome --music kudos_engine/assets/music/epic.mp3
  python -m kudos_engine score --name "Coliseo de Roma" --unesco --visitors 7600000 --wiki 130
  python -m kudos_engine voices    (lista voces Edge-TTS en español)

Flags relevantes:
  --no-intro        : omite el intro KUDOS de 0.8s
  --no-voice        : vídeo mudo (sin narración)
  --voice NOMBRE    : voz Edge-TTS (default es-ES-AlvaroNeural)
  --duration N      : fuerza duración objetivo (segundos)
  --scenes N        : fuerza número de escenas
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .pipeline import generate_capsule
from .tier import classify_poi
from .providers.voice_edge import list_spanish_voices


# POIs conocidos por slug — accesos cortos
POI_PRESETS = {
    "rome":     {"name": "Coliseo de Roma", "unesco": True, "annual_visitors": 7_600_000, "wikipedia_languages": 130, "anthropic_confidence": 0.95},
    "machu":    {"name": "Machu Picchu", "unesco": True, "annual_visitors": 1_500_000, "wikipedia_languages": 100, "anthropic_confidence": 0.95},
    "taj":      {"name": "Taj Mahal", "unesco": True, "annual_visitors": 8_000_000, "wikipedia_languages": 110, "anthropic_confidence": 0.95},
    "alhambra": {"name": "Alhambra", "unesco": True, "annual_visitors": 2_800_000, "wikipedia_languages": 90, "anthropic_confidence": 0.93},
    "sagrada":  {"name": "Sagrada Familia", "unesco": True, "annual_visitors": 4_700_000, "wikipedia_languages": 80, "anthropic_confidence": 0.93},
}


def _resolve_poi(name_or_slug: str) -> dict:
    """Resuelve un alias corto a dict completo, o construye uno mínimo."""
    if name_or_slug in POI_PRESETS:
        return dict(POI_PRESETS[name_or_slug])
    return {"name": name_or_slug}


def cmd_generate(args) -> int:
    poi = _resolve_poi(args.poi)

    if args.duration:
        poi["_force_duration"] = args.duration   # informa al tier (no soportado aún)
    if args.scenes:
        poi["_force_scenes"] = args.scenes

    music_path = Path(args.music) if args.music else None
    if music_path and not music_path.exists():
        print(f"AVISO: la pista de música {music_path} no existe — se omite.")
        music_path = None

    result = generate_capsule(
        poi,
        voice=args.voice,
        music_path=music_path,
        include_intro=not args.no_intro,
        skip_voice=args.no_voice,
        verbose=True,
    )
    print()
    print("=" * 60)
    print("CÁPSULA LISTA")
    print("=" * 60)
    print(f"Tier:     {result['tier']}")
    print(f"Vídeo:    {result['video']}")
    print(f"Metadata: {result['metadata']}")
    return 0


def cmd_score(args) -> int:
    poi = {
        "name": args.name,
        "unesco": args.unesco,
        "annual_visitors": args.visitors,
        "wikipedia_languages": args.wiki,
        "anthropic_confidence": args.ai,
    }
    result = classify_poi(poi)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def cmd_voices(args) -> int:
    voices = list_spanish_voices()
    print("Voces neurales en español disponibles:")
    for v in voices:
        marker = " ← default" if v == "es-ES-AlvaroNeural" else ""
        print(f"  · {v}{marker}")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="kudos_engine", description="Motor cinematográfico KUDOS")
    sub = p.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate", help="Genera una cápsula de un POI")
    g.add_argument("--poi", required=True, help='Nombre del POI o alias corto (rome, machu, taj, alhambra, sagrada)')
    g.add_argument("--voice", default="es-ES-AlvaroNeural", help="Voz Edge-TTS")
    g.add_argument("--music", default=None, help="Ruta a MP3 de música de fondo")
    g.add_argument("--no-intro", action="store_true", help="Omite intro KUDOS")
    g.add_argument("--no-voice", action="store_true", help="Vídeo sin narración")
    g.add_argument("--duration", type=int, default=None, help="Fuerza duración (segundos)")
    g.add_argument("--scenes", type=int, default=None, help="Fuerza número de escenas")
    g.set_defaults(func=cmd_generate)

    s = sub.add_parser("score", help="Calcula tier de un POI con señales manuales")
    s.add_argument("--name", required=True)
    s.add_argument("--unesco", action="store_true")
    s.add_argument("--visitors", type=int, default=0)
    s.add_argument("--wiki", type=int, default=0, help="número de idiomas en Wikipedia")
    s.add_argument("--ai", type=float, default=0.0, help="confianza Anthropic 0-1")
    s.set_defaults(func=cmd_score)

    v = sub.add_parser("voices", help="Lista voces Edge-TTS en español")
    v.set_defaults(func=cmd_voices)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
