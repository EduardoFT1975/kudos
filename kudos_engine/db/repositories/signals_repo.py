"""PoiSignals repository."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Dict

from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.db.models.signals import PoiSignals
from kudos_engine.db.models.save import Save, Visit, Resonance
from kudos_engine.db.models.telemetry import TelemetryEvent


class SignalsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_for_poi(self, poi_id: str) -> Optional[PoiSignals]:
        return await self.session.get(PoiSignals, poi_id)

    async def upsert(self, poi_id: str, **fields) -> PoiSignals:
        """Insert or update poi_signals row. Atomic upsert."""
        fields["poi_id"] = poi_id
        fields["updated_at"] = datetime.utcnow()
        stmt = pg_insert(PoiSignals).values(**fields)
        stmt = stmt.on_conflict_do_update(
            index_elements=[PoiSignals.poi_id],
            set_={k: v for k, v in fields.items() if k != "poi_id"},
        )
        await self.session.execute(stmt)
        await self.session.flush()
        return await self.session.get(PoiSignals, poi_id)

    async def top_by_score(self, score: str, limit: int = 20) -> List[PoiSignals]:
        score_col = getattr(PoiSignals, score, None)
        if score_col is None:
            return []
        stmt = select(PoiSignals).order_by(score_col.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def recompute_for_poi(self, poi_id: str) -> PoiSignals:
        """Recompute signals desde saves + visits + resonances + telemetry."""
        # Saves
        saves_count_q = await self.session.execute(
            select(func.count()).select_from(Save).where(Save.poi_id == poi_id)
        )
        total_saves = int(saves_count_q.scalar_one())

        saves_motiv_q = await self.session.execute(
            select(func.count()).select_from(Save).where(
                Save.poi_id == poi_id, Save.motivation.isnot(None)
            )
        )
        saves_with_motiv = int(saves_motiv_q.scalar_one())

        saves_visit_q = await self.session.execute(
            select(func.count()).select_from(Save).where(
                Save.poi_id == poi_id, Save.motivation == "travel"
            )
        )
        saves_want_visit = int(saves_visit_q.scalar_one())

        # Visits
        visits_q = await self.session.execute(
            select(func.count()).select_from(Visit).where(Visit.poi_id == poi_id)
        )
        total_visits = int(visits_q.scalar_one())

        # Resonances
        res_count_q = await self.session.execute(
            select(func.count()).select_from(Resonance).where(Resonance.poi_id == poi_id)
        )
        total_resonances = int(res_count_q.scalar_one())

        res_breakdown_q = await self.session.execute(
            select(Resonance.resonance_type, func.count())
            .where(Resonance.poi_id == poi_id)
            .group_by(Resonance.resonance_type)
        )
        breakdown = dict(res_breakdown_q.all())
        emotion_profile: Dict[str, float] = {}
        if total_resonances > 0:
            for t in ("asombro", "aprendizaje", "inspiracion", "conexion", "nostalgia"):
                emotion_profile[t] = round(breakdown.get(t, 0) / total_resonances, 3)

        # Telemetry views
        views_q = await self.session.execute(
            select(func.count()).select_from(TelemetryEvent).where(
                TelemetryEvent.poi_id == poi_id,
                TelemetryEvent.event_type.in_(["poi_view", "node_open"]),
            )
        )
        total_views = int(views_q.scalar_one())

        # Normalizaciones
        def norm(v: float, cap: float) -> float:
            return min(100.0, (v / cap) * 100.0) if cap > 0 else 0.0

        discovery_score = norm(total_views, 1000)
        importance_score = norm(saves_with_motiv, 100)
        memory_score = 50.0   # TODO refinar con revisits aging/released ratio
        emotion_score = norm(total_resonances, 50)
        future_value_score = norm(saves_want_visit, 50)

        return await self.upsert(
            poi_id,
            discovery_score=discovery_score,
            importance_score=importance_score,
            memory_score=memory_score,
            emotion_score=emotion_score,
            future_value_score=future_value_score,
            emotion_profile=emotion_profile,
            total_views=total_views,
            total_saves=total_saves,
            total_visits=total_visits,
            total_resonances=total_resonances,
        )
