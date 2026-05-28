"""
KUDOS · Importador masivo de POIs desde OpenStreetMap.

Usa la API Overpass (https://wiki.openstreetmap.org/wiki/Overpass_API) para
descargar miles de POIs reales (monumentos, museos, sitios históricos,
naturaleza, gastronomía señalada) de un país o región dada.

Cada POI incluye:
  - id estable (osm/{type}/{id})
  - name (multilingüe, prefiere ES → local → EN)
  - lat / lng
  - category (mapeado a PoiCategory de KUDOS)
  - country
  - wikidata_id (cuando OSM lo tiene)
  - osm_tags (subset relevante)

Salida: experience/public/data/osm/<country_code>.json

Uso:
  python -m kudos_engine.scripts.import_osm --country ES                 # España
  python -m kudos_engine.scripts.import_osm --country IT --max 3000      # Italia, tope 3000
  python -m kudos_engine.scripts.import_osm --all                        # 30 países top mundo
  python -m kudos_engine.scripts.import_osm --bbox 41.7,12.3,42.0,12.6   # Roma centro
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Optional

import requests


OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
]

HEADERS = {"User-Agent": "KUDOS-Engine/0.1 (https://kudos.world)"}

# Carpeta destino — el frontend lo servirá desde /data/osm/<cc>.json
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "experience" / "public" / "data" / "osm"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Tags OSM que nos interesan (lista curada)
INTERESTING_TAGS = {
    "tourism": ["museum", "attraction", "gallery", "viewpoint", "artwork", "theme_park", "zoo", "aquarium", "monument"],
    "historic": ["castle", "monument", "memorial", "ruins", "archaeological_site", "battlefield", "fort", "tomb",
                 "wayside_cross", "wayside_shrine", "city_gate", "tower", "aqueduct", "manor", "palace", "church"],
    "amenity": ["place_of_worship", "theatre", "arts_centre", "library"],
    "leisure": ["nature_reserve", "garden", "park"],
    "natural": ["peak", "volcano", "cave_entrance", "waterfall", "spring", "geyser", "rock", "cliff"],
    "place": ["square"],
}

# Mapeo OSM → PoiCategory de KUDOS
CATEGORY_MAP = {
    # monumentos / patrimonio
    "tourism=monument": "monumento", "tourism=attraction": "monumento", "tourism=viewpoint": "monumento",
    "historic=castle": "monumento", "historic=monument": "monumento", "historic=memorial": "monumento",
    "historic=ruins": "monumento", "historic=archaeological_site": "monumento", "historic=fort": "monumento",
    "historic=tower": "monumento", "historic=aqueduct": "monumento", "historic=palace": "monumento",
    "historic=tomb": "monumento", "historic=city_gate": "monumento", "historic=battlefield": "monumento",
    "historic=manor": "monumento", "historic=church": "monumento",
    "amenity=place_of_worship": "monumento",
    "place=square": "monumento",
    # museos
    "tourism=museum": "museo", "tourism=gallery": "museo",
    "amenity=theatre": "museo", "amenity=arts_centre": "museo", "amenity=library": "museo",
    "tourism=artwork": "museo",
    # naturaleza
    "leisure=nature_reserve": "naturaleza", "leisure=garden": "naturaleza", "leisure=park": "naturaleza",
    "natural=peak": "naturaleza", "natural=volcano": "naturaleza", "natural=cave_entrance": "naturaleza",
    "natural=waterfall": "naturaleza", "natural=spring": "naturaleza", "natural=geyser": "naturaleza",
    "natural=rock": "naturaleza", "natural=cliff": "naturaleza",
    "tourism=theme_park": "naturaleza", "tourism=zoo": "naturaleza", "tourism=aquarium": "naturaleza",
    # otros
    "historic=wayside_cross": "monumento", "historic=wayside_shrine": "monumento",
}


# Bounding boxes oficiales (sur, oeste, norte, este) para algunos países top
COUNTRY_BBOX = {
    "ES": (36.0, -9.5, 43.8, 4.3),     # España
    "IT": (36.6, 6.6, 47.1, 18.5),     # Italia
    "FR": (41.3, -5.1, 51.1, 9.6),     # Francia
    "GR": (34.8, 19.4, 41.7, 28.3),    # Grecia
    "PT": (36.9, -9.6, 42.2, -6.2),    # Portugal
    "DE": (47.3, 5.9, 55.1, 15.0),     # Alemania
    "GB": (49.9, -8.7, 60.9, 1.8),     # Reino Unido
    "EG": (22.0, 24.7, 31.7, 36.9),    # Egipto
    "MX": (14.5, -117.1, 32.7, -86.7), # México
    "PE": (-18.4, -81.4, -0.0, -68.7), # Perú
    "IN": (8.1, 68.1, 35.5, 97.4),     # India
    "CN": (18.2, 73.5, 53.6, 134.8),   # China
    "JP": (24.3, 122.9, 45.5, 145.8),  # Japón
    "TR": (35.8, 26.0, 42.1, 44.8),    # Turquía
    "US": (24.4, -125.0, 49.4, -66.9), # EE.UU.
    "CA": (41.7, -141.0, 83.1, -52.6), # Canadá
    "BR": (-33.7, -73.9, 5.3, -34.8),  # Brasil
    "AR": (-55.1, -73.6, -21.8, -53.6),# Argentina
    "AU": (-43.6, 113.3, -10.7, 153.6),# Australia
    "ZA": (-34.8, 16.5, -22.1, 32.9),  # Sudáfrica
    "MA": (21.4, -17.0, 35.9, -1.0),   # Marruecos
    "CL": (-55.9, -75.6, -17.5, -66.4),# Chile
    "KH": (10.4, 102.3, 14.7, 107.6),  # Camboya
    "JO": (29.2, 34.9, 33.4, 39.3),    # Jordania
    "TH": (5.6, 97.3, 20.5, 105.6),    # Tailandia
    "MM": (9.4, 92.2, 28.5, 101.2),    # Myanmar
    "IL": (29.5, 34.3, 33.3, 35.9),    # Israel
    "RU": (41.2, 19.7, 81.9, -169.0),  # Rusia (cuidado meridiano)
    "NL": (50.7, 3.3, 53.6, 7.2),      # Países Bajos
    "CZ": (48.6, 12.1, 51.1, 18.9),    # Rep. Checa
}


def _build_query_for_tag(bbox: tuple[float, float, float, float],
                          tag_key: str, values: list[str],
                          max_results: int = 2000) -> str:
    """Construye una query Overpass QL pequeña para UN solo tag_key."""
    s, w, n, e = bbox
    bbox_str = f"({s},{w},{n},{e})"
    parts = []
    for v in values:
        # Solo nodos/ways con nombre — descartamos los anónimos
        parts.append(f'node["{tag_key}"="{v}"]["name"]{bbox_str};')
        parts.append(f'way["{tag_key}"="{v}"]["name"]{bbox_str};')
    body = "\n  ".join(parts)
    return (
        f'[out:json][timeout:180];\n'
        f'(\n  {body}\n);\n'
        f'out center {max_results};\n'
    )


def _run_overpass(query: str) -> Optional[dict]:
    """Ejecuta la query contra el primer endpoint que responda."""
    last_err = None
    for url in OVERPASS_URLS:
        try:
            print(f"[overpass] POST {url} (query {len(query)} bytes)...")
            r = requests.post(url, data={"data": query}, headers=HEADERS, timeout=300)
            print(f"[overpass]   → HTTP {r.status_code}, {len(r.content)} bytes")
            if r.status_code == 200:
                try:
                    data = r.json()
                    return data
                except Exception as e:
                    print(f"[overpass]   → JSON parse error: {e}")
                    last_err = e
            else:
                print(f"[overpass]   → body: {r.text[:300]}")
                last_err = RuntimeError(f"HTTP {r.status_code}")
        except Exception as e:
            print(f"[overpass]   → {type(e).__name__}: {e}")
            last_err = e
        time.sleep(3)
    print(f"[overpass] TODOS los endpoints fallaron · último error: {last_err}")
    return None


def _normalize(elem: dict, country_code: str) -> Optional[dict]:
    """Convierte un elemento OSM en POI KUDOS. Devuelve None si no es válido."""

    tags = elem.get("tags") or {}
    name = (
        tags.get("name:es")
        or tags.get("name:en")
        or tags.get("name:fr")
        or tags.get("int_name")
        or tags.get("name")
    )
    if not name:
        return None

    # Coords (nodo o way con center)
    if elem.get("type") == "node":
        lat, lng = elem.get("lat"), elem.get("lon")
    else:
        c = elem.get("center") or {}
        lat, lng = c.get("lat"), c.get("lon")
    if lat is None or lng is None:
        return None

    # Categoría: tomar el primer tag que matchee
    category = None
    matched_tag = None
    for tag_key, values in INTERESTING_TAGS.items():
        if tags.get(tag_key) in values:
            matched_tag = f"{tag_key}={tags[tag_key]}"
            category = CATEGORY_MAP.get(matched_tag, "monumento")
            break
    if not category:
        return None

    return {
        "id": f'osm-{elem.get("type")}-{elem.get("id")}',
        "name": name,
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "country_code": country_code,
        "category": category,
        "osm_tag": matched_tag,
        "wikidata_id": tags.get("wikidata"),
        "wikipedia": tags.get("wikipedia"),
        "website": tags.get("website") or tags.get("url"),
        "image_url": tags.get("image"),
        "heritage": tags.get("heritage") or tags.get("heritage:operator"),
        "unesco": "unesco" in (tags.get("heritage:operator") or "").lower()
                   or "unesco" in (tags.get("operator") or "").lower(),
    }


def import_country(country_code: str, max_results: int = 5000) -> Path:
    """
    Descarga, normaliza y guarda los POIs de un país.
    Hace UNA query por cada tag_key (tourism, historic, amenity, leisure, natural,
    place) para evitar el timeout que ocurría al pedir todo de golpe.
    """
    bbox = COUNTRY_BBOX.get(country_code.upper())
    if not bbox:
        raise ValueError(f"País no soportado: {country_code}. Añádelo a COUNTRY_BBOX.")

    print(f"[osm] === {country_code} === bbox={bbox} max/tag={max_results}")
    all_elements: list[dict] = []
    for tag_key, values in INTERESTING_TAGS.items():
        print(f"[osm] tag '{tag_key}' ({len(values)} valores)...")
        query = _build_query_for_tag(bbox, tag_key, values, max_results)
        data = _run_overpass(query)
        if not data:
            print(f"[osm] tag '{tag_key}' FALLÓ · sigo con el siguiente")
            continue
        elems = data.get("elements", [])
        print(f"[osm] tag '{tag_key}' → {len(elems)} elementos")
        all_elements.extend(elems)
        time.sleep(2)  # cortesía Overpass

    print(f"[osm] TOTAL elementos crudos: {len(all_elements)}")

    pois = []
    seen_ids = set()
    for el in all_elements:
        p = _normalize(el, country_code.upper())
        if p and p["id"] not in seen_ids:
            seen_ids.add(p["id"])
            pois.append(p)

    print(f"[osm] {len(pois)} POIs válidos (con nombre + coords + categoría)")

    out_path = OUTPUT_DIR / f"{country_code.lower()}.json"
    out_path.write_text(
        json.dumps({"country": country_code.upper(), "count": len(pois), "pois": pois},
                   ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print(f"[osm] OK · {out_path} ({out_path.stat().st_size // 1024} KB)")
    return out_path


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="kudos_engine.scripts.import_osm")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--country", help="Código país ISO-2 (ej: ES, IT, FR)")
    g.add_argument("--bbox", help="Bbox custom: south,west,north,east")
    g.add_argument("--all", action="store_true", help="Importa todos los países conocidos")
    p.add_argument("--max", type=int, default=5000, help="Tope de POIs por país")
    args = p.parse_args(argv)

    if args.all:
        for cc in COUNTRY_BBOX.keys():
            try:
                import_country(cc, args.max)
                time.sleep(3)  # cortesía Overpass
            except Exception as e:
                print(f"[{cc}] FALLO: {e}")
        return 0

    if args.country:
        import_country(args.country, args.max)
        return 0

    if args.bbox:
        parts = [float(x) for x in args.bbox.split(",")]
        if len(parts) != 4:
            print("--bbox necesita 4 valores: south,west,north,east")
            return 1
        bbox = tuple(parts)  # type: ignore
        # Hack: reusar import_country pero con bbox custom
        print(f"[osm] bbox custom: {bbox}")
        query = _build_query(bbox, args.max)  # type: ignore
        data = _run_overpass(query)
        if not data:
            return 1
        pois = []
        for el in data.get("elements", []):
            p2 = _normalize(el, "XX")
            if p2:
                pois.append(p2)
        out = OUTPUT_DIR / "custom-bbox.json"
        out.write_text(json.dumps({"count": len(pois), "pois": pois}, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"[osm] OK · {out} ({len(pois)} POIs)")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
