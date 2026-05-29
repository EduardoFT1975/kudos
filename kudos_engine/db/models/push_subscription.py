"""
PushSubscription model - T3.2 EJEC Day 22.

Almacena las suscripciones Web Push (endpoint + p256dh + auth).
Una por user (o por session_id si anonimo).

Para enviar notifs reales necesitamos VAPID keys + libreria pywebpush.
MVP: solo almacenamos. El envio queda preparado pero opt-in via env vars.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from kudos_engine.db.base import Base


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    session_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    endpoint: Mapped[str] = mapped_column(Text, nullable=False)
    p256dh: Mapped[str] = mapped_column(String(255), nullable=False)
    auth: Mapped[str] = mapped_column(String(64), nullable=False)

    # opcional: user agent + lang locale para personalizar payloads
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    locale: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("endpoint", name="uq_push_endpoint"),
        Index("ix_push_user", "user_id"),
        Index("ix_push_session", "session_id"),
    )
