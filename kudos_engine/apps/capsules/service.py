"""
KUDOS Capsule Engine v2 · Capsule service.

Reglas de negocio:
  - Toda cápsula creada toma snapshot del Merit del POI (denormalizado).
  - Duración se sugiere desde Merit tier (puede sobrescribirse).
  - Publicar requiere status >= MEDIA_READY (en MVP: cualquier estado).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from kudos_engine.apps.capsules import repository as repo
from kudos_engine.apps.capsules.models import (
    Capsule, CapsuleCreate, CapsuleUpdate, MeritSnapshot
)
from kudos_engine.apps.core.enums import CapsuleStatus
from kudos_engine.apps.merit import service as merit_service
from kudos_engine.apps.pois import service as poi_service


def create_capsule(payload: CapsuleCreate) -> Optional[Capsule]:
    poi = poi_service.get_poi(payload.poi_id)
    if not poi:
        return None

    # Merit snapshot · auto-compute si no existe
    profile = merit_service.get_profile(payload.poi_id) or merit_service.compute_for_poi(payload.poi_id)
    snapshot = MeritSnapshot(
        final_score=profile.final_score if profile else 0.0,
        tier=profile.tier if profile else "TIER_C",
    )

    duration = payload.duration_s or merit_service.recommended_duration(snapshot.tier)

    capsule = Capsule(
        id=uuid.uuid4().hex,
        poi_id=payload.poi_id,
        type=payload.type,
        narrative_type=payload.narrative_type,
        tier=snapshot.tier,
        title=payload.title,
        hook=payload.hook,
        summary=payload.summary,
        script=payload.script,
        duration_s=duration,
        language=payload.language,
        merit_snapshot=snapshot,
    )
    return repo.upsert_capsule(capsule)


def update_capsule(capsule_id: str, patch: CapsuleUpdate) -> Optional[Capsule]:
    existing = repo.get_capsule(capsule_id)
    if not existing:
        return None
    data = existing.model_dump()
    patch_data = patch.model_dump(exclude_none=True)
    # media_manifest si viene anidado
    if "media_manifest" in patch_data and isinstance(patch_data["media_manifest"], dict):
        data["media_manifest"] = patch_data.pop("media_manifest")
    data.update(patch_data)
    data["updated_at"] = datetime.utcnow().isoformat()
    return repo.upsert_capsule(Capsule(**data))


def get_capsule(capsule_id: str) -> Optional[Capsule]:
    return repo.get_capsule(capsule_id)


def list_capsules(limit: int = 50, offset: int = 0, poi_id: Optional[str] = None,
                  status: Optional[str] = None, tier: Optional[str] = None) -> List[Capsule]:
    return repo.list_capsules(limit=limit, offset=offset, poi_id=poi_id, status=status, tier=tier)


def list_for_poi(poi_id: str) -> List[Capsule]:
    return repo.list_capsules(poi_id=poi_id, limit=100)


def publish(capsule_id: str) -> Optional[Capsule]:
    """Marca PUBLISHED y stampa published_at."""
    existing = repo.get_capsule(capsule_id)
    if not existing:
        return None
    data = existing.model_dump()
    data["status"] = CapsuleStatus.PUBLISHED.value
    data["published_at"] = datetime.utcnow().isoformat()
    data["updated_at"] = data["published_at"]
    return repo.upsert_capsule(Capsule(**data))


def increment_save(capsule_id: str) -> Optional[Capsule]:
    """Primary KPI · SAVE_RATE."""
    existing = repo.get_capsule(capsule_id)
    if not existing:
        return None
    data = existing.model_dump()
    data["save_count"] = int(data.get("save_count", 0)) + 1
    return repo.upsert_capsule(Capsule(**data))


def count_capsules() -> int:
    return repo.count_capsules()


def delete_capsule(capsule_id: str) -> bool:
    return repo.delete_capsule(capsule_id)
