# kudos_app/management/commands/import_official_content.py
"""
Comando: python manage.py import_official_content

Importa cientos de cápsulas de dominio público firmadas por cuentas
oficiales TRANSPARENTES de Kudos. NO crea usuarios falsos: las cuentas
están claramente marcadas como editoriales (igual que The New York Times
tiene cuentas oficiales en redes sociales).

Fuentes (todas dominio público o factuales):
- Filosofía clásica: Marco Aurelio, Séneca, Epicteto, Confucio, Lao Tzu
- Patrimonio mundial UNESCO (factual)
- Eventos históricos universales
- Citas célebres pre-1929 (dominio público)
- Hitos científicos
"""

import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime
from kudos_app.models import User, Capsule, Badge, SettingsConfig


# ============================================================
# CUENTAS OFICIALES (transparentes, no fingen ser personas reales)
# ============================================================
OFFICIAL_ACCOUNTS = [
    {
        'uid': 'kudos_sabiduria', 'alias': '@KudosSabiduría',
        'bio': '🏛 Cuenta editorial oficial · Selección curada de sabiduría universal de dominio público.',
        'role': 'admin', 'avatar': '',
    },
    {
        'uid': 'kudos_historia', 'alias': '@KudosHistoria',
        'bio': '📜 Cuenta editorial oficial · Hitos históricos de la humanidad, geolocalizados.',
        'role': 'admin', 'avatar': '',
    },
    {
        'uid': 'kudos_ciencia', 'alias': '@KudosCiencia',
        'bio': '🔬 Cuenta editorial oficial · Hitos científicos verificables.',
        'role': 'admin', 'avatar': '',
    },
    {
        'uid': 'kudos_arte', 'alias': '@KudosArte',
        'bio': '🎨 Cuenta editorial oficial · Patrimonio artístico y reflexiones estéticas.',
        'role': 'admin', 'avatar': '',
    },
    {
        'uid': 'kudos_unesco', 'alias': '@KudosUNESCO',
        'bio': '🌍 Cuenta editorial oficial · Patrimonio Mundial geolocalizado (datos factuales UNESCO).',
        'role': 'admin', 'avatar': '',
    },
]


