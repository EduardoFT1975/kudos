"""
KUDOS Capsule Engine v2 · Telemetry service.

Persistencia JSONL append-only · 1 línea por evento · sin lock global
(filesystem POSIX garantiza append atómico para escrituras pequeñas).
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Dict, List

from kudos_engine.apps.core.config import APPS_DATA_DIR
from kudos_engine.apps.telemetry.models import TelemetryEvent


# JSONL persistente
EVENTS_LOG = APPS_DATA_DIR / "telemetry.jsonl"
EVENTS_LOG.parent.mkdir(parents=True, exist_ok=True)


def log_event(event: TelemetryEvent) -> None:
    """Append atómico al jsonl."""
    line = event.model_dump_json() + "\n"
    with open(EVENTS_LOG, "a", encoding="utf-8") as f:
        f.write(line)


def log_batch(events: List[TelemetryEvent]) -> int:
    """Append batch · una sola escritura."""
    buf = "".join(e.model_dump_json() + "\n" for e in events)
    with open(EVENTS_LOG, "a", encoding="utf-8") as f:
        f.write(buf)
    return len(events)


def stats_event_counts() -> Dict[str, int]:
    """Cuenta de eventos por tipo (lee todo · OK <100k eventos)."""
    if not EVENTS_LOG.exists():
        return {}
    counts: Dict[str, int] = {}
    with open(EVENTS_LOG, "r", encoding="utf-8") as f:
        for line in f:
            try:
                e = json.loads(line)
                counts[e["event"]] = counts.get(e["event"], 0) + 1
            except (json.JSONDecodeError, KeyError):
                pass
    return counts


def top_pois_by_event(event_type: str, limit: int = 20) -> List[Dict]:
    """Top POIs más vistos / clicados / guardados según el evento dado."""
    if not EVENTS_LOG.exists():
        return []
    counts: Dict[str, int] = {}
    with open(EVENTS_LOG, "r", encoding="utf-8") as f:
        for line in f:
            try:
                e = json.loads(line)
                if e.get("event") == event_type and e.get("poi_id"):
                    counts[e["poi_id"]] = counts.get(e["poi_id"], 0) + 1
            except (json.JSONDecodeError, KeyError):
                pass
    items = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    return [{"poi_id": pid, "count": n} for pid, n in items]
