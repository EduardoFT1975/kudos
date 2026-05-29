"""
Rate limiting · T1.5.

slowapi + Redis backend si REDIS_URL esta seteada, sino in-memory.

Limites canonicos (definidos en este modulo, no en los routers):
  GENERAL           60/minute por IP
  AUTH_OAUTH         5/minute por IP   (anti-bruteforce)
  AUTH_REFRESH      10/minute por IP
  SAVE              10/minute por user_id (o IP si anon)
  TELEMETRY         30/minute por user_id (o IP si anon)
  SHARE              5/minute por user_id

Aplicacion en routers:
  from kudos_engine.security.rate_limit import limiter, RL_AUTH_OAUTH

  @router.post("/oauth/google")
  @limiter.limit(RL_AUTH_OAUTH)
  async def google_login(request: Request, ...):
      ...
"""
from __future__ import annotations

import os
from typing import Optional

from slowapi import Limiter
from slowapi.util import get_remote_address


# Limites canonicos (string format slowapi)
RL_GENERAL = "60/minute"
RL_AUTH_OAUTH = "5/minute"
RL_AUTH_REFRESH = "10/minute"
RL_SAVE = "10/minute"
RL_TELEMETRY = "30/minute"
RL_SHARE = "5/minute"


def _storage_uri() -> Optional[str]:
    """Devuelve REDIS_URL si esta seteada, sino None (in-memory)."""
    url = os.getenv("REDIS_URL")
    if url and url.startswith("redis"):
        return url
    return None


# Instancia global. Importar y aplicar @limiter.limit(...) en endpoints.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri(),
    default_limits=[RL_GENERAL],
    headers_enabled=True,   # X-RateLimit-* + Retry-After
)


def key_user_or_ip(request) -> str:
    """
    Key function que prefiere user_id (si Authorization Bearer existe)
    sobre IP. Permite rate limit por usuario autenticado.
    """
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth.split()[1]
        # No decodificamos completo (overhead), tomamos hash truncado
        import hashlib
        return "user:" + hashlib.sha256(token.encode()).hexdigest()[:16]
    return get_remote_address(request)
