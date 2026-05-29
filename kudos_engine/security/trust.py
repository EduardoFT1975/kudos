"""
Signal Trust Layer · T1.5 · GPT-5 directive.

Estructura preparada · algoritmo en futuras fases.

Niveles canonicos:
  trusted    - usuario verificado con historial limpio
  normal     - usuario tipico (default)
  suspect    - patron anomalo detectado (spike, bot signatures)
  bot        - confirmado bot, eventos ignorados en agregados

Hoy todos los eventos entran como `normal`. Cuando el classifier exista
(fase HDG Alpha), recalculara periodicamente y actualizara la columna.
"""
from __future__ import annotations

from enum import Enum


class TrustLevel(str, Enum):
    TRUSTED = "trusted"
    NORMAL = "normal"
    SUSPECT = "suspect"
    BOT = "bot"


DEFAULT_TRUST = TrustLevel.NORMAL


# Heuristica MUY basica para T1.5 · solo evita usuarios brand-new que
# disparan miles de eventos en segundos. NO es el classifier real.

def quick_classify(*, events_in_session: int, session_age_s: float,
                    has_user_id: bool) -> TrustLevel:
    """Devuelve nivel sugerido para este evento."""
    if has_user_id and session_age_s > 3600 and events_in_session < 200:
        return TrustLevel.TRUSTED  # user con historial razonable
    if events_in_session > 500 and session_age_s < 60:
        return TrustLevel.SUSPECT  # spike imposible
    if events_in_session > 2000:
        return TrustLevel.BOT
    return TrustLevel.NORMAL
