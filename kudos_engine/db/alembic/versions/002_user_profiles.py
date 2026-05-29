"""user_profiles + indices auth · T1.3

Revision ID: 002_user_profiles
Revises: 001_initial_schema
Create Date: 2026-05-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "002_user_profiles"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("primary_interest", sa.String(32)),
        sa.Column("secondary_interests", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("discovery_style", sa.String(16)),
        sa.Column("exploration_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("memory_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "discovery_style IS NULL OR discovery_style IN ('explorer','curator','pilgrim','dreamer','scholar')",
            name="discovery_style_valid",
        ),
    )
    op.create_index("ix_user_profiles_discovery_style", "user_profiles", ["discovery_style"])


def downgrade() -> None:
    op.drop_table("user_profiles")
