"""
DiscoveryShift model · T2.8 + EJEC Day 1.

Cada Shift representa el cambio cognitivo posible al consumir un POI:
  BEFORE  -> creencia previa habitual
  DISCOVERY -> lo que el POI revela
  AFTER   -> nueva creencia disponible

Solo se asocia a POIs Core/Omega/S. Tier B/C no tienen shifts explicitos.

Tiers canon (alineado con jerarquia T2.3/T2.4):
  - core   : Humanity Core (7) -- inmutable
  - omega  : Tier Omega (12)
  - s      : Tier S (50)
  - a      : Tier A (250)
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, CheckConstraint, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from kudos_engine.db.base import Base


# Pilares canonicos del Humanity Core (T2.3)
PILLARS = (
    "origen",        # origen biologico
    "significado",   # proto-civilizacion / ritual
    "belleza",       # arte / expresion
    "creencia",      # trascendencia / fe
    "conocimiento",  # ciencia / vida
    "exploracion",   # frontera / cosmos
    "memoria",       # destruccion / memoria humana
)

TIERS = ("core", "omega", "s", "a", "b", "c")


class DiscoveryShift(Base):
    __tablename__ = "discovery_shifts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    poi_id: Mapped[str] = mapped_column(String(64), nullable=False)
    pillar: Mapped[str] = mapped_column(String(32), nullable=False)
    tier: Mapped[str] = mapped_column(String(8), nullable=False)

    before_statement: Mapped[str] = mapped_column(Text, nullable=False)
    discovery_revealed: Mapped[str] = mapped_column(Text, nullable=False)
    after_statement: Mapped[str] = mapped_column(Text, nullable=False)

    identity_shift_from: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    identity_shift_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    action_potential: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    action_friction: Mapped[str] = mapped_column(String(8), default="low", nullable=False)

    language: Mapped[str] = mapped_column(String(8), default="es", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    __table_args__ = (
        UniqueConstraint("poi_id", "language", name="uq_discovery_shifts_poi_lang"),
        CheckConstraint(
            "pillar IN ('origen','significado','belleza','creencia','conocimiento','exploracion','memoria')",
            name="pillar_valid",
        ),
        CheckConstraint(
            "tier IN ('core','omega','s','a','b','c')",
            name="tier_valid_shift",
        ),
        CheckConstraint(
            "action_friction IN ('low','medium','high')",
            name="action_friction_valid",
        ),
        Index("ix_discovery_shifts_pillar", "pillar"),
        Index("ix_discovery_shifts_tier", "tier"),
    )


# Helper para enlazar con Narrative (T1.2): los WHY IT MATTERS Core son narrativas
# de tipo 'why_it_matters' marcadas con tier='core' en narratives.tier.
