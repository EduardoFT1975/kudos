# kudos_app/management/commands/full_autopilot.py
"""KUDOS · Autopiloto completo (un único comando que gobierna todo).

Combina en un único bucle infinito:
  1. Importación masiva de cápsulas (Wikipedia, datos abiertos)
  2. Multi-agente KUDOS MIND (curador, moderador, analista, narrador, etc.)
  3. Departamentos autónomos (marketing, RRHH, producto, finanzas, legal...)
  4. Multimedia auto (clip + audio + resumen)
  5. Tareas diarias y limpieza

Es la forma RECOMENDADA de tener Kudos vivo sin intervención.

Uso:
  python manage.py full_autopilot
  python manage.py full_autopilot --sleep 600    # 10 min entre macro-ciclos
"""
import os
import signal
import sys
import time

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Autopiloto MAESTRO: importación + IA multi-agente + departamentos + multimedia.'

    def add_arguments(self, parser):
        parser.add_argument('--sleep', type=int, default=300,
                            help='Pausa entre macro-ciclos (def. 300 = 5 min).')
        parser.add_argument('--no-import', action='store_true',
                            help='No ejecutar importación de Wikipedia.')

    def handle(self, *args, **options):
        sleep_sec = options['sleep']

        def _stop(*_):
            self.stdout.write('\n🛑 full_autopilot detenido limpiamente.')
            sys.exit(0)
        import threading
        if threading.current_thread() is threading.main_thread():
            try:
                signal.signal(signal.SIGINT, _stop)
                signal.signal(signal.SIGTERM, _stop)
            except (ValueError, OSError):
                pass

        self.stdout.write(self.style.HTTP_INFO(
            '\n♾  KUDOS FULL AUTOPILOT'
            f'\n    Macro-ciclo cada {sleep_sec}s'
            '\n    Ctrl+C para detener\n'))

        cycle = 0
        while True:
            cycle += 1
            self.stdout.write(self.style.WARNING(
                f'\n══════ MACRO-CICLO {cycle} · {timezone.now():%Y-%m-%d %H:%M:%S} ══════'))

            self._step('1. KUDOS MIND (multi-agente)', 'ai_autopilot', once=True, sleep=10)

            if not options['no_import']:
                self._step('2. Importación de cápsulas', 'continuous_import',
                           cycles=1, sleep=10, per_cycle=15)

            self._step('3. Multimedia auto', 'multimedia_auto', max=80)

            self._step('4. Departamentos autónomos', 'autonomous_ops')

            self._step('5. Tareas diarias', 'daily_tasks')

            self.stdout.write(f'\n💤 Pausa {sleep_sec}s antes del siguiente macro-ciclo.')
            time.sleep(sleep_sec)

    def _step(self, label, command, **kwargs):
        self.stdout.write(self.style.SUCCESS(f'\n→ {label}'))
        try:
            call_command(command, **kwargs)
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f'  ⚠ {command}: {exc}'))
