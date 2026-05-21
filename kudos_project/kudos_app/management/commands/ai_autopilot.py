# kudos_app/management/commands/ai_autopilot.py
"""
KUDOS MIND · Piloto automático interno.

Lanza varios agentes de IA en bucle indefinido. Cada agente cumple
una función concreta (importar, curar, moderar, analizar, narrar,
recomendar, planificar, cuidar al fundador). El comando:

  - Crea / actualiza los agentes en la base de datos.
  - En cada ciclo recorre los activos y, si toca por su intervalo,
    los ejecuta dentro de un try/except seguro.
  - Registra cada acción en AIAction y cada conclusión en AIInsight.
  - Es ECONÓMICO con datos: no llama a APIs externas en ningún caso.
  - Si OPENAI_API_KEY existe el sistema PUEDE enriquecerse, pero
    funciona perfectamente sin internet.
  - Modo `--once` ejecuta un solo ciclo (perfecto para cron / Render).
  - Modo continuo por defecto: corre hasta que pulses Ctrl+C.

Uso:
  python manage.py ai_autopilot                # bucle infinito (recomendado)
  python manage.py ai_autopilot --once         # un solo ciclo
  python manage.py ai_autopilot --sleep 120    # 2 min entre ciclos
"""
import os
import random
import signal
import sys
import time
import traceback
from datetime import timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db.models import Avg, Count, Sum
from django.utils import timezone

from kudos_app.models import (
    AIAction, AIAgent, AIDirective, AIInsight,
    Activity, Badge, BudgetLine, Capsule, Department, FeedItem, Goal,
    HabitLog, JournalEntry, KPI, Like, Notification, Proposal,
    Review, SettingsConfig, SocialSpace, User,
)


# Definición de los agentes que el sistema crea/actualiza al arrancar.
DEFAULT_AGENTS = [
    {'code': 'importer', 'kind': 'importer', 'icon': '📥',
     'name': 'Bibliotecario universal',
     'description': 'Trae cápsulas de Wikipedia y dominio público en bucle.',
     'interval_seconds': 600},
    {'code': 'curator', 'kind': 'curator', 'icon': '🧠',
     'name': 'Curador de cápsulas',
     'description': 'Asigna temas, detecta duplicados y mejora títulos vacíos.',
     'interval_seconds': 900},
    {'code': 'moderator', 'kind': 'moderator', 'icon': '🛡',
     'name': 'Centinela de calidad',
     'description': 'Marca cápsulas vacías o sospechosas para revisión humana.',
     'interval_seconds': 1200},
    {'code': 'analyst', 'kind': 'analyst', 'icon': '📊',
     'name': 'Analista de KPIs',
     'description': 'Recalcula KPIs y métricas globales del ecosistema.',
     'interval_seconds': 1800},
    {'code': 'narrator', 'kind': 'narrator', 'icon': '📜',
     'name': 'Narrador del ecosistema',
     'description': 'Genera resúmenes diarios y cuentos de hitos importantes.',
     'interval_seconds': 3600},
    {'code': 'recommender', 'kind': 'recommender', 'icon': '🎯',
     'name': 'Recomendador personal',
     'description': 'Construye el feed personalizado de cada usuario.',
     'interval_seconds': 1500},
    {'code': 'scheduler', 'kind': 'scheduler', 'icon': '⏰',
     'name': 'Planificador',
     'description': 'Lanza tareas diarias, limpia notificaciones, otorga insignias.',
     'interval_seconds': 7200},
    {'code': 'guardian', 'kind': 'guardian', 'icon': '🌿',
     'name': 'Guardián del fundador',
     'description': 'Vigila tu vida personal: hábitos, sueño, lectura, cripto, diario.',
     'interval_seconds': 5400},
]


