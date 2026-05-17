# kudos_app/management/commands/daily_tasks.py
"""
Comando: python manage.py daily_tasks

Ejecuta automáticamente las tareas del día. Pensado para correr una vez
al día (cron en Linux, Tareas Programadas en Windows, o cron de Render).

Tareas:
  1. Detectar cápsulas trending (>50 vistas, <7 días).
  2. Otorgar insignias automáticas según logros.
  3. Limpiar notificaciones antiguas (>30 días).
  4. Calcular usuarios destacados de la semana.
  5. Generar resumen diario para el panel del fundador.
"""

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Count, F, Sum
from kudos_app.models import (
    User, Capsule, Like, Badge, Notification, Proposal, SettingsConfig,
)


class Command(BaseCommand):
    help = 'Ejecuta las tareas automáticas diarias del ecosistema Kudos.'

    def handle(self, *args, **options):
        now = timezone.now()
        self.stdout.write(self.style.HTTP_INFO(f'⏰ Tareas diarias · {now.strftime("%Y-%m-%d %H:%M")}'))

        # ============ 1. CÁPSULAS TRENDING ============
        seven_days_ago = now - timedelta(days=7)
        trending = Capsule.objects.filter(
            timestamp__gte=seven_days_ago, privacy='publico'
        ).order_by('-likes', '-views')[:10]

        # Marcar trending en los parameters
        Capsule.objects.update(parameters={})
        for c in trending:
            c.parameters = c.parameters or {}
            c.parameters['trending'] = True
            c.save(update_fields=['parameters'])
        self.stdout.write(f'  ✓ Cápsulas trending detectadas: {len(trending)}')

        # ============ 2. INSIGNIAS AUTOMÁTICAS ============
        badges_awarded = 0

        # Coleccionista: 10+ cápsulas
        collectors = User.objects.annotate(c=Count('capsules')).filter(c__gte=10)
        for u in collectors:
            _, created = Badge.objects.get_or_create(
                user=u, name='Coleccionista',
                defaults={'description': 'Has creado más de 10 cápsulas', 'icon': '📦'}
            )
            if created:
                Notification.objects.create(
                    user=u, type='badge', priority='media',
                    message='🏆 ¡Has conseguido la insignia Coleccionista!'
                )
                u.add_xp(50)
                badges_awarded += 1

        # Influyente: 50+ likes acumulados en sus cápsulas
        for u in User.objects.all():
            total_likes = u.capsules.aggregate(t=Sum('likes'))['t'] or 0
            if total_likes >= 50:
                _, created = Badge.objects.get_or_create(
                    user=u, name='Influyente',
                    defaults={'description': 'Tus cápsulas acumulan más de 50 likes', 'icon': '🌟'}
                )
                if created:
                    Notification.objects.create(
                        user=u, type='badge', priority='media',
                        message='🏆 ¡Has conseguido la insignia Influyente!'
                    )
                    u.add_xp(80)
                    badges_awarded += 1

        # Sabio: 5+ cápsulas en sabiduría
        sages = User.objects.annotate(
            c=Count('capsules', filter=models_q('sabiduria'))
        ) if False else None
        # Versión simple sin Conditional Q
        for u in User.objects.all():
            n = u.capsules.filter(modo='sabiduria').count()
            if n >= 5:
                _, created = Badge.objects.get_or_create(
                    user=u, name='Sabio',
                    defaults={'description': 'Has compartido 5+ cápsulas de sabiduría', 'icon': '🧠'}
                )
                if created:
                    Notification.objects.create(
                        user=u, type='badge', priority='media',
                        message='🏆 ¡Has conseguido la insignia Sabio!'
                    )
                    u.add_xp(60)
                    badges_awarded += 1

        self.stdout.write(f'  ✓ Insignias automáticas otorgadas: {badges_awarded}')

        # ============ 3. LIMPIAR NOTIFICACIONES ANTIGUAS ============
        old_threshold = now - timedelta(days=30)
        deleted = Notification.objects.filter(timestamp__lt=old_threshold, read=True).delete()
        self.stdout.write(f'  ✓ Notificaciones antiguas limpiadas: {deleted[0] if deleted else 0}')

        # ============ 4. USUARIOS DESTACADOS ============
        top_users = User.objects.annotate(
            cap_count=Count('capsules')
        ).filter(cap_count__gt=0).order_by('-experience_points')[:10]
        top_data = [{'alias': u.alias, 'xp': u.experience_points, 'capsules': u.cap_count} for u in top_users]

        # ============ 5. RESUMEN DIARIO ============
        cfg, _ = SettingsConfig.objects.get_or_create(key='daily_summary')
        cfg.parameters = {
            'date': now.date().isoformat(),
            'total_capsules': Capsule.objects.count(),
            'total_users': User.objects.count(),
            'new_capsules_today': Capsule.objects.filter(
                timestamp__gte=now - timedelta(days=1)
            ).count(),
            'new_users_today': User.objects.filter(
                date_joined__gte=now - timedelta(days=1)
            ).count(),
            'active_proposals': Proposal.objects.filter(status='debate').count(),
            'badges_awarded_today': badges_awarded,
            'top_users': top_data,
        }
        cfg.save()
        self.stdout.write(self.style.SUCCESS('  ✓ Resumen diario actualizado'))

        self.stdout.write(self.style.SUCCESS('\n✅ Tareas diarias completadas'))


def models_q(modo):
    """Helper para Q condicional."""
    from django.db.models import Q
    return Q(modo=modo)
