"""
KUDOS Engine — Provider Wikimedia Commons.

Descarga imágenes de alta calidad CC/dominio público para un POI.
Wikimedia Commons tiene millones de fotos profesionales gratis y reutilizables,
con metadatos de licencia y autor.

API usada:
  - MediaWiki API (commons.wikimedia.org/w/api.php) — búsqueda + metadatos
  - Endpoint thumb — descarga de imagen a tamaño concreto

NO requiere API key. Sin límite de tarifa práctico para nuestro uso.

Política:
  - Bajamos siempre con tamaño objetivo ≥ 1920px (para Ken Burns sin pixelar)
  - Filtramos por tipo MIME (sólo JPEG/PNG, no SVG ni TIFF)
  - Guardamos cache local en kudos_engine/cache/wikimedia/<slug>/
  - Devolvemos lista de dicts con: path local + url original + autor + licencia
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

import requests


COMMONS_API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "KUDOS-Engine/0.1 (https://kudos.world; contact: hola@kudos.world)"}


@dataclass
class WikiImage:
    """Una imagen descargada de Wikimedia Commons."""
    path: str             # ruta local al archivo descargado
    url: str              # URL original en Commons
    title: str            # título del archivo (File:...)
    author: str           # autor según metadatos
    license: str          # licencia (CC-BY-SA-4.0, PD, etc.)
    width: int
    height: int


def _slugify(text: str) -> str:
    """Convierte un nombre en slug seguro para nombre de carpeta."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:80].strip("-") or "poi"


def search_images(query: str, limit: int = 20) -> list[dict]:
    """
    Busca títulos de archivos en Commons relacionados con `query`.
    Devuelve lista de dicts {title, pageid}.
    """
    params = {
        "action": "query",
        "format": "json",
        "list": "search",
        "srsearch": f'"{query}" filetype:bitmap',
        "srnamespace": 6,   # File:
        "srlimit": limit,
    }
    r = requests.get(COMMONS_API, params=params, headers=HEADERS, timeout=20)
    r.raise_for_status()
    data = r.json()
    return data.get("query", {}).get("search", [])


def get_image_info(titles: list[str], width: int = 1920) -> list[dict]:
    """
    Pide metadatos + URL de thumbnail al tamaño deseado para una lista de títulos.
    """
    if not titles:
        return []
    params = {
        "action": "query",
        "format": "json",
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": width,
        "titles": "|".join(titles),
    }
    r = requests.get(COMMONS_API, params=params, headers=HEADERS, timeout=20)
    r.raise_for_status()
    data = r.json()
    pages = data.get("query", {}).get("pages", {})
    out = []
    for _, page in pages.items():
        infos = page.get("imageinfo") or []
        if not infos:
            continue
        info = infos[0]
        meta = info.get("extmetadata", {}) or {}
        out.append({
            "title": page.get("title", ""),
            "url_thumb": info.get("thumburl") or info.get("url"),
            "url_full": info.get("url"),
            "mime": info.get("mime", ""),
            "width": info.get("thumbwidth") or info.get("width", 0),
            "height": info.get("thumbheight") or info.get("height", 0),
            "author": _strip_html(meta.get("Artist", {}).get("value", "Desconocido")),
            "license": meta.get("LicenseShortName", {}).get("value", "Desconocida"),
        })
    return out


def _strip_html(s: str) -> str:
    """Quita tags HTML de strings de metadata (Wikimedia los devuelve con <a>...)."""
    return re.sub(r"<[^>]+>", "", s or "").strip()


def download_images_for_poi(
    poi_name: str,
    min_count: int = 8,
    max_count: int = 12,
    cache_dir: Optional[Path] = None,
    target_width: int = 1920,
) -> list[WikiImage]:
    """
    Descarga imágenes top de un POI a una carpeta de cache.

    - Busca con `poi_name` en Commons.
    - Pide metadatos en lotes de 20.
    - Descarga `max_count` imágenes JPEG/PNG válidas.
    - Si ya hay un manifest.json en cache, lo devuelve sin volver a descargar.
    """
    if cache_dir is None:
        cache_dir = Path(__file__).resolve().parent.parent / "cache" / "wikimedia"
    cache_dir.mkdir(parents=True, exist_ok=True)

    slug = _slugify(poi_name)
    poi_dir = cache_dir / slug
    poi_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = poi_dir / "manifest.json"
    if manifest_path.exists():
        # cache hit
        try:
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
            return [WikiImage(**d) for d in data]
        except Exception:
            pass  # cache corrupta → regenerar

    # 1) buscar
    hits = search_images(poi_name, limit=40)
    titles = [h["title"] for h in hits]
    if not titles:
        return []

    # 2) metadatos
    infos = get_image_info(titles, width=target_width)
    # Filtrar a JPEG/PNG y con tamaño razonable
    infos = [i for i in infos if i["mime"] in ("image/jpeg", "image/png") and i["width"] >= 800]

    # 3) descargar
    downloaded: list[WikiImage] = []
    for idx, info in enumerate(infos):
        if len(downloaded) >= max_count:
            break
        ext = ".jpg" if info["mime"] == "image/jpeg" else ".png"
        fname = f"{idx:02d}_{hashlib.md5(info['url_thumb'].encode()).hexdigest()[:8]}{ext}"
        fpath = poi_dir / fname
        try:
            resp = requests.get(info["url_thumb"], headers=HEADERS, timeout=30)
            resp.raise_for_status()
            fpath.write_bytes(resp.content)
            downloaded.append(WikiImage(
                path=str(fpath),
                url=info["url_full"],
                title=info["title"],
                author=info["author"],
                license=info["license"],
                width=info["width"],
                height=info["height"],
            ))
            time.sleep(0.2)  # cortesía con el servidor
        except Exception as e:
            print(f"[wikimedia] omitida {info['title']}: {e}")

    if len(downloaded) < min_count:
        print(f"[wikimedia] AVISO: sólo {len(downloaded)} imágenes para «{poi_name}» (esperaba ≥ {min_count})")

    # 4) manifest
    manifest_path.write_text(
        json.dumps([asdict(d) for d in downloaded], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return downloaded
