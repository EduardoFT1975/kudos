"""
TelemetryEvent · HDG capture raw.

GPT-5 directive: NO eliminar eventos nunca. Hoy ruido, manana training data.
Particionado (BY RANGE ts) se difiere a fase escala (100k+ usuarios).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Any

from sqlalchemy import String, Text, DateTime, BigInteger, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from kudos_engine.db.base import Base


class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    poi_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    capsule_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    payload: Mapped[Optional[Any]] = mapped_column(JSONB, default=dict, nullable=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # WHY signal opcional (categoria preferida)
    event_reason: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    __table_args__ = (
        Index("ix_telemetry_user_ts", "user_id", "ts"),
        Index("ix_telemetry_event_ts", "event_type", "ts"),
        Index("ix_telemetry_poi_ts", "poi_id", "ts"),
    )
