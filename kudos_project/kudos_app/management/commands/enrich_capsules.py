# kudos_app/management/commands/enrich_capsules.py
"""
Comando: python manage.py enrich_capsules

Recorre las cápsulas que no tienen imagen y busca una en Wikipedia (CC-BY-SA).
Útil para que las cápsulas UNESCO/citas/eventos importadas masivamente
tengan ilustración visual.

Tipos enriquecidos:
- UNESCO: busca el sitio en Wikipedia ES → thumbnail
- Wikipedia: ya debería tener (si se importó con la versión nueva)
- Citas: busca al autor en Wikipedia ES → retrato
- Capitales: busca la ciudad → vista panorámica
- Eventos: busca el evento → ilustración

No sobrescribe imágenes existentes. Pausa 0.3 s entre llamadas.
"""

import json
import time
import urllib.parse
import urllib.request
from django.core.management.base import BaseCommand
from kudos_app.models import Capsule


def fetch_wiki_thumbnail(query, lang='es'):
    """Devuelve la URL del thumbnail de Wikipedia para 'query', o None."""
    encoded = urllib.parse.quote(query.replace(' ', '_'))
    url = f'https://{lang}.wikipedia.org/api/rest_v1/page/summary/{encoded}'
    req = urllib.request.Request(url, headers={
        'User-Agent': 'KudosEnricher/1.0 (educational; contact@kudos.local)'
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data.get('type') == 'disambiguation':
                return None
            thumb = data.get('thumbnail', {}).get('source')
            original = data.get('originalimage', {}).get('source')
            return original or thumb
    except Exception:
        return None


def extract_query_from_capsule(capsule):
    """Decide qué término buscar en Wikipedia según el título."""
    t = capsule.titulo or ''
    if t.startswith('UNESCO · '):
        return t.replace('UNESCO · ', '').split(',')[0].strip()
    if t.startswith('Wiki · '):
        return t.replace('Wiki · ', '').strip()
    if t.startswith('Cita · '):
        return t.replace('Cita · ', '').strip()
    if t.startswith('Hito · '):
        return t.replace('Hito · ', '').strip()
    if t.startswith('Ciudad · '):
        return t.replace('Ciudad · ', '').split(',')[0].strip()
    return None


class Command(BaseCommand):
    help = 'Enriquece cápsulas sin imagen buscando ilustraciones públicas en Wikipedia.'

    def add_arguments(self, parser):
        parser.add_argument('--max', type=int, default=500,
                            help='Máximo de cápsulas a enriquecer en una pasada')
        parser.add_argument('--lang', type=str, default='es', help='Idioma de Wikipedia (es, en, fr...)')
        parser.add_argument('--source', type=str, default='',
                            help='Filtrar por source (ej: oficial, wikipedia_es)')

    def handle(self, *args, **options):
        max_total = options['max']
        lang = options['lang']
        source_filter = options['source']

        qs = Capsule.objects.filter(image__isnull=True) | Capsule.objects.filter(image='')
        if source_filter:
            qs = qs.filter(source=source_filter)
        qs = qs.distinct()[:max_total]

        total = qs.count()
        self.stdout.write(self.style.HTTP_INFO(
            f'🖼  Enriqueciendo hasta {max_total} cápsulas (idioma {lang})...'
        ))
        self.stdout.write(f'   Pendientes en BD sin imagen: {total}')

        enriched = 0
        skipped = 0

        for cap in qs:
            query = extract_query_from_capsule(cap)
            if not query:
                skipped += 1
                continue

            time.sleep(0.3)  # Educado con la API
            img_url = fetch_wiki_thumbnail(query, lang=lang)
            if not img_url:
                # intentar en inglés como fallback
                if lang != 'en':
                    time.sleep(0.2)
                    img_url = fetch_wiki_thumbnail(query, lang='en')

            if img_url:
                cap.image = img_url
                cap.save(update_fields=['image'])
                enriched += 1
                if enriched % 10 == 0:
                    self.stdout.write(f'   ✓ {enriched} enriquecidas...')
            else:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ {enriched} cápsulas enriquecidas con imagen'
        ))
        if skipped:
            self.stdout.write(self.style.WARNING(f'⚠ {skipped} no encontraron ilustración'))
