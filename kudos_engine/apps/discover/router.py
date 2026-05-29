"""
PROMPT 2/6 - /api/discover router.

Devuelve el feed Discover con 4 bloques alineados a la maqueta MVP:
  - featured           (1 capsula destacada)
  - for_you            (10+ tarjetas)
  - timelines          (5+ historias que conectan epocas)
  - continue_exploring (saves del usuario o fallback global)

Fuente de datos: experience/public/capsules/*/metadata.json
No requiere Postgres. No requiere modelos nuevos.
"""
from __future__ import annotations

import json
import os
import random
from typing import Any, Optional

from fastapi import APIRouter, Header, Query


router = APIRouter(prefix="/api/discover", tags=["discover"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _capsules_dir() -> str:
    """Localiza la carpeta /public/capsules en el repo (works en Render too)."""
    here = os.path.dirname(__file__)
    # subir 3 niveles: discover -> apps -> kudos_engine -> repo_root
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(here)))
    return os.path.join(repo_root, "experience", "public", "capsules")


# Cache simple in-memory (se invalida al reiniciar el servicio)
_CACHE: dict[str, Any] = {"capsules": None}


# Fallback hardcoded: si el filesystem no tiene los metadata.json (Docker del
# backend no copia experience/public/), devolvemos los 12 POIs principales
# con imagenes de Wikidata Commons. Garantiza que el feed Discover NUNCA
# este vacio en produccion.
_FALLBACK_CAPSULES: list[dict] = [
    {
        "poi_id": "wd-Q10285", "name": "Coliseo", "country_code": "IT", "category": "monumento",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Colosseo%202020.jpg?width=1200",
        "tier": "S", "duration_s": 45, "score": 100,
        "video_url": "/capsules/wd-Q10285/capsule.mp4",
    },
    {
        "poi_id": "wd-Q131013", "name": "Acropolis de Atenas", "country_code": "GR", "category": "monumento",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Attica%2006-13%20Athens%2050%20View%20from%20Philopappos%20-%20Acropolis%20Hill.jpg?width=1200",
        "tier": "S", "duration_s": 45, "score": 100,
        "video_url": "/capsules/wd-Q131013/capsule.mp4",
    },
    {
        "poi_id": "wd-Q47476", "name": "Alhambra", "country_code": "ES", "category": "monumento",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Alhambra%20de%20noche.jpg?width=1200",
        "tier": "S", "duration_s": 45, "score": 95,
        "video_url": "/capsules/wd-Q47476/capsule.mp4",
    },
    {
        "poi_id": "wd-Q61942244", "name": "Sagrada Familia", "country_code": "ES", "category": "iglesia",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Sagrada%20Familia%2008-2018%20%282%29.jpg?width=1200",
        "tier": "S", "duration_s": 45, "score": 95,
        "video_url": "/capsules/wd-Q61942244/capsule.mp4",
    },
    {
        "poi_id": "wd-Q180212", "name": "Foro Romano", "country_code": "IT", "category": "arqueologia",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Foro%20Romano%20Musei%20Capitolini%20Roma.jpg?width=1200",
        "tier": "S", "duration_s": 45, "score": 90,
        "video_url": "/capsules/wd-Q180212/capsule.mp4",
    },
    {
        "poi_id": "wd-Q2981", "name": "Notre-Dame de Paris", "country_code": "FR", "category": "iglesia",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Notre-Dame%20de%20Paris%2C%204%20October%202017.jpg?width=1200",
        "tier": "S", "duration_s": 45, "score": 90,
        "video_url": "/capsules/wd-Q2981/capsule.mp4",
    },
    {
        "poi_id": "wd-Q12506", "name": "Hagia Sofia", "country_code": "TR", "category": "iglesia",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Hagia%20Sophia%20Mars%202013.jpg?width=1200",
        "tier": "S", "duration_s": 45, "score": 90,
        "video_url": "/capsules/wd-Q12506/capsule.mp4",
    },
    {
        "poi_id": "wd-Q243", "name": "Torre Eiffel", "country_code": "FR", "category": "monumento",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Tour%20Eiffel%20Wikimedia%20Commons.jpg?width=1200",
        "tier": "S", "duration_s": 45, "score": 90,
        "video_url": "/capsules/wd-Q243/capsule.mp4",
    },
    {
        "poi_id": "wd-Q43332", "name": "Pompeya", "country_code": "IT", "category": "arqueologia",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Pompeii%20Family%20Feast%20Painting%20Naples.jpg?width=1200",
        "tier": "S", "duration_s": 45, "score": 85,
        "video_url": "/capsules/wd-Q43332/capsule.mp4",
    },
    {
        "poi_id": "wd-Q43473", "name": "Machu Picchu", "country_code": "PE", "category": "arqueologia",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Machu%20Picchu%2C%20Peru.jpg?width=1200",
        "tier": "S", "duration_s": 45, "score": 95,
        "video_url": "/capsules/wd-Q43473/capsule.mp4",
    },
    {
        "poi_id": "wd-Q5788", "name": "Petra", "country_code": "JO", "category": "arqueologia",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/The%20Treasury%2C%20Petra%2C%20Jordan8.jpg?width=1200",
        "tier": "S", "duration_s": 45, "score": 90,
        "video_url": "/capsules/wd-Q5788/capsule.mp4",
    },
    {
        "poi_id": "wd-Q9202", "name": "Taj Mahal", "country_code": "IN", "category": "monumento",
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Taj%20Mahal%2C%20Agra%2C%20India%20edit3.jpg?width=1200",
        "tier": "S", "duration_s": 45, "score": 95,
        "video_url": "/capsules/wd-Q9202/capsule.mp4",
    },
]


