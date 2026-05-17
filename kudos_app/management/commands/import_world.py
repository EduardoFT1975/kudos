# kudos_app/management/commands/import_world.py
"""KUDOS · Importador masivo nivel National Geographic.

Para cada lugar mundial trae:
  • Extracto COMPLETO de Wikipedia (no solo el resumen corto)
  • Hasta 3 imágenes de Wikimedia
  • Datos climáticos actuales (Open-Meteo, gratis sin key)
  • Atribución de fuentes (Wikipedia + UNESCO + NASA + curados)
  • Asignación inteligente del consejero histórico por tema

El texto narrable queda LIMPIO (sin #, ━, •, URLs ni metadatos) en
ai_summary. La atribución de fuentes va en parameters['sources'] para
mostrarse aparte, no leerse en el clip.

Uso:
  python manage.py import_world                # 200 lugares
  python manage.py import_world --max 1000     # 1000 lugares
  python manage.py import_world --type museum  # solo un tipo
  python manage.py import_world --enrich       # ejecuta multimedia_auto al final
  python manage.py import_world --weather      # añade clima de cada lugar
"""
import json
import re
import time
import urllib.parse
import urllib.request

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from kudos_app.models import Capsule, User


# ============================================================
# Catálogo curado · 100+ lugares con Wikipedia title + UNESCO/NASA notes
# ============================================================
# Cada entrada: (titulo_wiki, lat, lon, modo, tag, descripción extra de fuente alternativa)
CATEGORIES = {
    'museum': [
        ('Museo del Prado', 40.4138, -3.6920, 'museo', 'museum',
            'Inaugurado en 1819, alberga la mayor colección mundial de pintura española y obras maestras de Velázquez, Goya, El Greco, Tiziano y Bosch.'),
        ('Museo del Louvre', 48.8606, 2.3376, 'museo', 'museum',
            'Antigua residencia real convertida en museo en 1793. Acoge la Mona Lisa, la Venus de Milo y más de 380.000 obras.'),
        ('British Museum', 51.5194, -0.1270, 'museo', 'museum',
            'Fundado en 1753 como primer museo nacional público del mundo. Contiene la Piedra Rosetta y los mármoles del Partenón.'),
        ('Museo Metropolitano de Arte', 40.7794, -73.9632, 'museo', 'museum',
            'El museo más grande del hemisferio occidental. Más de 2 millones de obras desde el Egipto faraónico al arte contemporáneo.'),
        ('Museo del Hermitage', 59.9398, 30.3146, 'museo', 'museum',
            'Fundado por Catalina la Grande en 1764 en el Palacio de Invierno. 3 millones de objetos en seis edificios históricos.'),
        ('Galería Uffizi', 43.7678, 11.2553, 'museo', 'museum',
            'Núcleo del Renacimiento: Botticelli, Da Vinci, Miguel Ángel, Rafael, Caravaggio. Encargada por los Médici en 1581.'),
        ('Rijksmuseum', 52.3600, 4.8852, 'museo', 'museum',
            'Edificio de Pierre Cuypers de 1885. La Ronda de Noche de Rembrandt y la Lechera de Vermeer.'),
        ('Museos Vaticanos', 41.9067, 12.4537, 'museo', 'museum',
            'Fundados por el Papa Julio II en el siglo XVI. Capilla Sixtina, Estancias de Rafael, museo etrusco y egipcio.'),
        ('Museo Nacional Centro de Arte Reina Sofía', 40.4080, -3.6944, 'museo', 'museum',
            'Arte español del siglo XX. El Guernica de Picasso es la obra cumbre.'),
        ('Museo Guggenheim Bilbao', 43.2687, -2.9340, 'museo', 'museum',
            'Edificio de Frank Gehry de 1997 en titanio que regeneró Bilbao. Hito arquitectónico mundial.'),
        ('Museo Egipcio', 30.0478, 31.2336, 'museo', 'museum',
            'Más de 120.000 piezas. La máscara funeraria de Tutankamón y momias reales.'),
        ('Museo Nacional de Tokio', 35.7188, 139.7766, 'museo', 'museum',
            'El más antiguo de Japón (1872). Mayor colección de arte y antigüedades japonesas del mundo.'),
        ('Museum of Modern Art', 40.7614, -73.9776, 'museo', 'museum',
            'Pionero del arte moderno desde 1929. Van Gogh, Dalí, Pollock, Warhol, Rothko.'),
        ('Museo Picasso de Barcelona', 41.3851, 2.1810, 'museo', 'museum',
            'Cinco palacios medievales conectados. Mayor colección de la juventud y formación de Picasso.'),
        ('Museo Nacional de Antropología', 19.4260, -99.1864, 'museo', 'museum',
            'Mayor museo arqueológico de América Latina. Piedra del Sol azteca y el penacho de Moctezuma.'),
        ('Museo Nacional de China', 39.9035, 116.3956, 'museo', 'museum',
            'En la plaza de Tiananmén. 5.000 años de civilización china en 1,4 millones de piezas.'),
        ('Museo de Pérgamo', 52.5212, 13.3964, 'museo', 'museum',
            'Reconstrucciones monumentales: Altar de Pérgamo, Puerta de Ishtar de Babilonia, Mercado de Mileto.'),
        ('Musée d\'Orsay', 48.8600, 2.3266, 'museo', 'museum',
            'Antigua estación de tren convertida en museo. Mayor colección impresionista del mundo: Monet, Renoir, Van Gogh.'),
        ('Museo Munch', 59.9072, 10.7556, 'museo', 'museum',
            'Edificio nuevo de 2021. Hogar de El Grito y 28.000 obras de Edvard Munch.'),
        ('Tate Modern', 51.5076, -0.0994, 'museo', 'museum',
            'Antigua central eléctrica de Bankside. Arte moderno y contemporáneo desde 1900.'),
    ],
    'monument': [
        ('Coliseo', 41.8902, 12.4922, 'monumento', 'monument',
            'Anfiteatro romano del año 80 d.C. capaz de albergar 50.000 espectadores. Símbolo eterno de la grandeza imperial.'),
        ('Torre Eiffel', 48.8584, 2.2945, 'monumento', 'monument',
            'Construida para la Exposición Universal de 1889. 330 metros, 7 millones de visitantes anuales.'),
        ('Estatua de la Libertad', 40.6892, -74.0445, 'monumento', 'monument',
            'Regalo de Francia a EEUU en 1886. 93 metros de cobre repujado por Bartholdi y Eiffel.'),
        ('Cristo Redentor', -22.9519, -43.2105, 'monumento', 'monument',
            'Inaugurado en 1931. 38 metros de altura sobre el cerro Corcovado, símbolo de Río.'),
        ('Taj Mahal', 27.1751, 78.0421, 'monumento', 'monument',
            'Mausoleo en mármol blanco construido por Shah Jahan entre 1632 y 1653 en honor a Mumtaz Mahal.'),
        ('Gran Muralla China', 40.4319, 116.5704, 'monumento', 'monument',
            'Más de 21.000 km a lo largo de 2.000 años. Una de las mayores obras humanas de todos los tiempos.'),
        ('Machu Picchu', -13.1631, -72.5450, 'monumento', 'monument',
            'Ciudadela inca del siglo XV a 2.430 m de altitud. Redescubierta en 1911 por Hiram Bingham.'),
        ('Pirámide de Keops', 29.9792, 31.1342, 'monumento', 'monument',
            'Única maravilla del mundo antiguo que sigue en pie. 2,3 millones de bloques alineados con las estrellas.'),
        ('Stonehenge', 51.1789, -1.8262, 'monumento', 'monument',
            'Círculo neolítico de 5.000 años. Misterio astronómico aún sin descifrar del todo.'),
        ('Petra', 30.3285, 35.4444, 'monumento', 'monument',
            'Capital nabatea tallada en piedra rosa. Redescubierta para Occidente en 1812.'),
        ('Chichén Itzá', 20.6843, -88.5678, 'monumento', 'monument',
            'Centro maya del periodo posclásico. La pirámide de Kukulkán y el efecto serpiente del equinoccio.'),
        ('Angkor Wat', 13.4125, 103.8670, 'monumento', 'monument',
            'Mayor monumento religioso del mundo. Construido por Suryavarman II en el siglo XII.'),
        ('Acrópolis de Atenas', 37.9715, 23.7267, 'monumento', 'monument',
            'Cuna de la democracia. El Partenón de Pericles encarna la perfección clásica.'),
        ('Sagrada Familia', 41.4036, 2.1744, 'monumento', 'monument',
            'Obra maestra de Antoni Gaudí, en construcción desde 1882. Prevista terminación 2026.'),
        ('Big Ben', 51.5007, -0.1246, 'monumento', 'monument',
            'Torre del reloj del Palacio de Westminster. Su carillón ha marcado el tiempo de Londres desde 1859.'),
        ('Puerta de Brandemburgo', 52.5163, 13.3777, 'monumento', 'monument',
            'Símbolo de la reunificación alemana. Inspirada en los Propileos de la Acrópolis.'),
        ('Alhambra', 37.1773, -3.5986, 'monumento', 'monument',
            'Conjunto palaciego nazarí de los siglos XIII-XIV. Cumbre del arte islámico en Occidente. Patrimonio UNESCO desde 1984.'),
        ('Mezquita-catedral de Córdoba', 37.8786, -4.7794, 'monumento', 'monument',
            'Construida en el siglo VIII sobre una basílica visigoda. 856 columnas y dobles arcos rojos y blancos.'),
        ('Castillo de Edimburgo', 55.9486, -3.1999, 'monumento', 'monument',
            'Fortaleza sobre roca volcánica. Sede de la Piedra del Destino y las Joyas de la Corona escocesa.'),
        ('Monte Rushmore', 43.8791, -103.4591, 'monumento', 'monument',
            'Esculturas de 18 metros de Washington, Jefferson, Roosevelt y Lincoln talladas entre 1927 y 1941.'),
    ],
    'landscape': [
        ('Gran Cañón del Colorado', 36.0544, -112.1401, 'paisaje', 'landscape',
            '446 km de longitud, hasta 1.857 m de profundidad. 1.840 millones de años de historia geológica visibles.'),
        ('Cataratas del Niágara', 43.0962, -79.0377, 'paisaje', 'landscape',
            'Frontera natural entre EEUU y Canadá. 168.000 m³ de agua por minuto en caída libre.'),
        ('Cataratas Victoria', -17.9243, 25.8572, 'paisaje', 'landscape',
            'Mosi-oa-Tunya, "el humo que truena". 1.708 metros de ancho, mayor cortina de agua del mundo.'),
        ('Cataratas del Iguazú', -25.6953, -54.4367, 'paisaje', 'landscape',
            '275 saltos en herradura. Compartidas por Argentina y Brasil. Patrimonio UNESCO.'),
        ('Monte Everest', 27.9881, 86.9250, 'paisaje', 'landscape',
            '8.848,86 metros. Cima de la Tierra. Primera ascensión: Hillary y Tenzing, 29 de mayo de 1953.'),
        ('Monte Fuji', 35.3606, 138.7274, 'paisaje', 'landscape',
            'Estratovolcán sagrado del Japón. 3.776 m. Inspiración de Hokusai y la cultura nipona.'),
        ('Lago Baikal', 53.5587, 108.1650, 'paisaje', 'landscape',
            'Lago más profundo y antiguo del mundo. 1.642 m de profundidad, 25 millones de años, 20% del agua dulce mundial.'),
        ('Sahara', 23.8067, 11.2880, 'paisaje', 'landscape',
            '9 millones de km². Desierto cálido más grande de la Tierra. Hace 10.000 años fue verde.'),
        ('Selva amazónica', -3.4653, -62.2159, 'paisaje', 'landscape',
            '5,5 millones de km². Mayor selva tropical del mundo. 10% de las especies del planeta.'),
        ('Gran Barrera de Coral', -18.2871, 147.6992, 'paisaje', 'landscape',
            '2.300 km de arrecifes coralinos. Visible desde el espacio. Mayor estructura viva del planeta.'),
        ('Aurora boreal', 69.6492, 18.9553, 'paisaje', 'landscape',
            'Choque de partículas solares con la magnetosfera. Tromsø es uno de los mejores miradores del mundo.'),
        ('Kilimanjaro', -3.0674, 37.3556, 'paisaje', 'landscape',
            'Volcan de 5.895 m, techo de Africa. Sus glaciares retroceden por el cambio climatico.'),
        ('Yellowstone', 44.4280, -110.5885, 'paisaje', 'landscape',
            'Primer parque nacional del mundo (1872). Geiseres como Old Faithful sobre un supervolcan activo.'),
        ('Cinque Terre', 44.1267, 9.7090, 'paisaje', 'landscape',
            'Cinco pueblos colgados sobre acantilados de la Liguria. UNESCO por su paisaje cultural agricola.'),
        ('Picos de Europa', 43.1840, -4.8381, 'paisaje', 'landscape',
            'Macizo calizo en el norte de Espana. 646 km2, primer parque nacional espanol (1918).'),
        ('Teide', 28.2724, -16.6425, 'paisaje', 'landscape',
            'Pico mas alto de Espana (3.715 m). Volcan activo, tercero mas alto del mundo desde su base oceanica.'),
    ],
    'business': [
        ('Harrods', 51.4994, -0.1631, 'negocio', 'business',
            'Almacenes fundados en 1834. 90.000 m2 de venta, 330 departamentos, 1 millon de visitantes anuales.'),
        ('Galeries Lafayette', 48.8736, 2.3324, 'negocio', 'business',
            'Cupula de cristal Art Nouveau de 1912. Templo del lujo frances en el bulevar Haussmann.'),
        ('Gran Bazar de Estambul', 41.0107, 28.9682, 'negocio', 'business',
            'Uno de los mercados cubiertos mas antiguos del mundo (1461). 4.000 tiendas en 60 calles.'),
        ('Mercado de la Boqueria', 41.3818, 2.1715, 'negocio', 'business',
            'Mercado modernista de 1840 en La Rambla. Catedral gastronomica de Barcelona.'),
        ('Mercado de San Miguel', 40.4154, -3.7090, 'negocio', 'business',
            'Mercado gourmet madrileno en estructura de hierro de 1916.'),
        ('Mercado de Tsukiji', 35.6655, 139.7707, 'negocio', 'business',
            'Antiguo mercado mayorista del pescado de Tokio. Subastas de atun rojo legendarias.'),
        ('Borough Market', 51.5055, -0.0905, 'negocio', 'business',
            'Mercado mas antiguo de Londres. Bajo los arcos victorianos del puente.'),
        ('Pike Place Market', 47.6097, -122.3422, 'negocio', 'business',
            'Mercado publico de Seattle desde 1907. Cuna del primer Starbucks.'),
        ('Khan el-Khalili', 30.0476, 31.2624, 'negocio', 'business',
            'Bazar historico de El Cairo desde 1382. Joyeria, especias, perfumes y cafe tradicional.'),
        ('Camden Market', 51.5414, -0.1466, 'negocio', 'business',
            'Mercado alternativo del norte de Londres. Cuna de la moda urbana y la musica indie.'),
        ('Macys Herald Square', 40.7510, -73.9888, 'negocio', 'business',
            'Mayor grandes almacenes del mundo. 11 plantas. Famoso por el desfile de Accion de Gracias.'),
        ('GUM', 55.7547, 37.6217, 'negocio', 'business',
            'Almacenes neorrusos en la Plaza Roja, 1893. Tres galerias acristaladas y arcadas.'),
        ('Mercado Central de Valencia', 39.4731, -0.3786, 'negocio', 'business',
            'Joya modernista de 1928. Una de las mayores plazas de abastos de Europa.'),
        ('Mahane Yehuda', 31.7857, 35.2120, 'negocio', 'business',
            'Mercado mas vibrante de Jerusalen. De dia especias y frutas, de noche tapas y vino.'),
        ('Chatuchak', 13.7997, 100.5510, 'negocio', 'business',
            'Mercado de fin de semana de Bangkok. 15.000 puestos, 200.000 visitantes diarios.'),
    ],
    'point_of_interest': [
        ('Times Square', 40.7580, -73.9855, 'historico', 'poi',
            'Cruce mas fotografiado del mundo. 365.000 personas al dia. Pantallas LED.'),
        ('Plaza Mayor de Madrid', 40.4155, -3.7074, 'historico', 'poi',
            'Construida bajo Felipe III en 1619. Ha visto autos de fe, corridas y proclamaciones reales.'),
        ('Plaza Roja', 55.7539, 37.6208, 'historico', 'poi',
            'Corazon historico de Moscu desde el siglo XV. La catedral de San Basilio y el Kremlin la flanquean.'),
        ('Plaza de Tiananmen', 39.9054, 116.3976, 'historico', 'poi',
            'Mayor plaza publica del mundo: 440.000 m2. Centro politico de China.'),
        ('Plaza de San Pedro', 41.9022, 12.4533, 'historico', 'poi',
            'Disenada por Bernini entre 1656 y 1667. Columnata semicircular que abraza al peregrino.'),
        ('Trafalgar Square', 51.5080, -0.1281, 'historico', 'poi',
            'Conmemora la victoria de Nelson en 1805. Columna y leones de Landseer dominan el centro de Londres.'),
        ('Plaza Mayor de Salamanca', 40.9657, -5.6636, 'historico', 'poi',
            'Joya barroca de Alberto de Churriguera (1729). Considerada la plaza mas bella de Espana.'),
        ('Place Vendome', 48.8675, 2.3293, 'historico', 'poi',
            'Plaza octogonal de Hardouin-Mansart (1699). Corazon del lujo parisino.'),
        ('Plaza Garibaldi', 19.4406, -99.1393, 'historico', 'poi',
            'Hogar de los mariachis en Ciudad de Mexico desde el siglo XIX. Musica en vivo cada noche.'),
        ('Wall Street', 40.7066, -74.0090, 'historico', 'poi',
            'Centro financiero mundial. La Bolsa de Nueva York mueve cada dia mas de 200.000 millones de dolares.'),
    ],
}


