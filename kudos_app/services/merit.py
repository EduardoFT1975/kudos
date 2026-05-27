"""Lógica de Mérito + Mi Mundo · espejo de experience/lib/kudos/store.ts.

Funciones puras (sin side-effects que no sean BD) que cubren los hooks
del frontend Next.js para que persistan contra Django en vez de
localStorage. Cualquier cambio aquí debe replicarse en
`experience/lib/kudos/store.ts` o viceversa.

Funciones expuestas:

  · add_event(user, pillar, points, label, capsule, place)
        Espejo de `addMeritEvent`. Crea un MeritEvent.

  · compute_snapshot(user)
        Espejo de `computeMerit` + `MeritSnapshot`. Devuelve dict con
        total · level · next_level_at · per_pillar · recent · last_30.

  · tick_streak(user)
        Espejo de `tickStreak`. Avanza la racha si el usuario actúa hoy.

  · read_streak(user)
        Espejo de `readStreak`. Lee la racha sin avanzarla.

  · mark_visited(user, place)
        Espejo de `markVisited`. Idempotente. Crea Visit + suma +15 a
        Descubrimiento la primera vez.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Optional

from django.db import transaction
from django.utils import timezone

from kudos_app.models import (
    Capsule, MeritEvent, Place, Streak, Visit,
)


# Pilares válidos · espejo de `MeritPillar` en store.ts línea 97
PILLAR_VALUES = (
    'creacion', 'inspiracion', 'descubrimiento', 'comunidad', 'integridad',
)

# Curva de niveles · espejo de `breakpoints` en store.ts línea 409.
# Nivel N requiere total >= LEVEL_BREAKPOINTS[N-1].
LEVEL_BREAKPOINTS = (
    0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000, 5500, 7500, 10000,
)


# ─── add_event ────────────────────────────────────────────────────────────

def add_event(
    *,
    user,
    pillar: str,
    points: int,
    label: str = '',
    capsule: Optional[Capsule] = None,
    place: Optional[Place] = None,
) -> MeritEvent:
    """Crea un MeritEvent. Equivalente a `addMeritEvent` del store."""
    if pillar not in PILLAR_VALUES:
        raise ValueError(f'pillar inválido: {pillar!r}. Esperado uno de {PILLAR_VALUES}')
    return MeritEvent.objects.create(
        user=user,
        pillar=pillar,
        points=int(points),
        label=label,
        capsule=capsule,
        place=place,
    )


# ─── compute_snapshot ─────────────────────────────────────────────────────

def compute_snapshot(user) -> dict:
    """Calcula el snapshot completo del usuario.

    Espejo exacto de `computeMerit` en store.ts. Devuelve un dict con:

      · total          (int)            suma de points en todos los eventos
      · level          (int)            nivel 1..13 según LEVEL_BREAKPOINTS
      · next_level_at  (int)            puntos para subir al siguiente nivel
      · per_pillar     (dict[str,int])  acumulado por pilar
      · recent         (list[dict])     últimos 8 eventos en orden -ts
      · last_30        (list[dict])     30 días bucketed (día → puntos)
    """
    events_qs = MeritEvent.objects.filter(user=user).order_by('-ts')
    events = list(events_qs)

    per_pillar = {p: 0 for p in PILLAR_VALUES}
    total = 0
    for ev in events:
        per_pillar[ev.pillar] += ev.points
        total += ev.points

    # Nivel curve
    level = 1
    for i in range(1, len(LEVEL_BREAKPOINTS)):
        if total >= LEVEL_BREAKPOINTS[i]:
            level = i + 1
    next_level_at = LEVEL_BREAKPOINTS[
        min(level, len(LEVEL_BREAKPOINTS) - 1)
    ]

    recent = [
        {
            'id': e.id,
            'pillar': e.pillar,
            'points': e.points,
            'label': e.label,
            'ts': e.ts.isoformat(),
            'capsule_id': e.capsule_id,
            'place_id': e.place_id,
        }
        for e in events[:8]
    ]

    # Buckets de los últimos 30 días
    today = timezone.now().date()
    buckets = []
    by_day = {}
    for i in range(29, -1, -1):
        day = today - timedelta(days=i)
        key = day.isoformat()
        bucket = {'day': key, 'points': 0}
        buckets.append(bucket)
        by_day[key] = bucket
    for ev in events:
        key = ev.ts.date().isoformat()
        b = by_day.get(key)
        if b is not None:
            b['points'] += ev.points

    return {
        'total': total,
        'level': level,
        'next_level_at': next_level_at,
        'per_pillar': per_pillar,
        'recent': recent,
        'last_30': buckets,
    }


# ─── tick_streak / read_streak ────────────────────────────────────────────

def tick_streak(user) -> Streak:
    """Avanza la racha del usuario si actúa hoy.

    Reglas (espejo de `tickStreak` store.ts líneas 488-505):
      · Si ya tickeó hoy → no cambia nada.
      · Si tickeó ayer → days += 1.
      · Si pasaron 2+ días → days = 1 (rota racha pero arranca de nuevo).
    En todos los casos best_days se actualiza si days > best_days.
    """
    today = timezone.now().date()
    streak, _created = Streak.objects.get_or_create(user=user)

    if streak.last_day == today:
        return streak

    yesterday = today - timedelta(days=1)
    if streak.last_day == yesterday:
        streak.days += 1
    else:
        streak.days = 1

    if streak.days > streak.best_days:
        streak.best_days = streak.days
    streak.last_day = today
    streak.save()
    return streak


def read_streak(user) -> Streak:
    """Lee la racha sin avanzarla. Si no existe, devuelve instancia in-memory."""
    try:
        return Streak.objects.get(user=user)
    except Streak.DoesNotExist:
        return Streak(user=user, days=0, best_days=0, last_day=None)


# ─── mark_visited ─────────────────────────────────────────────────────────

@transaction.atomic
def mark_visited(
    *,
    user,
    place: Place,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> tuple:
    """Registra Visit + suma +15 mérito descubrimiento. Idempotente.

    Espejo de `markVisited` store.ts líneas 465-470. Devuelve
    `(visit, created: bool)`. Si created=True, también se creó un
    MeritEvent +15 Descubrimiento.
    """
    visit, created = Visit.objects.get_or_create(
        user=user, place=place,
        defaults={'lat': lat, 'lon': lon},
    )
    if created:
        add_event(
            user=user,
            pillar='descubrimiento',
            points=15,
            label='Estuviste en un lugar',
            place=place,
        )
    return visit, created
