"""AXÓN · Phase 0 · seed_rome

Crea/actualiza el Place(slug="rome") canónico y linka cápsulas existentes
cuyo campo `lugar` contenga 'Roma' / 'Rome'. Recuenta `capsule_count`.

Idempotente. Sin destrucción de datos. Sin crear cápsulas nuevas (el master
prompt prohíbe imports masivos).

Uso:
    python manage.py seed_rome
    python manage.py seed_rome --dry-run    # muestra lo que haría sin tocar BD
    python manage.py seed_rome --verbose    # log de cápsulas linkadas
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from kudos_app.models import Capsule, Place


ROME_DEFAULTS = {
    'name': 'Roma',
    'country': 'Italia',
    'latitud': 41.9028,
    'longitud': 12.4964,
    'summary': (
        'Capital eterna: 28 siglos de capas urbanas vivas. '
        'Del Foro de los Reyes al Vaticano contemporáneo.'
    ),
    'description': (
        'Roma es el palimpsesto vivo de Occidente. Cada cuadra contiene '
        'estratos romanos, paleocristianos, medievales, renacentistas, '
        'barrocos y modernos coexistiendo en el mismo espacio físico.'
    ),
    'era_range_from': -753,   # fundación legendaria
    'era_range_to': 2026,     # presente vivo
    'image': '',              # se completa cuando llegue Visual Layer
}


class Command(BaseCommand):
    help = 'Crea Place(rome) y linka cápsulas existentes con lugar≈Roma.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='No persiste cambios; solo reporta.')
        parser.add_argument('--verbose', action='store_true',
                            help='Imprime cada cápsula linkada.')

    @transaction.atomic
    def handle(self, *args, **opts):
        dry = opts['dry_run']
        verbose = opts['verbose']

        # ── 1. Asegurar Place ────────────────────────────────────────────────
        place, created = Place.objects.get_or_create(
            slug='rome',
            defaults={**ROME_DEFAULTS, 'updated': timezone.now()},
        )
        if created:
            self.stdout.write(self.style.SUCCESS('+ Place "rome" creado.'))
        else:
            # Actualizar metadatos por si cambiaron en ROME_DEFAULTS.
            changed = []
            for k, v in ROME_DEFAULTS.items():
                if getattr(place, k) != v and v != '':
                    setattr(place, k, v)
                    changed.append(k)
            if changed:
                place.updated = timezone.now()
                if not dry:
                    place.save(update_fields=changed + ['updated'])
                self.stdout.write(self.style.WARNING(
                    f'~ Place "rome" actualizado · {", ".join(changed)}'
                ))
            else:
                self.stdout.write('= Place "rome" ya existe y está al día.')

        # ── 2. Detectar cápsulas candidatas por `lugar` ──────────────────────
        # Heurística simple: contiene "roma" case-insensitive y no apunta ya
        # a otro Place. NO tocamos cápsulas que ya tengan place asignado.
        candidates = Capsule.objects.filter(
            Q(lugar__icontains='roma') | Q(lugar__icontains='rome'),
            place__isnull=True,
        )
        total = candidates.count()
        self.stdout.write(f'  Candidatas detectadas: {total}')

        linked = 0
        for c in candidates.iterator(chunk_size=200):
            if verbose:
                self.stdout.write(f'  · {c.uid} · "{c.lugar}" → rome')
            if not dry:
                c.place = place
                c.save(update_fields=['place'])
            linked += 1

        # ── 3. Recontar capsule_count ────────────────────────────────────────
        real_count = Capsule.objects.filter(place=place).count()
        # Tras el link de candidatas (en dry mode aún no aplicado):
        projected = real_count + (linked if dry else 0)
        if not dry:
            place.capsule_count = real_count
            place.save(update_fields=['capsule_count', 'updated'])

        # ── 4. Reporte ───────────────────────────────────────────────────────
        verb = 'LINKARÍA' if dry else 'linkadas'
        self.stdout.write(self.style.SUCCESS(
            f'\nRoma · {verb} {linked} cápsulas · capsule_count='
            f'{projected if dry else real_count}'
        ))
        if dry:
            self.stdout.write(self.style.WARNING('(dry-run · no se persistió nada)'))
            transaction.set_rollback(True)
