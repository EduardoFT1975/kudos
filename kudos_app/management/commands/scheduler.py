# kudos_app/management/commands/scheduler.py

from django.core.management.base import BaseCommand
from kudos_app.models import Capsule, User, SettingsConfig
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Ejecuta tareas programadas para Kudos, como procesar cápsulas y enviar notificaciones.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecuta el comando en modo simulación sin realizar cambios.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        self.stdout.write(self.style.SUCCESS('Iniciando el programador de Kudos...'))

        # Configuración inicial
        config = SettingsConfig.objects.get_or_create(key="scheduler_settings")[0]
        last_run = config.parameters.get('last_run', None)
        now = timezone.now()

        # Verificar si es hora de ejecutar (ejemplo: cada 24 horas)
        if last_run and (now - last_run) < timedelta(hours=24) and not dry_run:
            self.stdout.write(self.style.WARNING('El programador ya se ejecutó hoy.'))
            return

        # Tarea 1: Procesar cápsulas expiradas
        expired_capsules = Capsule.objects.filter(
            modo__in=['dia', 'semana'],
            fecha__lt=now - timedelta(days=7)  # Ejemplo: cápsulas de más de 7 días
        )
        expired_count = expired_capsules.count()
        if not dry_run:
            expired_capsules.update(privacy='solo_yo')  # Ocultar cápsulas expiradas
            logger.info(f"Se ocultaron {expired_count} cápsulas expiradas.")
        self.stdout.write(f"Procesadas {expired_count} cápsulas expiradas.")

        # Tarea 2: Enviar notificaciones a usuarios activos
        active_users = User.objects.filter(is_active=True)
        notification_count = 0
        for user in active_users:
            recent_capsules = Capsule.objects.filter(usuario=user, timestamp__gte=now - timedelta(days=1)).count()
            if recent_capsules > 0 and not dry_run:
                # Aquí podrías integrar un sistema de notificaciones real
                logger.info(f"Notificación enviada a {user.alias}: {recent_capsules} cápsulas recientes.")
                notification_count += 1
        self.stdout.write(f"Enviadas {notification_count} notificaciones a usuarios activos.")

        # Tarea 3: Actualizar estadísticas globales (ejemplo)
        total_capsules = Capsule.objects.count()
        if not dry_run:
            config.variables['total_capsules'] = total_capsules
            config.parameters['last_run'] = now
            config.save()
        self.stdout.write(f"Estadísticas actualizadas: {total_capsules} cápsulas totales.")

        # Finalización
        if dry_run:
            self.stdout.write(self.style.WARNING('Modo simulación: no se aplicaron cambios.'))
        else:
            self.stdout.write(self.style.SUCCESS('Programador de Kudos ejecutado exitosamente.'))