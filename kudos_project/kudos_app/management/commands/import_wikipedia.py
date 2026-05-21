# kudos_app/management/commands/import_wikipedia.py
"""
Comando: python manage.py import_wikipedia [--region GLOBAL] [--max 1000]

Importa cápsulas geolocalizadas desde la API pública de Wikipedia
(es.wikipedia.org). NO requiere clave de API.

Atribución: Wikipedia es CC BY-SA 4.0. Cada cápsula incluye autoría
(Wikipedia ES) y enlace a la fuente.
"""

import json
import time
import urllib.parse
import urllib.request
from datetime import date
from django.core.management.base import BaseCommand
from django.utils import timezone
from kudos_app.models import User, Capsule


# Regiones predefinidas: lat, lon, radio km, nombre
REGIONS = {
    'GLOBAL': [
        # Continente Europa
        (40.4168, -3.7038, 10000, 'Madrid'),       # España
        (48.8566, 2.3522, 10000, 'París'),          # Francia
        (51.5074, -0.1278, 10000, 'Londres'),       # UK
        (52.5200, 13.4050, 10000, 'Berlín'),        # Alemania
        (41.9028, 12.4964, 10000, 'Roma'),          # Italia
        (52.3676, 4.9041, 10000, 'Amsterdam'),      # NL
        (55.7558, 37.6173, 10000, 'Moscú'),         # Rusia
        (37.9838, 23.7275, 10000, 'Atenas'),        # Grecia
        # América
        (40.7128, -74.0060, 10000, 'Nueva York'),   # EEUU
        (34.0522, -118.2437, 10000, 'Los Ángeles'),
        (19.4326, -99.1332, 10000, 'Ciudad de México'),
        (-23.5505, -46.6333, 10000, 'São Paulo'),
        (-34.6037, -58.3816, 10000, 'Buenos Aires'),
        (-12.0464, -77.0428, 10000, 'Lima'),
        (4.7110, -74.0721, 10000, 'Bogotá'),
        # Asia
        (35.6762, 139.6503, 10000, 'Tokio'),
        (39.9042, 116.4074, 10000, 'Pekín'),
        (28.6139, 77.2090, 10000, 'Nueva Delhi'),
        (1.3521, 103.8198, 10000, 'Singapur'),
        (25.2048, 55.2708, 10000, 'Dubái'),
        # África
        (30.0444, 31.2357, 10000, 'El Cairo'),
        (-1.2921, 36.8219, 10000, 'Nairobi'),
        (-33.9249, 18.4241, 10000, 'Ciudad del Cabo'),
        (6.5244, 3.3792, 10000, 'Lagos'),
        # Oceanía
        (-33.8688, 151.2093, 10000, 'Sídney'),
        (-37.8136, 144.9631, 10000, 'Melbourne'),
    ],
    'ESPAÑA': [
        (40.4168, -3.7038, 50000, 'Madrid y centro'),
        (41.3851, 2.1734, 50000, 'Cataluña'),
        (43.3623, -8.4115, 50000, 'Galicia'),
        (37.3858, -5.9930, 50000, 'Andalucía occidental'),
        (37.1773, -3.5986, 50000, 'Andalucía oriental'),
        (39.4699, -0.3763, 50000, 'Comunidad Valenciana'),
        (43.2630, -2.9350, 50000, 'País Vasco'),
        (38.9870, -1.8585, 50000, 'Castilla-La Mancha'),
        (28.1248, -15.4300, 50000, 'Canarias'),
    ],
    'EUROPA': [
        (52.5200, 13.4050, 50000, 'Berlín'),
        (48.8566, 2.3522, 50000, 'París'),
        (51.5074, -0.1278, 50000, 'Londres'),
        (41.9028, 12.4964, 50000, 'Roma'),
        (40.4168, -3.7038, 50000, 'Madrid'),
        (52.3676, 4.9041, 50000, 'Amsterdam'),
        (50.0875, 14.4213, 50000, 'Praga'),
        (48.2082, 16.3738, 50000, 'Viena'),
        (37.9838, 23.7275, 50000, 'Atenas'),
        (59.3293, 18.0686, 50000, 'Estocolmo'),
        (60.1699, 24.9384, 50000, 'Helsinki'),
        (47.4979, 19.0402, 50000, 'Budapest'),
        (50.0617, 19.9384, 50000, 'Cracovia'),
    ],
    'AMERICA_LATINA': [
        (19.4326, -99.1332, 50000, 'Ciudad de México'),
        (4.7110, -74.0721, 50000, 'Bogotá'),
        (-12.0464, -77.0428, 50000, 'Lima'),
        (-34.6037, -58.3816, 50000, 'Buenos Aires'),
        (-22.9068, -43.1729, 50000, 'Río de Janeiro'),
        (-23.5505, -46.6333, 50000, 'São Paulo'),
        (-33.4489, -70.6693, 50000, 'Santiago'),
        (-0.1807, -78.4678, 50000, 'Quito'),
    ],
    'ASIA': [
        (35.6762, 139.6503, 50000, 'Tokio'),
        (39.9042, 116.4074, 50000, 'Pekín'),
        (28.6139, 77.2090, 50000, 'Nueva Delhi'),
        (13.7563, 100.5018, 50000, 'Bangkok'),
        (1.3521, 103.8198, 50000, 'Singapur'),
        (37.5665, 126.9780, 50000, 'Seúl'),
    ],
}


