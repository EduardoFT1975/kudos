"""
Auth endpoints · T1.3.

POST /api/auth/oauth/google   · intercambia id_token Google por par JWT KUDOS
POST /api/auth/refresh        · rota refresh + emite nuevo access
POST /api/auth/logout         · revoca refresh actual
POST /api/auth/logout-all     · revoca todos los refresh del usuario
GET  /api/auth/me             · perfil del usuario autenticado
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Header
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.auth.dependencies import get_current_user
from kudos_engine.auth.google_verify import verify_google_id_token, GoogleVerifyError
from kudos_engine.auth.jwt_utils import (
    encode_access, encode_refresh, decode_token, hash_token, hash_ip,
    AuthError, REFRESH_TTL_DAYS,
)
from kudos_engine.db.database import get_async_session
from kudos_engine.db.models.user import User
from kudos_engine.db.repositories.user_repo import UserRepository
from kudos_engine.db.repositories.refresh_repo import RefreshTokenRepository
from kudos_engine.security.rate_limit import limiter, RL_AUTH_OAUTH, RL_AUTH_REFRESH


router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "kudos_refresh"
COOKIE_SECURE = os.getenv("ENV", "production").lower() == "production"
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None


class GoogleLoginRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    expires_in: int
    user: dict


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        max_age=REFRESH_TTL_DAYS * 24 * 3600,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        domain=COOKIE_DOMAIN,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/", domain=COOKIE_DOMAIN)


def _user_to_dict(u: User) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "display_name": u.display_name,
        "avatar_url": u.avatar_url,
        "locale": u.locale,
        "primary_interest": u.primary_interest,
    }


@router.post("/oauth/google", response_model=TokenResponse)
@limiter.limit(RL_AUTH_OAUTH)
async def google_login(
    body: GoogleLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_session),
):
    """Verifica id_token Google + crea/actualiza user + emite par JWT KUDOS."""
    try:
        google_payload = await verify_google_id_token(body.id_token)
    except GoogleVerifyError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=f"google verify failed: {e}")

    email = google_payload.get("email")
    sub = google_payload.get("sub")
    name = google_payload.get("name")
    picture = google_payload.get("picture")
    locale_hint = google_payload.get("locale", "es")[:8]

    if not email or not sub:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="google payload incompleto")

    user_repo = UserRepository(db)
    user = await user_repo.create_or_update(
        email=email,
        provider="google",
        oauth_id=sub,
        display_name=name,
        avatar_url=picture,
        locale=locale_hint,
    )

    access_token, _ = encode_access(user.id, interest=user.primary_interest)
    refresh_token, jti, _ = encode_refresh(user.id)

    refresh_repo = RefreshTokenRepository(db)
    await refresh_repo.create(
        jti=jti,
        user_id=user.id,
        hash_val=hash_token(refresh_token),
        user_agent=request.headers.get("user-agent", "")[:255],
        ip_hash=hash_ip(request.client.host if request.client else ""),
    )

    await db.commit()

    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(
        access_token=access_token,
        expires_in=15 * 60,
        user=_user_to_dict(user),
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit(RL_AUTH_REFRESH)
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_session),
):
    """Rota refresh + emite nuevo access. Si detecta replay, revoca toda la cadena del user."""
    raw = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="missing refresh cookie")
    try:
        payload = decode_token(raw)
    except AuthError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=str(e))

    jti = payload.get("jti")
    sub = payload.get("sub")
    if not jti or not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid refresh payload")

    refresh_repo = RefreshTokenRepository(db)
    rt = await refresh_repo.get_by_jti(jti)
    if rt is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="refresh not found")

    # ANTI-REPLAY: si ya fue rotado/revocado, considerar ataque -> revocar toda la cadena
    if rt.revoked_at is not None or rt.rotated_to is not None:
        await refresh_repo.revoke_all_for_user(uuid.UUID(sub))
        await db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="refresh reuse detected · all sessions revoked")

    # Verificar hash
    if rt.hash != hash_token(raw):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="refresh hash mismatch")

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(uuid.UUID(sub))
    if not user or user.deleted_at is not None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="user not found")

    # Rotar
    new_refresh, new_jti, _ = encode_refresh(user.id)
    await refresh_repo.create(
        jti=new_jti,
        user_id=user.id,
        hash_val=hash_token(new_refresh),
        user_agent=request.headers.get("user-agent", "")[:255],
        ip_hash=hash_ip(request.client.host if request.client else ""),
    )
    await refresh_repo.mark_rotated(jti, new_jti)
    new_access, _ = encode_access(user.id, interest=user.primary_interest)
    await db.commit()

    _set_refresh_cookie(response, new_refresh)
    return TokenResponse(
        access_token=new_access,
        expires_in=15 * 60,
        user=_user_to_dict(user),
    )


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_session),
):
    raw = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw:
        try:
            payload = decode_token(raw)
            jti = payload.get("jti")
            if jti:
                repo = RefreshTokenRepository(db)
                await repo.revoke_one(jti)
                await db.commit()
        except AuthError:
            pass
    _clear_refresh_cookie(response)
    return Response(status_code=204)


@router.post("/logout-all", status_code=204)
async def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    repo = RefreshTokenRepository(db)
    await repo.revoke_all_for_user(current_user.id)
    await db.commit()
    _clear_refresh_cookie(response)
    return Response(status_code=204)


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return _user_to_dict(current_user)
