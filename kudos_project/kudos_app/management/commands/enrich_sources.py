# kudos_app/management/commands/enrich_sources.py
"""KUDOS · Enriquecimiento real con fuentes abiertas múltiples.

Para cada cápsula geolocalizada o titulada, consulta APIs públicas y
gratuitas (sin clave) y agrega:

  • Wikidata (CC0): identificador QID, país, tipo de bien, estatus UNESCO
  • Wikimedia Commons (CC BY-SA): hasta 4 imágenes adicionales
  • The Met Museum Open Access API (CC0): obras relacionadas si es museo/arte
  • NASA Images API (Dominio Público): imagen astronómica si aplica
  • LibriVox (Dominio Público): audiolibros relacionados
  • Internet Archive (varía por ítem): items relacionados
  • Open-Meteo (CC BY): clima actual de las coordenadas

Todo se guarda en `parameters['sources']` con NOMBRE + LICENCIA + URL,
para mostrar el pie de atribución y proteger al proyecto frente a
demandas. Nada se inventa: solo lo que devuelven las APIs.

Uso:
  python manage.py enrich_sources                  # 100 cápsulas
  python manage.py enrich_sources --max 1000       # 1000
  python manage.py enrich_sources --force          # repasa también las ya enriquecidas
  python manage.py enrich_sources --weather        # añade clima actual
"""
import json
import re
import time
import urllib.parse
import urllib.request

from django.core.management.base import BaseCommand
from django.utils import timezone

from kudos_app.models import AIAction, AIAgent, Capsule


