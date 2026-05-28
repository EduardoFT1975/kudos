"""
KUDOS · S1 · Pre-computar tier de TODOS los POIs Wikidata.

Aplica el algoritmo "Selecta KUDOS" (mismo que el frontend) y reescribe
los jsons con campo `tier` ya calculado. Frontend pasa de calcular a leer.

Ventajas:
  - El frontend no recalcula tier en cada carga (CPU saved)
  - Podemos ajustar reglas tier sin redeploy frontend
  - El campo tier sirve para indexación y filtrado backend
  - Stats por país: cuántos POIs S/A/B/C en cada mercado

Uso:
  python -m kudos_engine.scripts.recompute_tiers
  python -m kudos_engine.scripts.recompute_tiers --dry-run
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path


# ─── Paths ──────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[2]           # kudos_project/
WIKIDATA_DIR = ROOT / "experience" / "public" / "data" / "wikidata"


# ─── Algoritmo Selecta KUDOS (mismo que frontend WorldEngine.tsx) ────
LEGENDARY_IDS = {
    "wd-Q10285",        # Coliseo Roma
    "wd-Q43332",        # Sagrada Familia
    "wd-Q39054",        # Machu Picchu
    "wd-Q5788",         # Petra
    "wd-Q5788",
    "wd-Q243",          # Acropolis Athens
    "wd-Q43483",        # Alhambra Granada
    "wd-Q39054",
    "wd-Q9202",         # Hagia Sophia Istanbul
    "wd-Q156628",       # Eiffel Tower
    "wd-Q43473",        # Taj Mahal
    "wd-Q12501",        # Great Wall China
    "wd-Q37200",        # Pyramids of Giza
    "wd-Q12506",        # Chichen Itza
    "wd-Q9438",         # Cristo Redentor
    "wd-Q43473",
    "wd-Q43332",
    "wd-Q9279",         # Notre Dame Paris
    "wd-Q9438",
}

KEYWORDS_S = re.compile(r"alh[áa]mbra|sagrada familia|machu picchu|coliseo|colosseum|acr[óo]polis|gran pir[áa]mide|notre-dame de paris|reichstag|templo de karnak|baz[íi]lica de san pedro|gran mezquita de c[óo]rdoba", re.IGNORECASE)
KEYWORDS_A = re.compile(r"catedral de |cathedral of |alc[áa]zar de |abad[íi]a de |abbey of |monasterio del |monasterio de san |monasterio de santa |palacio real de |palacio nacional de |teatro romano de |villa romana de |anfiteatro romano de |museo nacional de |biblioteca nacional de |plaza mayor de ", re.IGNORECASE)
KEYWORDS_B = re.compile(r"bas[íi]lica|catedral|cathedral|monasterio|abad[íi]a|abbey|alc[áa]zar|alh[áa]mbra|santuario|castillo|castle|fortaleza|fortress|murall|alcazaba|teatro romano|villa romana|anfiteatro|yacimiento arqueol[óo]gico|parque nacional|jard[íi]n bot[áa]nico|reserva natural|dolmen|menhir|m[áa]moa|t[úu]mulo|petr[óo]glifo|museo de arte|museo arqueol[óo]gico|pinacoteca", re.IGNORECASE)


def infer_category_short(category: str | None, type_: str | None, name: str | None) -> str:
    t = f"{type_ or ''} {category or ''} {name or ''}".lower()
    if re.search(r"iglesia|church|basilic|catedral|cathedral|monasterio|monastery|abad[ií]a|abbey|ermita|capilla|chapel|mosque|synagog|temple|sanctuar", t):
        return "religious"
    if re.search(r"castillo|castle|fortaleza|fortress|alcazar|alc[áa]zar|tower|torre|fort|murall", t):
        return "castle"
    if re.search(r"palacio|palace|palau", t):
        return "palace"
    if re.search(r"dolmen|menhir|m[áa]moa|t[úu]mulo|megalit|cromlech|petr[óo]glifo", t):
        return "megalith"
    if re.search(r"yacimiento|ruina|ruin|archaeolog|arqueol|villa romana|teatro romano|anfiteatro", t):
        return "archaeology"
    if re.search(r"museo|museum|galer[íi]a|gallery", t):
        return "museum"
    return ""


def tier_for(p: dict) -> str:
    if p.get("id") in LEGENDARY_IDS: return "S"
    name = p.get("name") or ""
    unesco = bool(p.get("unesco"))
    has_image = bool(p.get("image_url"))

    # Tier S · LEGENDARY o keyword icónica top
    if KEYWORDS_S.search(name): return "S"

    # Tier A · debe ser ICÓNICO · foto + keyword premium (UNESCO solo no basta)
    if has_image and KEYWORDS_A.search(name): return "A"

    # Tier B · POI de calidad · foto + (UNESCO o keyword secundaria)
    if has_image and (unesco or KEYWORDS_B.search(name)): return "B"

    return "C"


# ─── Main ──────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--dir", type=Path, default=WIKIDATA_DIR)
    args = parser.parse_args()

    if not args.dir.exists():
        print(f"ERROR · directorio no encontrado: {args.dir}", file=sys.stderr)
        return 1

    files = sorted(args.dir.glob("*.json"))
    if not files:
        print(f"ERROR · no hay jsons en {args.dir}", file=sys.stderr)
        return 1

    grand_total = Counter()
    print(f"Procesando {len(files)} archivos en {args.dir}")
    print()

    for fp in files:
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        pois = data.get("pois", [])
        country_stats = Counter()
        for p in pois:
            t = tier_for(p)
            p["tier"] = t
            country_stats[t] += 1
            grand_total[t] += 1
        print(f"  {fp.stem.upper():<4} · {len(pois):>5} POIs · "
              f"S={country_stats['S']:>3} A={country_stats['A']:>4} "
              f"B={country_stats['B']:>4} C={country_stats['C']:>5}")
        if not args.dry_run:
            tmp = fp.with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
            tmp.replace(fp)

    print()
    print(f"TOTAL · S={grand_total['S']} A={grand_total['A']} "
          f"B={grand_total['B']} C={grand_total['C']}")
    visible = grand_total["S"] + grand_total["A"] + grand_total["B"]
    total = sum(grand_total.values())
    print(f"VISIBLES (S+A+B) · {visible}/{total} = {100*visible/total:.1f}%")
    if args.dry_run:
        print("\n[DRY RUN · no se ha modificado nada]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