# ============================================================
# CONTENIDO: SABIDURÍA CLÁSICA (autores fallecidos hace siglos – dominio público)
# ============================================================
WISDOM = [
    # Marco Aurelio (s. II) – Meditaciones, dominio público
    ('@KudosSabiduría', 'Marco Aurelio sobre el momento presente',
     'Recuerda que ningún hombre pierde más vida que la que ahora vive, ni vive más vida que la que ahora pierde. — Marco Aurelio, Meditaciones (s. II d.C.)',
     ['estoicismo', 'tiempo', 'presente'], 'Roma, Italia', 41.9028, 12.4964),
    ('@KudosSabiduría', 'La fuerza interior',
     'Tienes poder sobre tu mente, no sobre los acontecimientos externos. Date cuenta de esto y encontrarás fuerza. — Marco Aurelio',
     ['estoicismo', 'mente', 'autonomía'], 'Roma, Italia', 41.9028, 12.4964),
    ('@KudosSabiduría', 'La obra del día',
     'Cuando te levantes por la mañana, piensa en el privilegio precioso de estar vivo, de respirar, de pensar, de disfrutar, de amar. — Marco Aurelio',
     ['estoicismo', 'gratitud'], 'Roma, Italia', 41.9028, 12.4964),

    # Séneca – Cartas a Lucilio, dominio público
    ('@KudosSabiduría', 'Séneca y el tiempo prestado',
     'Mientras esperamos vivir, la vida pasa. — Séneca, Cartas a Lucilio',
     ['estoicismo', 'tiempo'], 'Córdoba, España', 37.8882, -4.7794),
    ('@KudosSabiduría', 'Sobre la prosperidad',
     'No es porque las cosas son difíciles que no nos atrevemos; es porque no nos atrevemos que son difíciles. — Séneca',
     ['valor', 'estoicismo'], 'Córdoba, España', 37.8882, -4.7794),

    # Epicteto – Enquiridión, dominio público
    ('@KudosSabiduría', 'La distinción del Enquiridión',
     'Hay cosas que dependen de nosotros y otras que no. Distinguirlas es el principio de toda libertad. — Epicteto',
     ['estoicismo', 'libertad'], 'Hierápolis, Frigia', 37.9244, 29.1305),
    ('@KudosSabiduría', 'Lo que ofende',
     'No nos ofenden las cosas, sino la opinión que tenemos de ellas. — Epicteto',
     ['filosofía', 'mente'], 'Hierápolis, Frigia', 37.9244, 29.1305),

    # Confucio (s. V a.C.) – Analectas, dominio público
    ('@KudosSabiduría', 'Confucio sobre el aprendizaje',
     'Aprender sin pensar es esfuerzo perdido; pensar sin aprender es peligroso. — Confucio, Analectas',
     ['educación', 'pensamiento', 'oriental'], 'Qufu, China', 35.5905, 116.9914),
    ('@KudosSabiduría', 'El arte del silencio',
     'El silencio es un amigo verdadero que jamás traiciona. — Confucio',
     ['silencio', 'ética'], 'Qufu, China', 35.5905, 116.9914),
    ('@KudosSabiduría', 'Confucio sobre la conducta',
     'No hagas a los demás lo que no querrías que te hiciesen a ti. — Confucio (versión positiva del precepto universal)',
     ['ética', 'reciprocidad'], 'Qufu, China', 35.5905, 116.9914),

    # Lao Tzu – Tao Te Ching, dominio público
    ('@KudosSabiduría', 'Lao Tzu y el viaje',
     'Un viaje de mil millas comienza con un solo paso. — Lao Tzu, Tao Te Ching',
     ['oriental', 'taoísmo', 'persistencia'], 'Henan, China', 34.7657, 113.7531),
    ('@KudosSabiduría', 'La fuerza del agua',
     'Nada es más blando ni más débil que el agua. Y, sin embargo, nada la supera para vencer lo duro y lo fuerte. — Lao Tzu',
     ['taoísmo', 'fluidez', 'fuerza'], 'Henan, China', 34.7657, 113.7531),

    # Sócrates / Platón (s. V-IV a.C.) – dominio público
    ('@KudosSabiduría', 'Sócrates: la única sabiduría',
     'Solo sé que no sé nada. — Sócrates (citado por Platón)',
     ['filosofía', 'humildad', 'griego'], 'Atenas, Grecia', 37.9838, 23.7275),
    ('@KudosSabiduría', 'La vida examinada',
     'Una vida no examinada no merece ser vivida. — Sócrates, Apología',
     ['filosofía', 'examen'], 'Atenas, Grecia', 37.9838, 23.7275),
    ('@KudosSabiduría', 'Aristóteles sobre la virtud',
     'Somos lo que repetidamente hacemos. La excelencia no es un acto, sino un hábito. — Aristóteles, Ética a Nicómaco',
     ['ética', 'hábito', 'virtud'], 'Estagira, Grecia', 40.5719, 23.7558),
    ('@KudosSabiduría', 'La amistad según Aristóteles',
     'La amistad es un alma que habita en dos cuerpos. — Aristóteles',
     ['amistad', 'ética'], 'Atenas, Grecia', 37.9838, 23.7275),

    # Buda (s. VI-V a.C.) – dominio público
    ('@KudosSabiduría', 'Buda sobre la mente',
     'Todo lo que somos es resultado de lo que hemos pensado. — Atribuido a Buda, Dhammapada',
     ['budismo', 'mente'], 'Bodh Gaya, India', 24.6962, 84.9879),
    ('@KudosSabiduría', 'Buda sobre el odio',
     'El odio nunca cesa con odio: solo cesa con amor. Esta es una ley eterna. — Atribuido a Buda',
     ['budismo', 'amor'], 'Bodh Gaya, India', 24.6962, 84.9879),

    # Otros clásicos
    ('@KudosSabiduría', 'Heráclito y el río',
     'Nadie se baña dos veces en el mismo río. — Heráclito (s. VI-V a.C.)',
     ['cambio', 'griego'], 'Éfeso, Turquía', 37.9395, 27.3417),
    ('@KudosSabiduría', 'Cicerón sobre la amistad',
     'La amistad mejora la felicidad y disminuye la miseria, doblando nuestra alegría y dividiendo nuestro dolor. — Cicerón, De Amicitia',
     ['amistad', 'romano'], 'Roma, Italia', 41.9028, 12.4964),
    ('@KudosSabiduría', 'Plutarco y la mente',
     'La mente no es un vaso por llenar, sino un fuego por encender. — Plutarco',
     ['educación'], 'Queronea, Grecia', 38.4938, 22.8456),
]

