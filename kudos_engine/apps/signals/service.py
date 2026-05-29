"""
KUDOS HDG · Service · agrega señales para producir scores por POI.

Idempotente · re-ejecutar cada N horas o tras burst de eventos.
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from kudos_engine.apps.core import db
from kudos_engine.apps.core.config import (
    APPS_DATA_DIR, STORE_SAVES,
)
from kudos_engine.apps.save.service import (
    STORE_VISITED, STORE_RESONANCES,
)
from kudos_engine.apps.signals.models import PoiSignals


STORE_SIGNALS = APPS_DATA_DIR / "poi_signals.json"
TELEMETRY_LOG = APPS_DATA_DIR / "telemetry.jsonl"


def _normalize(value: float, max_value: float) -> float:
    """Normaliza a 0..100 con cap."""
    if max_value <= 0: return 0.0
    return min(100.0, (value / max_value) * 100.0)


def recompute_for_poi(poi_id: str) -> PoiSignals:
    """Agrega todas las señales de un POI."""
    # Saves
    saves = [s for s in db.list_all(STORE_SAVES) if s.get("poi_id") == poi_id]
    total_saves = len(saves)
    saves_with_motivation = sum(1 for s in saves if s.get("motivation"))
    saves_want_visit = sum(1 for s in saves if s.get("motivation") == "quiero_visitarlo")
    saves_still_relevant = sum(1 for s in saves if s.get("memory_status") == "still_relevant")
    saves_released = sum(1 for s in saves if s.get("memory_status") == "released")
    revisits = sum(int(s.get("revisit_count", 0)) for s in saves)

    # Visits
    visits = [v for v in db.list_all(STORE_VISITED) if v.get("poi_id") == poi_id]
    total_visits = len(visits)

    # Resonances
    resonances = [r for r in db.list_all(STORE_RESONANCES)
                  if r.get("target_type") == "poi" and r.get("target_id") == poi_id]
    total_resonances = len(resonances)
    emotion_counts = Counter(r.get("resonance") for r in resonances)
    emotion_total = sum(emotion_counts.values()) or 1
    emotion_profile = {k: round(v / emotion_total, 3) for k, v in emotion_counts.items() if k}

    # Discovery (vistas/clicks desde telemetría)
    total_views = 0
    if TELEMETRY_LOG.exists():
        with open(TELEMETRY_LOG, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    e = json.loads(line)
                    if e.get("poi_id") == poi_id and e.get("event") in (
                        "poi_view", "poi_click", "node_open", "capsule_play"
                    ):
                        total_views += 1
                except Exception:
                    pass

    # Scores (normalizados con caps razonables MVP)
    discovery_score = _normalize(total_views + total_resonances * 2, max_value=200)

    if total_saves == 0:
        importance_score = 0.0
    else:
        importance_score = _normalize(
            saves_with_motivation + total_visits * 3 + revisits * 2,
            max_value=50,
        )

    memory_score = _normalize(
        saves_still_relevant * 3 + revisits * 2 - saves_released,
        max_value=20,
    )

    emotion_score = _normalize(
        sum(emotion_counts.values()),
        max_value=100,
    )

    future_value_score = _normalize(saves_want_visit, max_value=30)

    sig = PoiSignals(
        poi_id=poi_id,
        discovery_score=round(discovery_score, 2),
        importance_score=round(importance_score, 2),
        memory_score=round(memory_score, 2),
        emotion_profile=emotion_profile,
        emotion_score=round(emotion_score, 2),
        future_value_score=round(future_value_score, 2),
        total_views=total_views,
        total_saves=total_saves,
        total_visits=total_visits,
        total_resonances=total_resonances,
        last_signal_at=datetime.utcnow().isoformat(),
    )
    db.upsert(STORE_SIGNALS, poi_id, sig.model_dump())
    return sig


def get_signals(poi_id: str) -> Optional[PoiSignals]:
    raw = db.get(STORE_SIGNALS, poi_id)
    return PoiSignals(**raw) if raw else None


def recompute_all_active(limit: int = 1000) -> int:
    """Recalcula para todos los POIs que tienen al menos un save o resonancia."""
    poi_ids = set()
    for s in db.list_all(STORE_SAVES):
        if s.get("poi_id"): poi_ids.add(s["poi_id"])
    for r in db.list_all(STORE_RESONANCES):
        if r.get("target_type") == "poi" and r.get("target_id"):
            poi_ids.add(r["target_id"])
    for pid in list(poi_ids)[:limit]:
        recompute_for_poi(pid)
    return len(poi_ids)


def top_pois_by(score: str, limit: int = 20) -> List[Dict]:
    """Top POIs ordenados por un score concreto · ranking interno · no expuesto al usuario."""
    items = db.list_all(STORE_SIGNALS)
    items.sort(key=lambda s: s.get(score, 0), reverse=True)
    return items[:limit]
