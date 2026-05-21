# kudos_app/management/commands/multimedia_auto.py
"""KUDOS · Generación masiva de multimedia para cápsulas.

Procesa todas las cápsulas que aún no tengan enriquecimiento IA y les asigna:
- Resumen automático
- Temas inferidos
- Voz del consejero histórico que mejor encaja
- Semilla determinista para el clip de vídeo (10s, generado en cliente con SVG)
- Score de calidad estimado

NO consume APIs externas. Todo se calcula localmente con heurísticas que
trabajan sobre el texto y la metadata existente.

Uso:
  python manage.py multimedia_auto                # procesa hasta 200 cápsulas
  python manage.py multimedia_auto --max 1000     # procesa hasta 1000
  python manage.py multimedia_auto --loop         # bucle infinito
  python manage.py multimedia_auto --force        # reprocesa todas
"""
import signal
import sys
import time
from django.core.management.base import BaseCommand
from django.utils import timezone

from kudos_app.models import (
    AIAction, AIAgent, AIInsight, Capsule, HistoricalCharacter,
)


VOICE_BY_MODE = {
    'sabiduria': 'seneca',
    'historico': 'confucio',
    'arte': 'cleopatra',
    'espiritual': 'confucio',
    'ciudadano': 'aristoteles',
    'comercial': 'tesla',
    'personal': 'nightingale',
}

KEYWORDS = {
    'historia': ['rey', 'reina', 'imperio', 'guerra', 'siglo', 'antigua', 'medieval'],
    'sabiduria': ['estoico', 'filosofia', 'sabio', 'virtud', 'razon'],
    'arte': ['arte', 'pintura', 'musica', 'poesia', 'belleza', 'escultura'],
    'ciencia': ['ciencia', 'experimento', 'descubrimiento', 'teoria', 'formula'],
    'espiritual': ['espiritu', 'alma', 'meditacion', 'oracion'],
    'naturaleza': ['rio', 'montana', 'bosque', 'mar', 'animal', 'planta'],
    'tecnologia': ['tecnologia', 'maquina', 'computacion', 'red', 'digital'],
}

POS_WORDS = ['feliz', 'amor', 'paz', 'bello', 'esperanza', 'libertad', 'alegria',
             'gracias', 'logro', 'sueño']
NEG_WORDS = ['guerra', 'muerte', 'odio', 'miedo', 'caos', 'tristeza', 'dolor',
             'esclavitud', 'derrota']


class Command(BaseCommand):
    help = 'Genera multimedia (resumen, voz, clip, audio) para todas las cápsulas.'

    def add_arguments(self, parser):
        parser.add_argument('--max', type=int, default=200,
                            help='Máximo de cápsulas a procesar por ciclo.')
        parser.add_argument('--force', action='store_true',
                            help='Reprocesar incluso las ya enriquecidas.')
        parser.add_argument('--loop', action='store_true',
                            help='Ejecutar en bucle.')
        parser.add_argument('--sleep', type=int, default=120,
                            help='Pausa entre ciclos en bucle.')

    def handle(self, *args, **options):
        agent, _ = AIAgent.objects.get_or_create(
            code='multimedia',
            defaults={'name': 'Estudio multimedia', 'kind': 'curator',
                      'icon': '🎞', 'description': 'Genera clip + audio + resumen automáticos.',
                      'is_active': True, 'interval_seconds': 600})

        def _stop(*_):
            self.stdout.write('\n🛑 multimedia_auto detenido.'); sys.exit(0)
        import threading
        if threading.current_thread() is threading.main_thread():
            try:
                signal.signal(signal.SIGINT, _stop)
                signal.signal(signal.SIGTERM, _stop)
            except (ValueError, OSError):
                pass

        cycle = 0
        while True:
            cycle += 1
            self.stdout.write(self.style.HTTP_INFO(
                f'\n━━ multimedia_auto ciclo {cycle} ━━'))
            count = self._enrich_batch(agent,
                                       max_n=options['max'],
                                       force=options['force'])
            self.stdout.write(self.style.SUCCESS(f'  ✓ {count} cápsulas procesadas'))
            if count and not options['force']:
                AIInsight.objects.create(
                    agent=agent, kind='milestone',
                    title=f'+{count} cápsulas con multimedia auto',
                    body=f'Se han generado clip + audio + resumen para {count} cápsulas.',
                    impact=3, related_url='/capsules/')
            if not options['loop']:
                break
            self.stdout.write(f'💤 pausa {options["sleep"]}s')
            time.sleep(options['sleep'])

    # -----------------------------------------------------------------
    def _enrich_batch(self, agent, max_n=200, force=False):
        qs = Capsule.objects.all() if force else Capsule.objects.filter(ai_enriched=False)
        qs = qs[:max_n]
        n = 0
        for c in qs:
            self._enrich_capsule(c, agent)
            n += 1
        agent.runs_total += 1
        agent.successes += 1
        agent.actions_total += n
        agent.last_run = timezone.now()
        agent.last_status = 'ok'
        agent.save()
        return n

    def _enrich_capsule(self, c, agent):
        text = (c.titulo + ' ' + c.contenido).strip().lower()
        # Temas
        themes = []
        for tag, words in KEYWORDS.items():
            if any(w in text for w in words):
                themes.append(tag)
        if not themes:
            themes = [c.modo]
        # Sentimiento
        pos = sum(text.count(w) for w in POS_WORDS)
        neg = sum(text.count(w) for w in NEG_WORDS)
        total = pos + neg
        sentiment = (pos - neg) / total if total else 0
        # Calidad
        q = 4
        if len(c.contenido) > 200: q += 1
        if len(c.contenido) > 800: q += 1
        if c.latitud and c.longitud: q += 1
        if c.image: q += 1
        if c.video or c.audio: q += 1
        if c.titulo: q += 1
        q = min(10, q)
        # Voz
        voice = VOICE_BY_MODE.get(c.modo, 'aristoteles')
        # Resumen
        summary = (c.contenido[:280] + '...') if len(c.contenido) > 280 else c.contenido

        c.ai_summary = summary
        c.ai_themes = themes
        c.ai_quality_score = q
        c.ai_audio_voice = voice
        c.ai_video_seed = f'{c.uid}-{c.modo}-{c.dimension_layer}-{c.era}'
        c.ai_enriched = True
        c.ai_enriched_at = timezone.now()
        if hasattr(c, 'ai_sentiment'):
            try:
                c.ai_sentiment = sentiment
            except Exception:
                pass
        c.save()

        AIAction.objects.create(
            agent=agent, action='multimedia_enrich', level='success',
            target_type='capsule', target_id=c.uid,
            summary=f'q={q} t={themes} voz={voice} sent={sentiment:.2f}',
            parameters={'quality': q, 'themes': themes,
                        'voice': voice, 'sentiment': sentiment},
        )
