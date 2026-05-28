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
    "wd-Q10285",   # Coliseo
    "wd-Q43332",   # Pompeya
    "wd-Q160422",   # Sagrada Familia
    "wd-Q1419",   # Foro Romano
    "wd-Q12512",   # Torre de Pisa
    "wd-Q160933",   # Venecia
    "wd-Q49093",   # Vaticano
    "wd-Q150586",   # Capilla Sixtina
    "wd-Q26013",   # Pompeya
    "wd-Q43473",   # Alhambra
    "wd-Q12511",   # Mezquita-Catedral Cordoba
    "wd-Q4233734",   # Park Güell
    "wd-Q243",   # Torre Eiffel
    "wd-Q2981",   # Notre Dame Paris
    "wd-Q19675",   # Versailles
    "wd-Q19660",   # Louvre
    "wd-Q165498",   # Mont Saint-Michel
    "wd-Q131013",   # Acropolis Athens
    "wd-Q132498",   # Partenón
    "wd-Q189814",   # Meteora
    "wd-Q9141",   # Stonehenge
    "wd-Q23306",   # Big Ben
    "wd-Q62378",   # Tower of London
    "wd-Q9259",   # British Museum
    "wd-Q22247",   # Westminster Abbey
    "wd-Q4360",   # Brandenburger Tor
    "wd-Q4250",   # Reichstag
    "wd-Q4915",   # Neuschwanstein
    "wd-Q207659",   # Torre de Belém
    "wd-Q210298",   # Monasterio Jerónimos
    "wd-Q47672",   # Fuji
    "wd-Q179195",   # Templo Kinkaku-ji
}

# POIs a EXCLUIR (ciudades como punto)
EXCLUDED_AS_POI = {
    "wd-Q12892",
    "wd-Q18287233",
    "wd-Q1492",
    "wd-Q1490",
    "wd-Q2807",
    "wd-Q641",
    "wd-Q1085",
    "wd-Q90",
    "wd-Q220",
    "wd-Q84",
    "wd-Q1741",
}

KEYWORDS_S = re.compile(r"alh[áa]mbra|sagrada familia|machu picchu|acr[óo]polis|gran pir[áa]mide|notre-dame de paris|reichstag|templo de karnak|baz[íi]lica de san pedro|gran mezquita de c[óo]rdoba", re.IGNORECASE)
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
    pid = p.get("id", "")
    # Excluir ciudades como puntos (Roma/París/Madrid... son contenedores no POIs)
    if pid in EXCLUDED_AS_POI: return "C"

    # Tier S · LEGENDARY canónico (wd-IDs hardcoded · top mundiales)
    if pid in LEGENDARY_IDS: return "S"

    name = p.get("name") or ""
    unesco = bool(p.get("unesco"))
    has_image = bool(p.get("image_url"))

    # Tier S débil · keyword icónica top (sólo si no es legendary)
    if KEYWORDS_S.search(name): return "S"

    # Tier A · foto + keyword premium
    if has_image and KEYWORDS_A.search(name): return "A"

    # Tier B · foto + (UNESCO o keyword secundaria)
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
