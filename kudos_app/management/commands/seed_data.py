# kudos_app/management/commands/seed_data.py
"""
Comando: python manage.py seed_data

Pobla la base de datos con cápsulas, propuestas y espacios de demostración
para que el proyecto se vea atractivo desde el primer arranque.
"""

import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from kudos_app.models import (
    User, Capsule, Proposal, SocialSpace, Competition, Badge, Notification,
)


CAPSULES_DATA = [
    {
        'titulo': 'La sabiduría de Aristóteles',
        'contenido': 'La virtud es un hábito, no un acto. Somos lo que repetidamente hacemos. La excelencia, entonces, no es un acto, sino un hábito.',
        'modo': 'sabiduria', 'lugar': 'Atenas, Grecia',
        'latitud': 37.9838, 'longitud': 23.7275,
        'temas': ['filosofía', 'virtud', 'griego clásico'],
    },
    {
        'titulo': 'Reflexión bajo el cielo de Roma',
        'contenido': 'Comienza el día diciendo a ti mismo: encontraré gente entrometida, ingrata, arrogante, traicionera, envidiosa, antipática. — Marco Aurelio',
        'modo': 'espiritual', 'lugar': 'Roma, Italia',
        'latitud': 41.9028, 'longitud': 12.4964,
        'temas': ['estoicismo', 'meditación'],
    },
    {
        'titulo': 'El primer día de Kudos',
        'contenido': 'Hoy nace un ecosistema multidimensional. Nuestro objetivo: preservar el legado humano más allá del tiempo, conectar a la humanidad sin fronteras, y empoderar a cada voz con valor de mérito.',
        'modo': 'historico', 'lugar': 'Madrid, España',
        'latitud': 40.4168, 'longitud': -3.7038,
        'temas': ['fundación', 'manifiesto'],
    },
    {
        'titulo': 'Las tres dimensiones del arte',
        'contenido': 'El arte verdadero conecta el pasado (memoria), el presente (emoción) y el futuro (esperanza). Cada cápsula es una obra abierta.',
        'modo': 'arte', 'lugar': 'Florencia, Italia',
        'latitud': 43.7696, 'longitud': 11.2558,
        'temas': ['arte', 'creatividad', 'estética'],
    },
    {
        'titulo': 'Recuerdo de mi abuela',
        'contenido': 'Me decía: "no temas equivocarte, teme no intentarlo". Llevo conmigo esa frase como talismán. Esta cápsula es para que sus palabras vivan más allá de mí.',
        'modo': 'personal', 'lugar': 'Sevilla, España',
        'latitud': 37.3891, 'longitud': -5.9845,
        'temas': ['familia', 'memoria', 'vida'],
    },
    {
        'titulo': 'Sobre la inteligencia colectiva',
        'contenido': 'Solos llegamos rápido; juntos llegamos lejos. Pero más importante: juntos llegamos donde solos jamás imaginaríamos. El Comité de Sabios encarna ese principio.',
        'modo': 'sabiduria', 'lugar': 'Tokio, Japón',
        'latitud': 35.6762, 'longitud': 139.6503,
        'temas': ['comunidad', 'gobernanza', 'colaboración'],
    },
    {
        'titulo': 'Mirando las estrellas en el Sahara',
        'contenido': 'Bajo este cielo que vio nacer civilizaciones, entiendo que somos pequeños pero no insignificantes. Cada cápsula es una estrella que encenderá futuras generaciones.',
        'modo': 'espiritual', 'lugar': 'Sahara, Marruecos',
        'latitud': 31.7917, 'longitud': -7.0926,
        'temas': ['cosmos', 'introspección'],
    },
    {
        'titulo': 'El mercado del futuro',
        'contenido': 'Imagina un mercado donde no se vende: se intercambia mérito. Donde no compites: contribuyes. Donde no acumulas: trasciendes. Eso es Kudos Market.',
        'modo': 'comercial', 'lugar': 'Singapur',
        'latitud': 1.3521, 'longitud': 103.8198,
        'temas': ['economía', 'descentralización', 'futuro'],
    },
]

PROPOSALS_DATA = [
    {
        'title': 'Energía solar para todas las nuevas ciudades',
        'description': 'Propongo que toda nueva planificación urbana en el ecosistema Kudos integre paneles solares en cada hogar como nodos de la red Nexus. Los hogares se convierten en repetidores y productores de energía.',
        'themes': ['sostenibilidad', 'urbanismo', 'tecnología'],
        'votes_for': 27, 'votes_against': 4,
    },
    {
        'title': 'Educación libre y eterna',
        'description': 'Crear un programa donde cada usuario veterano tutoree a 3 nuevos. Las cápsulas educativas se preservan eternamente y forman currículos abiertos.',
        'themes': ['educación', 'mentoría', 'igualdad'],
        'votes_for': 41, 'votes_against': 2,
    },
    {
        'title': 'Día sin pantallas, con cápsulas',
        'description': 'Un día al mes el ecosistema invita a registrar tus cápsulas a mano (papel, audio, presencia) y subirlas después. Nos protege del exceso digital.',
        'themes': ['bienestar', 'cultura', 'salud'],
        'votes_for': 18, 'votes_against': 9,
    },
]

