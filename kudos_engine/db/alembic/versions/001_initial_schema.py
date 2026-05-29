"""initial schema · T1.2 Postgres Foundation · 13 tablas

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-05-29

Tablas (13):
  users, refresh_tokens
  saves, visits, watched, resonances, memory_prompts
  poi_signals
  telemetry_events
  capsules, narratives, poi_relationships
  merit_overrides (GPT-5 directive)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ===== users =====
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("oauth_provider", sa.String(16), nullable=False),
        sa.Column("oauth_id", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(120)),
        sa.Column("avatar_url", sa.Text()),
        sa.Column("locale", sa.String(8), nullable=False, server_default="es"),
        sa.Column("primary_interest", sa.String(32)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True)),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("oauth_provider IN ('google','apple','anon')", name="oauth_provider_valid"),
        sa.UniqueConstraint("oauth_provider", "oauth_id", name="uq_users_oauth"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_last_seen_at", "users", ["last_seen_at"])

    # ===== refresh_tokens =====
    op.create_table(
        "refresh_tokens",
        sa.Column("jti", sa.String(64), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hash", sa.String(128), nullable=False),
        sa.Column("user_agent", sa.String(255)),
        sa.Column("ip_hash", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("rotated_to", sa.String(64)),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])

    # ===== saves =====
    op.create_table(
        "saves",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("poi_id", sa.String(64), nullable=False),
        sa.Column("capsule_id", sa.String(128)),
        sa.Column("collection_type", sa.String(32), nullable=False, server_default="personal"),
        sa.Column("motivation", sa.String(32)),
        sa.Column("themes", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("emotional_reason", sa.Text()),
        sa.Column("memory_status", sa.String(16), nullable=False, server_default="fresh"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("collection_type IN ('personal','want_to_visit','visited')", name="collection_type_valid"),
        sa.CheckConstraint("memory_status IN ('fresh','aging','stale')", name="memory_status_valid"),
    )
    op.create_index("ix_saves_user_created", "saves", ["user_id", "created_at"])
    op.create_index("ix_saves_poi_id", "saves", ["poi_id"])

    # ===== visits =====
    op.create_table(
        "visits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("poi_id", sa.String(64), nullable=False),
        sa.Column("visited_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("source", sa.String(32)),
        sa.Column("visit_reason", sa.String(32)),
    )
    op.create_index("ix_visits_user_visited", "visits", ["user_id", "visited_at"])
    op.create_index("ix_visits_poi_id", "visits", ["poi_id"])

    # ===== watched =====
    op.create_table(
        "watched",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("capsule_id", sa.String(128), nullable=False),
        sa.Column("poi_id", sa.String(64)),
        sa.Column("watched_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completion_pct", sa.Integer()),
        sa.Column("watch_reason", sa.String(32)),
    )
    op.create_index("ix_watched_user_watched", "watched", ["user_id", "watched_at"])
    op.create_index("ix_watched_capsule_id", "watched", ["capsule_id"])

    # ===== resonances =====
    op.create_table(
        "resonances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("poi_id", sa.String(64), nullable=False),
        sa.Column("capsule_id", sa.String(128)),
        sa.Column("resonance_type", sa.String(32), nullable=False),
        sa.Column("intensity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("resonance_reason", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("intensity BETWEEN 1 AND 5", name="intensity_range"),
    )
    op.create_index("ix_resonances_poi_type", "resonances", ["poi_id", "resonance_type"])
    op.create_index("ix_resonances_user_id", "resonances", ["user_id"])

    # ===== memory_prompts =====
    op.create_table(
        "memory_prompts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("save_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("saves.id", ondelete="SET NULL")),
        sa.Column("prompted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("response", sa.String(32)),
        sa.Column("memory_reason", sa.Text()),
    )
    op.create_index("ix_memory_prompts_user_prompted", "memory_prompts", ["user_id", "prompted_at"])

    # ===== poi_signals =====
    op.create_table(
        "poi_signals",
        sa.Column("poi_id", sa.String(64), primary_key=True),
        sa.Column("discovery_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("importance_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("memory_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("emotion_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("future_value_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("emotion_profile", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("total_views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_saves", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_visits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_resonances", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_signal_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_poi_signals_discovery", "poi_signals", ["discovery_score"])
    op.create_index("ix_poi_signals_importance", "poi_signals", ["importance_score"])
    op.create_index("ix_poi_signals_memory", "poi_signals", ["memory_score"])
    op.create_index("ix_poi_signals_emotion", "poi_signals", ["emotion_score"])
    op.create_index("ix_poi_signals_future_value", "poi_signals", ["future_value_score"])

    # ===== telemetry_events =====
    op.create_table(
        "telemetry_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("session_id", sa.String(64), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("poi_id", sa.String(64)),
        sa.Column("capsule_id", sa.String(128)),
        sa.Column("payload", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("event_reason", sa.String(32)),
    )
    op.create_index("ix_telemetry_user_ts", "telemetry_events", ["user_id", "ts"])
    op.create_index("ix_telemetry_event_ts", "telemetry_events", ["event_type", "ts"])
    op.create_index("ix_telemetry_poi_ts", "telemetry_events", ["poi_id", "ts"])

    # ===== capsules =====
    op.create_table(
        "capsules",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("poi_id", sa.String(64), nullable=False),
        sa.Column("title", sa.String(255)),
        sa.Column("duration_s", sa.Integer()),
        sa.Column("url", sa.Text()),
        sa.Column("thumb_url", sa.Text()),
        sa.Column("vtt_url", sa.Text()),
        sa.Column("scene_manifest", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(16), nullable=False, server_default="published"),
        sa.Column("tier", sa.String(2)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('draft','published','archived')", name="capsule_status_valid"),
    )
    op.create_index("ix_capsules_poi_id", "capsules", ["poi_id"])
    op.create_index("ix_capsules_status_created", "capsules", ["status", "created_at"])

    # ===== narratives =====
    op.create_table(
        "narratives",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("poi_id", sa.String(64), nullable=False),
        sa.Column("narrative_type", sa.String(64), nullable=False),
        sa.Column("title", sa.String(255)),
        sa.Column("hook", sa.Text()),
        sa.Column("duration_s", sa.Integer()),
        sa.Column("emotion", sa.String(32)),
        sa.Column("body_md", sa.Text()),
        sa.Column("language", sa.String(8), nullable=False, server_default="es"),
        sa.Column("generated_by", sa.String(64)),
        sa.Column("generated_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("poi_id", "narrative_type", "language", name="uq_narratives_unique_per_poi"),
    )
    op.create_index("ix_narratives_poi_id", "narratives", ["poi_id"])

    # ===== poi_relationships =====
    op.create_table(
        "poi_relationships",
        sa.Column("poi_id", sa.String(64), nullable=False),
        sa.Column("related_id", sa.String(64), nullable=False),
        sa.Column("relation_type", sa.String(32), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("distance_km", sa.Float()),
        sa.Column("relationship_origin", sa.String(16), nullable=False, server_default="system"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("poi_id", "related_id", "relation_type", name="pk_poi_relationships"),
        sa.CheckConstraint("relation_type IN ('geographical','thematic','historical','temporal')", name="relation_type_valid"),
        sa.CheckConstraint("relationship_origin IN ('system','curator','user','ai')", name="relationship_origin_valid"),
    )
    op.create_index("ix_poi_relationships_poi", "poi_relationships", ["poi_id"])
    op.create_index("ix_poi_relationships_related", "poi_relationships", ["related_id"])

    # ===== merit_overrides (GPT-5 directive) =====
    op.create_table(
        "merit_overrides",
        sa.Column("poi_id", sa.String(64), primary_key=True),
        sa.Column("override_score", sa.Float(), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_merit_overrides_source", "merit_overrides", ["source"])


def downgrade() -> None:
    # Orden inverso (FK first)
    op.drop_table("merit_overrides")
    op.drop_table("poi_relationships")
    op.drop_table("narratives")
    op.drop_table("capsules")
    op.drop_table("telemetry_events")
    op.drop_table("poi_signals")
    op.drop_table("memory_prompts")
    op.drop_table("resonances")
    op.drop_table("watched")
    op.drop_table("visits")
    op.drop_table("saves")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
