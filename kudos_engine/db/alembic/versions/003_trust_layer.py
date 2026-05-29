"""trust_layer · telemetry_events + poi_signals + resonances

Revision ID: 003_trust_layer
Revises: 002_user_profiles
Create Date: 2026-05-29

GPT-5 directive T1.5: cada senal debe poder clasificarse:
  trusted / normal / suspect / bot
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003_trust_layer"
down_revision: Union[str, None] = "002_user_profiles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("telemetry_events",
        sa.Column("trust_level", sa.String(16), nullable=False, server_default="normal"))
    op.create_check_constraint(
        "trust_level_valid_te",
        "telemetry_events",
        "trust_level IN ('trusted','normal','suspect','bot')",
    )
    op.create_index("ix_telemetry_trust", "telemetry_events", ["trust_level"])

    op.add_column("resonances",
        sa.Column("trust_level", sa.String(16), nullable=False, server_default="normal"))
    op.create_check_constraint(
        "trust_level_valid_res",
        "resonances",
        "trust_level IN ('trusted','normal','suspect','bot')",
    )

    op.add_column("saves",
        sa.Column("trust_level", sa.String(16), nullable=False, server_default="normal"))
    op.create_check_constraint(
        "trust_level_valid_saves",
        "saves",
        "trust_level IN ('trusted','normal','suspect','bot')",
    )


def downgrade() -> None:
    op.drop_constraint("trust_level_valid_saves", "saves")
    op.drop_column("saves", "trust_level")
    op.drop_constraint("trust_level_valid_res", "resonances")
    op.drop_column("resonances", "trust_level")
    op.drop_index("ix_telemetry_trust", table_name="telemetry_events")
    op.drop_constraint("trust_level_valid_te", "telemetry_events")
    op.drop_column("telemetry_events", "trust_level")
