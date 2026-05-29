"""discovery_shifts + narratives_tier · T3.2 EJEC Day 1

Revision ID: 004_discovery_shifts
Revises: 003_trust_layer
Create Date: 2026-05-29

Anade:
  - tabla `discovery_shifts` (1 fila por POI Core/Omega/S/A · BEFORE/DISCOVERY/AFTER)
  - columnas en `narratives` para T2.7 (tier, is_canon, story_score, validation_data)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "004_discovery_shifts"
down_revision: Union[str, None] = "003_trust_layer"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ===== discovery_shifts =====
    op.create_table(
        "discovery_shifts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("poi_id", sa.String(64), nullable=False),
        sa.Column("pillar", sa.String(32), nullable=False),
        sa.Column("tier", sa.String(8), nullable=False),
        sa.Column("before_statement", sa.Text(), nullable=False),
        sa.Column("discovery_revealed", sa.Text(), nullable=False),
        sa.Column("after_statement", sa.Text(), nullable=False),
        sa.Column("identity_shift_from", sa.String(255)),
        sa.Column("identity_shift_to", sa.String(255)),
        sa.Column("action_potential", sa.Text()),
        sa.Column("action_friction", sa.String(8), nullable=False, server_default="low"),
        sa.Column("language", sa.String(8), nullable=False, server_default="es"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("poi_id", "language", name="uq_discovery_shifts_poi_lang"),
        sa.CheckConstraint(
            "pillar IN ('origen','significado','belleza','creencia','conocimiento','exploracion','memoria')",
            name="pillar_valid",
        ),
        sa.CheckConstraint(
            "tier IN ('core','omega','s','a','b','c')",
            name="tier_valid_shift",
        ),
        sa.CheckConstraint(
            "action_friction IN ('low','medium','high')",
            name="action_friction_valid",
        ),
    )
    op.create_index("ix_discovery_shifts_pillar", "discovery_shifts", ["pillar"])
    op.create_index("ix_discovery_shifts_tier", "discovery_shifts", ["tier"])

    # ===== narratives extensions T2.7 =====
    op.add_column("narratives",
        sa.Column("tier", sa.String(8), nullable=False, server_default="b"))
    op.add_column("narratives",
        sa.Column("is_canon", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("narratives",
        sa.Column("story_score", sa.Float(), nullable=True))
    op.add_column("narratives",
        sa.Column("validation_data", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")))
    op.add_column("narratives",
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))

    op.create_check_constraint(
        "narratives_tier_valid",
        "narratives",
        "tier IN ('core','omega','s','a','b','c')",
    )
    op.create_index("ix_narratives_tier", "narratives", ["tier"])
    op.create_index("ix_narratives_is_canon", "narratives", ["is_canon"])


def downgrade() -> None:
    op.drop_index("ix_narratives_is_canon", table_name="narratives")
    op.drop_index("ix_narratives_tier", table_name="narratives")
    op.drop_constraint("narratives_tier_valid", "narratives")
    op.drop_column("narratives", "published_at")
    op.drop_column("narratives", "validation_data")
    op.drop_column("narratives", "story_score")
    op.drop_column("narratives", "is_canon")
    op.drop_column("narratives", "tier")
    op.drop_index("ix_discovery_shifts_tier", table_name="discovery_shifts")
    op.drop_index("ix_discovery_shifts_pillar", table_name="discovery_shifts")
    op.drop_table("discovery_shifts")