class Command(BaseCommand):
    help = 'KUDOS MIND · Piloto automático interno (multi-agente).'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true',
                            help='Ejecuta un único ciclo y termina.')
        parser.add_argument('--sleep', type=int, default=60,
                            help='Segundos de espera entre ciclos (def. 60).')
        parser.add_argument('--max-cycles', type=int, default=0,
                            help='Nº máximo de ciclos (0 = infinito).')
        parser.add_argument('--quiet', action='store_true',
                            help='Solo errores en stdout.')

    # ====================================================
    # Bucle principal
    # ====================================================
    def handle(self, *args, **options):
        self.quiet = options['quiet']
        self.sleep_sec = max(5, options['sleep'])
        once = options['once']
        max_cycles = options['max_cycles']

        self._ensure_agents()
        self._announce()

        # Solo registramos handlers en el hilo principal (no cuando se invoca
        # desde una vista de Django, que corre en hilos secundarios).
        import threading
        if threading.current_thread() is threading.main_thread():
            def graceful(signum, frame):
                self.log('🛑 KUDOS MIND detenido manualmente.', force=True)
                sys.exit(0)
            try:
                signal.signal(signal.SIGINT, graceful)
                signal.signal(signal.SIGTERM, graceful)
            except (ValueError, OSError):
                pass

        cycle = 0
        while True:
            cycle += 1
            if max_cycles and cycle > max_cycles:
                break
            self.log(f'\n━━━ Ciclo {cycle} · {timezone.now():%Y-%m-%d %H:%M:%S} ━━━')

            for agent in AIAgent.objects.filter(is_active=True):
                if not self._is_due(agent):
                    continue
                self._run_agent(agent)

            if once:
                break
            self.log(f'💤 Pausa de {self.sleep_sec}s.')
            time.sleep(self.sleep_sec)

        self.log('✅ KUDOS MIND finalizado.', force=True)

    # ====================================================
    # Helpers
    # ====================================================
    def log(self, msg, force=False):
        if force or not self.quiet:
            self.stdout.write(msg)

    def _announce(self):
        self.log(self.style.HTTP_INFO(
            '\n♾  KUDOS MIND · Piloto automático arrancado'
            f'\n   Agentes activos: {AIAgent.objects.filter(is_active=True).count()}'
            f'\n   Pausa entre ciclos: {self.sleep_sec}s'
            '\n   Para detener: Ctrl+C\n'
        ))

    def _ensure_agents(self):
        """Inserta/actualiza la lista de agentes por defecto."""
        for spec in DEFAULT_AGENTS:
            AIAgent.objects.update_or_create(
                code=spec['code'],
                defaults={
                    'name': spec['name'], 'kind': spec['kind'],
                    'icon': spec['icon'], 'description': spec['description'],
                    'interval_seconds': spec['interval_seconds'],
                    'is_active': True,
                }
            )

    def _is_due(self, agent):
        if agent.last_run is None:
            return True
        elapsed = (timezone.now() - agent.last_run).total_seconds()
        return elapsed >= agent.interval_seconds

    def _run_agent(self, agent):
        """Ejecuta un agente con manejo de errores y logging."""
        method = getattr(self, f'agent_{agent.code}', None)
        if not method:
            # Los agentes con prefijo dept_*, source_enricher, multimedia los lanzan
            # OTROS comandos (autonomous_ops, enrich_sources, multimedia_auto). El
            # autopiloto MIND no los ejecuta directamente: los salta sin error.
            if (agent.code.startswith('dept_') or
                    agent.code in ('source_enricher', 'multimedia')):
                return
            self.log(f'  {agent.icon} {agent.name}: sin implementación interna · OK (lo lanza otro comando)')
            return
        agent.runs_total += 1
        try:
            actions = method(agent) or 0
            agent.actions_total += int(actions)
            agent.successes += 1
            agent.last_status = 'ok'
            self.log(f'  {agent.icon} {agent.name}: +{actions} acciones')
        except Exception as exc:
            agent.failures += 1
            agent.last_status = 'error'
            AIAction.objects.create(
                agent=agent, action='exception', level='error',
                summary=str(exc)[:500],
                parameters={'trace': traceback.format_exc()[:2000]},
            )
            self.log(self.style.ERROR(
                f'  {agent.icon} {agent.name}: ERROR · {exc}'))
        finally:
            agent.last_run = timezone.now()
            agent.save(update_fields=[
                'runs_total', 'successes', 'failures', 'actions_total',
                'last_run', 'last_status'])

    def _record(self, agent, action, summary='', level='info',
                target_type='', target_id='', parameters=None):
        AIAction.objects.create(
            agent=agent, action=action, level=level,
            summary=summary[:500], target_type=target_type,
            target_id=str(target_id)[:80], parameters=parameters or {},
        )

    def _insight(self, agent, kind, title, body, impact=2, related_url='', params=None):
        AIInsight.objects.create(
            agent=agent, kind=kind, title=title[:200], body=body,
            impact=impact, related_url=related_url[:300],
            parameters=params or {},
        )

    def _directives_for(self, scope):
        return AIDirective.objects.filter(is_active=True).filter(
            scope__in=[scope, 'global']).order_by('priority')

    # ====================================================
    # AGENTES
    # ====================================================
    def agent_importer(self, agent):
        """Importa cápsulas de Wikipedia para que el ecosistema crezca solo."""
        regions = ['GLOBAL', 'ESPAÑA', 'EUROPA', 'AMERICA_LATINA', 'ASIA', 'AFRICA']
        region = regions[(agent.runs_total - 1) % len(regions)]
        per_cycle = agent.config.get('per_cycle', 12)
        before = Capsule.objects.count()
        try:
            call_command('import_wikipedia',
                         region=region, max=per_cycle, per_region=4, lang='es',
                         stdout=open(os.devnull, 'w'))
        except Exception as exc:
            self._record(agent, 'import_failed',
                         summary=f'{region}: {exc}', level='warning')
            return 0
        added = Capsule.objects.count() - before
        if added:
            self._record(agent, 'import',
                         summary=f'+{added} cápsulas de {region}', level='success',
                         parameters={'region': region, 'added': added})
        return added

    def agent_curator(self, agent):
        """Mejora cápsulas con título vacío, asigna temas básicos por modo."""
        actions = 0
        empties = Capsule.objects.filter(titulo='').exclude(contenido='')[:30]
        for c in empties:
            new_title = c.contenido.strip().split('.')[0][:80] or c.contenido[:80]
            if new_title and new_title != c.titulo:
                c.titulo = new_title
                c.save(update_fields=['titulo'])
                actions += 1
        # Cápsulas sin temas reciben temas por modo
        no_topics = Capsule.objects.filter(temas=[])[:30]
        topic_map = {
            'historico': ['historia', 'memoria'],
            'sabiduria': ['sabiduria', 'estoicismo'],
            'arte': ['arte', 'cultura'],
            'espiritual': ['espiritual', 'reflexion'],
            'ciudadano': ['ciudadania', 'comunidad'],
            'comercial': ['mercado', 'economia'],
            'personal': ['personal'],
        }
        for c in no_topics:
            c.temas = topic_map.get(c.modo, ['general'])
            c.save(update_fields=['temas'])
            actions += 1
        if actions:
            self._record(agent, 'curate',
                         summary=f'{actions} cápsulas mejoradas', level='success')
        return actions

    def agent_moderator(self, agent):
        """Detecta cápsulas vacías o muy cortas y avisa al fundador."""
        sus = Capsule.objects.filter(privacy='publico').filter(
            contenido__regex=r'^.{1,15}$')[:25]
        actions = 0
        for c in sus:
            self._record(agent, 'flag_empty',
                         summary=f'{c.uid} parece vacía: "{c.contenido[:30]}"',
                         level='warning', target_type='capsule', target_id=c.uid)
            actions += 1
        if actions:
            self._insight(agent, 'alert',
                          title=f'{actions} cápsulas vacías detectadas',
                          body='Se han marcado cápsulas con contenido casi inexistente. Revísalas si quieres.',
                          impact=2, related_url='/founder/')
        return actions

    def agent_analyst(self, agent):
        """Recalcula KPIs registrados en la BD usando fórmulas conocidas."""
        actions = 0
        formulas = {
            'content.total_capsules': lambda: Capsule.objects.count(),
            'content.public_capsules': lambda: Capsule.objects.filter(privacy='publico').count(),
            'growth.users': lambda: User.objects.count(),
            'growth.dau': lambda: Activity.objects.filter(
                timestamp__gte=timezone.now() - timedelta(days=1)).values('usuario').distinct().count(),
            'growth.wau': lambda: Activity.objects.filter(
                timestamp__gte=timezone.now() - timedelta(days=7)).values('usuario').distinct().count(),
            'engagement.likes': lambda: Like.objects.count(),
            'engagement.reviews': lambda: Review.objects.count(),
            'community.proposals': lambda: Proposal.objects.count(),
            'community.spaces': lambda: SocialSpace.objects.count(),
            'finance.budget_year': lambda: float(BudgetLine.objects.filter(
                year=timezone.now().year, type='cost').aggregate(t=Sum('amount_eur'))['t'] or 0),
        }
        for kpi in KPI.objects.all():
            fn = formulas.get(kpi.code)
            if not fn:
                continue
            try:
                value = fn()
                if value is None:
                    continue
                kpi.current_value = float(value)
                kpi.last_updated = timezone.now()
                kpi.save(update_fields=['current_value', 'last_updated'])
                actions += 1
            except Exception:
                continue
        if actions:
            self._record(agent, 'kpi_refresh',
                         summary=f'{actions} KPIs recalculados', level='success')
        return actions

    def agent_narrator(self, agent):
        """Resumen diario del ecosistema y cuento de hitos."""
        today = timezone.now().date()
        existing = AIInsight.objects.filter(
            kind='summary', created__date=today).first()
        if existing:
            return 0
        last24h = timezone.now() - timedelta(hours=24)
        new_caps = Capsule.objects.filter(timestamp__gte=last24h).count()
        new_users = User.objects.filter(date_joined__gte=last24h).count()
        new_props = Proposal.objects.filter(timestamp__gte=last24h).count()
        body = (
            f'En las últimas 24 horas el ecosistema ha sumado '
            f'{new_caps} cápsulas, {new_users} pioneros y {new_props} propuestas. '
            f'El total acumulado asciende a {Capsule.objects.count()} cápsulas '
            f'preservadas para la posteridad.')
        self._insight(agent, 'summary',
                      title=f'Resumen del día · {today:%d %b %Y}',
                      body=body, impact=2, related_url='/founder/',
                      params={'caps': new_caps, 'users': new_users, 'props': new_props})
        # Guardar también como SettingsConfig para founder_panel
        SettingsConfig.objects.update_or_create(
            key='daily_summary',
            defaults={'parameters': {
                'date': str(today),
                'capsules_24h': new_caps,
                'users_24h': new_users,
                'proposals_24h': new_props,
                'total_capsules': Capsule.objects.count(),
            }})
        return 1

    def agent_recommender(self, agent):
        """Crea feed personalizado usando UserPreference (intereses, dimensión, era, voz)."""
        from kudos_app.models import UserPreference
        recent_users = User.objects.filter(is_active=True).order_by('-date_joined')[:50]
        actions = 0
        for u in recent_users:
            FeedItem.objects.filter(user=u, created__lt=timezone.now() - timedelta(days=7)).delete()
            existing = FeedItem.objects.filter(
                user=u, created__date=timezone.now().date()).count()
            if existing >= 8:
                continue
            # Defensivo: la BD puede no tener la columna capsule en FeedItem si una
            # migración antigua no se aplicó. Usamos try/except y fallback vacío.
            try:
                seen_ids = list(FeedItem.objects.filter(user=u).values_list('capsule', flat=True))
                seen = set(int(x) for x in seen_ids if x)
            except Exception:
                seen = set()
            qs = Capsule.objects.filter(privacy='publico').exclude(usuario=u)
            if seen:
                qs = qs.exclude(id__in=seen)

            pref = UserPreference.objects.filter(user=u).first()
            if pref:
                # Filtrar por intereses (cualquiera coincide)
                if pref.interests:
                    from django.db.models import Q
                    q = Q()
                    for tag in pref.interests:
                        q |= Q(temas__icontains=tag) | Q(ai_themes__icontains=tag)
                    qs = qs.filter(q)
                if pref.preferred_dimension:
                    qs = qs.filter(dimension_layer=pref.preferred_dimension)
                if pref.preferred_era:
                    qs = qs.filter(era=pref.preferred_era)
                if pref.preferred_voice:
                    qs = qs.filter(ai_audio_voice=pref.preferred_voice)

            candidates = qs.order_by('-ai_quality_score', '-likes', '-views')[:12]
            reason = ('🎯 Por tu interés en: ' + ', '.join((pref.interests or [])[:2])
                      if pref and pref.interests else '🔥 En tendencia')
            for c in candidates[: 8 - existing]:
                try:
                    FeedItem.objects.create(
                        user=u, capsule=c, headline=c.display_title[:200],
                        body=(c.ai_summary or c.contenido[:280]),
                        score=0.7 + (c.ai_quality_score or 0) / 20,
                        reason=reason)
                    actions += 1
                except Exception as e:
                    # BD desincronizada: intenta sin capsule (modo degradado)
                    try:
                        FeedItem.objects.create(
                            user=u, headline=c.display_title[:200],
                            score=0.5, reason=reason)
                        actions += 1
                    except Exception:
                        pass
        return actions

    def agent_scheduler(self, agent):
        """Lanza las tareas diarias y limpia notificaciones antiguas."""
        actions = 0
        try:
            call_command('daily_tasks', stdout=open(os.devnull, 'w'))
            actions += 1
            self._record(agent, 'daily_tasks', summary='Tareas diarias lanzadas',
                         level='success')
        except Exception as exc:
            self._record(agent, 'daily_tasks_failed',
                         summary=str(exc), level='warning')
        deleted, _ = Notification.objects.filter(
            read=True,
            timestamp__lt=timezone.now() - timedelta(days=30)).delete()
        if deleted:
            actions += 1
            self._record(agent, 'cleanup_notifications',
                         summary=f'{deleted} notificaciones antiguas borradas',
                         level='info')
        return actions

    def agent_guardian(self, agent):
        """Vigila la vida personal del fundador y emite consejos suaves."""
        founders = User.objects.filter(is_superuser=True)[:3]
        actions = 0
        for f in founders:
            today = timezone.now().date()
            # Diario
            last_journal = JournalEntry.objects.filter(user=f).order_by('-date').first()
            if not last_journal or (today - last_journal.date).days > 3:
                Notification.objects.get_or_create(
                    user=f, type='guardian',
                    message='🌿 Hace días que no escribes en tu diario estoico. '
                            'Cinco minutos hoy mantienen la mente clara.',
                    defaults={'priority': 'media'})
                actions += 1
            # Hábitos
            today_logs = HabitLog.objects.filter(
                habit__user=f, date=today, completed=True).count()
            if today_logs == 0:
                Notification.objects.get_or_create(
                    user=f, type='guardian',
                    message='💪 Aún no has marcado ningún hábito hoy. '
                            'Pequeño paso > gran promesa.',
                    defaults={'priority': 'baja'})
                actions += 1
        if actions:
            self._record(agent, 'guardian_check',
                         summary=f'{actions} consejos enviados al fundador',
                         level='info')
        return actions
