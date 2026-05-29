"""User + RefreshToken repository (T1.2 minimo · T1.3 lo extendera)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.db.models.user import User, RefreshToken


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_oauth(self, provider: str, oauth_id: str) -> Optional[User]:
        stmt = select(User).where(User.oauth_provider == provider, User.oauth_id == oauth_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_or_update(self, *, email: str, provider: str, oauth_id: str,
                                display_name: Optional[str] = None,
                                avatar_url: Optional[str] = None,
                                locale: str = "es") -> User:
        existing = await self.get_by_oauth(provider, oauth_id)
        if existing:
            existing.email = email
            existing.display_name = display_name or existing.display_name
            existing.avatar_url = avatar_url or existing.avatar_url
            existing.last_seen_at = datetime.utcnow()
            await self.session.flush()
            return existing
        user = User(
            email=email,
            oauth_provider=provider,
            oauth_id=oauth_id,
            display_name=display_name,
            avatar_url=avatar_url,
            locale=locale,
            last_seen_at=datetime.utcnow(),
        )
        self.session.add(user)
        await self.session.flush()
        return user
