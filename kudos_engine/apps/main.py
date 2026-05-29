"""KUDOS Capsule Engine v2 · T1.2-T1.5 + T3.2 Core Engine + Admin Metrics."""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from kudos_engine.apps.capsules.router import router as capsules_router
from kudos_engine.apps.feed.router import router as feed_router
from kudos_engine.apps.media.router import router as media_router
from kudos_engine.apps.merit.router import router as merit_router
from kudos_engine.apps.narrative.router import router as narrative_router
from kudos_engine.apps.nodes.router import router as nodes_router
from kudos_engine.apps.pois.router import router as pois_router

from kudos_engine.apps.save.router import router as save_router_legacy
from kudos_engine.apps.telemetry.router import router as telemetry_router_legacy
from kudos_engine.apps.signals.router import router as signals_router_legacy

from kudos_engine.db.database import is_postgres_enabled

from kudos_engine.security.cors import allowed_origins
from kudos_engine.security.rate_limit import limiter
from kudos_engine.security.middleware import BodySizeLimitMiddleware, SecurityHeadersMiddleware
from kudos_engine.security.observability import init_sentry


def create_app() -> FastAPI:
    sentry_active = init_sentry()

    app = FastAPI(
        title="KUDOS Capsule Engine v2 + HDG + Core Engine + Admin",
        description="Contextual discovery infrastructure",
        version="2.8.0",
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(BodySizeLimitMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Admin-Token"],
        max_age=600,
    )

    app.include_router(pois_router)
    app.include_router(capsules_router)
    app.include_router(merit_router)
    app.include_router(narrative_router)
    app.include_router(media_router)
    app.include_router(feed_router)
    app.include_router(nodes_router)

    if is_postgres_enabled():
        from kudos_engine.apps.save.pg_router import router as save_pg
        from kudos_engine.apps.telemetry.pg_router import router as telemetry_pg
        from kudos_engine.apps.signals.pg_router import router as signals_pg
        app.include_router(save_pg)
        app.include_router(telemetry_pg)
        app.include_router(signals_pg)

        from kudos_engine.apps.db_admin.router import router as db_admin_router
        from kudos_engine.auth.router import router as auth_router
        from kudos_engine.auth.migration_router import router as migration_router
        app.include_router(db_admin_router)
        app.include_router(auth_router)
        app.include_router(migration_router)

        from kudos_engine.apps.core_engine.router import router as core_router
        app.include_router(core_router)

        # === T3.2 Day 10-11 · Admin Metrics + Cron ===
        from kudos_engine.apps.admin_metrics.router import router as admin_metrics_router
        app.include_router(admin_metrics_router)
    else:
        app.include_router(save_router_legacy)
        app.include_router(telemetry_router_legacy)
        app.include_router(signals_router_legacy)

    @app.get("/")
    def root():
        persistence = "postgres" if is_postgres_enabled() else "json-legacy"
        return {
            "service": "kudos-capsule-engine-v2",
            "version": "2.8.0",
            "status": "operational",
            "persistence": persistence,
            "auth": "google-oauth-jwt" if is_postgres_enabled() else "disabled",
            "core_engine": "active" if is_postgres_enabled() else "disabled",
            "admin_metrics": "active" if is_postgres_enabled() else "disabled",
            "endpoints_mode": "postgres-aware" if is_postgres_enabled() else "json-legacy",
            "security": {
                "cors": "hardened",
                "rate_limit": "slowapi",
                "body_limit": "256kb",
                "security_headers": "enabled",
                "sentry": "active" if sentry_active else "disabled",
            },
            "modules_loaded": ["pois", "capsules", "merit", "narrative", "media", "feed", "save", "nodes", "telemetry", "signals", "core_engine", "admin_metrics"],
            "personal_world": ["saved", "visited", "watched", "resonances", "memory"],
            "human_discovery_graph": ["discovery", "importance", "memory", "emotion", "future_value"],
            "trust_layer": ["trusted", "normal", "suspect", "bot"],
            "why_signals": ["motivation", "visit_reason", "watch_reason", "resonance_reason", "memory_reason", "event_reason"],
            "humanity_core": ["olduvai", "gobekli", "lascaux", "jerusalen", "galapagos", "apollo11", "hiroshima"],
            "mvp_metrics": ["completion_rate", "resonance_rate", "reflection_rate", "return_visit_rate", "dti_preliminary"],
        }

    @app.get("/health")
    def health():
        return {"ok": True, "persistence": "postgres" if is_postgres_enabled() else "json-legacy", "sentry": sentry_active}

    return app


app = create_app()