def get_or_create_wiki_user():
    user, created = User.objects.get_or_create(
        uid='kudos_wikipedia',
        defaults={
            'alias': '@KudosWikipedia',
            'bio': '📚 Cuenta editorial · Importación con atribución desde Wikipedia (CC BY-SA 4.0).',
            'role': 'admin', 'is_active': True,
            'experience_points': 5000, 'level': 50,
        }
    )
    if created:
        user.set_password('kudos_wiki_secret_no_login')
        user.save()
    return user


def fetch_geo_articles(lat, lon, radius_m, limit=50, lang='es'):
    """Obtiene artículos geolocalizados de Wikipedia."""
    url = (f'https://{lang}.wikipedia.org/w/api.php?action=query'
           f'&list=geosearch&gscoord={lat}%7C{lon}&gsradius={radius_m}'
           f'&gslimit={limit}&format=json')
    req = urllib.request.Request(url, headers={
        'User-Agent': 'KudosImporter/1.0 (educational; contact@kudos.local)'
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get('query', {}).get('geosearch', [])
    except Exception as e:
        return []


def fetch_summary(title, lang='es'):
    """Obtiene resumen breve y URL del artículo de Wikipedia."""
    encoded = urllib.parse.quote(title.replace(' ', '_'))
    url = f'https://{lang}.wikipedia.org/api/rest_v1/page/summary/{encoded}'
    req = urllib.request.Request(url, headers={
        'User-Agent': 'KudosImporter/1.0 (educational; contact@kudos.local)'
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception:
        return None


class Command(BaseCommand):
    help = 'Importa cápsulas geolocalizadas desde la API pública de Wikipedia.'

    def add_arguments(self, parser):
        parser.add_argument('--region', type=str, default='GLOBAL',
            help='GLOBAL, ESPAÑA, EUROPA, AMERICA_LATINA, ASIA')
        parser.add_argument('--max', type=int, default=200,
            help='Cápsulas máximas a importar (por defecto 200)')
        parser.add_argument('--lang', type=str, default='es', help='Idioma de Wikipedia (es, en, fr...)')
        parser.add_argument('--per-region', type=int, default=20, help='Artículos por región/punto')

    def handle(self, *args, **options):
        region = options['region'].upper()
        if region not in REGIONS:
            self.stdout.write(self.style.ERROR(f'Región no válida. Usa: {list(REGIONS.keys())}'))
            return

        max_total = options['max']
        per_region = options['per_region']
        lang = options['lang']

        self.stdout.write(self.style.HTTP_INFO(f'📚 Wikipedia · región {region} · idioma {lang} · max {max_total}'))

        wiki_user = get_or_create_wiki_user()
        points = REGIONS[region]
        total_created = 0
        total_skipped = 0

        for lat, lon, radius_m, region_name in points:
            if total_created >= max_total:
                break

            self.stdout.write(f'\n  📍 Buscando en {region_name}...')
            articles = fetch_geo_articles(lat, lon, radius_m, limit=per_region, lang=lang)

            for art in articles:
                if total_created >= max_total:
                    break

                title = art.get('title', '').strip()
                a_lat = art.get('lat')
                a_lon = art.get('lon')
                if not title or a_lat is None or a_lon is None:
                    continue

                # Saltar si ya existe
                if Capsule.objects.filter(titulo=f'Wiki · {title}').exists():
                    total_skipped += 1
                    continue

                # Pequeña espera para no abusar de la API
                time.sleep(0.3)
                summary = fetch_summary(title, lang=lang)
                if not summary or 'extract' not in summary:
                    continue

                extract = summary.get('extract', '')[:1500]
                source_url = summary.get('content_urls', {}).get('desktop', {}).get('page', '')
                if not extract:
                    continue

                contenido = (
                    f'{extract}\n\n'
                    f'— Fuente: Wikipedia ({lang.upper()}), CC BY-SA 4.0\n'
                    f'  {source_url}'
                )

                try:
                    Capsule.objects.create(
                        titulo=f'Wiki · {title}',
                        usuario=wiki_user,
                        contenido=contenido,
                        modo='historico', privacy='publico',
                        lugar=region_name,
                        latitud=a_lat, longitud=a_lon,
                        temas=['wikipedia', 'geografía', region.lower()],
                        likes=0, views=0,
                        source=f'wikipedia_{lang}',
                    )
                    total_created += 1
                    if total_created % 10 == 0:
                        self.stdout.write(f'    ✓ {total_created} cápsulas creadas...')
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'    ⚠ Error en "{title}": {e}'))
                    continue

        self.stdout.write(self.style.SUCCESS(f'\n✅ Wikipedia: {total_created} cápsulas creadas, {total_skipped} ya existían'))