def http_get(url, timeout=15):
    req = urllib.request.Request(url, headers={'User-Agent': 'KudosEnricher/1.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', errors='replace')


# -------------------------------------------------------------------
# Wikidata (CC0)
# -------------------------------------------------------------------
def wikidata_lookup(title, lang='es'):
    """Devuelve QID + país + estatus UNESCO + imagen + descripción corta."""
    base = 'https://www.wikidata.org/w/api.php'
    params = {
        'action': 'wbsearchentities', 'format': 'json',
        'language': lang, 'search': title, 'limit': '1',
    }
    try:
        data = json.loads(http_get(base + '?' + urllib.parse.urlencode(params)))
        results = data.get('search', [])
        if not results:
            return {}
        qid = results[0].get('id')
        if not qid:
            return {}
        # Detalles de la entidad
        detail = json.loads(http_get(
            f'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids={qid}&props=claims|descriptions|labels'
        ))
        ent = detail.get('entities', {}).get(qid, {})
        claims = ent.get('claims', {})
        description = ent.get('descriptions', {}).get(lang, {}).get('value', '')
        # País (P17)
        country_qid = None
        if 'P17' in claims:
            country_qid = claims['P17'][0]['mainsnak'].get('datavalue', {}).get('value', {}).get('id')
        # Estatus UNESCO Patrimonio Mundial: P1435 (heritage designation) contiene Q9259
        unesco = False
        for c in claims.get('P1435', []):
            v = c.get('mainsnak', {}).get('datavalue', {}).get('value', {})
            if isinstance(v, dict) and v.get('id') == 'Q9259':
                unesco = True
                break
        # Imagen (P18)
        image = ''
        if 'P18' in claims:
            file_name = claims['P18'][0]['mainsnak'].get('datavalue', {}).get('value', '')
            if file_name:
                # Construye URL de Wikimedia Commons
                fn = file_name.replace(' ', '_')
                image = f'https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(fn)}?width=900'
        return {
            'qid': qid, 'description': description, 'unesco': unesco,
            'country_qid': country_qid, 'image': image,
            'url': f'https://www.wikidata.org/wiki/{qid}',
        }
    except Exception as e:
        return {'error': str(e)}


# -------------------------------------------------------------------
# The Met Museum Open Access (CC0)
# -------------------------------------------------------------------
def met_museum_search(query, limit=3):
    """Busca obras públicamente accesibles del Met. Sin clave."""
    try:
        url = (f'https://collectionapi.metmuseum.org/public/collection/v1/'
               f'search?hasImages=true&q={urllib.parse.quote(query)}')
        ids = json.loads(http_get(url, timeout=10)).get('objectIDs') or []
        items = []
        for oid in ids[:limit]:
            try:
                obj = json.loads(http_get(
                    f'https://collectionapi.metmuseum.org/public/collection/v1/objects/{oid}'))
                if obj.get('isPublicDomain') and obj.get('primaryImageSmall'):
                    items.append({
                        'title': obj.get('title') or '',
                        'artist': obj.get('artistDisplayName') or '',
                        'date': obj.get('objectDate') or '',
                        'image': obj.get('primaryImageSmall'),
                        'url': obj.get('objectURL', ''),
                    })
                time.sleep(0.15)
            except Exception:
                continue
        return items
    except Exception:
        return []


# -------------------------------------------------------------------
# NASA Image and Video Library (Dominio Público)
# -------------------------------------------------------------------
def nasa_images(query, limit=3):
    try:
        url = f'https://images-api.nasa.gov/search?q={urllib.parse.quote(query)}&media_type=image'
        data = json.loads(http_get(url, timeout=10))
        items_raw = data.get('collection', {}).get('items', [])[:limit]
        items = []
        for it in items_raw:
            d = (it.get('data') or [{}])[0]
            links = it.get('links') or []
            href = links[0].get('href') if links else ''
            items.append({
                'title': d.get('title', ''),
                'description': (d.get('description') or '')[:300],
                'date': d.get('date_created', '')[:10],
                'image': href,
                'url': it.get('href', ''),
            })
        return items
    except Exception:
        return []


# -------------------------------------------------------------------
# LibriVox (Dominio Público) · audiolibros relacionados
# -------------------------------------------------------------------
def librivox_search(query, limit=2):
    try:
        url = (f'https://librivox.org/api/feed/audiobooks/?title={urllib.parse.quote(query)}'
               f'&format=json&limit={limit}&extended=1')
        data = json.loads(http_get(url, timeout=10))
        books = data.get('books') or []
        return [{
            'title': b.get('title', ''),
            'authors': ', '.join(a.get('last_name','') for a in (b.get('authors') or [])[:3]),
            'url': b.get('url_librivox', ''),
            'audio_zip': b.get('url_zip_file', ''),
            'description': (b.get('description') or '')[:300],
        } for b in books]
    except Exception:
        return []


# -------------------------------------------------------------------
# Internet Archive
# -------------------------------------------------------------------
def archive_search(query, limit=3):
    try:
        url = (f'https://archive.org/advancedsearch.php?q={urllib.parse.quote(query)}'
               f'&fl[]=identifier&fl[]=title&fl[]=mediatype&fl[]=licenseurl'
               f'&rows={limit}&output=json')
        data = json.loads(http_get(url, timeout=10))
        docs = data.get('response', {}).get('docs') or []
        return [{
            'title': d.get('title', ''),
            'mediatype': d.get('mediatype', ''),
            'license': d.get('licenseurl', ''),
            'url': f"https://archive.org/details/{d.get('identifier', '')}",
        } for d in docs]
    except Exception:
        return []


# -------------------------------------------------------------------
# Open-Meteo (CC BY 4.0) · clima actual
# -------------------------------------------------------------------
def open_meteo(lat, lon):
    try:
        url = (f'https://api.open-meteo.com/v1/forecast?latitude={lat}'
               f'&longitude={lon}&current_weather=true')
        return json.loads(http_get(url, timeout=8)).get('current_weather') or {}
    except Exception:
        return {}


# -------------------------------------------------------------------
# Comando
# -------------------------------------------------------------------
class Command(BaseCommand):
    help = 'Enriquece cápsulas con datos reales de Wikidata, Met, NASA, LibriVox, Internet Archive y Open-Meteo.'

    def add_arguments(self, parser):
        parser.add_argument('--max', type=int, default=100)
        parser.add_argument('--force', action='store_true',
                            help='Reprocesar incluso cápsulas ya enriquecidas con fuentes.')
        parser.add_argument('--weather', action='store_true',
                            help='Añadir clima actual de cada lugar.')
        parser.add_argument('--lang', type=str, default='es')
        parser.add_argument('--modo', type=str, default='',
                            help='Solo cápsulas de este modo (museo, monumento, ...)')

    def handle(self, *args, **options):
        agent, _ = AIAgent.objects.get_or_create(
            code='source_enricher',
            defaults={'name': 'Enriquecedor multifuente', 'kind': 'curator',
                      'icon': '📚', 'description': 'Conecta Wikidata, Met, NASA, LibriVox, Archive, Open-Meteo.',
                      'is_active': True, 'interval_seconds': 1800})

        qs = Capsule.objects.filter(privacy='publico')
        if options['modo']:
            qs = qs.filter(modo=options['modo'])
        if not options['force']:
            # Sin enriquecimiento previo, o sin clave 'sources' en parameters
            qs = [c for c in qs[:options['max'] * 3]
                  if not (c.parameters or {}).get('sources_v2')]
            qs = qs[:options['max']]
        else:
            qs = list(qs[:options['max']])

        total = len(qs)
        self.stdout.write(self.style.HTTP_INFO(
            f'\n=== Enriquecimiento multifuente · {total} cápsulas ===\n'))

        for i, c in enumerate(qs, 1):
            self.stdout.write(f'[{i}/{total}] {c.titulo or c.contenido[:50]}')
            sources = []
            extra_images = []
            extra_audio = []

            # 1) Wikidata
            wd = wikidata_lookup(c.titulo, options['lang']) or {}
            if wd.get('qid'):
                sources.append({
                    'name': 'Wikidata', 'license': 'CC0',
                    'url': wd.get('url', ''), 'qid': wd.get('qid'),
                    'description': wd.get('description', '')[:200],
                    'unesco_world_heritage': bool(wd.get('unesco')),
                })
                if wd.get('image'):
                    extra_images.append({'url': wd['image'], 'source': 'Wikimedia Commons', 'license': 'CC BY-SA'})

            # 2) Wikipedia (ya está como source principal pero registramos)
            sources.append({
                'name': 'Wikipedia', 'license': 'CC BY-SA 4.0',
                'url': f"https://es.wikipedia.org/wiki/{urllib.parse.quote((c.titulo or '').replace(' ', '_'))}",
            })

            # 3) Met Museum (solo si modo arte/museo/monumento)
            if c.modo in ('museo', 'arte', 'monumento'):
                met = met_museum_search(c.titulo, limit=3)
                if met:
                    sources.append({'name': 'The Met Open Access', 'license': 'CC0',
                                    'url': 'https://www.metmuseum.org/art/collection',
                                    'related_items': met})
                    for item in met[:2]:
                        if item.get('image'):
                            extra_images.append({'url': item['image'], 'source': 'The Met',
                                                  'license': 'CC0', 'caption': item.get('title','')})

            # 4) NASA (solo si modo paisaje/eterno o palabras espacio/luna/...)
            txt_lower = (c.titulo + ' ' + c.contenido).lower()
            if any(w in txt_lower for w in ['espacio','luna','marte','planeta','galaxia','estrella','astronomia']):
                nasa = nasa_images(c.titulo, limit=2)
                if nasa:
                    sources.append({'name': 'NASA Image Library', 'license': 'Dominio Público',
                                    'url': 'https://images.nasa.gov/',
                                    'related_items': nasa})
                    for item in nasa:
                        if item.get('image'):
                            extra_images.append({'url': item['image'], 'source': 'NASA',
                                                  'license': 'Dominio Público', 'caption': item.get('title','')})

            # 5) LibriVox (audio relacionado, solo si sabiduria/historico/filosofia)
            if c.modo in ('sabiduria','historico','espiritual') or 'filosofia' in (c.temas or []):
                lv = librivox_search(c.titulo, limit=1)
                if lv:
                    sources.append({'name': 'LibriVox', 'license': 'Dominio Público',
                                    'url': 'https://librivox.org/',
                                    'related_audiobooks': lv})
                    for b in lv:
                        if b.get('audio_zip'):
                            extra_audio.append({'url': b['audio_zip'], 'source': 'LibriVox',
                                                 'license': 'Dominio Público', 'caption': b.get('title','')})

            # 6) Internet Archive
            ia = archive_search(c.titulo, limit=2)
            if ia:
                sources.append({'name': 'Internet Archive', 'license': 'Varía por ítem',
                                'url': 'https://archive.org/',
                                'related_items': ia})

            # 7) Open-Meteo (clima)
            if options['weather'] and c.latitud and c.longitud:
                w = open_meteo(c.latitud, c.longitud)
                if w:
                    sources.append({'name': 'Open-Meteo', 'license': 'CC BY 4.0',
                                    'url': 'https://open-meteo.com/',
                                    'current_weather': w})

            # Persistencia
            params = c.parameters or {}
            params['sources_v2'] = sources
            params['extra_images'] = extra_images
            params['extra_audio'] = extra_audio
            params['enriched_sources_at'] = timezone.now().isoformat()
            c.parameters = params

            # Marca UNESCO en temas si Wikidata lo confirma
            if wd.get('unesco') and 'unesco' not in (c.temas or []):
                c.temas = list(c.temas or []) + ['unesco']
            c.save(update_fields=['parameters', 'temas'])

            try:
                AIAction.objects.create(
                    agent=agent, action='enrich_sources', level='success',
                    target_type='capsule', target_id=c.uid,
                    summary=f'{len(sources)} fuentes, +{len(extra_images)} img, +{len(extra_audio)} audio',
                    parameters={'sources_count': len(sources)},
                )
            except Exception:
                pass

            time.sleep(0.3)  # respeto a las APIs

        agent.runs_total += 1
        agent.successes += 1
        agent.actions_total += total
        agent.last_run = timezone.now()
        agent.last_status = 'ok'
        agent.save()

        self.stdout.write(self.style.SUCCESS(
            f'\n[OK] {total} cápsulas enriquecidas con fuentes múltiples.'))
