"""
KUDOS Capsule Engine v2 · /api/media router.
"""
from __future__ import annotations

from typing import List
from fastapi import APIRouter, HTTPException, Query

from kudos_engine.apps.media import service
from kudos_engine.apps.media.models import MediaAsset, MediaAssetCreate, SceneManifest


router = APIRouter(prefix="/api/media", tags=["media"])


@router.post("/assets", response_model=MediaAsset, status_code=201)
def register_asset(payload: MediaAssetCreate):
    return service.register_asset(payload)


@router.get("/assets/{asset_id}", response_model=MediaAsset)
def get_asset(asset_id: str):
    a = service.get_asset(asset_id)
    if not a:
        raise HTTPException(404, detail="Asset not found")
    return a


@router.get("/assets/by-poi/{poi_id}", response_model=List[MediaAsset])
def list_assets_for_poi(poi_id: str):
    return service.list_assets_for_poi(poi_id)


@router.post("/manifests/{capsule_id}/build", response_model=SceneManifest)
def build_manifest(capsule_id: str, scene_count: int = Query(5, ge=2, le=12)):
    m = service.build_manifest(capsule_id, scene_count=scene_count)
    if not m:
        raise HTTPException(404, detail="Capsule not found")
    return m