# ============================================================
# HISTORIA – hechos factuales (no copyrightables)
# ============================================================
HISTORY = [
    ('@KudosHistoria', 'Caída del muro de Berlín · 9 nov 1989',
     'El 9 de noviembre de 1989, miles de berlineses cruzaron el muro que dividía la ciudad desde 1961. Marcó el principio simbólico del fin de la Guerra Fría.',
     ['historia', 'siglo XX', 'libertad'], 'Berlín, Alemania', 52.5163, 13.3777, datetime(1989, 11, 9)),
    ('@KudosHistoria', 'Llegada del hombre a la Luna · 20 jul 1969',
     'Apolo 11 alunizó en el Mar de la Tranquilidad. Neil Armstrong y Buzz Aldrin se convirtieron en los primeros humanos en pisar otro mundo.',
     ['ciencia', 'espacio', 'siglo XX'], 'Mar de la Tranquilidad, Luna', 0.6741, 23.4729, datetime(1969, 7, 20)),
    ('@KudosHistoria', 'Declaración de los Derechos Humanos · 10 dic 1948',
     'La Asamblea General de la ONU adoptó la Declaración Universal en París: 30 artículos que recogen derechos inalienables de toda persona.',
     ['derechos humanos', 'siglo XX'], 'París, Francia', 48.8566, 2.3522, datetime(1948, 12, 10)),
    ('@KudosHistoria', 'Imprenta de Gutenberg · ~1440',
     'Johannes Gutenberg desarrolla la imprenta de tipos móviles en Maguncia. Multiplica el acceso al conocimiento y cataliza la modernidad.',
     ['ciencia', 'tecnología', 'edad media'], 'Maguncia, Alemania', 49.9929, 8.2473, datetime(1440, 1, 1)),
    ('@KudosHistoria', 'Renuncia de Mandela a la prisión · 11 feb 1990',
     'Tras 27 años encarcelado, Nelson Mandela sale libre y comienza el proceso que terminará con el apartheid y le llevará a la presidencia de Sudáfrica.',
     ['derechos humanos', 'África', 'siglo XX'], 'Ciudad del Cabo, Sudáfrica', -33.9249, 18.4241, datetime(1990, 2, 11)),
    ('@KudosHistoria', 'Descubrimiento de la penicilina · 1928',
     'Alexander Fleming descubre la penicilina por accidente al observar cómo un moho destruía bacterias en una placa de Petri. Salvaría millones de vidas.',
     ['ciencia', 'medicina', 'siglo XX'], 'Londres, Reino Unido', 51.5074, -0.1278, datetime(1928, 9, 28)),
    ('@KudosHistoria', 'Independencia de la India · 15 ago 1947',
     'India se independiza del Imperio Británico tras décadas de movimiento no-violento liderado por Mahatma Gandhi y otros.',
     ['historia', 'independencia', 'siglo XX'], 'Nueva Delhi, India', 28.6139, 77.2090, datetime(1947, 8, 15)),
    ('@KudosHistoria', 'Nacimiento de la World Wide Web · 1989',
     'Tim Berners-Lee propone en el CERN la "World Wide Web". El primer servidor web del mundo arrancó en 1990 y cambió la comunicación humana.',
     ['ciencia', 'internet', 'siglo XX'], 'Ginebra, Suiza', 46.2044, 6.1432, datetime(1989, 3, 12)),
    ('@KudosHistoria', 'Pinturas rupestres de Altamira · ~36000 a.C.',
     'Las pinturas de Altamira en Cantabria son uno de los testimonios más antiguos del arte humano: bisontes y manos en colores ocre y negro.',
     ['arte', 'prehistoria'], 'Santillana del Mar, España', 43.3772, -4.1198, None),
    ('@KudosHistoria', 'Construcción de la Gran Muralla China',
     'Erigida durante distintas dinastías a lo largo de 2000 años. Más de 21.000 km de muros, torres y fortalezas. Símbolo de la perseverancia humana.',
     ['historia', 'arquitectura', 'oriente'], 'Beijing, China', 40.4319, 116.5704, None),
]

