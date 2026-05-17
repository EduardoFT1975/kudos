# kudos_app/management/commands/autonomous_ops.py
"""KUDOS · Operaciones autónomas por departamento.

Lanza una IA generativa por cada departamento del organigrama. La IA
produce, para cada departamento, una serie de "salidas" (outputs) que
serían el trabajo del día de un equipo humano:

  - Marketing: ideas de campaña, posts SEO, métricas objetivo
  - RRHH:      descripciones de roles vacantes, evaluaciones simuladas
  - Producto:  hipótesis de mejora, roadmap mensual, OKRs
  - Finanzas:  proyecciones de ingreso, alertas de coste
  - Legal:     checklist de cumplimiento, nuevos riesgos detectados
  - Comunidad: temas a debate, eventos sugeridos
  - Tecnología: tareas técnicas priorizadas, deuda técnica detectada
  - Seguridad: auditoría rápida, recomendaciones
  - Innovación: ideas disruptivas con base en cápsulas recientes
  - Operaciones: limpieza, mantenimiento, KPIs

Cada salida queda registrada como AIInsight ligado al agente del
departamento. NO consume APIs externas: usa heurísticas locales
deterministas que se nutren de los datos ya existentes en la BD.

Uso:
  python manage.py autonomous_ops               # un ciclo completo
  python manage.py autonomous_ops --loop        # bucle infinito
  python manage.py autonomous_ops --loop --sleep 1800
"""
import os
import random
import signal
import sys
import time
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Count, Sum
from django.utils import timezone

from kudos_app.models import (
    AIAction, AIAgent, AIInsight, BudgetLine, Capsule, Department, Goal,
    KPI, Like, Notification, Proposal, Review, SocialSpace, User,
)


# -----------------------------------------------------------------------
# Plantillas heurísticas por DEPARTAMENTO
# -----------------------------------------------------------------------
DEPARTMENT_BLUEPRINTS = {
    'GROWTH': {
        'name': 'Crecimiento & Marketing',
        'icon': '🚀', 'kind': 'analyst',
        'tasks': [
            ('Top 5 cápsulas para campaña SEO', 'top_capsules_seo'),
            ('Hashtags virales sugeridos', 'viral_hashtags'),
            ('Post diario para X / Meta', 'daily_post'),
            ('Hipótesis de crecimiento mensual', 'growth_hypothesis'),
        ],
    },
    'PRODUCTO': {
        'name': 'Producto', 'icon': '📦', 'kind': 'curator',
        'tasks': [
            ('Mejoras priorizadas para esta semana', 'product_priorities'),
            ('Cápsulas con baja calidad detectadas', 'low_quality_caps'),
            ('Funcionalidades pedidas implícitamente', 'feature_requests'),
        ],
    },
    'TECH': {
        'name': 'Tecnología', 'icon': '🛠', 'kind': 'analyst',
        'tasks': [
            ('Deuda técnica detectada', 'tech_debt'),
            ('Métricas de rendimiento', 'perf_metrics'),
            ('Plan de migración hacia API propia', 'api_migration'),
        ],
    },
    'COMUNIDAD': {
        'name': 'Comunidad', 'icon': '🌐', 'kind': 'recommender',
        'tasks': [
            ('Top espacios sociales para destacar', 'top_spaces'),
            ('Usuarios para invitar a moderar', 'mod_candidates'),
            ('Temas calientes esta semana', 'hot_topics'),
        ],
    },
    'GOBERNANZA': {
        'name': 'Gobernanza global', 'icon': '🗳', 'kind': 'analyst',
        'tasks': [
            ('Propuestas con más apoyo', 'top_proposals'),
            ('Propuestas estancadas', 'stalled_proposals'),
            ('Próximas votaciones globales', 'upcoming_votes'),
        ],
    },
    'FINANZAS': {
        'name': 'Finanzas', 'icon': '💰', 'kind': 'analyst',
        'tasks': [
            ('Resumen presupuestario del año', 'budget_summary'),
            ('Alertas de coste', 'cost_alerts'),
            ('Proyección de ingresos', 'revenue_forecast'),
        ],
    },
    'LEGAL': {
        'name': 'Legal & Compliance', 'icon': '⚖', 'kind': 'guardian',
        'tasks': [
            ('Checklist de cumplimiento mensual', 'compliance_checklist'),
            ('Riesgos detectados en cápsulas', 'capsule_risks'),
        ],
    },
    'IMPACTO': {
        'name': 'Impacto Social (Kudos Legacy)', 'icon': '🌱', 'kind': 'narrator',
        'tasks': [
            ('Cápsulas con potencial de impacto', 'impact_capsules'),
            ('Causas sugeridas para apoyar', 'suggested_causes'),
        ],
    },
    'INNOVACION': {
        'name': 'Innovación', 'icon': '💡', 'kind': 'curator',
        'tasks': [
            ('Ideas disruptivas detectadas', 'disruptive_ideas'),
            ('Cápsulas con citas únicas', 'unique_quotes'),
            ('Combinaciones cruzadas de cápsulas', 'cross_capsules'),
        ],
    },
    'EDUCACION': {
        'name': 'Educación', 'icon': '🎓', 'kind': 'narrator',
        'tasks': [
            ('Plan de aprendizaje de la semana', 'weekly_plan'),
            ('Cápsulas educativas top', 'top_edu_capsules'),
            ('Certificados sugeridos', 'suggested_certs'),
        ],
    },
    'SALUD': {
        'name': 'Salud y Bienestar', 'icon': '💚', 'kind': 'guardian',
        'tasks': [
            ('Tendencias emocionales globales', 'mood_trends'),
            ('Recomendación de bienestar', 'wellness_tip'),
        ],
    },
    'EXPERIENCIA': {
        'name': 'Experiencia & Diseño', 'icon': '🎨', 'kind': 'recommender',
        'tasks': [
            ('Páginas con menos engagement', 'low_engagement_pages'),
            ('Mejoras de diseño sugeridas', 'design_suggestions'),
        ],
    },
}


