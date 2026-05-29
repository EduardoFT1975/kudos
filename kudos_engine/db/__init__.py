"""
KUDOS Data Layer · T1.2 Postgres Foundation.

Modulo de persistencia productiva basado en SQLAlchemy 2.0 + asyncpg + Alembic.
Reemplaza progresivamente el JSON store legacy en kudos_engine/apps/core/db.py.

Activacion controlada por env var KUDOS_USE_POSTGRES=true.
"""
