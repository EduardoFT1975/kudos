"""
Observability T1.5 · Sentry init + structured logging hook.

Sentry se inicializa SOLO si SENTRY_DSN esta seteada. Si no, no-op.
NO captura request bodies (privacidad).
NO captura headers Authorization / Cookie.
"""
from __future__ import annotations

import logging
import os
from typing import Optional


def init_sentry() -> bool:
    """Inicializa Sentry. Devuelve True si activo, False si skipped."""
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        return False
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    except ImportError:
        logging.warning("sentry-sdk no instalado · skip init")
        return False

    env = os.getenv("ENV", "development")
    release = os.getenv("RENDER_GIT_COMMIT", "dev")[:12]

    sentry_sdk.init(
        dsn=dsn,
        environment=env,
        release=f"kudos-api-v2@{release}",
        traces_sample_rate=0.10 if env == "production" else 0.50,
        profiles_sample_rate=0.0,
        send_default_pii=False,         # NO emails, no IPs en errores
        max_breadcrumbs=50,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        before_send=_scrub_sensitive,
    )
    return True


def _scrub_sensitive(event, hint):
    """Limpia headers + cookies + payloads sensibles antes de enviar a Sentry."""
    try:
        req = event.get("request", {})
        headers = req.get("headers", {})
        if isinstance(headers, dict):
            for h in list(headers.keys()):
                if h.lower() in ("authorization", "cookie", "x-admin-token"):
                    headers[h] = "[Filtered]"
        # No mandes el body completo
        if "data" in req:
            req["data"] = "[Filtered]"
    except Exception:
        pass
    return event
