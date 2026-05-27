"""kudos_app · API REST para Mérito + Mi Mundo (MVP maquetas).

Endpoints simples Django nativos (no DRF · coherente con el resto del
proyecto). Todos requieren autenticación. Las mutaciones (POST/DELETE)
están exentas de CSRF · el frontend Next.js usa JWT/Authorization
header gestionado en `experience/lib/auth/` (a integrar en P32.06).

Rutas:

  GET    /api/merit/snapshot/      → snapshot completo (total, level, pilares, last_30)
  GET    /api/merit/events/        → últimos 200 eventos
  POST   /api/merit/events/add/    → añadir evento + tick_streak

  GET    /api/bookmarks/           → todos los Bookmark del usuario
  POST   /api/bookmarks/           → crear (idempotente)
  DELETE /api/bookmarks/           → eliminar

  GET    /api/visits/              → todos los Visit del usuario
  POST   /api/visits/              → mark_visited + tick_streak

  GET    /api/streak/              → estado racha
  GET    /api/collections/         → todas las Collection del usuario
"""
from __future__ import annotations

import json
from typing import Optional

from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from kudos_app.models import (
    Bookmark, Capsule, Collection, MeritEvent, Place, Visit,
)
from kudos_app.services import merit as merit_service



# ─── Demo user fallback ────────────────────────────────────────────────────
# Para MVP local · si el request no tiene usuario autenticado, devuelve
# (o crea) un User con uid="demo". Esto permite probar el smoke E2E
# sin flow de login en el frontend. En producción restaurar
# @login_required.

def _resolve_user(request):
    user = getattr(request, "user", None)
    if user is not None and user.is_authenticated:
        return user
    from kudos_app.models import User
    demo, _ = User.objects.get_or_create(
        uid="demo",
        defaults={"alias": "demo", "is_active": True},
    )
    return demo


# ─── Helpers ──────────────────────────────────────────────────────────────

def _json_body(request: HttpRequest) -> dict:
    try:
        return json.loads(request.body or b'{}')
    except json.JSONDecodeError:
        return {}


def _err(msg: str, status: int = 400) -> JsonResponse:
    return JsonResponse({'error': msg}, status=status)


# ─── Mérito ───────────────────────────────────────────────────────────────

@require_GET
def api_merit_snapshot(request: HttpRequest) -> JsonResponse:
    """Snapshot completo del Mérito + estado de racha."""
    snapshot = merit_service.compute_snapshot(_resolve_user(request))
    streak = merit_service.read_streak(_resolve_user(request))
    snapshot['streak'] = {
        'days': streak.days,
        'best_days': streak.best_days,
        'last_day': streak.last_day.isoformat() if streak.last_day else None,
    }
    return JsonResponse(snapshot)


@require_GET
def api_merit_events(request: HttpRequest) -> JsonResponse:
    """Últimos 200 eventos de mérito del usuario."""
    events = MeritEvent.objects.filter(user=_resolve_user(request)).order_by('-ts')[:200]
    return JsonResponse({
        'events': [
            {
                'id': e.id,
                'pillar': e.pillar,
                'points': e.points,
                'label': e.label,
                'ts': e.ts.isoformat(),
                'capsule_id': e.capsule_id,
                'place_id': e.place_id,
            }
            for e in events
        ],
    })


@csrf_exempt
@require_POST
def api_merit_add_event(request: HttpRequest) -> JsonResponse:
    """Crea un MeritEvent + avanza racha. Body JSON:

        {pillar, points, label?, capsule_id?, place_id?}
    """
    data = _json_body(request)
    pillar = data.get('pillar')
    points = data.get('points')

    if pillar not in merit_service.PILLAR_VALUES:
        return _err('pillar inválido')
    if not isinstance(points, int):
        return _err('points debe ser int')

    capsule = None
    place = None
    if data.get('capsule_id'):
        capsule = Capsule.objects.filter(uid=data['capsule_id']).first()
    if data.get('place_id'):
        place = Place.objects.filter(slug=data['place_id']).first()

    ev = merit_service.add_event(
        user=_resolve_user(request),
        pillar=pillar,
        points=points,
        label=data.get('label', ''),
        capsule=capsule,
        place=place,
    )
    merit_service.tick_streak(_resolve_user(request))
    return JsonResponse({'id': ev.id, 'ok': True})


