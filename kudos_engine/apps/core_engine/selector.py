"""
DailyCoreSelector · rotacion Lun-Dom de los 7 Humanity Core.

Mapeo canonico (alineado con seed_humanity_core + CoreDelDia.tsx):
  Lunes    -> Olduvai Gorge       (wd-Q174045)
  Martes   -> Gobekli Tepe        (wd-Q1090052)
  Miercoles-> Lascaux             (wd-Q189780)
  Jueves   -> Jerusalen           (wd-Q1218)
  Viernes  -> Galapagos           (wd-Q42797)
  Sabado   -> Apollo 11           (wd-Q1737)
  Domingo  -> Hiroshima           (wd-Q176330)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Final


# 7 Cores en orden Lun..Dom (index 0 = lunes)
CORE_BY_DAY: Final[tuple[str, ...]] = (
    "wd-Q174045",   # Olduvai Gorge
    "wd-Q1090052",  # Gobekli Tepe
    "wd-Q189780",   # Lascaux
    "wd-Q1218",     # Jerusalen
    "wd-Q42797",    # Galapagos
    "wd-Q1737",     # Apollo 11
    "wd-Q176330",   # Hiroshima
)


CORE_PILLARS: Final[dict[str, str]] = {
    "wd-Q174045":  "origen",
    "wd-Q1090052": "significado",
    "wd-Q189780":  "belleza",
    "wd-Q1218":    "creencia",
    "wd-Q42797":   "conocimiento",
    "wd-Q1737":    "exploracion",
    "wd-Q176330":  "memoria",
}


def get_core_for_today(now: datetime | None = None) -> str:
    """Devuelve el poi_id del Core del dia actual (UTC)."""
    n = now or datetime.now(timezone.utc)
    # Python weekday: lunes=0, domingo=6 (perfect alignment)
    return CORE_BY_DAY[n.weekday()]


def is_core(poi_id: str) -> bool:
    """True si el poi_id pertenece al Humanity Core."""
    return poi_id in CORE_BY_DAY


def core_pillar(poi_id: str) -> str | None:
    """Devuelve el pilar humano del Core o None si no es Core."""
    return CORE_PILLARS.get(poi_id)