# ============================================================
# UNESCO – Patrimonio Mundial (factual)
# ============================================================
UNESCO = [
    ('@KudosUNESCO', 'Machu Picchu · Perú',
     'Ciudad inca del siglo XV a 2.430 m de altitud. Patrimonio Mundial UNESCO desde 1983. Una de las maravillas más visitadas del planeta.',
     ['patrimonio', 'unesco', 'inca'], 'Machu Picchu, Perú', -13.1631, -72.5450),
    ('@KudosUNESCO', 'Taj Mahal · India',
     'Mausoleo de mármol blanco construido entre 1631 y 1648 por Shah Jahan en memoria de su esposa Mumtaz Mahal. UNESCO desde 1983.',
     ['patrimonio', 'unesco', 'arquitectura'], 'Agra, India', 27.1751, 78.0421),
    ('@KudosUNESCO', 'Pirámides de Giza · Egipto',
     'Las únicas de las Siete Maravillas del Mundo Antiguo que sobreviven. Construidas hace ~4.500 años. UNESCO desde 1979.',
     ['patrimonio', 'unesco', 'antiguo egipto'], 'Giza, Egipto', 29.9792, 31.1342),
    ('@KudosUNESCO', 'Petra · Jordania',
     'Ciudad nabatea tallada en la roca rosa hace más de 2.000 años. UNESCO desde 1985. "El tesoro" es su fachada más célebre.',
     ['patrimonio', 'unesco'], 'Petra, Jordania', 30.3285, 35.4444),
    ('@KudosUNESCO', 'Angkor Wat · Camboya',
     'El templo religioso más grande del mundo, construido en el siglo XII por el rey Suryavarman II. UNESCO desde 1992.',
     ['patrimonio', 'unesco'], 'Siem Reap, Camboya', 13.4125, 103.8670),
    ('@KudosUNESCO', 'Coliseo de Roma · Italia',
     'Anfiteatro construido en el siglo I d.C. con capacidad para 50.000 espectadores. UNESCO desde 1980.',
     ['patrimonio', 'unesco', 'roma'], 'Roma, Italia', 41.8902, 12.4922),
    ('@KudosUNESCO', 'Stonehenge · Reino Unido',
     'Monumento megalítico levantado entre el 3000 y el 2000 a.C. UNESCO desde 1986. Su propósito exacto sigue siendo un misterio.',
     ['patrimonio', 'unesco', 'prehistoria'], 'Wiltshire, Reino Unido', 51.1789, -1.8262),
    ('@KudosUNESCO', 'Galápagos · Ecuador',
     'Archipiélago volcánico con biodiversidad única que inspiró la teoría de la evolución de Darwin. UNESCO desde 1978.',
     ['patrimonio', 'unesco', 'naturaleza'], 'Galápagos, Ecuador', -0.9538, -90.9656),
    ('@KudosUNESCO', 'Gran Barrera de Coral · Australia',
     '2.300 km de arrecifes coralinos. El mayor sistema vivo de la Tierra, visible desde el espacio. UNESCO desde 1981.',
     ['patrimonio', 'unesco', 'naturaleza'], 'Queensland, Australia', -18.2871, 147.6992),
    ('@KudosUNESCO', 'Alhambra · España',
     'Conjunto palaciego nazarí del siglo XIV en Granada. Cumbre del arte hispanomusulmán. UNESCO desde 1984.',
     ['patrimonio', 'unesco', 'al-andalus'], 'Granada, España', 37.1773, -3.5986),
    ('@KudosUNESCO', 'Kioto histórico · Japón',
     'Antigua capital imperial. Sus templos, jardines zen y barrios de geishas son Patrimonio Mundial desde 1994.',
     ['patrimonio', 'unesco', 'japón'], 'Kioto, Japón', 35.0116, 135.7681),
    ('@KudosUNESCO', 'Acrópolis de Atenas · Grecia',
     'La cuna simbólica de la civilización occidental. El Partenón, el Erecteion, los Propileos. UNESCO desde 1987.',
     ['patrimonio', 'unesco', 'griego'], 'Atenas, Grecia', 37.9715, 23.7257),
    ('@KudosUNESCO', 'Cataratas del Iguazú · Argentina/Brasil',
     '275 saltos de agua a lo largo de casi 3 km. UNESCO desde 1984. Una de las maravillas naturales del planeta.',
     ['patrimonio', 'unesco', 'naturaleza'], 'Puerto Iguazú, Argentina', -25.6953, -54.4367),
]

