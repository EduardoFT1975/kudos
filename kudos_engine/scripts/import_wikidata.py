"""
KUDOS · Importador masivo desde Wikidata SPARQL.

Más fiable y rico que Overpass:
  - Devuelve nombre multilingüe + coord + categoría + foto Wikimedia + UNESCO
  - Endpoint público de Wikidata, sin API key
  - Una sola query devuelve hasta 10.000 entidades con metadata completa
  - Filtros por país, por tipo (monumento, museo, naturaleza, etc.)

Categorías que importa:
  - Q570116   tourist attraction
  - Q33506    museum
  - Q4989906  monument
  - Q839954   archaeological site
  - Q23413    castle
  - Q1248784  cathedral
  - Q16970    church
  - Q22698    park
  - Q46831    mountain range
  - Q11459    waterfall
  - Q193912   national park

Uso:
  python -m kudos_engine.scripts.import_wikidata --country ES
  python -m kudos_engine.scripts.import_wikidata --country IT --max 3000
  python -m kudos_engine.scripts.import_wikidata --all
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Optional

import requests


SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
HEADERS = {
    "User-Agent": "KUDOS-Engine/0.1 (https://kudos.world; contact: hola@kudos.world)",
    "Accept": "application/sparql-results+json",
}

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "experience" / "public" / "data" / "wikidata"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ISO 3166-1 alpha-2 → Wikidata Q-item de país
COUNTRY_QID = {
    "ES": "Q29",       "IT": "Q38",       "FR": "Q142",      "GR": "Q41",
    "PT": "Q45",       "DE": "Q183",      "GB": "Q145",      "EG": "Q79",
    "MX": "Q96",       "PE": "Q419",      "IN": "Q668",      "CN": "Q148",
    "JP": "Q17",       "TR": "Q43",       "US": "Q30",       "CA": "Q16",
    "BR": "Q155",      "AR": "Q414",      "AU": "Q408",      "ZA": "Q258",
    "MA": "Q1028",     "CL": "Q298",      "KH": "Q424",      "JO": "Q810",
    "TH": "Q869",      "MM": "Q836",      "IL": "Q801",      "RU": "Q159",
    "NL": "Q55",       "CZ": "Q213",      "ID": "Q252",      "VN": "Q881",
    "PH": "Q928",      "IR": "Q794",      "ET": "Q115",      "TZ": "Q924",
    "ZM": "Q953",      "KE": "Q114",
}

# Tipos de POIs interesantes · Wikidata Q-items
POI_TYPES = [
    "Q570116",    # tourist attraction
    "Q33506",     # museum
    "Q4989906",   # monument
    "Q839954",    # archaeological site
    "Q23413",     # castle
    "Q1248784",   # cathedral
    "Q44539",     # temple
    "Q108325",    # palace
    "Q11303",     # skyscraper
    "Q12280",     # bridge
    "Q22698",     # park
    "Q193912",    # national park
    "Q11459",     # waterfall
    "Q8502",      # mountain
    "Q35112",     # archaeological park
    "Q1107656",   # garden
]


def build_sparql_one_type(country_qid: str, type_qid: str, limit: int = 800) -> str:
    """Query pequeña: SOLO un tipo, un país. Cabe en el timeout de 60s del SPARQL público."""
    return f"""
