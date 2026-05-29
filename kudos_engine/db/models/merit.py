"""
Merit overrides table (GPT-5 directive H1.T1.0 ajuste 3).

Permite que ciertos POIs (UNESCO, Patrimonio Mundial, lugares historicos
canonicos) nazcan con merit alto sin esperar a que los usuarios los descubran.

Hoy la tabla queda creada vacia. Se popula en T3 (Content Scale) o
manualmente desde panel admin futuro.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Float, Text, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from kudos_engine.db.base import Base


class MeritOverride(Base):
    __tablename__ = "merit_overrides"

    poi_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    override_score: Mapped[float] = mapped_column(Float, nullable=False)              # 0..100
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)                # "UNESCO World Heritage 1980"
    source: Mapped[str] = mapped_column(String(32), nullable=False)                   # 'unesco' / 'curator' / 'editorial'
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_merit_overrides_source", "source"),
    )
