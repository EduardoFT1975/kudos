"""
PoiSignals · HDG aggregate por POI.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, Any

from sqlalchemy import String, Integer, Float, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from kudos_engine.db.base import Base


class PoiSignals(Base):
    __tablename__ = "poi_signals"

    poi_id: Mapped[str] = mapped_column(String(64), primary_key=True)

    discovery_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    importance_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    memory_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    emotion_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    future_value_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    emotion_profile: Mapped[Optional[Any]] = mapped_column(JSONB, default=dict, nullable=True)

    total_views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_saves: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_visits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_resonances: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    last_signal_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_poi_signals_discovery", "discovery_score"),
        Index("ix_poi_signals_importance", "importance_score"),
        Index("ix_poi_signals_memory", "memory_score"),
        Index("ix_poi_signals_emotion", "emotion_score"),
        Index("ix_poi_signals_future_value", "future_value_score"),
    )
