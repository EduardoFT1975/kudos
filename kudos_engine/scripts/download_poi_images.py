"""
KUDOS · Descarga imágenes Wikimedia de POIs Tier S+A · genera WebP locales.

Soluciona la dependencia de Wikimedia FilePath en producción:
  - 95% de los POIs visibles (S+A) tienen imagen propia en /public
  - Tier B sigue con Wikimedia (cuando crezcamos los movemos a R2)
  - Cuando tengas Cloudflare R2 cambia BASE_URL_LOCAL y listo

Salida: experience/public/poi-images/{wd-id}_card.webp (240x240)
        experience/public/poi-images/{wd-id}_hero.webp (1080x720)

Reescribe JSONs Wikidata añadiendo campo image_url_local que apunta a la URL relativa.

Uso (en C:\Users\efert\kudos_project):
  python -m kudos_engine.scripts.download_poi_images
  python -m kudos_engine.scripts.download_poi_images --workers 8
  python -m kudos_engine.scripts.download_poi_images --tier-min A   (solo Tier S)
  python -m kudos_engine.scripts.download_poi_images --resume       (skip ya descargadas)
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
from urllib.parse import quote
import urllib.request
import urllib.error

try:
    from PIL import Image
except ImportError:
    print("ERROR · Pillow no instalado · pip install Pillow", file=sys.stderr)
    sys.exit(1)


ROOT = Path(__file__).resolve().parents[2]               # kudos_project/
WIKIDATA_DIR = ROOT / "experience" / "public" / "data" / "wikidata"
IMAGES_DIR = ROOT / "experience" / "public" / "poi-images"
BASE_URL_LOCAL = "/poi-images"      # ← cambiar a CDN cuando exista (ej: https://cdn.kudos.app)

USER_AGENT = "KudosBot/1.0 (https://kudos.app · eduardo@kudos.world)"
TIMEOUT_S = 25

SIZES = [
    ("card",  240),
    ("hero",  1080),
]


def fetch_bytes(url: str, max_retries: int = 3) -> bytes:
    """Descarga con retries + backoff."""
    last_err = None
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=TIMEOUT_S) as r:
                return r.read()
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            last_err = e
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"fetch failed after {max_retries}: {last_err}")


def process_one(poi: dict, resume: bool = False) -> tuple[str, str | None, str | None]:
    """
    Procesa una imagen. Devuelve (poi_id, local_url_card | None, error_msg | None).
    """
    poi_id = poi.get("id", "unknown")
    src_url = poi.get("image_url")
    if not src_url:
        return (poi_id, None, "no image_url")

    # Forzar HTTPS
    if src_url.startswith("http://"):
        src_url = "https://" + src_url[len("http://"):]

    # Asegurar Special:FilePath con width param para descarga directa
    fetch_url = src_url if "?width=" in src_url or "?" in src_url else src_url + "?width=1200"

    # Paths de salida
    card_path = IMAGES_DIR / f"{poi_id}_card.webp"
    hero_path = IMAGES_DIR / f"{poi_id}_hero.webp"

    if resume and card_path.exists() and hero_path.exists():
        return (poi_id, f"{BASE_URL_LOCAL}/{poi_id}_card.webp", None)

    try:
        raw = fetch_bytes(fetch_url)
        img = Image.open(BytesIO(raw))
        # Forzar RGB (algunas wikimedia vienen RGBA o paleta)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
    except Exception as e:
        return (poi_id, None, f"fetch/decode: {e}")

    # Genera card 240×240 (cuadrado center-crop) y hero 1080 ancho (proporcional)
    try:
        # Card · center-crop a cuadrado, luego resize 240
        w, h = img.size
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        card_img = img.crop((left, top, left + side, top + side)).resize((240, 240), Image.LANCZOS)
        card_img.save(card_path, "WEBP", quality=82, method=6)

        # Hero · ancho 1080, alto proporcional
        if w > 1080:
            ratio = 1080 / w
            hero_img = img.resize((1080, int(h * ratio)), Image.LANCZOS)
        else:
            hero_img = img
        hero_img.save(hero_path, "WEBP", quality=80, method=6)
    except Exception as e:
        return (poi_id, None, f"resize/save: {e}")

    return (poi_id, f"{BASE_URL_LOCAL}/{poi_id}_card.webp", None)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tier-min", default="B", choices=["S", "A", "B"],
                        help="Mínimo tier a descargar (default B = todos S+A+B)")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--resume", action="store_true", help="Skip las que ya existen")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max", type=int, default=0, help="Limitar a N POIs (0=todos)")
    args = parser.parse_args()

    if not WIKIDATA_DIR.exists():
        print(f"ERROR · no encuentro {WIKIDATA_DIR}", file=sys.stderr)
        return 1

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # Tiers permitidos
    allowed = {"S": ["S"], "A": ["S", "A"], "B": ["S", "A", "B"]}[args.tier_min]
    print(f"Descargando tiers: {allowed}")
    print(f"Workers: {args.workers} · Resume: {args.resume}")
    print()

    # Recolectar POIs candidatos
    all_pois: list[tuple[Path, dict]] = []     # (file_path, poi_dict)
    for fp in sorted(WIKIDATA_DIR.glob("*.json")):
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        for poi in data.get("pois", []):
            if poi.get("tier") not in allowed: continue
            if not poi.get("image_url"): continue
            all_pois.append((fp, poi))

    if args.max:
        all_pois = all_pois[:args.max]

    print(f"Total POIs candidatos: {len(all_pois)}")
    if args.dry_run:
        for fp, poi in all_pois[:10]:
            print(f"  [dry] {poi.get('id')} · {poi.get('name')[:50]} · tier={poi.get('tier')}")
        print(f"  ... ({len(all_pois)} en total)")
        return 0

    # Descarga concurrente
    results: dict[str, str | None] = {}
    errors: list[tuple[str, str]] = []
    done = 0
    t0 = time.time()

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = {ex.submit(process_one, poi, args.resume): poi.get("id") for _, poi in all_pois}
        for fut in as_completed(futures):
            poi_id, local_url, err = fut.result()
            results[poi_id] = local_url
            done += 1
            if err:
                errors.append((poi_id, err))
            if done % 20 == 0 or done == len(futures):
                elapsed = time.time() - t0
                rate = done / elapsed if elapsed > 0 else 0
                ok = sum(1 for v in results.values() if v)
                print(f"  {done:>5}/{len(futures)} · {ok} ok · {len(errors)} err · {rate:.1f}/s · {elapsed:.0f}s")

    # Re-escribir JSONs con image_url_local poblado
    print()
    print("Actualizando JSONs...")
    for fp in sorted(WIKIDATA_DIR.glob("*.json")):
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        updated = 0
        for poi in data.get("pois", []):
            pid = poi.get("id")
            if pid in results and results[pid]:
                poi["image_url_local"] = results[pid]
                updated += 1
        if updated > 0:
            tmp = fp.with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
            tmp.replace(fp)
            print(f"  {fp.name}: +{updated} image_url_local")

    print()
    print(f"FIN · {sum(1 for v in results.values() if v)} imágenes OK · {len(errors)} errores")
    if errors[:10]:
        print("\nPrimeros errores:")
        for pid, msg in errors[:10]:
            print(f"  {pid}: {msg}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
