"""
KUDOS Capsule Engine v2 · FastAPI app principal.

Monta todos los módulos. Corre con:
  uvicorn kudos_engine.apps.main:app --port 8001
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from kudos_engine.apps.capsules.router import router as capsules_router
from kudos_engine.apps.feed.router import router as feed_router
from kudos_engine.apps.media.router import router as media_router
from kudos_engine.apps.merit.router import router as merit_router
from kudos_engine.apps.narrative.router import router as narrative_router
from kudos_engine.apps.nodes.router import router as nodes_router
from kudos_engine.apps.pois.router import router as pois_router
from kudos_engine.apps.save.router import router as save_router
from kudos_engine.apps.telemetry.router import router as telemetry_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="KUDOS Capsule Engine v2",
        description="Contextual discovery infrastructure · CTO directive compliant",
        version="2.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(pois_router)
    app.include_router(capsules_router)
    app.include_router(merit_router)
    app.include_router(narrative_router)
    app.include_router(media_router)
    app.include_router(feed_router)
    app.include_router(save_router)
    app.include_router(nodes_router)
    app.include_router(telemetry_router)

    @app.get("/")
    def root():
        return {
            "service": "kudos-capsule-engine-v2",
            "status": "operational",
            "version": "2.1.0",
            "modules_loaded": [
                "pois", "capsules", "merit", "narrative", "media",
                "feed", "save", "nodes", "telemetry",
            ],
            "personal_world": [
                "saved", "visited", "watched", "reactions",
            ],
            "i18n_ready": True,
            "kpis_tracked": ["SAVE_RATE", "EXPLORATION_DEPTH", "VIEW_COUNT", "SHARE_COUNT"],
        }

    @app.get("/health")
    def health():
        return {"ok": True}

    return app


app = create_app()
