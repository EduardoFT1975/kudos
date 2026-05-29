"""
FastAPI dependencies para auth.

Uso en endpoints:
  @router.post("/...")
  async def my_endpoint(
      current_user: User = Depends(get_current_user),
      db: AsyncSession = Depends(get_async_session),
  ):
      # current_user.id es el UUID del autenticado

Para endpoints opcionales:
  current_user: Optional[User] = Depends(get_optional_user)
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.auth.jwt_utils import decode_token, AuthError
from kudos_engine.db.database import get_async_session
from kudos_engine.db.models.user import User
from kudos_engine.db.repositories.user_repo import UserRepository


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_session),
) -> User:
    """Require JWT valido. Lanza 401 si no."""
    if not authorization:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header")
    token = parts[1]
    try:
        payload = decode_token(token)
    except AuthError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=str(e))
    if payload.get("scope") != "user":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid token scope")
    sub = payload.get("sub")
    try:
        user_id = uuid.UUID(sub)
    except (TypeError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid sub")
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="user not found")
    if user.deleted_at is not None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="user deleted")
    return user


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_session),
) -> Optional[User]:
    """No requiere auth. Si hay JWT valido devuelve user, si no None."""
    if not authorization:
        return None
    try:
        return await get_current_user(authorization, db)
    except HTTPException:
        return None


def require_ownership(resource_user_id: uuid.UUID, current_user: User) -> None:
    """Helper: lanza 403 si el usuario no es dueno del recurso."""
    if resource_user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="not the owner")