# ─── Bookmarks (Saved) ────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST', 'DELETE'])
def api_bookmarks(request: HttpRequest) -> JsonResponse:
    """GET → lista. POST/DELETE body JSON: {kind: 'capsule'|'poi', target_id}."""
    if request.method == 'GET':
        bm = (Bookmark.objects
              .filter(user=_resolve_user(request))
              .select_related('capsule', 'place')
              .order_by('-created'))
        return JsonResponse({
            'bookmarks': [
                {
                    'id': b.id,
                    'kind': 'capsule' if b.capsule_id else 'poi',
                    'target_id': (b.capsule.uid if b.capsule_id
                                  else b.place.slug),
                    'note': b.note,
                    'created': b.created.isoformat(),
                }
                for b in bm
            ],
        })

    data = _json_body(request)
    kind = data.get('kind')
    target_id = data.get('target_id')
    if kind not in ('capsule', 'poi'):
        return _err('kind inválido')

    capsule = None
    place = None
    if kind == 'capsule':
        capsule = Capsule.objects.filter(uid=target_id).first()
        if not capsule:
            return _err('cápsula no encontrada', 404)
    else:
        # MVP: auto-crear Place con datos minimos si el slug no existe.
        # El frontend tiene POIs hardcoded que no fueron sembrados en BD.
        place, _ = Place.objects.get_or_create(
            slug=target_id,
            defaults={'name': target_id.replace('-', ' ').title()},
        )

    if request.method == 'POST':
        bm, created = Bookmark.objects.get_or_create(
            user=_resolve_user(request), capsule=capsule, place=place,
            defaults={'note': data.get('note', '')},
        )
        return JsonResponse({'id': bm.id, 'created': created})

    # DELETE
    deleted, _ = Bookmark.objects.filter(
        user=_resolve_user(request), capsule=capsule, place=place,
    ).delete()
    return JsonResponse({'ok': True, 'deleted': deleted})


# ─── Visits (Estuve aquí) ─────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def api_visits(request: HttpRequest) -> JsonResponse:
    if request.method == 'GET':
        visits = (Visit.objects
                  .filter(user=_resolve_user(request))
                  .select_related('place')
                  .order_by('-ts'))
        return JsonResponse({
            'visits': [
                {
                    'place_id': v.place.slug,
                    'place_name': v.place.name,
                    'ts': v.ts.isoformat(),
                    'lat': v.lat,
                    'lon': v.lon,
                }
                for v in visits
            ],
        })

    data = _json_body(request)
    slug = data.get('place_id')
    if not slug:
        return _err('place_id requerido')
    # MVP: auto-crear Place si el slug no existe.
    place, _ = Place.objects.get_or_create(
        slug=slug,
        defaults={'name': slug.replace('-', ' ').title()},
    )

    visit, created = merit_service.mark_visited(
        user=_resolve_user(request), place=place,
        lat=data.get('lat'), lon=data.get('lon'),
    )
    merit_service.tick_streak(_resolve_user(request))
    return JsonResponse({
        'ok': True,
        'created': created,
        'place_id': place.slug,
    })


# ─── Streak ───────────────────────────────────────────────────────────────

@require_GET
def api_streak(request: HttpRequest) -> JsonResponse:
    streak = merit_service.read_streak(_resolve_user(request))
    return JsonResponse({
        'days': streak.days,
        'best_days': streak.best_days,
        'last_day': streak.last_day.isoformat() if streak.last_day else None,
    })


# ─── Collections ──────────────────────────────────────────────────────────

@require_GET
def api_collections(request: HttpRequest) -> JsonResponse:
    cols = (Collection.objects
            .filter(user=_resolve_user(request))
            .prefetch_related('capsules', 'places')
            .order_by('-updated'))
    return JsonResponse({
        'collections': [
            {
                'id': c.id,
                'name': c.name,
                'slug': c.slug,
                'kind': c.kind,
                'description': c.description,
                'cover_image': c.cover_image,
                'is_public': c.is_public,
                'capsule_count': c.capsules.count(),
                'place_count': c.places.count(),
                'created': c.created.isoformat(),
                'updated': c.updated.isoformat(),
            }
            for c in cols
        ],
    })
