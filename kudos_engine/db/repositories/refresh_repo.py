"""RefreshToken repository · rotacion + revocacion en cadena."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.db.models.user import RefreshToken


class RefreshTokenRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, *, jti: str, user_id: uuid.UUID, hash_val: str,
                     user_agent: Optional[str] = None, ip_hash: Optional[str] = None) -> RefreshToken:
        rt = RefreshToken(
            jti=jti, user_id=user_id, hash=hash_val,
            user_agent=user_agent, ip_hash=ip_hash,
        )
        self.session.add(rt)
        await self.session.flush()
        return rt

    async def get_by_jti(self, jti: str) -> Optional[RefreshToken]:
        return await self.session.get(RefreshToken, jti)

    async def mark_rotated(self, old_jti: str, new_jti: str) -> None:
        rt = await self.session.get(RefreshToken, old_jti)
        if rt:
            rt.rotated_to = new_jti
            rt.revoked_at = datetime.utcnow()
            await self.session.flush()

    async def revoke_one(self, jti: str) -> bool:
        rt = await self.session.get(RefreshToken, jti)
        if not rt:
            return False
        rt.revoked_at = datetime.utcnow()
        await self.session.flush()
        return True

    async def revoke_all_for_user(self, user_id: uuid.UUID) -> int:
        """Logout en todos los dispositivos."""
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.utcnow())
        )
        result = await self.session.execute(stmt)
        return result.rowcount
