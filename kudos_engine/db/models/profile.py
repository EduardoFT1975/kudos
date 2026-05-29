"""
UserProfile (T1.3 · GPT-5 directive User Discovery Profile).

Preparado para HDG futuro. No se expone UX en T1.3.

Campos:
  - primary_interest        (ya en users · espejo aqui para queries rapidas)
  - secondary_interests     lista JSONB
  - discovery_style         enum: explorer / curator / pilgrim / dreamer / scholar
  - exploration_score       0..100 (cuanto explora vs lugares ya conocidos)
  - memory_score            0..100 (cuanto revisita / consolida)
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Any

from sqlalchemy import String, Float, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from kudos_engine.db.base import Base


DISCOVERY_STYLES = ("explorer", "curator", "pilgrim", "dreamer", "scholar")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    primary_interest: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    secondary_interests: Mapped[Optional[Any]] = mapped_column(JSONB, default=list, nullable=True)
    discovery_style: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    exploration_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    memory_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(), onupdate=func.now(), nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "discovery_style IS NULL OR discovery_style IN ('explorer','curator','pilgrim','dreamer','scholar')",
            name="discovery_style_valid",
        ),
        Index("ix_user_profiles_discovery_style", "discovery_style"),
    )
