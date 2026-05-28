"""
KUDOS Capsule Engine v2 · /api/pois router.

REST minimal según CTO directive Phase 10:
  GET    /api/pois/                  list (paginated)
  POST   /api/pois/                  create
  GET    /api/pois/{id}              detail
  PATCH  /api/pois/{id}              update
  DELETE /api/pois/{id}              delete
  GET    /api/pois/{id}/related      related POIs via graph
  POST   /api/pois/{id}/link         crear relationship
"""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from kudos_engine.apps.pois import service
from kudos_engine.apps.pois.models import POI, POICreate, POIUpdate


router = APIRouter(prefix="/api/pois", tags=["pois"])


class LinkPOIRequest(BaseModel):
    target_id: str
    type: str = "THEMATIC"
    weight: float = 1.0
    description: Optional[str] = None


@router.get("/", response_model=List[POI])
def list_pois(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    country: Optional[str] = None,
    tier: Optional[str] = None,
):
    """Lista paginada · ordenada por merit_score desc."""
    return service.list_pois(limit=limit, offset=offset, country=country, tier=tier)


@router.get("/count")
def count_pois():
    return {"count": service.count_pois()}


@router.post("/", response_model=POI, status_code=201)
def create_poi(payload: POICreate):
    return service.create_poi(payload)


@router.get("/{poi_id}", response_model=POI)
def get_poi(poi_id: str):
    poi = service.get_poi(poi_id)
    if not poi:
        raise HTTPException(404, detail="POI not found")
    return poi


@router.patch("/{poi_id}", response_model=POI)
def update_poi(poi_id: str, patch: POIUpdate):
    poi = service.update_poi(poi_id, patch)
    if not poi:
        raise HTTPException(404, detail="POI not found")
    return poi


@router.delete("/{poi_id}", status_code=204)
def delete_poi(poi_id: str):
    if not service.delete_poi(poi_id):
        raise HTTPException(404, detail="POI not found")


@router.get("/{poi_id}/related", response_model=List[POI])
def get_related(poi_id: str, limit: int = Query(8, ge=1, le=50)):
    if not service.get_poi(poi_id):
        raise HTTPException(404, detail="POI not found")
    return service.get_related(poi_id, limit=limit)


@router.post("/{poi_id}/link", status_code=201)
def link_poi(poi_id: str, body: LinkPOIRequest):
    if not service.get_poi(poi_id):
        raise HTTPException(404, detail="POI not found")
    if not service.get_poi(body.target_id):
        raise HTTPException(404, detail="Target POI not found")
    rel = service.link_pois(poi_id, body.target_id, body.type, body.weight, body.description)
    return rel.model_dump()