SELECT DISTINCT ?item ?itemLabel ?coord ?image ?heritage WHERE {{
  ?item wdt:P31/wdt:P279* wd:{type_qid} .
  ?item wdt:P17 wd:{country_qid} .
  ?item wdt:P625 ?coord .
  OPTIONAL {{ ?item wdt:P18 ?image . }}
  OPTIONAL {{ ?item wdt:P1435 ?heritage . }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en" . }}
}}
LIMIT {limit}
"""


def _wkt_to_latlng(wkt: str) -> Optional[tuple[float, float]]:
    """Parse 'Point(lon lat)' → (lat, lng)."""
    try:
        body = wkt[wkt.index("(") + 1 : wkt.index(")")]
        parts = body.split()
        return float(parts[1]), float(parts[0])
    except Exception:
        return None


def _category_from_type(type_label: str) -> str:
    t = (type_label or "").lower()
    if "museum" in t or "museo" in t or "gallery" in t or "galería" in t: return "museo"
    if "park" in t or "parque" in t or "garden" in t or "jardín" in t or "mountain" in t or "waterfall" in t or "monta" in t: return "naturaleza"
    return "monumento"


TYPE_TO_CATEGORY = {
    "Q570116": ("monumento", "atracción turística"),
    "Q33506":  ("museo",     "museo"),
    "Q4989906":("monumento", "monumento"),
    "Q839954": ("monumento", "yacimiento arqueológico"),
    "Q23413":  ("monumento", "castillo"),
    "Q1248784":("monumento", "catedral"),
    "Q44539":  ("monumento", "templo"),
    "Q108325": ("monumento", "palacio"),
    "Q11303":  ("monumento", "rascacielos"),
    "Q12280":  ("monumento", "puente"),
    "Q22698":  ("naturaleza","parque"),
    "Q193912": ("naturaleza","parque nacional"),
    "Q11459":  ("naturaleza","cascada"),
    "Q8502":   ("naturaleza","montaña"),
    "Q35112":  ("monumento", "parque arqueológico"),
    "Q1107656":("naturaleza","jardín"),
}


def import_country(country_code: str, max_per_type: int = 800) -> Path:
    qid = COUNTRY_QID.get(country_code.upper())
    if not qid:
        raise ValueError(f"País no soportado: {country_code}. Disponibles: {list(COUNTRY_QID)}")

    print(f"[wikidata] === {country_code} === Q={qid} {len(POI_TYPES)} tipos × {max_per_type}")

    all_pois: list[dict] = []
    seen = set()

    for type_qid in POI_TYPES:
        cat, label = TYPE_TO_CATEGORY.get(type_qid, ("monumento", type_qid))
        query = build_sparql_one_type(qid, type_qid, max_per_type)
        print(f"[wikidata] type {type_qid} ({label})...")

        try:
            r = requests.post(SPARQL_ENDPOINT, data={"query": query}, headers=HEADERS, timeout=90)
            if r.status_code != 200:
                print(f"   → HTTP {r.status_code} · {r.text[:120]}")
                continue
            data = r.json()
        except Exception as e:
            print(f"   → ERROR: {type(e).__name__}: {e}")
            continue

        bindings = data.get("results", {}).get("bindings", [])
        added = 0
        for b in bindings:
            item = b.get("item", {}).get("value", "")
            qid_item = item.rsplit("/", 1)[-1] if item else None
            if not qid_item or qid_item in seen:
                continue
            coord = b.get("coord", {}).get("value", "")
            latlng = _wkt_to_latlng(coord)
            if not latlng:
                continue
            name = b.get("itemLabel", {}).get("value", qid_item)
            if name == qid_item:  # sin nombre legible
                continue
            seen.add(qid_item)
            image = b.get("image", {}).get("value")
            heritage = b.get("heritage", {}).get("value")
            all_pois.append({
                "id": f"wd-{qid_item}",
                "name": name,
                "lat": round(latlng[0], 6),
                "lng": round(latlng[1], 6),
                "country_code": country_code.upper(),
                "category": cat,
                "type": label,
                "wikidata": qid_item,
                "image_url": image,
                "unesco": bool(heritage),
            })
            added += 1
        print(f"   → +{added} (acumulado {len(all_pois)})")
        time.sleep(1)  # cortesía SPARQL

    print(f"[wikidata] TOTAL {country_code}: {len(all_pois)} POIs válidos")
    out_path = OUTPUT_DIR / f"{country_code.lower()}.json"
    out_path.write_text(
        json.dumps({"country": country_code.upper(), "source": "wikidata", "count": len(all_pois), "pois": all_pois},
                   ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print(f"[wikidata] OK · {out_path} ({out_path.stat().st_size // 1024} KB)")
    return out_path


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="kudos_engine.scripts.import_wikidata")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--country", help="Código ISO-2 (ES, IT, FR, JP...)")
    g.add_argument("--all", action="store_true", help="Importa los ~30 países pre-mapeados")
    p.add_argument("--max", type=int, default=800, help="Tope por tipo (16 tipos)")
    args = p.parse_args(argv)

    if args.all:
        for cc in COUNTRY_QID.keys():
            try:
                import_country(cc, args.max)
                time.sleep(2)
            except Exception as e:
                print(f"[{cc}] FALLO: {e}")
        return 0

    if args.country:
        import_country(args.country, args.max)
    return 0


if __name__ == "__main__":
    sys.exit(main())