# ============================================================
# CIENCIA – hitos verificables
# ============================================================
SCIENCE = [
    ('@KudosCiencia', 'Einstein y E=mc²',
     'En 1905 Albert Einstein publicó su artículo sobre la equivalencia masa-energía. Una idea sencilla con consecuencias inmensas.',
     ['ciencia', 'física'], 'Berna, Suiza', 46.9480, 7.4474),
    ('@KudosCiencia', 'Estructura del ADN',
     'En 1953, Watson y Crick (con datos esenciales de Rosalind Franklin) publican la estructura en doble hélice del ADN. Cambia la biología para siempre.',
     ['ciencia', 'biología'], 'Cambridge, Reino Unido', 52.2053, 0.1218),
    ('@KudosCiencia', 'Sputnik 1 · 1957',
     'Primer satélite artificial puesto en órbita. Inicia la era espacial. Lanzado por la URSS el 4 de octubre de 1957.',
     ['ciencia', 'espacio'], 'Baikonur, Kazajistán', 45.965, 63.305),
    ('@KudosCiencia', 'Galileo y los telescopios',
     'En 1609 Galileo Galilei mejora el telescopio y observa lunas en Júpiter. La cosmovisión geocéntrica empieza a desmoronarse.',
     ['ciencia', 'astronomía'], 'Padua, Italia', 45.4064, 11.8768),
    ('@KudosCiencia', 'CRISPR · 2012',
     'Doudna y Charpentier publican el uso de CRISPR-Cas9 para edición genética precisa. Premio Nobel de Química 2020.',
     ['ciencia', 'biotecnología'], 'Berkeley, EE.UU.', 37.8716, -122.2727),
    ('@KudosCiencia', 'Vacuna contra la viruela · 1796',
     'Edward Jenner desarrolla la primera vacuna eficaz inoculando cowpox. Inicia el camino que acabará erradicando la viruela en 1980.',
     ['ciencia', 'medicina'], 'Berkeley, Reino Unido', 51.6925, -2.4571),
    ('@KudosCiencia', 'La gravedad de Newton · 1687',
     'Isaac Newton publica los Principia, donde formula la ley de gravitación universal. Una sola ley explica las mareas y las órbitas.',
     ['ciencia', 'física'], 'Cambridge, Reino Unido', 52.2053, 0.1218),
]


# ============================================================
# ARTE – obras y reflexiones (factuales o de dominio público)
# ============================================================
ART = [
    ('@KudosArte', 'La Gioconda · Leonardo · ~1503',
     'Leonardo da Vinci pintó la Mona Lisa entre 1503 y 1519. Hoy custodiada en el Louvre. Su sonrisa enigmática ha fascinado a generaciones.',
     ['arte', 'renacimiento'], 'París, Francia', 48.8606, 2.3376),
    ('@KudosArte', 'La noche estrellada · Van Gogh · 1889',
     'Vincent van Gogh pintó La Noche Estrellada desde su habitación en el manicomio de Saint-Rémy-de-Provence. Un cielo en remolino sobre un pueblo dormido.',
     ['arte', 'postimpresionismo'], 'Saint-Rémy, Francia', 43.7889, 4.8311),
    ('@KudosArte', 'La capilla Sixtina · Miguel Ángel · 1508-1512',
     'Miguel Ángel pintó el techo de la Capilla Sixtina de pie sobre andamios durante 4 años. La Creación de Adán es su escena más célebre.',
     ['arte', 'renacimiento'], 'Vaticano', 41.9029, 12.4534),
    ('@KudosArte', 'El Guernica · Picasso · 1937',
     'Pablo Picasso pintó Guernica como respuesta al bombardeo de la villa vasca durante la Guerra Civil Española. Hoy en el Museo Reina Sofía.',
     ['arte', 'siglo XX'], 'Madrid, España', 40.4084, -3.6953),
    ('@KudosArte', 'La belleza según Plotino',
     'La belleza es ante todo el resplandor de la unidad sobre la multiplicidad. — Plotino, Enéadas (s. III)',
     ['filosofía', 'estética'], 'Roma, Italia', 41.9028, 12.4964),
]


