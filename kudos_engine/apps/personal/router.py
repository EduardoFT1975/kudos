"""
T3.2 EJEC Day 15-16 - Personal Graph + Shift History router.

Endpoints:
  GET /api/personal/graph  -> exposiciones del usuario a Cores por pilar (luminosidad nodos)
  GET /api/personal/shifts -> Discovery Shifts vividos por el usuario (revisitables)
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.apps.core_engine.selector import CORE_BY_DAY, CORE_PILLARS
from kudos_engine.auth.dependencies import get_optional_user
from kudos_engine.db.database import get_async_session
from kudos_engine.db.models.shift import DiscoveryShift
from kudos_engine.db.models.telemetry import TelemetryEvent
from kudos_engine.db.models.user import User


router = APIRouter(prefix="/api/personal", tags=["personal"])


PILLARS = ("origen", "significado", "belleza", "creencia", "conocimiento", "exploracion", "memoria")


class PillarNode(BaseModel):
    pillar: str
    core_completed_count: int
    last_exposure_at: Optional[datetime] = None
    luminosity: str


class PersonalGraphResponse(BaseModel):
    user_authenticated: bool
    pillars: list[PillarNode]
    total_cores_completed: int
    discovery_dna_unlocked: bool
    discovery_dna_requirements_met: dict[str, bool]
    contextual_message: str


def _classify_luminosity(count: int) -> str:
    if count <= 0:    return "off"
    if count == 1:    return "tenue"
    if count == 2:    return "medio"
    return "brillante"


def _contextual_message(total_completed: int, pillars_touched: int, dna: bool) -> str:
    if total_completed == 0:
        return "Hola. Hoy empieza algo."
    if total_completed < 3:
        return "Continuamos."
    if pillars_touched < 5:
        return f"Has tocado {pillars_touched} pilares. Faltan {7 - pillars_touched} para tu Discovery DNA."
    if dna:
        return "Has tocado los 7 pilares. Aqui empieza la profundidad."
    return f"Has tocado {pillars_touched} pilares. Estas a {5 - pillars_touched} de tu Discovery DNA."


def _events_filter(user: Optional[User], session_id: Optional[str]):
    if user is not None:
        return TelemetryEvent.user_id == user.id
    if session_id:
        return TelemetryEvent.session_id == session_id
    return TelemetryEvent.id == -1


@router.get("/graph", response_model=PersonalGraphResponse)
async def get_personal_graph(
    x_session_id: Optional[str] = Header(None),
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_async_session),
):
    user_filter = _events_filter(user, x_session_id)

    pillar_data: dict[str, dict] = {p: {"count": 0, "last_ts": None} for p in PILLARS}

    stmt = (
        select(
            TelemetryEvent.poi_id,
            func.max(TelemetryEvent.ts).label("last_ts"),
        )
        .where(
            user_filter,
            TelemetryEvent.event_type == "core_completed",
            TelemetryEvent.poi_id.in_(CORE_BY_DAY),
        )
        .group_by(TelemetryEvent.poi_id)
    )
    result = await db.execute(stmt)
    for poi_id, last_ts in result.all():
        pillar = CORE_PILLARS.get(poi_id)
        if not pillar:
            continue
        pillar_data[pillar]["count"] += 1
        if pillar_data[pillar]["last_ts"] is None or last_ts > pillar_data[pillar]["last_ts"]:
            pillar_data[pillar]["last_ts"] = last_ts

    nodes = [
        PillarNode(
            pillar=p,
            core_completed_count=pillar_data[p]["count"],
            last_exposure_at=pillar_data[p]["last_ts"],
            luminosity=_classify_luminosity(pillar_data[p]["count"]),
        )
        for p in PILLARS
    ]

    pillars_touched = sum(1 for n in nodes if n.core_completed_count > 0)
    total_completed = sum(n.core_completed_count for n in nodes)

    rv_stmt = select(func.count()).where(user_filter, TelemetryEvent.event_type == "return_visit_to_poi")
    rv_count = int((await db.execute(rv_stmt)).scalar_one() or 0)

    rf_stmt = select(func.count()).where(user_filter, TelemetryEvent.event_type == "reflection_submitted")
    rf_count = int((await db.execute(rf_stmt)).scalar_one() or 0)

    rl_stmt = select(func.count()).where(user_filter, TelemetryEvent.event_type == "relationship_followed")
    rl_count = int((await db.execute(rl_stmt)).scalar_one() or 0)

    dna_req = {
        "pillars_touched_5_plus":    pillars_touched >= 5,
        "cores_completed_2_plus":    total_completed >= 2,
        "return_visit_1_plus":       rv_count >= 1,
        "reflection_1_plus":         rf_count >= 1,
        "relationship_followed_3_plus": rl_count >= 3,
    }
    dna_unlocked = all(dna_req.values())

    return PersonalGraphResponse(
        user_authenticated=user is not None,
        pillars=nodes,
        total_cores_completed=total_completed,
        discovery_dna_unlocked=dna_unlocked,
        discovery_dna_requirements_met=dna_req,
        contextual_message=_contextual_message(total_completed, pillars_touched, dna_unlocked),
    )


class ShiftLived(BaseModel):
    poi_id: str
    pillar: str
    tier: str
    before_statement: str
    discovery_revealed: str
    after_statement: str
    identity_shift_to: Optional[str] = None
    first_lived_at: datetime
    last_revisited_at: datetime
    revisit_count: int


class ShiftHistoryResponse(BaseModel):
    user_authenticated: bool
    total_shifts_lived: int
    shifts: list[ShiftLived]
    contextual_message: str


@router.get("/shifts", response_model=ShiftHistoryResponse)
async def get_personal_shifts(
    x_session_id: Optional[str] = Header(None),
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_async_session),
):
    user_filter = _events_filter(user, x_session_id)

    stmt = (
        select(
            TelemetryEvent.poi_id,
            func.min(TelemetryEvent.ts).label("first_at"),
            func.max(TelemetryEvent.ts).label("last_at"),
            func.count(TelemetryEvent.id).label("n"),
        )
        .where(
            user_filter,
            TelemetryEvent.event_type == "shift_acknowledged",
            TelemetryEvent.poi_id.isnot(None),
        )
        .group_by(TelemetryEvent.poi_id)
        .order_by(func.max(TelemetryEvent.ts).desc())
    )
    rows = (await db.execute(stmt)).all()

    if not rows:
        return ShiftHistoryResponse(
            user_authenticated=user is not None,
            total_shifts_lived=0,
            shifts=[],
            contextual_message="Aun no has vivido ningun Discovery Shift. Empieza con el Core del dia.",
        )

    poi_ids = [r.poi_id for r in rows]

    shifts_q = await db.execute(
        select(DiscoveryShift).where(
            DiscoveryShift.poi_id.in_(poi_ids),
            DiscoveryShift.language == "es",
        )
    )
    shift_by_poi = {s.poi_id: s for s in shifts_q.scalars().all()}

    out: list[ShiftLived] = []
    for r in rows:
        ds = shift_by_poi.get(r.poi_id)
        if ds is None:
            continue
        out.append(ShiftLived(
            poi_id=ds.poi_id,
            pillar=ds.pillar,
            tier=ds.tier,
            before_statement=ds.before_statement,
            discovery_revealed=ds.discovery_revealed,
            after_statement=ds.after_statement,
            identity_shift_to=ds.identity_shift_to,
            first_lived_at=r.first_at,
            last_revisited_at=r.last_at,
            revisit_count=int(r.n),
        ))

    total = len(out)
    if total == 0:
        msg = "Aun no has vivido ningun Discovery Shift completo."
    elif total == 1:
        msg = "Tu primer Discovery Shift. Aqui empezo."
    elif total < 5:
        msg = f"{total} shifts vividos. Cada uno cambio algo en como ves el mundo."
    else:
        msg = f"{total} shifts. Esto ya no es exploracion, es construccion de mirada."

    return ShiftHistoryResponse(
        user_authenticated=user is not None,
        total_shifts_lived=total,
        shifts=out,
        contextual_message=msg,
    )
