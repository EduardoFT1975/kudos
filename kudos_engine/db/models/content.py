"""
Content models: Capsule, Narrative, PoiRelationship.

Estos son contenido estatico generado por nuestro pipeline (Anthropic + ffmpeg + Wikidata).
Llegan via seed inicial desde manifests JSON en experience/public/.

GPT-5 ajustes T1.0:
  - relationship_origin: 'system' | 'curator' | 'user' | 'ai'  (World Graph multi-source)
  - reserved table merit_overrides (NO en este file, no es content)

T2.7 + EJEC Day 1 extensions:
  - narratives.tier ('core' | 'omega' | 's' | 'a' | 'b' | 'c')
  - narratives.is_canon (las 7 Core)
  - narratives.story_score, validation_data, published_at
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Any

from sqlalchemy import String, Text, Integer, Float, Boolean, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, Index, PrimaryKeyConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from kudos_engine.db.base import Base


class Capsule(Base):
    __tablename__ = "capsules"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    poi_id: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    duration_s: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumb_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vtt_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scene_manifest: Mapped[Optional[Any]] = mapped_column(JSONB, default=dict, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="published", nullable=False)
    tier: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("status IN ('draft','published','archived')", name="capsule_status_valid"),
        Index("ix_capsules_poi_id", "poi_id"),
        Index("ix_capsules_status_created", "status", "created_at"),
    )


class Narrative(Base):
    __tablename__ = "narratives"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    poi_id: Mapped[str] = mapped_column(String(64), nullable=False)
    narrative_type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    hook: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_s: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    emotion: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    body_md: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String(8), default="es", nullable=False)
    generated_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # T2.7 + EJEC Day 1 extensions
    tier: Mapped[str] = mapped_column(String(8), default="b", nullable=False)
    is_canon: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    story_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    validation_data: Mapped[Optional[Any]] = mapped_column(JSONB, default=dict, nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("poi_id", "narrative_type", "language", name="uq_narratives_unique_per_poi"),
        CheckConstraint("tier IN ('core','omega','s','a','b','c')", name="narratives_tier_valid"),
        Index("ix_narratives_poi_id", "poi_id"),
        Index("ix_narratives_tier", "tier"),
        Index("ix_narratives_is_canon", "is_canon"),
    )


class PoiRelationship(Base):
    __tablename__ = "poi_relationships"

    poi_id: Mapped[str] = mapped_column(String(64), nullable=False)
    related_id: Mapped[str] = mapped_column(String(64), nullable=False)
    relation_type: Mapped[str] = mapped_column(String(32), nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # GPT-5 directive: multi-source origin
    relationship_origin: Mapped[str] = mapped_column(String(16), default="system", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint("poi_id", "related_id", "relation_type"),
        CheckConstraint("relation_type IN ('geographical','thematic','historical','temporal')", name="relation_type_valid"),
        CheckConstraint("relationship_origin IN ('system','curator','user','ai')", name="relationship_origin_valid"),
        Index("ix_poi_relationships_poi", "poi_id"),
        Index("ix_poi_relationships_related", "related_id"),
    )
