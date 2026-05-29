"""
KUDOS · G1 · Pipeline batch · genera cápsulas reales para Top Tier S+A.

Output:
  experience/public/capsules/{wd-id}/capsule.mp4
  experience/public/capsules/{wd-id}/metadata.json
  experience/public/capsules/index.json     (manifest leído por frontend)

Uso (en C:/Users/efert/kudos_project):

  # Solo Tier S (~20 POIs · ~30 min · ~$3 Anthropic)
  python -m kudos_engine.scripts.generate_capsules_top --tier S

  # Tier S + A · primeras 50 (~2-3h · ~$15)
  python -m kudos_engine.scripts.generate_capsules_top --tier A --limit 50

  # Reanuda · skip las que ya tengan capsule.mp4
  python -m kudos_engine.scripts.generate_capsules_top --resume

  # Sin Anthropic (guion plantilla · gratis · sin IA)
  python -m kudos_engine.scripts.generate_capsules_top --no-anthropic --tier S

Variables de entorno necesarias:
  ANTHROPIC_API_KEY (opcional · sin esta var usa --no-anthropic forzado)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from pathlib import Path

from kudos_engine.pipeline import generate_capsule


ROOT = Path(__file__).resolve().parents[2]              # kudos_project/
WIKIDATA_DIR = ROOT / "experience" / "public" / "data" / "wikidata"
OUT_CAPSULES = ROOT / "experience" / "public" / "capsules"
MANIFEST_PATH = OUT_CAPSULES / "index.json"


def collect_pois(tier_max: str, limit: int) -> list[dict]:
    """
    Recolecta POIs candidatos · tier_max="S" → solo S
                                tier_max="A" → S + A
                                tier_max="B" → S + A + B
    """
    allowed = {"S": ["S"], "A": ["S", "A"], "B": ["S", "A", "B"]}[tier_max]
    pois: list[dict] = []
    for fp in sorted(WIKIDATA_DIR.glob("*.json")):
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        for p in data.get("pois", []):
            if p.get("tier") not in allowed: continue
            if not p.get("name"): continue
            # Necesario para tier algo (genera el recipe correcto)
            p["wikipedia_languages"] = p.get("wikipedia_languages", 30)
            p["annual_visitors"] = p.get("annual_visitors", 500_000)
            pois.append(p)

    # Ordenar por tier S primero · luego nombre
    tier_order = {"S": 0, "A": 1, "B": 2}
    pois.sort(key=lambda p: (tier_order.get(p.get("tier"), 9), p.get("name", "")))
    return pois[:limit] if limit else pois


def load_manifest() -> dict:
    if not MANIFEST_PATH.exists(): return {"capsules": {}, "updated_at": None}
    try:
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"capsules": {}, "updated_at": None}


def save_manifest(m: dict) -> None:
    OUT_CAPSULES.mkdir(parents=True, exist_ok=True)
    m["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    # Atomic
    import tempfile
    fd, tmp = tempfile.mkstemp(dir=OUT_CAPSULES, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            json.dump(m, f, ensure_ascii=False, indent=2)
        os.replace(tmp, MANIFEST_PATH)
    except Exception:
        try: os.unlink(tmp)
        except: pass
        raise


def process_poi(poi: dict, no_anthropic: bool, voice: str) -> dict:
    """
    Genera la cápsula y la copia al public/capsules/{wd-id}/
    Devuelve dict con info para el manifest.
    """
    wd_id = poi.get("id", "unknown")
    name = poi.get("name", "POI sin nombre")
    out_dir = OUT_CAPSULES / wd_id
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n──────────────────────────────────────")
    print(f"  {wd_id} · {name[:60]} · tier={poi.get('tier')}")
    print(f"──────────────────────────────────────")

    # Si no anthropic, marcar para usar guion plantilla
    if no_anthropic:
        os.environ.pop("ANTHROPIC_API_KEY", None)   # forzar fallback

    # Generar con el pipeline existente
    result = generate_capsule(poi, voice=voice, include_intro=True, verbose=True)

    if not result.get("video"):
        return {"status": "no_video", "tier": poi.get("tier"), "name": name}

    # Mover/copiar el MP4 generado al public/capsules
    import shutil
    src_mp4 = Path(result["video"])
    dst_mp4 = out_dir / "capsule.mp4"
    if src_mp4.exists():
        shutil.copy2(src_mp4, dst_mp4)

    # Copiar metadata
    src_meta = Path(result.get("metadata", ""))
    dst_meta = out_dir / "metadata.json"
    if src_meta.exists():
        shutil.copy2(src_meta, dst_meta)

    size_mb = round(dst_mp4.stat().st_size / 1024 / 1024, 2) if dst_mp4.exists() else 0
    return {
        "status": "ok",
        "tier": poi.get("tier"),
        "name": name,
        "url": f"/capsules/{wd_id}/capsule.mp4",
        "meta_url": f"/capsules/{wd_id}/metadata.json",
        "size_mb": size_mb,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Genera cápsulas KUDOS en batch.")
    parser.add_argument("--tier", default="S", choices=["S", "A", "B"],
                        help="Máximo tier a procesar (S=solo S, A=S+A, B=S+A+B). Default: S")
    parser.add_argument("--limit", type=int, default=0,
                        help="Máximo de POIs a procesar (0=todos)")
    parser.add_argument("--resume", action="store_true",
                        help="Saltar POIs cuyo capsule.mp4 ya existe")
    parser.add_argument("--no-anthropic", action="store_true",
                        help="Usar guion plantilla (sin Anthropic · gratis pero menos rico)")
    parser.add_argument("--voice", default="es-ES-AlvaroNeural",
                        help="Voz Edge-TTS · default es-ES-AlvaroNeural")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not WIKIDATA_DIR.exists():
        print(f"ERROR · no encuentro {WIKIDATA_DIR}", file=sys.stderr)
        return 1

    # Validar Anthropic
    if not args.no_anthropic and not os.environ.get("ANTHROPIC_API_KEY"):
        print("ADVERTENCIA · ANTHROPIC_API_KEY no encontrada · forzando --no-anthropic")
        args.no_anthropic = True

    OUT_CAPSULES.mkdir(parents=True, exist_ok=True)

    pois = collect_pois(args.tier, args.limit)
    print(f"\n{'═'*60}")
    print(f"  KUDOS · batch capsules")
    print(f"  Tier max: {args.tier} · Limit: {args.limit or 'todos'}")
    print(f"  Total candidatos: {len(pois)}")
    print(f"  Resume: {args.resume} · No-Anthropic: {args.no_anthropic}")
    print(f"  Voice: {args.voice}")
    print(f"{'═'*60}\n")

    if args.dry_run:
        for i, p in enumerate(pois[:30]):
            print(f"  [{i+1:>3}] {p.get('tier')} · {p.get('id'):>15} · {p.get('name')[:50]}")
        if len(pois) > 30:
            print(f"  ... ({len(pois)-30} más)")
        return 0

    manifest = load_manifest()
    ok, skipped, failed = 0, 0, 0
    t0 = time.time()

    for i, poi in enumerate(pois):
        wd_id = poi.get("id")
        out_mp4 = OUT_CAPSULES / wd_id / "capsule.mp4"

        if args.resume and out_mp4.exists():
            skipped += 1
            print(f"  [{i+1:>3}/{len(pois)}] SKIP {wd_id} (ya existe)")
            continue

        # Retry exterior · si falla por red (DNS, timeout, etc.), reintentar 2 veces
        info = None
        last_err = None
        for attempt in range(3):
            try:
                info = process_poi(poi, args.no_anthropic, args.voice)
                break
            except (ConnectionError, OSError) as e:
                last_err = e
                if attempt < 2:
                    wait = 5 * (attempt + 1)
                    print(f"  [retry] red falló · esperando {wait}s · intento {attempt+2}/3")
                    time.sleep(wait)
            except Exception as e:
                # Errores no de red · no reintentar
                raise
        if info is None:
            failed += 1
            print(f"  ERROR red persistente {wd_id}: {last_err}")
            continue
        try:
            if info.get("status") == "ok":
                manifest["capsules"][wd_id] = info
                save_manifest(manifest)
                ok += 1
            else:
                failed += 1
        except KeyboardInterrupt:
            print("\n[Ctrl+C] · interrumpido por usuario")
            save_manifest(manifest)
            break
        except Exception as e:
            failed += 1
            print(f"  ERROR procesando {wd_id}: {e}")
            traceback.print_exc()

        # Progress summary
        elapsed = time.time() - t0
        avg = elapsed / (ok + failed + 1)
        eta_min = (len(pois) - (i + 1)) * avg / 60
        print(f"\n  Progreso: ok={ok} skip={skipped} fail={failed} · "
              f"{elapsed/60:.1f}min transcurridos · ETA {eta_min:.0f}min")

    # Final
    print(f"\n{'═'*60}")
    print(f"  FIN · ok={ok} · skip={skipped} · failed={failed}")
    print(f"  Manifest: {MANIFEST_PATH}")
    print(f"  {len(manifest['capsules'])} cápsulas listas")
    print(f"{'═'*60}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