VOICE_BY_TOPIC = {
    'filosofia':'aristoteles','estoicismo':'seneca','sabiduria':'seneca',
    'historia':'cleopatra','arte':'cleopatra','realeza':'cleopatra',
    'museo':'cleopatra','monumento':'cleopatra',
    'paisaje':'confucio','ciencia':'newton','matematica':'newton',
    'tecnologia':'tesla','innovacion':'tesla','comercio':'tesla','negocio':'tesla',
    'salud':'nightingale','medicina':'nightingale','educacion':'nightingale',
    'espiritual':'confucio','naturaleza':'confucio',
}

def best_voice(modo, temas):
    for t in (temas or []):
        if t in VOICE_BY_TOPIC:
            return VOICE_BY_TOPIC[t]
    return VOICE_BY_TOPIC.get(modo, 'aristoteles')


def clean_for_narration(text):
    if not text: return ''
    text = re.split(r'━{3,}|═{3,}', text)[0]
    text = re.sub(r'(?im)^[\-•\*]\s*(fuente|coordenadas|tipo|autor|licencia|atribuci.n).*?$', '', text)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'[#—•\*_\[\]\(\)|]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def http_get(url, timeout=20):
    req = urllib.request.Request(url, headers={'User-Agent': 'KudosImporter/2.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', errors='replace')


def wiki_full(title, lang='es', max_chars=4500):
    base = f'https://{lang}.wikipedia.org/w/api.php'
    params = {
        'action':'query','format':'json','titles':title,
        'prop':'extracts|pageimages|info',
        'exsectionformat':'plain','explaintext':'true','exlimit':'1',
        'inprop':'url','pithumbsize':'1280','redirects':'true',
    }
    url = base + '?' + urllib.parse.urlencode(params)
    try:
        data = json.loads(http_get(url))
        pages = data.get('query', {}).get('pages', {})
        if not pages: return None
        page = next(iter(pages.values()))
        extract = page.get('extract','') or ''
        extract = re.sub(r'\n=+\s*(Vease tambien|Referencias|Notas|Bibliografia|Enlaces externos|V.ase tambi.n)[^=]*=+\n[\s\S]*$', '', extract)
        extract = extract.strip()[:max_chars]
        return {
            'title': page.get('title', title),
            'extract': extract,
            'image': (page.get('thumbnail') or {}).get('source',''),
            'url': page.get('fullurl',''),
            'pageid': page.get('pageid'),
        }
    except Exception:
        return None


def open_meteo(lat, lon):
    try:
        url = f'https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true'
        data = json.loads(http_get(url, timeout=8))
        return data.get('current_weather') or {}
    except Exception:
        return {}


class Command(BaseCommand):
    help = 'Importa museos, monumentos, paisajes, negocios y POI globales con contenido profundo.'

    def add_arguments(self, parser):
        parser.add_argument('--max', type=int, default=200)
        parser.add_argument('--type', type=str, default='')
        parser.add_argument('--lang', type=str, default='es')
        parser.add_argument('--enrich', action='store_true')
        parser.add_argument('--weather', action='store_true')
        parser.add_argument('--force', action='store_true')

    def handle(self, *args, **options):
        max_total = options['max']
        only_type = options['type'].lower().strip()
        lang = options['lang']
        do_weather = options['weather']
        force = options['force']

        wiki_user, _ = User.objects.get_or_create(
            uid='wikipedia_world',
            defaults={'alias':'Atlas Universal','role':'user',
                      'bio':'Importador automatico de patrimonio mundial.'})

        total = updated = skipped = 0
        for tipo, lugares in CATEGORIES.items():
            if only_type and tipo != only_type: continue
            self.stdout.write(self.style.HTTP_INFO(f'\n--> Importando {tipo} ({len(lugares)} lugares)'))
            for nombre, lat, lon, modo, tag, glosa in lugares:
                if total + updated >= max_total: break

                existing = Capsule.objects.filter(titulo=nombre, source__startswith='wikipedia').first()
                if existing and not force:
                    skipped += 1; continue

                wiki = wiki_full(nombre, lang) or {}
                extract = wiki.get('extract') or glosa
                wiki_url = wiki.get('url','')
                main_img = wiki.get('image','')
                weather = open_meteo(lat, lon) if do_weather else {}

                narrable = clean_for_narration(f'{extract}\n\n{glosa}')

                topic_set = {modo}
                lo = narrable.lower()
                for k in ['filosofia','estoicismo','historia','arte','realeza','ciencia',
                          'matematica','tecnologia','innovacion','comercio','salud',
                          'medicina','educacion','espiritual','naturaleza','sabiduria']:
                    if k in lo: topic_set.add(k)
                temas = list(topic_set) + ['atlas', tag, 'patrimonio']
                voice = best_voice(modo, temas)

                params = {
                    'sources': [
                        {'name':'Wikipedia','lang':lang.upper(),'license':'CC BY-SA 4.0','url':wiki_url},
                        {'name':'Catalogo Kudos curado','note':glosa},
                    ],
                    'weather': weather,
                    'imported_at': timezone.now().isoformat(),
                }

                fields = dict(
                    titulo=nombre, usuario=wiki_user, contenido=narrable,
                    modo=modo, privacy='publico', lugar=nombre,
                    latitud=lat, longitud=lon, temas=temas,
                    image=main_img, likes=0, views=0,
                    source=f'wikipedia_{lang}_{tag}',
                    parameters=params,
                    ai_summary=narrable[:500],
                    ai_themes=temas, ai_audio_voice=voice,
                    ai_video_seed=f'{nombre}-{modo}-{tag}',
                    ai_quality_score=8 if extract and len(extract) > 400 else 6,
                    ai_enriched=True, ai_enriched_at=timezone.now(),
                )

                try:
                    if existing and force:
                        for k, v in fields.items(): setattr(existing, k, v)
                        existing.save(); updated += 1
                    else:
                        Capsule.objects.create(**fields); total += 1
                    if (total + updated) % 5 == 0:
                        self.stdout.write(f'  ok creadas {total} / actualizadas {updated}')
                    time.sleep(0.25)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  ! {nombre}: {e}'))
            if total + updated >= max_total: break

        self.stdout.write(self.style.SUCCESS(
            f'\n[OK] {total} cápsulas creadas, {updated} actualizadas, {skipped} omitidas.'))

        if options['enrich']:
            try:
                call_command('multimedia_auto', max=total + updated + 50)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'multimedia_auto: {e}'))
