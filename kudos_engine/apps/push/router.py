"""
T3.2 EJEC Day 22 - Push notifications router.

Endpoints:
  POST /api/push/subscribe    -> registra una PushSubscription
  POST /api/push/unsubscribe  -> elimina por endpoint
  GET  /api/push/vapid-public -> devuelve la public key VAPID (para clientes)

NOTA: el envio real esta gated por env var KUDOS_VAPID_PRIVATE_KEY.
Si no esta configurado, los endpoints aceptan suscripciones pero no envian.
Esto permite empezar a recolectar usuarios opt-in antes del primer broadcast.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.auth.dependencies import get_optional_user
from kudos_engine.db.database import get_async_session
from kudos_engine.db.models.push_subscription import PushSubscription
from kudos_engine.db.models.user import User


router = APIRouter(prefix="/api/push", tags=["push"])


VAPID_PUBLIC_KEY = os.getenv("KUDOS_VAPID_PUBLIC_KEY", "")


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscribeBody(BaseModel):
    endpoint: str
    keys: SubscriptionKeys
    locale: Optional[str] = None


class UnsubscribeBody(BaseModel):
    endpoint: str


@router.get("/vapid-public")
async def vapid_public():
    """
    Devuelve la public VAPID key para que el cliente la use en subscribe().
    Si no esta configurada, devuelve empty string (el cliente skip suscripcion).
    """
    return {"public_key": VAPID_PUBLIC_KEY, "configured": bool(VAPID_PUBLIC_KEY)}


@router.post("/subscribe")
async def subscribe(
    body: SubscribeBody,
    request: Request,
    x_session_id: Optional[str] = Header(None),
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Registra una PushSubscription. Idempotente: si el endpoint ya existe,
    actualiza last_used_at y refresca user_id/session_id.
    """
    if not body.endpoint or not body.keys.p256dh or not body.keys.auth:
        raise HTTPException(400, "invalid subscription")

    ua = request.headers.get("user-agent", "")[:512] or None

    existing = (await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
    )).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if existing:
        existing.user_id = user.id if user else existing.user_id
        existing.session_id = x_session_id or existing.session_id
        existing.last_used_at = now
        existing.user_agent = ua
        existing.locale = body.locale or existing.locale
    else:
        sub = PushSubscription(
            user_id=user.id if user else None,
            session_id=x_session_id,
            endpoint=body.endpoint,
            p256dh=body.keys.p256dh,
            auth=body.keys.auth,
            user_agent=ua,
            locale=body.locale,
            last_used_at=now,
        )
        db.add(sub)

    await db.commit()
    return {"ok": True, "configured": bool(VAPID_PUBLIC_KEY)}


@router.post("/unsubscribe")
async def unsubscribe(
    body: UnsubscribeBody,
    db: AsyncSession = Depends(get_async_session),
):
    if not body.endpoint:
        raise HTTPException(400, "endpoint required")
    await db.execute(delete(PushSubscription).where(PushSubscription.endpoint == body.endpoint))
    await db.commit()
    return {"ok": True}
