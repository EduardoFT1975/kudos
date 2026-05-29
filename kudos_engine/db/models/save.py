"""
Save + Visit + Watched + Resonance + MemoryPrompt.

WHY SIGNALS (requisito GPT-5 T1.2):
  - save.motivation        (learn/travel/remember/inspire/research/connect)
  - visit.visit_reason     (planned / spontaneous / pilgrimage / educational / other)
  - watched.watch_reason   (curiosity / learning / inspiration / preparation / nostalgia)
  - resonance.resonance_type (asombro / aprendizaje / inspiracion / conexion / nostalgia)
  - memory_prompt.response (still_relevant / aging / released / dismissed)

Estos campos NO se usan todavia en la UI. El modelo los reserva para HDG futuro.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Any

from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from kudos_engine.db.base import Base


# Constantes WHY (HDG futuro)
SAVE_MOTIVATIONS = ("learn", "travel", "remember", "inspire", "research", "connect")
VISIT_REASONS = ("planned", "spontaneous", "pilgrimage", "educational", "other")
WATCH_REASONS = ("curiosity", "learning", "inspiration", "preparation", "nostalgia")
RESONANCE_TYPES = ("asombro", "aprendizaje", "inspiracion", "conexion", "nostalgia")
MEMORY_RESPONSES = ("still_relevant", "aging", "released", "dismissed")


class Save(Base):
    __tablename__ = "saves"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    poi_id: Mapped[str] = mapped_column(String(64), nullable=False)
    capsule_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    collection_type: Mapped[str] = mapped_column(String(32), default="personal", nullable=False)
    motivation: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # WHY
    themes: Mapped[Optional[Any]] = mapped_column(JSONB, default=list, nullable=True)
    emotional_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    memory_status: Mapped[str] = mapped_column(String(16), default="fresh", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    __table_args__ = (
        CheckConstraint("collection_type IN ('personal','want_to_visit','visited')", name="collection_type_valid"),
        CheckConstraint("memory_status IN ('fresh','aging','stale')", name="memory_status_valid"),
        Index("ix_saves_user_created", "user_id", "created_at"),
        Index("ix_saves_poi_id", "poi_id"),
    )


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    poi_id: Mapped[str] = mapped_column(String(64), nullable=False)
    visited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    source: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)            # gps / manual / capsule
    visit_reason: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)      # WHY · HDG futuro

    __table_args__ = (
        Index("ix_visits_user_visited", "user_id", "visited_at"),
        Index("ix_visits_poi_id", "poi_id"),
    )


class Watched(Base):
    __tablename__ = "watched"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    capsule_id: Mapped[str] = mapped_column(String(128), nullable=False)
    poi_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    watched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completion_pct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    watch_reason: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)      # WHY · HDG futuro

    __table_args__ = (
        Index("ix_watched_user_watched", "user_id", "watched_at"),
        Index("ix_watched_capsule_id", "capsule_id"),
    )


class Resonance(Base):
    __tablename__ = "resonances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    poi_id: Mapped[str] = mapped_column(String(64), nullable=False)
    capsule_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    resonance_type: Mapped[str] = mapped_column(String(32), nullable=False)             # WHY canonico
    intensity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    resonance_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)        # WHY libre (texto)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("intensity BETWEEN 1 AND 5", name="intensity_range"),
        Index("ix_resonances_poi_type", "poi_id", "resonance_type"),
        Index("ix_resonances_user_id", "user_id"),
    )


class MemoryPrompt(Base):
    __tablename__ = "memory_prompts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    save_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("saves.id", ondelete="SET NULL"), nullable=True)
    prompted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    response: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    memory_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)           # WHY libre

    __table_args__ = (
        Index("ix_memory_prompts_user_prompted", "user_id", "prompted_at"),
    )