SPACES_DATA = [
    {
        'name': 'Filosofía Eterna',
        'description': 'Un espacio para los amantes de la sabiduría: estoicos, taoístas, racionalistas, místicos. Compartimos cápsulas que cuestionan e iluminan.',
        'icon': '🏛',
    },
    {
        'name': 'Cápsulas Familiares',
        'description': 'Para preservar el legado de tu familia: abuelos, infancia, recetas, historias. Lo íntimo hecho eterno.',
        'icon': '👨‍👩‍👧‍👦',
    },
    {
        'name': 'Innovación 5D',
        'description': 'Proyectos, ideas y experimentos que mezclan tecnología, arte, ciencia y filosofía. ¿Cómo será el futuro?',
        'icon': '🚀',
    },
    {
        'name': 'Salud Mental Compartida',
        'description': 'Espacio seguro para hablar de bienestar emocional, ansiedad, propósito. Sin juicios, con respeto.',
        'icon': '💚',
    },
]


class Command(BaseCommand):
    help = 'Carga datos de demostración (cápsulas, propuestas, espacios) en la base de datos.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset', action='store_true',
            help='Borra antes los datos existentes (NO los usuarios reales).',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🌱 Sembrando datos de demostración...'))

        # 1) Crear (o reutilizar) usuario "demo"
        demo_user, created = User.objects.get_or_create(
            uid='demo',
            defaults={
                'alias': 'KudosDemo',
                'email': 'demo@kudos.local',
                'role': 'user',
                'bio': 'Cuenta de demostración con cápsulas de ejemplo.',
                'experience_points': 250,
                'level': 3,
            }
        )
        if created:
            demo_user.set_password('demo1234')
            demo_user.save()
            self.stdout.write(self.style.SUCCESS('  ✓ Usuario "demo" creado (contraseña: demo1234)'))
        else:
            self.stdout.write('  • Usuario "demo" ya existe')

        # 2) Reset opcional
        if options['reset']:
            Capsule.objects.filter(usuario=demo_user).delete()
            Proposal.objects.filter(user=demo_user).delete()
            SocialSpace.objects.filter(creator=demo_user).delete()
            Competition.objects.filter(creator=demo_user).delete()
            self.stdout.write(self.style.WARNING('  ↻ Datos previos del usuario demo borrados'))

        # 3) Cápsulas
        for data in CAPSULES_DATA:
            obj, created = Capsule.objects.get_or_create(
                titulo=data['titulo'], usuario=demo_user,
                defaults={
                    **data,
                    'privacy': 'publico',
                    'likes': random.randint(3, 30),
                    'views': random.randint(20, 200),
                }
            )
            if created:
                self.stdout.write(f'  ✓ Cápsula: {obj.titulo}')

        # 4) Propuestas
        for data in PROPOSALS_DATA:
            obj, created = Proposal.objects.get_or_create(
                title=data['title'], user=demo_user,
                defaults={**data, 'status': 'debate'}
            )
            if created:
                self.stdout.write(f'  ✓ Propuesta: {obj.title}')

        # 5) Espacios sociales
        for data in SPACES_DATA:
            obj, created = SocialSpace.objects.get_or_create(
                name=data['name'],
                defaults={**data, 'creator': demo_user},
            )
            if created:
                obj.members.add(demo_user)
                self.stdout.write(f'  ✓ Espacio: {obj.name}')

        # 6) Competiciones
        Competition.objects.get_or_create(
            name='Maratón de Sabiduría 2026',
            defaults={
                'creator': demo_user,
                'description': 'Competición de aporte a la sabiduría: el usuario con más cápsulas valoradas en sabiduría gana una insignia legendaria.',
                'sport': 'cultura',
                'is_virtual': True,
                'entry_price': 0,
            },
        )

        # 7) Insignias para el demo
        for name, desc, icon in [
            ('Pionero', 'Estuviste en los primeros días de Kudos', '🌟'),
            ('Coleccionista', 'Compartiste más de 5 cápsulas', '📦'),
            ('Voz Colectiva', 'Hiciste tu primera propuesta', '🗳️'),
        ]:
            Badge.objects.get_or_create(user=demo_user, name=name,
                                        defaults={'description': desc, 'icon': icon})

        self.stdout.write(self.style.SUCCESS('\n✅ Listo. Inicia el servidor y visita la página de inicio.'))
        self.stdout.write('   Login con: UID="demo" / contraseña="demo1234"\n')