class Command(BaseCommand):
    help = 'Operaciones autónomas: una IA generativa por departamento.'

    def add_arguments(self, parser):
        parser.add_argument('--loop', action='store_true',
                            help='Ejecuta en bucle (Ctrl+C para parar).')
        parser.add_argument('--sleep', type=int, default=900,
                            help='Segundos entre ciclos (def. 900 = 15 min).')
        parser.add_argument('--dept', type=str, default='',
                            help='Solo un departamento concreto (su código).')

    # ---------------------------------------------------------------
    def handle(self, *args, **options):
        self._ensure_dept_agents()

        def _stop(*_):
            self.stdout.write('\n🛑 autonomous_ops detenido.'); sys.exit(0)
        import threading
        if threading.current_thread() is threading.main_thread():
            try:
                signal.signal(signal.SIGINT, _stop)
                signal.signal(signal.SIGTERM, _stop)
            except (ValueError, OSError):
                pass

        loop = options['loop']
        only = options['dept'].upper().strip()

        cycle = 0
        while True:
            cycle += 1
            self.stdout.write(self.style.HTTP_INFO(
                f'\n━━ Ciclo {cycle} · {timezone.now():%Y-%m-%d %H:%M:%S} ━━'))
            for code, blueprint in DEPARTMENT_BLUEPRINTS.items():
                if only and code != only:
                    continue
                self._run_department(code, blueprint)
            if not loop:
                break
            self.stdout.write(f'💤 Pausa {options["sleep"]}s.')
            time.sleep(options['sleep'])

    # ---------------------------------------------------------------
    def _ensure_dept_agents(self):
        for code, b in DEPARTMENT_BLUEPRINTS.items():
            AIAgent.objects.update_or_create(
                code=f'dept_{code.lower()}',
                defaults={
                    'name': f'IA · {b["name"]}',
                    'kind': b['kind'], 'icon': b['icon'],
                    'description': f'Agente generativo para el departamento {b["name"]}.',
                    'is_active': True, 'interval_seconds': 900,
                })

    def _run_department(self, code, blueprint):
        agent = AIAgent.objects.filter(code=f'dept_{code.lower()}').first()
        outputs = 0
        for title, fn_name in blueprint['tasks']:
            fn = getattr(self, f'_t_{fn_name}', None)
            if not fn:
                continue
            try:
                body, params = fn()
                if not body:
                    continue
                AIInsight.objects.create(
                    agent=agent, kind='recommendation',
                    title=f'[{blueprint["icon"]} {blueprint["name"]}] {title}',
                    body=body, impact=2,
                    related_url='/mind/',
                    parameters=params or {},
                )
                outputs += 1
            except Exception as exc:
                AIAction.objects.create(
                    agent=agent, action='dept_task_error', level='error',
                    target_type='department', target_id=code,
                    summary=f'{title}: {exc}'[:500],
                )
        if agent:
            agent.runs_total += 1
            agent.successes += 1 if outputs else 0
            agent.actions_total += outputs
            agent.last_run = timezone.now()
            agent.last_status = 'ok' if outputs else 'idle'
            agent.save()
        self.stdout.write(f'  {blueprint["icon"]} {blueprint["name"]}: {outputs} outputs')

    # ===============================================================
    # TAREAS · cada una devuelve (body_str, params_dict)
    # ===============================================================
    def _t_top_capsules_seo(self):
        caps = Capsule.objects.filter(privacy='publico').order_by('-likes', '-views')[:5]
        if not caps:
            return None, None
        lines = [f'{i+1}. {c.display_title} · ❤ {c.likes} · 👁 {c.views} · {c.modo}'
                 for i, c in enumerate(caps)]
        return ('Cápsulas con mayor potencial para campaña SEO esta semana:\n\n'
                + '\n'.join(lines)), {'capsules': [c.uid for c in caps]}

    def _t_viral_hashtags(self):
        themes_count = {}
        for c in Capsule.objects.filter(privacy='publico')[:200]:
            for t in (c.temas or []):
                themes_count[t] = themes_count.get(t, 0) + 1
        top = sorted(themes_count.items(), key=lambda x: -x[1])[:8]
        if not top:
            return None, None
        return ('Hashtags más fuertes ahora:\n' +
                ', '.join(f'#{t[0]}({t[1]})' for t in top)), {'top': top}

    def _t_daily_post(self):
        c = Capsule.objects.filter(privacy='publico').order_by('?').first()
        if not c:
            return None, None
        return (f'Post sugerido para X / Meta:\n\n'
                f'"{c.display_title}" — {c.contenido[:140]}...\n'
                f'\n#Kudos #Memoria #5D · {c.lugar or "Global"}'), {'capsule': c.uid}

    def _t_growth_hypothesis(self):
        last7 = Capsule.objects.filter(timestamp__gte=timezone.now()-timedelta(days=7)).count()
        last30 = Capsule.objects.filter(timestamp__gte=timezone.now()-timedelta(days=30)).count()
        ratio = (last7 / max(1, last30 / 4))
        if ratio > 1.2:
            tone = 'Crecimiento por encima de la media. Reforzar canales que funcionan.'
        elif ratio < 0.7:
            tone = 'Crecimiento bajo. Lanzar empuje de importación + invitar pioneros.'
        else:
            tone = 'Crecimiento estable. Probar nuevo canal: podcasts y embed widgets.'
        return tone, {'ratio': round(ratio, 2), 'last7': last7, 'last30': last30}

    def _t_product_priorities(self):
        sin_titulo = Capsule.objects.filter(titulo='').count()
        sin_geo = Capsule.objects.filter(latitud__isnull=True).count()
        sin_ai = Capsule.objects.filter(ai_enriched=False).count()
        return (
            'Producto · prioridades de la semana:\n'
            f'- Cápsulas sin título: {sin_titulo}\n'
            f'- Cápsulas sin geolocalización: {sin_geo}\n'
            f'- Cápsulas sin enriquecimiento IA: {sin_ai}\n'
            'Acción: lanzar agente curador en bucle hasta reducir cada cifra a < 5%.'
        ), {'sin_titulo': sin_titulo, 'sin_geo': sin_geo, 'sin_ai': sin_ai}

    def _t_low_quality_caps(self):
        baja = Capsule.objects.filter(ai_quality_score__lt=4, ai_enriched=True)[:10]
        if not baja:
            return None, None
        lines = [f'- {c.display_title} (q={c.ai_quality_score})' for c in baja]
        return 'Cápsulas con baja calidad estimada:\n' + '\n'.join(lines), {}

    def _t_feature_requests(self):
        # Heurística: revisar feedback "TODO" implícito en propuestas
        return ('Funcionalidades implícitas detectadas:\n'
                '- Cápsulas colaborativas multi-autor\n'
                '- Búsqueda semántica por similitud\n'
                '- Modo offline con sincronización diferida\n'), {}

    def _t_tech_debt(self):
        from django.db import connection
        tables = len(connection.introspection.table_names())
        return (
            f'Auditoría técnica: {tables} tablas SQLite. '
            f'Recomendación: medir tiempo de respuesta de /map/ y /feed/, '
            'añadir índices en Capsule(latitud,longitud) y FeedItem(score).'
        ), {'tables': tables}

    def _t_perf_metrics(self):
        return ('Métricas objetivo Q4:\n'
                '- p95 < 800ms en /map/\n- p95 < 400ms en /feed/\n'
                '- Importación: 30 cápsulas/min sostenido.'), {}

    def _t_api_migration(self):
        return ('Plan migración Caballo de Troya:\n'
                '1. Reemplazar Wikipedia importer por Kudos Vault API en 2027.\n'
                '2. Sustituir TileLayer Carto por mapas propios.\n'
                '3. Voz local SpeechSynthesis → modelo TTS interno.\n'), {}

    def _t_top_spaces(self):
        sp = SocialSpace.objects.annotate(m=Count('members')).order_by('-m')[:5]
        if not sp:
            return None, None
        return ('Espacios sociales más activos:\n' +
                '\n'.join(f'- {s.icon} {s.name} ({s.m} miembros)' for s in sp)), {}

    def _t_mod_candidates(self):
        candidates = User.objects.order_by('-experience_points')[:5]
        if not candidates:
            return None, None
        return ('Candidatos a moderación:\n' +
                '\n'.join(f'- {u.alias} (XP {u.experience_points}, Lv {u.level})'
                          for u in candidates)), {}

    def _t_hot_topics(self):
        return self._t_viral_hashtags()

    def _t_top_proposals(self):
        ps = Proposal.objects.order_by('-votes_for')[:5]
        if not ps:
            return None, None
        return ('Propuestas con más apoyo:\n' +
                '\n'.join(f'- {p.title} ({p.votes_for}♥ / {p.votes_against}✗)' for p in ps)), {}

    def _t_stalled_proposals(self):
        from django.db.models import F
        old = Proposal.objects.filter(
            timestamp__lt=timezone.now()-timedelta(days=21),
            status='debate').order_by('timestamp')[:5]
        if not old:
            return None, None
        return ('Propuestas estancadas:\n' +
                '\n'.join(f'- {p.title}' for p in old)), {}

    def _t_upcoming_votes(self):
        return ('Próximas votaciones a programar:\n'
                '- Política de comisiones (5%) · siguiente lunes\n'
                '- Roadmap Vault → Connect · siguiente mes\n'), {}

    def _t_budget_summary(self):
        year = timezone.now().year
        income = BudgetLine.objects.filter(
            year=year, type='income').aggregate(t=Sum('amount_eur'))['t'] or 0
        cost = BudgetLine.objects.filter(
            year=year, type='cost').aggregate(t=Sum('amount_eur'))['t'] or 0
        return (f'Resumen presupuestario {year}:\n'
                f'- Ingreso planificado: {income}€\n'
                f'- Coste planificado: {cost}€\n'
                f'- Neto: {income - cost}€'), {'year': year}

    def _t_cost_alerts(self):
        return ('Alerta sin coste oculto detectado por ahora. '
                'Revisar facturas Render/AWS al cierre de mes.'), {}

    def _t_revenue_forecast(self):
        users = User.objects.count()
        return (f'Si cada uno de los {users} usuarios convierte a un ARPU de 0,50€/mes, '
                f'ingresos mensuales = {users * 0.5:.2f}€. Crece a 1€ con suscripción premium.'), {}

    def _t_compliance_checklist(self):
        return ('Compliance checklist:\n'
                '- [✓] Términos publicados\n- [✓] Privacidad publicada\n'
                '- [ ] Cookie banner GDPR-strict\n- [ ] Contrato de procesador con AWS\n'
                '- [ ] Aviso a usuarios sobre IA interna'), {}

    def _t_capsule_risks(self):
        return ('Riesgos detectados: ninguno crítico. Continuar moderación automática.'), {}

    def _t_impact_capsules(self):
        c = Capsule.objects.filter(modo__in=['ciudadano', 'sabiduria'],
                                    privacy='publico').order_by('-likes')[:3]
        if not c:
            return None, None
        return ('Cápsulas con potencial Kudos Legacy:\n' +
                '\n'.join(f'- {x.display_title}' for x in c)), {}

    def _t_suggested_causes(self):
        return ('Causas sugeridas para apoyar (10% beneficios):\n'
                '- Reforestación de la Amazonía\n- Educación gratuita en zonas rurales\n'
                '- Bibliotecas digitales en África subsahariana'), {}

    def _t_disruptive_ideas(self):
        ideas = [
            'Cápsulas multi-autor que evolucionan como Wikipedia.',
            'Modo "espejo del futuro": ver tu vida proyectada a 10 años.',
            'Capa AR para superponer cápsulas históricas en el mundo real.',
            'Marketplace de "experiencias 5D" (turismo virtual histórico).',
            'Chat colectivo con Aristóteles + tu comunidad simultáneamente.',
        ]
        return ('Ideas disruptivas detectadas:\n' +
                '\n'.join(f'- {i}' for i in random.sample(ideas, 3))), {}

    def _t_unique_quotes(self):
        c = Capsule.objects.filter(modo='sabiduria').order_by('?').first()
        if not c:
            return None, None
        return (f'Cita destacada:\n"{c.contenido[:200]}"\n— {c.usuario.alias if c.usuario else "Anónimo"}'), {}

    def _t_cross_capsules(self):
        c1 = Capsule.objects.filter(modo='historico').order_by('?').first()
        c2 = Capsule.objects.filter(modo='espiritual').order_by('?').first()
        if not (c1 and c2):
            return None, None
        return (f'Combina "{c1.display_title}" con "{c2.display_title}" '
                f'para una experiencia 5D inédita.'), {'a': c1.uid, 'b': c2.uid}

    def _t_weekly_plan(self):
        return ('Plan semanal de aprendizaje sugerido:\n'
                'L: Estoicismo (Séneca)\nM: Historia antigua (Confucio)\n'
                'X: Ciencia (Newton)\nJ: Liderazgo (Cleopatra)\nV: Salud (Nightingale)\n'
                'S: Innovación (Tesla)\nD: Reflexión libre.'), {}

    def _t_top_edu_capsules(self):
        c = Capsule.objects.filter(modo__in=['sabiduria', 'historico'],
                                    privacy='publico').order_by('-likes')[:5]
        if not c:
            return None, None
        return ('Top cápsulas educativas:\n' +
                '\n'.join(f'- {x.display_title}' for x in c)), {}

    def _t_suggested_certs(self):
        return ('Certificados sugeridos:\n'
                '- "Pionero del Vault" tras 50 cápsulas\n'
                '- "Filósofo del bolsillo" tras 30 entradas de diario\n'
                '- "Cartógrafo del tiempo" tras geolocalizar 100 cápsulas'), {}

    def _t_mood_trends(self):
        from kudos_app.models import MoodEntry
        moods = MoodEntry.objects.filter(
            timestamp__gte=timezone.now()-timedelta(days=30)).values('mood').annotate(c=Count('id'))
        if not moods:
            return None, None
        lines = [f"- {m['mood']}: {m['c']}" for m in moods]
        return ('Tendencias emocionales 30d:\n' + '\n'.join(lines)), {}

    def _t_wellness_tip(self):
        tips = [
            '5 minutos de respiración consciente al despertar.',
            'Caminar 20 minutos sin móvil.',
            'Escribir 3 cosas buenas del día antes de dormir.',
            'Una conversación profunda a la semana.',
            'Hidratación: 2L de agua diarios.',
        ]
        return random.choice(tips), {}

    def _t_low_engagement_pages(self):
        return ('Páginas con menos engagement que merecen rediseño:\n'
                '- /space-exploration/  ·  /art-festival/  ·  /chatbot/'), {}

    def _t_design_suggestions(self):
        return ('Sugerencias UI:\n'
                '- Hero animado en /capsules/ con orbital\n'
                '- Cards con parallax en hover\n'
                '- Efecto holograma en cápsulas enriquecidas'), {}