def _load_capsules_metadata() -> list[dict]:
    """Carga capsulas desde varios paths posibles. Si nada existe, usa fallback hardcoded."""
    if _CACHE["capsules"] is not None:
        return _CACHE["capsules"]

    # Probar varios paths candidatos (Render Docker, Render Python, dev local)
    candidates = [
        _capsules_dir(),
        os.path.join(os.getcwd(), "experience", "public", "capsules"),
        "/app/experience/public/capsules",
        "/opt/render/project/src/experience/public/capsules",
    ]

    out: list[dict] = []
    for cdir in candidates:
        if not os.path.isdir(cdir):
            continue
        for name in os.listdir(cdir):
            if not name.startswith("wd-"):
                continue
            meta_path = os.path.join(cdir, name, "metadata.json")
            if not os.path.isfile(meta_path):
                continue
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                poi = meta.get("poi", {})
                cls = meta.get("classification", {})
                recipe = cls.get("recipe", {})
                score = cls.get("score", 50)
                out.append({
                    "poi_id": poi.get("id") or name,
                    "name": poi.get("name", name),
                    "country_code": poi.get("country_code", ""),
                    "category": poi.get("category", ""),
                    "image_url": poi.get("image_url", ""),
                    "tier": poi.get("tier") or cls.get("tier", "B"),
                    "lat": poi.get("lat"),
                    "lng": poi.get("lng"),
                    "annual_visitors": poi.get("annual_visitors"),
                    "duration_s": int(recipe.get("duration_seconds") or 30),
                    "score": int(score),
                    "video_url": f"/capsules/{name}/capsule.mp4",
                })
            except Exception:
                continue
        if out:
            break  # encontramos en este candidato, no seguir

    # Fallback final: si no encontramos NADA en filesystem, usar hardcoded
    if not out:
        out = list(_FALLBACK_CAPSULES)

    out.sort(key=lambda c: c["score"], reverse=True)
    _CACHE["capsules"] = out
    return out


def _evocative_for(name: str) -> str:
    """Frase corta evocadora por POI (fallback narrativa)."""
    n = name.lower()
    if "coliseo" in n:           return "Donde el Imperio se convirtio en leyenda."
    if "alhambra" in n:          return "Donde Al-Andalus guardo su ultimo suspiro."
    if "sagrada" in n:           return "Una catedral aun sin terminar despues de 140 anos."
    if "acropolis" in n or "acrópolis" in n: return "La piedra que enseno a Europa a pensar."
    if "foro romano" in n:       return "El centro de un imperio que decidio el mundo."
    if "notre" in n:             return "La piedra que sobrevivio a su propio incendio."
    if "eiffel" in n:             return "El hierro que iba a derribarse despues de 20 anos."
    if "pompeya" in n:            return "La ciudad que el tiempo congelo en una manana."
    if "machu" in n:              return "La cumbre que los Incas eligieron como umbral."
    if "petra" in n:              return "La ciudad que el desierto talló en una piedra."
    if "hagia" in n:              return "Mil anos siendo el corazon del mundo cristiano."
    if "athens" in n:             return "La ciudad que ensenó a Europa a discutir."
    return "Un lugar que merece ser descubierto."


