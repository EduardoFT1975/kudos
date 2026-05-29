"""KUDOS Capsule Engine v2 - PROMPT 2/6 + T3.2 backstops."""
from __future__ import annotations

from fastapi import FastAPI
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
        title="KUDOS Capsule Engine - MVP build",
        description="Contextual discovery infrastructure",
        version="3.1.0",
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
        allow_headers=["Authorization", "Content-Type", "X-Admin-Token", "X-Session-Id"],
        max_age=600,
    )

    app.include_router(pois_router)
    app.include_router(capsules_router)
    app.include_router(merit_router)
    app.include_router(narrative_router)
    app.include_router(media_router)
    app.include_router(feed_router)
    app.include_router(nodes_router)

    # PROMPT 2/6 - Discover MVP composer (sin requirement Postgres)
    from kudos_engine.apps.discover.router import router as discover_router
    app.include_router(discover_router)

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

        from kudos_engine.apps.admin_metrics.router import router as admin_metrics_router
        app.include_router(admin_metrics_router)

        from kudos_engine.apps.personal.router import router as personal_router
        app.include_router(personal_router)

        from kudos_engine.apps.push.router import router as push_router
        app.include_router(push_router)
    else:
        app.include_router(save_router_legacy)
        app.include_router(telemetry_router_legacy)
        app.include_router(signals_router_legacy)

    @app.get("/")
    def root():
        persistence = "postgres" if is_postgres_enabled() else "json-legacy"
        return {
            "service": "kudos-capsule-engine",
            "version": "3.1.0",
            "status": "operational",
            "persistence": persistence,
            "discover_mvp": "active",
            "endpoints_mode": "postgres-aware" if is_postgres_enabled() else "json-legacy",
            "modules_loaded": ["pois", "capsules", "merit", "narrative", "media", "feed", "save", "nodes", "telemetry", "signals", "discover"],
            "humanity_core": "frozen (post-MVP)",
            "mvp_screens": ["discover", "map", "poi", "mi_mundo", "compartir"],
        }

    @app.get("/health")
    def health():
        return {"ok": True, "persistence": "postgres" if is_postgres_enabled() else "json-legacy", "sentry": sentry_active}

    return app


app = create_app()
