"""
Seed inicial · T1.2 Postgres Foundation.

Carga desde manifests JSON en experience/public/ a Postgres:
  - capsules/index.json        -> capsules table
  - data/narratives/index.json -> narratives table
  - data/relationships/index.json -> poi_relationships table

Idempotente: usa UPSERT (ON CONFLICT). Puede correrse N veces.

Uso:
  $ DATABASE_URL=postgresql://... python -m kudos_engine.db.seed.seed_initial
  $ DATABASE_URL=... python -m kudos_engine.db.seed.seed_initial --skip-narratives
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path
from typing import Any, Dict

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.db.database import get_async_sessionmaker
from kudos_engine.db.models.content import Capsule, Narrative, PoiRelationship


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
PUBLIC_DIR = PROJECT_ROOT / "experience" / "public"


def load_json(rel_path: str) -> Dict[str, Any]:
    path = PUBLIC_DIR / rel_path
    if not path.exists():
        print(f"[seed] WARN: {path} no existe, skip")
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[seed] ERR loading {path}: {e}")
        return {}


async def seed_capsules(session: AsyncSession) -> int:
    data = load_json("capsules/index.json")
    capsules = data.get("capsules", {})
    count = 0
    for cid, c in capsules.items():
        stmt = pg_insert(Capsule).values(
            id=cid,
            poi_id=c.get("poi_id", cid),
            title=c.get("name") or c.get("title"),
            duration_s=c.get("duration_s"),
            url=c.get("url"),
            thumb_url=c.get("thumb_url"),
            vtt_url=c.get("vtt_url"),
            scene_manifest=c.get("scene_manifest", {}),
            status=c.get("status", "published"),
            tier=c.get("tier"),
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[Capsule.id],
            set_={
                "title": stmt.excluded.title,
                "duration_s": stmt.excluded.duration_s,
                "url": stmt.excluded.url,
                "thumb_url": stmt.excluded.thumb_url,
                "vtt_url": stmt.excluded.vtt_url,
                "scene_manifest": stmt.excluded.scene_manifest,
                "status": stmt.excluded.status,
                "tier": stmt.excluded.tier,
            },
        )
        await session.execute(stmt)
        count += 1
    print(f"[seed] capsules: {count} upserts")
    return count


async def seed_narratives(session: AsyncSession) -> int:
    data = load_json("data/narratives/index.json")
    narratives_by_poi = data.get("narratives", {})
    count = 0
    for poi_id, narrs in narratives_by_poi.items():
        if not isinstance(narrs, list):
            continue
        for n in narrs:
            stmt = pg_insert(Narrative).values(
                poi_id=poi_id,
                narrative_type=n.get("type", "Hidden Truth"),
                title=n.get("title"),
                hook=n.get("hook"),
                duration_s=n.get("duration_s"),
                emotion=n.get("emotion"),
                body_md=n.get("body_md"),
                language=n.get("language", "es"),
                generated_by=n.get("generated_by"),
            )
            stmt = stmt.on_conflict_do_update(
                constraint="uq_narratives_unique_per_poi",
                set_={
                    "title": stmt.excluded.title,
                    "hook": stmt.excluded.hook,
                    "duration_s": stmt.excluded.duration_s,
                    "emotion": stmt.excluded.emotion,
                    "body_md": stmt.excluded.body_md,
                    "generated_by": stmt.excluded.generated_by,
                },
            )
            await session.execute(stmt)
            count += 1
    print(f"[seed] narratives: {count} upserts")
    return count


async def seed_relationships(session: AsyncSession) -> int:
    data = load_json("data/relationships/index.json")
    rels_by_poi = data.get("relationships", {})
    count = 0
    for poi_id, rels in rels_by_poi.items():
        if not isinstance(rels, list):
            continue
        for r in rels:
            related_id = r.get("id")
            relation_type = r.get("type", "geographical")
            if not related_id:
                continue
            stmt = pg_insert(PoiRelationship).values(
                poi_id=poi_id,
                related_id=related_id,
                relation_type=relation_type,
                weight=r.get("weight", 0.5),
                distance_km=r.get("distance_km"),
                relationship_origin=r.get("origin", "system"),
            )
            stmt = stmt.on_conflict_do_update(
                constraint="pk_poi_relationships",
                set_={
                    "weight": stmt.excluded.weight,
                    "distance_km": stmt.excluded.distance_km,
                    "relationship_origin": stmt.excluded.relationship_origin,
                },
            )
            await session.execute(stmt)
            count += 1
    print(f"[seed] relationships: {count} upserts")
    return count


async def main(skip_capsules: bool = False, skip_narratives: bool = False, skip_relationships: bool = False):
    SessionLocal = get_async_sessionmaker()
    async with SessionLocal() as session:
        try:
            if not skip_capsules:
                await seed_capsules(session)
            if not skip_narratives:
                await seed_narratives(session)
            if not skip_relationships:
                await seed_relationships(session)
            await session.commit()
            print("[seed] OK · commit done")
        except Exception as e:
            await session.rollback()
            print(f"[seed] FAILED: {e}")
            raise


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Seed initial Postgres con manifests estaticos.")
    ap.add_argument("--skip-capsules", action="store_true")
    ap.add_argument("--skip-narratives", action="store_true")
    ap.add_argument("--skip-relationships", action="store_true")
    args = ap.parse_args()
    asyncio.run(main(args.skip_capsules, args.skip_narratives, args.skip_relationships))
