"""Telemetry repository · ingestion + queries."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.db.models.telemetry import TelemetryEvent


class TelemetryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add_event(self, *, session_id: str, event_type: str,
                        user_id: Optional[uuid.UUID] = None,
                        poi_id: Optional[str] = None,
                        capsule_id: Optional[str] = None,
                        payload: Optional[Dict[str, Any]] = None,
                        event_reason: Optional[str] = None) -> TelemetryEvent:
        ev = TelemetryEvent(
            session_id=session_id, event_type=event_type, user_id=user_id,
            poi_id=poi_id, capsule_id=capsule_id, payload=payload or {},
            event_reason=event_reason,
        )
        self.session.add(ev)
        await self.session.flush()
        return ev

    async def add_batch(self, events: List[Dict[str, Any]]) -> int:
        """Bulk insert (cap 1000 per call)."""
        if not events:
            return 0
        events = events[:1000]
        rows = [TelemetryEvent(**ev) for ev in events]
        self.session.add_all(rows)
        await self.session.flush()
        return len(rows)

    async def top_pois(self, hours: int = 24, limit: int = 10) -> List[Dict[str, Any]]:
        since = datetime.utcnow() - timedelta(hours=hours)
        stmt = (
            select(TelemetryEvent.poi_id, func.count().label("c"))
            .where(TelemetryEvent.poi_id.isnot(None), TelemetryEvent.ts >= since)
            .group_by(TelemetryEvent.poi_id)
            .order_by(desc("c"))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return [{"poi_id": r[0], "events": int(r[1])} for r in result.all()]
