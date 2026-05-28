"""
KUDOS · G2 · Curate capsules post-batch.

Lee experience/public/capsules/index.json y detecta DUPLICADOS:
  - Cápsulas cuyo name contiene la misma keyword canónica
    (alhambra, acrópolis, sagrada familia, etc.)

Genera 2 archivos:
  - index_curated.json    · solo la cápsula canónica por grupo
  - index_review.json     · listado de duplicados detectados para revisión

NO borra cápsulas físicas (los MP4 quedan por si los recuperas).

Uso:
  python -m kudos_engine.scripts.curate_capsules
  python -m kudos_engine.scripts.curate_capsules --apply   (sobreescribe index.json)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from collections import defaultdict


ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "experience" / "public" / "capsules" / "index.json"
CURATED = INDEX.parent / "index_curated.json"
REVIEW = INDEX.parent / "index_review.json"


# Patrones canónicos · todo lo que matchee una de estas keywords se considera
# parte del MISMO grupo · sólo se queda la cápsula con nombre más corto (canónico).
CANONICAL_GROUPS = [
    ("alhambra",        re.compile(r"alh[áa]mbra",          re.IGNORECASE)),
    ("acropolis",       re.compile(r"acr[óo]polis|acropolis", re.IGNORECASE)),
    ("sagrada-familia", re.compile(r"sagrada\s+familia",    re.IGNORECASE)),
    ("notre-dame",      re.compile(r"notre[- ]dame",         re.IGNORECASE)),
    ("foro-romano",     re.compile(r"foro romano|forum romanum", re.IGNORECASE)),
    ("coliseo",         re.compile(r"coliseo|colosseum",     re.IGNORECASE)),
    ("eiffel",          re.compile(r"eiffel",                re.IGNORECASE)),
    ("torre-londres",   re.compile(r"torre de londres|tower of london", re.IGNORECASE)),
    ("pompeya",         re.compile(r"pompeya|pompeii",       re.IGNORECASE)),
    ("vaticano",        re.compile(r"vaticano|vatican|san pedro( del)? vaticano", re.IGNORECASE)),
    ("capilla-sixtina", re.compile(r"capilla sixtina|sistine chapel", re.IGNORECASE)),
]


def group_for(name: str) -> str:
    for key, rx in CANONICAL_GROUPS:
        if rx.search(name): return key
    return ""   # sin grupo · cápsula única


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true",
                        help="Sobreescribe index.json con la versión curada")
    args = parser.parse_args()

    if not INDEX.exists():
        print(f"ERROR · no encuentro {INDEX}", file=sys.stderr)
        return 1

    data = json.loads(INDEX.read_text(encoding="utf-8"))
    capsules = data.get("capsules", {})
    if not capsules:
        print("Index vacío · nada que curar")
        return 0

    # Agrupar por canonical
    groups: dict[str, list[tuple[str, dict]]] = defaultdict(list)
    singletons: dict[str, dict] = {}
    for wd_id, info in capsules.items():
        name = info.get("name", "")
        gkey = group_for(name)
        if gkey:
            groups[gkey].append((wd_id, info))
        else:
            singletons[wd_id] = info

    # Para cada grupo: ordenar por longitud del nombre · quedarse con el más corto (canónico)
    curated: dict[str, dict] = dict(singletons)
    review: dict[str, list] = {}

    for gkey, members in groups.items():
        members.sort(key=lambda x: len(x[1].get("name", "")))
        canonical_id, canonical_info = members[0]
        curated[canonical_id] = canonical_info
        if len(members) > 1:
            review[gkey] = [
                {"id": wd, "name": info.get("name"), "canonical": (wd == canonical_id)}
                for wd, info in members
            ]

    print(f"\n{'═'*60}")
    print(f"  Curación · {len(capsules)} cápsulas → {len(curated)} canónicas")
    print(f"  Grupos con duplicados: {len(review)}")
    print(f"{'═'*60}\n")

    for gkey, items in review.items():
        print(f"  [{gkey}]")
        for it in items:
            mark = "★" if it["canonical"] else " "
            print(f"    {mark} {it['id']:>15} · {it['name'][:60]}")
        print()

    # Guardar archivos
    data_curated = {"capsules": curated, "updated_at": data.get("updated_at")}
    CURATED.write_text(json.dumps(data_curated, ensure_ascii=False, indent=2), encoding="utf-8")
    REVIEW.write_text(json.dumps(review, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generado: {CURATED.name}")
    print(f"Generado: {REVIEW.name}")

    if args.apply:
        import shutil
        shutil.copy2(CURATED, INDEX)
        print(f"\n--apply · {INDEX.name} sobreescrito con {len(curated)} cápsulas canónicas")
    else:
        print(f"\nDry-run · no se ha tocado {INDEX.name}")
        print(f"  Para aplicar:  python -m kudos_engine.scripts.curate_capsules --apply")
    return 0


if __name__ == "__main__":
    sys.exit(main())
