"""Content repository: Capsule, Narrative, PoiRelationship · usado por seed + lectura."""
from __future__ import annotations

from typing import Optional, List, Any, Dict

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.db.models.content import Capsule, Narrative, PoiRelationship


class ContentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # ============ Capsules ============
    async def get_capsule(self, capsule_id: str) -> Optional[Capsule]:
        return await self.session.get(Capsule, capsule_id)

    async def upsert_capsule(self, capsule_id: str, **fields) -> None:
        fields["id"] = capsule_id
        stmt = pg_insert(Capsule).values(**fields)
        stmt = stmt.on_conflict_do_update(
            index_elements=[Capsule.id],
            set_={k: v for k, v in fields.items() if k != "id"},
        )
        await self.session.execute(stmt)

    async def list_capsules_by_poi(self, poi_id: str) -> List[Capsule]:
        stmt = select(Capsule).where(Capsule.poi_id == poi_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # ============ Narratives ============
    async def list_narratives_by_poi(self, poi_id: str, language: str = "es") -> List[Narrative]:
        stmt = select(Narrative).where(Narrative.poi_id == poi_id, Narrative.language == language)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def upsert_narrative(self, **fields) -> None:
        stmt = pg_insert(Narrative).values(**fields)
        # unique key (poi_id, narrative_type, language)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_narratives_unique_per_poi",
            set_={k: v for k, v in fields.items()
                  if k not in ("poi_id", "narrative_type", "language", "id")},
        )
        await self.session.execute(stmt)

    # ============ Relationships ============
    async def list_related(self, poi_id: str, limit: int = 6) -> List[PoiRelationship]:
        stmt = (
            select(PoiRelationship)
            .where(PoiRelationship.poi_id == poi_id)
            .order_by(PoiRelationship.weight.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def upsert_relationship(self, *, poi_id: str, related_id: str,
                                    relation_type: str, weight: float = 0.5,
                                    distance_km: Optional[float] = None,
                                    relationship_origin: str = "system") -> None:
        stmt = pg_insert(PoiRelationship).values(
            poi_id=poi_id, related_id=related_id, relation_type=relation_type,
            weight=weight, distance_km=distance_km,
            relationship_origin=relationship_origin,
        )
        stmt = stmt.on_conflict_do_update(
            constraint="pk_poi_relationships",
            set_={"weight": weight, "distance_km": distance_km,
                  "relationship_origin": relationship_origin},
        )
        await self.session.execute(stmt)
