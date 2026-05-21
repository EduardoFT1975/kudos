"""
KUDOS / AXÓN · Feature Gating Middleware.

Bloquea las rutas DORMANT con 404 (Http404) sin tocar urls.py ni views.py.

Activación: añadir a MIDDLEWARE en settings.py:
    'kudos_project.middleware.DormantRouteMiddleware',

Desactivación por entorno (debug interno):
    KUDOS_GATING_OFF=1   → desactiva el gating (todo accesible).
    KUDOS_GATING_LOG=1   → loggea intentos de acceso bloqueados.
"""
from __future__ import annotations
import logging
import os
import re

from django.http import Http404

from kudos_project.features import (
    ALWAYS_ALLOWED_PREFIXES,
    DORMANT_PATH_PREFIXES,
    DORMANT_PATH_REGEX,
)

logger = logging.getLogger(__name__)
_DORMANT_RE = [re.compile(p) for p in DORMANT_PATH_REGEX]


class DormantRouteMiddleware:
    """Devuelve 404 para rutas DORMANT. No-op si KUDOS_GATING_OFF=1."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.gating_off = os.getenv("KUDOS_GATING_OFF", "0").lower() in ("1", "true", "yes")
        self.log_blocks = os.getenv("KUDOS_GATING_LOG", "0").lower() in ("1", "true", "yes")

    def __call__(self, request):
        if not self.gating_off and self._is_dormant(request.path):
            if self.log_blocks:
                logger.info("axon.gating.block path=%s ua=%s",
                            request.path,
                            request.META.get("HTTP_USER_AGENT", "-")[:80])
            raise Http404("Route is dormant")
        return self.get_response(request)

    @staticmethod
    def _is_dormant(path: str) -> bool:
        # Whitelist siempre permitida (infra, admin, auth, API map).
        for allow in ALWAYS_ALLOWED_PREFIXES:
            if path.startswith(allow):
                return False
        # Prefijos de rutas dormant.
        for prefix in DORMANT_PATH_PREFIXES:
            if path.startswith(prefix):
                return True
        # Subrutas regex (cápsulas AR/VR/versions/etc.).
        for pat in _DORMANT_RE:
            if pat.match(path):
                return True
        return False
