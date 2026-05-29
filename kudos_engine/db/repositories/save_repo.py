"""Save + Visit + Watched + Resonance repository."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy import select, func, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.db.models.save import Save, Visit, Watched, Resonance, MemoryPrompt


class SaveRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_save(self, *, user_id: uuid.UUID, poi_id: str,
                          capsule_id: Optional[str] = None,
                          motivation: Optional[str] = None,
                          themes: Optional[list] = None,
                          emotional_reason: Optional[str] = None,
                          collection_type: str = "personal") -> Save:
        save = Save(
            user_id=user_id, poi_id=poi_id, capsule_id=capsule_id,
            motivation=motivation, themes=themes or [],
            emotional_reason=emotional_reason, collection_type=collection_type,
        )
        self.session.add(save)
        await self.session.flush()
        return save

    async def list_by_user(self, user_id: uuid.UUID, limit: int = 100) -> List[Save]:
        stmt = select(Save).where(Save.user_id == user_id).order_by(Save.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_poi(self, poi_id: str) -> int:
        stmt = select(func.count()).select_from(Save).where(Save.poi_id == poi_id)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def delete_save(self, save_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Borra solo si pertenece al user (ownership check)."""
        stmt = delete(Save).where(and_(Save.id == save_id, Save.user_id == user_id))
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def list_stale_for_user(self, user_id: uuid.UUID, older_than_days: int = 90,
                                    limit: int = 5) -> List[Save]:
        cutoff = datetime.utcnow() - timedelta(days=older_than_days)
        stmt = (
            select(Save)
            .where(and_(Save.user_id == user_id, Save.created_at < cutoff,
                        Save.memory_status == "fresh"))
            .order_by(Save.created_at.asc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_memory_status(self, save_id: uuid.UUID, status: str,
                                    memory_reason: Optional[str] = None) -> Optional[Save]:
        save = await self.session.get(Save, save_id)
        if not save:
            return None
        save.memory_status = "stale" if status == "released" else ("aging" if status == "aging" else "fresh")
        save.updated_at = datetime.utcnow()
        # log MemoryPrompt
        mp = MemoryPrompt(user_id=save.user_id, save_id=save.id, response=status, memory_reason=memory_reason)
        self.session.add(mp)
        await self.session.flush()
        return save

    async def add_visit(self, *, user_id: uuid.UUID, poi_id: str,
                        source: Optional[str] = None, visit_reason: Optional[str] = None) -> Visit:
        v = Visit(user_id=user_id, poi_id=poi_id, source=source, visit_reason=visit_reason)
        self.session.add(v)
        await self.session.flush()
        return v

    async def add_watched(self, *, user_id: uuid.UUID, capsule_id: str, poi_id: Optional[str] = None,
                          completion_pct: Optional[int] = None, watch_reason: Optional[str] = None) -> Watched:
        w = Watched(user_id=user_id, capsule_id=capsule_id, poi_id=poi_id,
                    completion_pct=completion_pct, watch_reason=watch_reason)
        self.session.add(w)
        await self.session.flush()
        return w

    async def add_resonance(self, *, user_id: uuid.UUID, poi_id: str, resonance_type: str,
                            intensity: int = 1, capsule_id: Optional[str] = None,
                            resonance_reason: Optional[str] = None) -> Resonance:
        r = Resonance(user_id=user_id, poi_id=poi_id, capsule_id=capsule_id,
                      resonance_type=resonance_type, intensity=intensity,
                      resonance_reason=resonance_reason)
        self.session.add(r)
        await self.session.flush()
        return r
