# kudos_app/management/commands/import_data.py

from django.core.management.base import BaseCommand, CommandError
from kudos_app.models import Capsule, User
from django.utils import timezone
import csv
import os
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Importa cápsulas multidimensionales desde un archivo CSV a la base de datos de Kudos.'

    def add_arguments(self, parser):
        parser.add_argument(
            'file_path',
            type=str,
            help='Ruta al archivo CSV que contiene los datos a importar',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecuta el comando en modo simulación sin guardar datos.',
        )

    def handle(self, *args, **options):
        file_path = options['file_path']
        dry_run = options['dry_run']

        # Verificar si el archivo existe
        if not os.path.exists(file_path):
            raise CommandError(f"El archivo {file_path} no existe.")

        self.stdout.write(self.style.SUCCESS(f"Iniciando importación desde {file_path}..."))

        # Contadores
        imported_count = 0
        skipped_count = 0

        # Abrir y leer el archivo CSV
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            required_fields = {'content', 'username', 'mode', 'privacy', 'themes'}

            # Verificar campos requeridos
            if not required_fields.issubset(reader.fieldnames):
                raise CommandError(f"El CSV debe contener las columnas: {', '.join(required_fields)}")

            for row in reader:
                try:
                    # Buscar usuario por nombre de usuario
                    user = User.objects.filter(username=row['username']).first()
                    if not user:
                        skipped_count += 1
                        logger.warning(f"Usuario {row['username']} no encontrado. Saltando fila.")
                        continue

                    # Procesar temas (separados por comas)
                    themes = [t.strip() for t in row['themes'].split(',') if t.strip()]

                    # Crear cápsula
                    capsule = Capsule(
                        uid=f"imported_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}_{imported_count}",
                        usuario=user,
                        contenido=row['content'],
                        modo=row['mode'],
                        fecha=timezone.now().date(),
                        privacy=row['privacy'],
                        time_scale='dia',  # Valor por defecto
                        price=float(row.get('price', 0.0)),
                        temas=themes,
                        parameters={'imported': True},
                        variables={'visibility_range': user.notification_distance or 1000}
                    )

                    if not dry_run:
                        capsule.save()
                        logger.info(f"Cápsula importada: {capsule.uid}")
                    imported_count += 1

                except Exception as e:
                    skipped_count += 1
                    logger.error(f"Error al importar fila: {row}. Excepción: {str(e)}")
                    continue

        # Resumen
        self.stdout.write(self.style.SUCCESS(f"Importación completada: {imported_count} cápsulas importadas, {skipped_count} filas omitidas."))
        if dry_run:
            self.stdout.write(self.style.WARNING('Modo simulación: no se guardaron datos.'))