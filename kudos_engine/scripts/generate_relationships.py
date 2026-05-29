"""
KUDOS · POI Relationship Engine · auto-generador.

Genera relaciones POI↔POI a partir del dataset Wikidata:
  - GEOGRAPHICAL: POIs <500m de distancia (mismo barrio · co-visita probable)
  - THEMATIC: misma category + mismo país (Catedral de X ↔ Catedral de Y)
  - TEMPORAL: comparten período histórico (mismo siglo o estilo arquitectónico)
  - HISTORICAL: mencionados en Wikipedia juntos (TODO · necesita scraping)

Output: experience/public/data/relationships/index.json
        { "wd-Q10285": [{"id": "wd-Q180212", "type": "geographical", "weight": 0.85}, ...] }

Uso:
  python -m kudos_engine.scripts.generate_relationships
  python -m kudos_engine.scripts.generate_relationships --tier-min A   (solo S+A)
  python -m kudos_engine.scripts.generate_relationships --max-per-poi 8
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List


ROOT = Path(__file__).resolve().parents[2]
WIKIDATA_DIR = ROOT / "experience" / "public" / "data" / "wikidata"
OUT_DIR = ROOT / "experience" / "public" / "data" / "relationships"
OUT_FILE = OUT_DIR / "index.json"


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distancia entre 2 puntos lat/lng en km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam/2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tier-min", default="B", choices=["S", "A", "B"])
    parser.add_argument("--max-per-poi", type=int, default=8)
    parser.add_argument("--geo-radius-km", type=float, default=2.0)
    args = parser.parse_args()

    allowed_tiers = {"S": ["S"], "A": ["S", "A"], "B": ["S", "A", "B"]}[args.tier_min]
    print(f"Generando relaciones para tiers: {allowed_tiers}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Cargar todos los POIs candidatos
    all_pois: list[dict] = []
    for fp in sorted(WIKIDATA_DIR.glob("*.json")):
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        for p in data.get("pois", []):
            if p.get("tier") not in allowed_tiers: continue
            if not p.get("lat") or not p.get("lng"): continue
            all_pois.append(p)

    print(f"Total POIs candidatos: {len(all_pois)}")

    # Index por país para optimizar búsqueda
    by_country: Dict[str, List[dict]] = defaultdict(list)
    for p in all_pois:
        cc = p.get("country_code", "??")
        by_country[cc].append(p)

    # Generar relaciones
    relationships: Dict[str, List[dict]] = defaultdict(list)
    processed = 0
    geo_count = 0
    thematic_count = 0

    for poi in all_pois:
        if processed % 500 == 0:
            print(f"  procesados {processed}/{len(all_pois)} · {geo_count} geo · {thematic_count} thematic")
        processed += 1

        cc = poi.get("country_code", "??")
        candidates = by_country.get(cc, [])
        lat0, lng0 = poi["lat"], poi["lng"]
        cat0 = poi.get("category", "")

        related: list[tuple[float, dict]] = []
        for other in candidates:
            if other["id"] == poi["id"]: continue
            d = haversine_km(lat0, lng0, other["lat"], other["lng"])

            # GEOGRAPHICAL · <2km
            if d <= args.geo_radius_km:
                weight = max(0.4, 1.0 - d / args.geo_radius_km)
                related.append((weight, {
                    "id": other["id"],
                    "type": "geographical",
                    "weight": round(weight, 2),
                    "distance_km": round(d, 2),
                }))
                geo_count += 1

            # THEMATIC · misma categoría · <50km
            elif d <= 50 and cat0 and other.get("category") == cat0:
                weight = max(0.3, 0.7 - d / 100)
                related.append((weight, {
                    "id": other["id"],
                    "type": "thematic",
                    "weight": round(weight, 2),
                    "distance_km": round(d, 2),
                }))
                thematic_count += 1

        # Ordenar por weight desc + dedupe (mantener solo el mejor tipo por target)
        related.sort(key=lambda x: x[0], reverse=True)
        seen: set = set()
        final = []
        for w, rel in related:
            if rel["id"] in seen: continue
            seen.add(rel["id"])
            final.append(rel)
            if len(final) >= args.max_per_poi: break

        if final:
            relationships[poi["id"]] = final

    # Persistir
    out = {
        "version": "1.0",
        "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "stats": {
            "total_pois_with_relations": len(relationships),
            "total_pois_candidates": len(all_pois),
            "geo_count": geo_count,
            "thematic_count": thematic_count,
        },
        "relationships": dict(relationships),
    }
    OUT_FILE.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"\n=== HECHO ===")
    print(f"  Output: {OUT_FILE}")
    print(f"  POIs con relaciones: {len(relationships)}")
    print(f"  Tamaño archivo: {OUT_FILE.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
