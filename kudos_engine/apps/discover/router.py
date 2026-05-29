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


def _load_capsules_metadata() -> list[dict]:
    """Carga todos los metadata.json individuales de /public/capsules/wd-*/."""
    if _CACHE["capsules"] is not None:
        return _CACHE["capsules"]

    cdir = _capsules_dir()
    if not os.path.isdir(cdir):
        _CACHE["capsules"] = []
        return []

    out = []
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
