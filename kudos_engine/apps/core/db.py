"""
KUDOS Capsule Engine v2 · JSON store atómico.

Persistencia mínima sin dependencias. Migrable a Postgres con
un cambio de adaptador (mismo interface load/save/list/get/upsert/delete).

Atomicidad: tempfile.mkstemp + os.replace (POSIX rename atómico).
Concurrencia: lock por archivo via threading.Lock (mono-proceso OK).
"""
from __future__ import annotations

import json
import os
import tempfile
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional


_LOCKS: Dict[str, threading.Lock] = {}


def _lock_for(path: Path) -> threading.Lock:
    key = str(path)
    if key not in _LOCKS:
        _LOCKS[key] = threading.Lock()
    return _LOCKS[key]


def load(path: Path) -> Dict[str, Any]:
    """Carga JSON como dict. Devuelve {} si no existe."""
    if not path.exists():
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save(path: Path, data: Dict[str, Any]) -> None:
    """Escribe JSON atómicamente."""
    path.parent.mkdir(parents=True, exist_ok=True)
    lock = _lock_for(path)
    with lock:
        fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
            os.replace(tmp, path)
        except Exception:
            try: os.unlink(tmp)
            except OSError: pass
            raise


def list_all(path: Path) -> List[Dict[str, Any]]:
    """Devuelve todos los valores como lista."""
    return list(load(path).values())


def get(path: Path, key: str) -> Optional[Dict[str, Any]]:
    return load(path).get(key)


def upsert(path: Path, key: str, value: Dict[str, Any]) -> Dict[str, Any]:
    data = load(path)
    data[key] = value
    save(path, data)
    return value


def delete(path: Path, key: str) -> bool:
    data = load(path)
    if key in data:
        del data[key]
        save(path, data)
        return True
    return False


def bulk_upsert(path: Path, items: Dict[str, Dict[str, Any]]) -> int:
    """Inserta/actualiza muchos items de una vez (1 sola escritura)."""
    data = load(path)
    data.update(items)
    save(path, data)
    return len(items)
