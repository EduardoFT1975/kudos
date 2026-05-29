"""
KUDOS · Multi-Capsule System · bulk narrative generator (P0 CTO).

Por cada POI Tier S+A genera 6 narrativas con distinto ángulo:
  - Hidden Truth
  - Human Story
  - Transformation
  - Mystery
  - Lost World
  - Present Connection

Cada narrativa: title (3-5 palabras serif) + hook (1 línea evocadora) +
type + duration_s + emotion.

Con ANTHROPIC_API_KEY: llamada Claude · narrativas únicas por POI.
Sin ANTHROPIC_API_KEY: fallback heurístico por categoría.

Output: experience/public/data/narratives/index.json

Uso:
  python -m kudos_engine.scripts.generate_narratives_top --tier S
  python -m kudos_engine.scripts.generate_narratives_top --tier A --limit 50
  python -m kudos_engine.scripts.generate_narratives_top --no-anthropic
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import List, Dict


ROOT = Path(__file__).resolve().parents[2]
WIKIDATA_DIR = ROOT / "experience" / "public" / "data" / "wikidata"
OUT_DIR = ROOT / "experience" / "public" / "data" / "narratives"
OUT_FILE = OUT_DIR / "index.json"


NARRATIVE_TYPES = [
    ("Hidden Truth",       "Lo que no aparece en los libros."),
    ("Human Story",        "Las vidas de quienes lo habitaron."),
    ("Transformation",     "Cómo cambió la historia."),
    ("Mystery",            "Lo que aún no entendemos."),
    ("Lost World",         "El mundo que dejó atrás."),
    ("Present Connection", "Lo que significa hoy."),
]


# Fallback heurístico · cuando no hay Anthropic
HEURISTIC = {
    "museum": [
        ("Las piezas que cambiaron de manos", "Cada objeto tiene un viaje secreto.", "Hidden Truth", 30, "curiosity"),
        ("Quien decidió qué guardar",        "Detrás de cada colección hay un curador con sesgo.", "Human Story", 45, "wonder"),
        ("El silencio que las protege",       "Los museos respiran de otra manera.", "Mystery", 30, "awe"),
        ("Lo que se perdió antes de llegar",  "Por cada pieza expuesta, mil se quemaron.", "Lost World", 30, "melancholy"),
        ("Cómo enseñamos lo que importa",     "Un museo es siempre una opinión.", "Transformation", 45, "wonder"),
        ("Por qué siguen siendo necesarios",  "En un mundo digital, lo tangible recobra valor.", "Present Connection", 30, "calm"),
    ],
    "castle": [
        ("La piedra que vio caer reinos",     "Cada muralla recuerda un asedio.", "Hidden Truth", 45, "awe"),
        ("La vida en sus pasillos",            "Sirvientes, espías, traidores y reyes.", "Human Story", 45, "wonder"),
        ("Ingeniería de la supervivencia",     "Cada detalle estaba pensado para resistir.", "Transformation", 30, "curiosity"),
        ("Los túneles que aún no descubrimos", "Bajo cada castillo hay secretos enterrados.", "Mystery", 30, "awe"),
        ("Cuando esta tierra cambió de dueño", "Reinos enteros se decidieron aquí.", "Lost World", 45, "melancholy"),
        ("Por qué siguen en pie",              "Construyeron pensando en siglos, no en años.", "Present Connection", 30, "calm"),
    ],
    "religious": [
        ("El aire pesa distinto",              "Hay lugares donde el silencio tiene espesor.", "Hidden Truth", 30, "awe"),
        ("Las manos que lo levantaron",        "Generaciones lo construyeron sin verlo terminado.", "Human Story", 45, "wonder"),
        ("Los símbolos ocultos en la piedra",  "Cada relieve cuenta lo que las palabras no.", "Mystery", 30, "curiosity"),
        ("Lo que se perdió en las reformas",   "Cada siglo borró y reescribió lo anterior.", "Lost World", 30, "melancholy"),
        ("Cómo cambió la fe que albergó",      "La devoción no es la misma de la que nació.", "Transformation", 30, "wonder"),
        ("Por qué la gente sigue viniendo",    "Hasta los no creyentes encuentran algo aquí.", "Present Connection", 30, "calm"),
    ],
    "archaeology": [
        ("Capas de vida bajo tus pies",        "Cada estrato es un siglo, una civilización.", "Lost World", 45, "awe"),
        ("Quienes vivieron aquí",              "Tuvieron miedo, alegría, sueños · igual que nosotros.", "Human Story", 45, "wonder"),
        ("Lo que un objeto delata",            "Una vasija rota cuenta cien historias.", "Hidden Truth", 30, "curiosity"),
        ("El día en que todo cambió",          "Algo pasó aquí · y todo terminó.", "Mystery", 30, "melancholy"),
        ("Lo que la tierra aún no devolvió",   "Bajo cada piedra excavada, otras esperan.", "Mystery", 30, "awe"),
        ("Cómo aprendemos de ellos hoy",       "Cada yacimiento nos recuerda algo de nosotros.", "Present Connection", 30, "calm"),
    ],
    "monument": [
        ("Quien quiso que durara más que él", "Cada monumento es un acto de inmortalidad.", "Hidden Truth", 30, "wonder"),
        ("Las manos que lo tallaron",          "Detrás de la grandeza hay anónimos.", "Human Story", 45, "wonder"),
        ("Por qué eligieron este lugar",       "La ubicación nunca es accidente.", "Mystery", 30, "curiosity"),
        ("Lo que celebra · lo que oculta",     "Todo monumento es también olvido.", "Hidden Truth", 30, "melancholy"),
        ("Cómo lo ven generaciones distintas", "Su significado cambia con quien lo mira.", "Transformation", 30, "wonder"),
        ("Por qué seguimos volviendo",         "Algunos lugares te llaman sin saber por qué.", "Present Connection", 30, "calm"),
    ],
    "palace": [
        ("Decisiones que cambiaron mapas",     "Aquí se redibujó el mundo entre cenas.", "Hidden Truth", 45, "awe"),
        ("Quienes lo habitaron",               "Reyes, amantes, conspiradores · todos pasaron por aquí.", "Human Story", 45, "wonder"),
        ("La arquitectura como poder",         "Cada sala dice algo sobre quien la diseñó.", "Transformation", 30, "curiosity"),
        ("Lo que pasaba detrás de las puertas","Lo oficial era solo la fachada.", "Mystery", 30, "melancholy"),
        ("Cuando dejó de ser palacio",         "Las épocas cambian más rápido que las paredes.", "Lost World", 30, "melancholy"),
        ("Lo que queda de su esplendor",       "Hoy seguimos imaginando cómo fue habitarlo.", "Present Connection", 30, "calm"),
    ],
    "park": [
        ("El mundo respira sin pedir permiso", "Aquí la naturaleza recuerda quién manda.", "Present Connection", 45, "calm"),
        ("Lo que vivía antes que tú",          "Cada árbol llevaba aquí siglos.", "Lost World", 30, "awe"),
        ("La vida invisible al ojo",           "Hay más historias bajo la corteza que en cualquier libro.", "Mystery", 30, "wonder"),
        ("Cómo nos cambia caminar aquí",       "Tu cuerpo lo sabe antes que tu cabeza.", "Transformation", 30, "calm"),
        ("Quienes decidieron protegerlo",      "No fue obvio · alguien luchó para preservarlo.", "Human Story", 30, "wonder"),
        ("Lo que estamos perdiendo",           "Cada año, lugares así desaparecen.", "Hidden Truth", 30, "melancholy"),
    ],
    "plaza": [
        ("Aquí la ciudad se encuentra",        "Las plazas son el corazón de las ciudades.", "Present Connection", 30, "wonder"),
        ("Lo que se decidió en este suelo",    "Mítines, revoluciones, ejecuciones.", "Hidden Truth", 30, "awe"),
        ("Las vidas que pasaron por aquí",     "Millones de pies, millones de historias.", "Human Story", 30, "wonder"),
        ("Cómo cambió con cada siglo",         "La plaza de hoy no es la de hace 200 años.", "Transformation", 30, "curiosity"),
        ("Lo que ocultan sus piedras",         "A veces hay otra plaza bajo la actual.", "Mystery", 30, "curiosity"),
        ("Por qué seguimos viniendo",          "Ningún algoritmo reemplaza estar aquí.", "Present Connection", 30, "calm"),
    ],
    "megalith": [
        ("Manos antiguas dejaron una huella",  "Quienes lo levantaron no conocían la escritura.", "Lost World", 45, "awe"),
        ("Por qué eligieron este lugar",       "Cada megalito está donde está por algo.", "Mystery", 30, "wonder"),
        ("Lo que celebraban aquí",             "Solsticios, muertos, futuros que no llegaron.", "Hidden Truth", 30, "awe"),
        ("Lo que aún no sabemos",              "Cada piedra plantea más preguntas que respuestas.", "Mystery", 30, "curiosity"),
        ("Quienes vinieron después",           "Romanos, cristianos, turistas · cada cultura lo reinterpretó.", "Transformation", 30, "wonder"),
        ("Por qué seguimos viniendo",          "Algunos lugares te interrogan sin decir palabra.", "Present Connection", 30, "calm"),
    ],
    "mystery": [
        ("Algo que aún no entendemos",         "Hay preguntas sin respuesta · y eso es bello.", "Mystery", 45, "wonder"),
        ("Las teorías que lo rodean",          "Cada generación tiene su explicación.", "Hidden Truth", 30, "curiosity"),
        ("Quienes lo vieron antes",            "Los primeros testigos cambiaron al verlo.", "Human Story", 30, "wonder"),
        ("Lo que se ha olvidado",              "Mucho se sabía · todo se ha perdido.", "Lost World", 30, "melancholy"),
        ("Por qué nos sigue fascinando",       "Lo desconocido tiene su propia gravedad.", "Transformation", 30, "awe"),
        ("Lo que dice de nosotros",            "Cómo lo explicamos dice más de nosotros que de ello.", "Present Connection", 30, "calm"),
    ],
}


def infer_category(poi: dict) -> str:
    """Categoría heurística para fallback."""
    name = (poi.get("name", "") + " " + poi.get("category", "")).lower()
    if "museo" in name or "museum" in name or "galer" in name: return "museum"
    if "castillo" in name or "castle" in name or "fortale" in name: return "castle"
    if "iglesia" in name or "catedral" in name or "basílica" in name or "monasterio" in name or "abadía" in name: return "religious"
    if "yacimiento" in name or "ruina" in name or "anfiteatro" in name or "teatro romano" in name: return "archaeology"
    if "palacio" in name or "palace" in name: return "palace"
    if "parque" in name or "jardín" in name or "park" in name: return "park"
    if "plaza" in name or "square" in name: return "plaza"
    if "dolmen" in name or "menhir" in name or "mámoa" in name or "túmulo" in name: return "megalith"
    return "monument"


def heuristic_narratives(poi: dict) -> List[Dict]:
    """Narrativas heurísticas · 6 por POI según categoría."""
    cat = infer_category(poi)
    template = HEURISTIC.get(cat, HEURISTIC["monument"])
    out = []
    for title, hook, ntype, dur, emo in template:
        out.append({
            "title": title,
            "hook": hook,
            "type": ntype,
            "duration_s": dur,
            "emotion": emo,
        })
    return out


def claude_narratives(poi: dict) -> List[Dict]:
    """Narrativas reales via Anthropic Claude."""
    try:
        from kudos_engine.providers.guion_claude import generate_script
    except Exception:
        return heuristic_narratives(poi)

    # MVP: usar el endpoint de guion existente · podríamos hacer prompt custom
    # Pero por simplicidad: heurística + 1 narrativa real generada como muestra
    try:
        import anthropic
        client = anthropic.Anthropic()
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": f"""Genera 6 narrativas distintas sobre {poi.get('name')} ({poi.get('country_code', '')}).
Cada una con: title (3-5 palabras evocadoras), hook (1 línea poética que invite), type (uno de: Hidden Truth, Human Story, Transformation, Mystery, Lost World, Present Connection), duration_s (15-45), emotion (awe, wonder, curiosity, melancholy, calm).
Devuelve JSON puro:
[{{"title":"...","hook":"...","type":"...","duration_s":30,"emotion":"awe"}}, ...]
NO añadas texto fuera del JSON."""
            }]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = "\n".join(raw.split("\n")[1:-1])
        narratives = json.loads(raw)
        if isinstance(narratives, list) and len(narratives) >= 4:
            return narratives[:6]
    except Exception as e:
        print(f"  [claude] fallback heurístico para {poi.get('name')}: {e}")
    return heuristic_narratives(poi)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tier", default="A", choices=["S", "A", "B"])
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--no-anthropic", action="store_true")
    parser.add_argument("--resume", action="store_true",
                        help="Skip POIs que ya tienen narrativas")
    args = parser.parse_args()

    allowed = {"S": ["S"], "A": ["S", "A"], "B": ["S", "A", "B"]}[args.tier]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Cargar existing manifest si --resume
    existing: Dict[str, List[Dict]] = {}
    if args.resume and OUT_FILE.exists():
        try:
            existing = json.loads(OUT_FILE.read_text(encoding="utf-8")).get("narratives", {})
            print(f"Resume · {len(existing)} POIs ya tienen narrativas")
        except Exception:
            pass

    # Validar Anthropic
    if not args.no_anthropic and not os.environ.get("ANTHROPIC_API_KEY"):
        print("AVISO · ANTHROPIC_API_KEY no encontrada · usando heurística")
        args.no_anthropic = True

    # Cargar POIs
    pois = []
    for fp in sorted(WIKIDATA_DIR.glob("*.json")):
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        for p in data.get("pois", []):
            if p.get("tier") not in allowed: continue
            if not p.get("name"): continue
            pois.append(p)

    if args.limit: pois = pois[:args.limit]
    print(f"Generando narrativas para {len(pois)} POIs (tier max {args.tier})")

    out_narratives = dict(existing)
    ok, skipped = 0, 0
    t0 = time.time()

    for i, poi in enumerate(pois):
        pid = poi["id"]
        if args.resume and pid in out_narratives:
            skipped += 1
            continue
        if i % 10 == 0:
            print(f"  {i}/{len(pois)} · ok={ok} skip={skipped}")

        narratives = heuristic_narratives(poi) if args.no_anthropic else claude_narratives(poi)
        out_narratives[pid] = narratives
        ok += 1

        # Persistir cada 25
        if ok % 25 == 0:
            persist(out_narratives)

    persist(out_narratives)
    dt = time.time() - t0
    print(f"\n=== HECHO ===")
    print(f"  Output: {OUT_FILE}")
    print(f"  POIs con narrativas: {len(out_narratives)}")
    print(f"  Nuevos: {ok} · Skipped: {skipped} · Tiempo: {dt:.1f}s")
    return 0


def persist(narratives: Dict[str, List[Dict]]):
    out = {
        "version": "1.0",
        "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "narratives": narratives,
    }
    OUT_FILE.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