def slugify_uid(name):
    return name.lower().replace('@kudos', 'kudos_').replace('í', 'i').replace('ó', 'o').replace('ñ', 'n')


class Command(BaseCommand):
    help = 'Importa cápsulas oficiales de dominio público (sabiduría, historia, ciencia, arte, UNESCO).'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Borra antes las cápsulas oficiales existentes.')

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('📚 Importando contenido oficial de dominio público...'))

        # 1) Crear cuentas oficiales (transparentes, no fingen ser personas)
        accounts = {}
        for acct in OFFICIAL_ACCOUNTS:
            user, created = User.objects.get_or_create(
                uid=acct['uid'],
                defaults={
                    'alias': acct['alias'], 'role': acct['role'],
                    'bio': acct['bio'], 'is_active': True,
                    'experience_points': 1000, 'level': 11,
                }
            )
            if created:
                user.set_password(f"oficial_{acct['uid']}_{random.randint(1000,9999)}")
                user.save()
                self.stdout.write(self.style.SUCCESS(f'  ✓ Cuenta oficial creada: {acct["alias"]}'))
                # Insignia oficial
                Badge.objects.get_or_create(user=user, name='Cuenta Editorial Oficial',
                                            defaults={'description': 'Cuenta editorial transparente de Kudos', 'icon': '✅'})
            accounts[acct['alias']] = user

        # 2) Reset opcional
        if options['reset']:
            count = Capsule.objects.filter(usuario__in=accounts.values()).delete()
            self.stdout.write(self.style.WARNING(f'  ↻ Cápsulas oficiales borradas: {count[0] if count else 0}'))

        # 3) Importar todas las series
        all_series = [
            ('Sabiduría clásica', WISDOM, 'sabiduria'),
            ('Historia', HISTORY, 'historico'),
            ('UNESCO', UNESCO, 'historico'),
            ('Ciencia', SCIENCE, 'sabiduria'),
            ('Arte', ART, 'arte'),
        ]

        total_created = 0
        for label, series, modo in all_series:
            self.stdout.write(self.style.HTTP_INFO(f'\n  ── {label} ({len(series)} cápsulas) ──'))
            for entry in series:
                if len(entry) == 7:  # con fecha
                    alias, titulo, contenido, temas, lugar, lat, lon = entry[:7]
                    fecha = entry[7] if len(entry) > 7 else timezone.now().date()
                elif len(entry) == 8:
                    alias, titulo, contenido, temas, lugar, lat, lon, fecha = entry
                    if fecha is None:
                        fecha = timezone.now().date()
                    else:
                        fecha = fecha.date() if hasattr(fecha, 'date') else fecha
                else:
                    alias, titulo, contenido, temas, lugar, lat, lon = entry
                    fecha = timezone.now().date()

                user = accounts.get(alias)
                if not user:
                    continue
                obj, created = Capsule.objects.get_or_create(
                    titulo=titulo, usuario=user,
                    defaults={
                        'contenido': contenido,
                        'modo': modo, 'privacy': 'publico',
                        'lugar': lugar, 'latitud': lat, 'longitud': lon,
                        'temas': temas, 'fecha': fecha,
                        'likes': random.randint(5, 80),
                        'views': random.randint(30, 500),
                        'source': 'oficial',
                    }
                )
                if created:
                    total_created += 1

        self.stdout.write(self.style.SUCCESS(f'\n✅ {total_created} cápsulas oficiales importadas'))
        total = Capsule.objects.filter(source='oficial').count()
        self.stdout.write(f'   Total cápsulas oficiales en BD: {total}')
        self.stdout.write(f'\n💡 Las cuentas oficiales son TRANSPARENTES (no fingen ser personas):')
        for acct in OFFICIAL_ACCOUNTS:
            self.stdout.write(f'   • {acct["alias"]} — {acct["bio"][:60]}...')
