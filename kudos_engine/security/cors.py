"""
CORS hardening · T1.5.

Lista blanca explicita. NO `*` en produccion.

Permitidos:
  - kudos.world + www.kudos.world (produccion)
  - kudos-frontend.onrender.com, kudos-frontend-rsi3.onrender.com (Render)
  - localhost:3000, localhost:3001 (dev)
  - cualquier dominio extra en KUDOS_EXTRA_ORIGINS (CSV)

En modo dev (ENV != production) se mantiene mas laxo.
"""
from __future__ import annotations

import os
from typing import List


PROD_ORIGINS = [
    "https://kudos.world",
    "https://www.kudos.world",
    "https://kudos-frontend.onrender.com",
    "https://kudos-frontend-rsi3.onrender.com",
]

DEV_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]


def allowed_origins() -> List[str]:
    env = os.getenv("ENV", "development").lower()
    origins = list(PROD_ORIGINS)
    if env != "production":
        origins.extend(DEV_ORIGINS)
    extra = os.getenv("KUDOS_EXTRA_ORIGINS", "")
    if extra:
        origins.extend([o.strip() for o in extra.split(",") if o.strip()])
    # dedupe preservando orden
    seen = set()
    out = []
    for o in origins:
        if o not in seen:
            seen.add(o)
            out.append(o)
    return out


# Ya NO usamos `*`. Si por error la lista queda vacia, refuse all.