def _country_label(cc: str) -> str:
    cc = (cc or "").upper()
    return {
        "IT": "Roma, Italia",
        "ES": "Espana",
        "GR": "Grecia",
        "FR": "Francia",
        "TR": "Turquia",
        "PE": "Peru",
        "JO": "Jordania",
        "EG": "Egipto",
    }.get(cc, cc)


def _to_card(c: dict) -> dict:
    return {
        "poi_id": c["poi_id"],
        "title": c["name"],
        "location": _country_label(c.get("country_code", "")),
        "image_url": c["image_url"],
        "tier": c["tier"],
        "category": c.get("category") or "lugar",
        "duration_s": c["duration_s"],
        "video_url": c["video_url"],
        "evocative": _evocative_for(c["name"]),
    }


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/")
def get_discover(
    x_session_id: Optional[str] = Header(None),
    limit_for_you: int = Query(12, ge=4, le=24),
    limit_timelines: int = Query(6, ge=3, le=12),
):
    """
    Discover feed para la pantalla /inicio MVP.
    """
    caps = _load_capsules_metadata()

    # Featured: la mas potente (mayor score), preferentemente con narrativa real
    featured = None
    if caps:
        featured = _to_card(caps[0])

    # For you: siguientes por score, excluyendo featured
    for_you = [_to_card(c) for c in caps[1:1 + limit_for_you]] if len(caps) > 1 else []

    # Timelines: pares de POIs de epocas distintas, con hilo narrativo
    # Aproximamos por categoria/pais hasta tener un cronologia real
    timelines = _build_timelines(caps, limit_timelines)

    # Continue exploring: si hay session_id con saves, devolverlo (fase 2);
    # MVP: fallback con UNESCO sites bonitos
    continue_exploring = [_to_card(c) for c in caps[:6]] if caps else []

    return {
        "featured": featured,
        "for_you": for_you,
        "timelines": timelines,
        "continue_exploring": continue_exploring,
        "total_capsules": len(caps),
    }


def _build_timelines(caps: list[dict], n: int) -> list[dict]:
    """
    Construye N pares POI-A -> POI-B con un puente narrativo simple.
    Estrategia MVP: emparejar POIs de la misma categoria o pais.
    Fallback: pares aleatorios de los 12 mejores.
    """
    if len(caps) < 2:
        return []

    pool = caps[:min(12, len(caps))]
    pairs = []
    used = set()
    for c in pool:
        if c["poi_id"] in used or len(pairs) >= n:
            continue
        candidates = [
            x for x in pool
            if x["poi_id"] not in used
            and x["poi_id"] != c["poi_id"]
            and (x["country_code"] == c["country_code"] or x["category"] == c["category"])
        ]
        if not candidates:
            continue
        partner = candidates[0]
        used.add(c["poi_id"])
        used.add(partner["poi_id"])
        pairs.append({
            "from": _to_card(c),
            "to": _to_card(partner),
            "bridge": _bridge_for(c, partner),
        })

    # Si no llegamos a N, completar aleatoriamente
    if len(pairs) < n:
        remaining = [c for c in pool if c["poi_id"] not in used]
        random.shuffle(remaining)
        while len(pairs) < n and len(remaining) >= 2:
            a, b = remaining.pop(), remaining.pop()
            pairs.append({
                "from": _to_card(a),
                "to": _to_card(b),
                "bridge": _bridge_for(a, b),
            })

    return pairs


def _bridge_for(a: dict, b: dict) -> str:
    if a.get("country_code") == b.get("country_code"):
        return f"De {a['name']} a {b['name']}: dos voces del mismo lugar."
    return f"De {a['name']} a {b['name']}: dos hilos de la misma humanidad."
