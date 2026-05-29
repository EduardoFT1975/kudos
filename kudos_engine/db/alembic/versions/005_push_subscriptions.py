"""push_subscriptions table - T3.2 EJEC Day 22.

Revision ID: 005_push
Revises: 004_shifts
Create Date: 2026-05-29
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers
revision = "005_push_subscriptions"
down_revision = "004_discovery_shifts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "push_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("session_id", sa.String(64), nullable=True),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.String(255), nullable=False),
        sa.Column("auth", sa.String(64), nullable=False),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("locale", sa.String(8), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("endpoint", name="uq_push_endpoint"),
    )
    op.create_index("ix_push_user", "push_subscriptions", ["user_id"])
    op.create_index("ix_push_session", "push_subscriptions", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_push_session", table_name="push_subscriptions")
    op.drop_index("ix_push_user", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
