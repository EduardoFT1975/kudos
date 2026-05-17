# kudos_app/management/commands/continuous_import.py
"""
Comando: python manage.py continuous_import

MODO CONTINUO. Importa cápsulas en bucle indefinido. Para detenerlo,
pulsa Ctrl+C en la terminal.

Cada ciclo (~1-2 min):
  1. Importa una región rotativa de Wikipedia (~30 cápsulas)
  2. Espera entre ciclos (configurable)

Uso:
  python manage.py continuous_import                  # Ciclos sin fin
  python manage.py continuous_import --cycles 100     # Sólo 100 ciclos
  python manage.py continuous_import --sleep 30       # 30s entre ciclos
"""

import time
import signal
import sys
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone
from kudos_app.models import Capsule


# Lista de regiones a rotar
ROTATION = ['GLOBAL', 'ESPAÑA', 'EUROPA', 'AMERICA_LATINA', 'ASIA']


class Command(BaseCommand):
    help = 'Importador continuo: ejecuta lotes de Wikipedia en bucle indefinido.'

    def add_arguments(self, parser):
        parser.add_argument('--cycles', type=int, default=0, help='Nº de ciclos (0 = infinito)')
        parser.add_argument('--sleep', type=int, default=60, help='Segundos entre ciclos (def. 60)')
        parser.add_argument('--per-cycle', type=int, default=30, help='Cápsulas por ciclo (def. 30)')

    def handle(self, *args, **options):
        max_cycles = options['cycles']
        sleep_sec = options['sleep']
        per_cycle = options['per_cycle']

        self.stdout.write(self.style.HTTP_INFO(
            f'\n♾  IMPORTADOR CONTINUO ARRANCADO'
            f'\n   Ciclos: {"INFINITO" if not max_cycles else max_cycles}'
            f'\n   Pausa entre ciclos: {sleep_sec}s'
            f'\n   Cápsulas por ciclo: {per_cycle}'
            f'\n   Para detener: Ctrl+C\n'
        ))

        # Capturar Ctrl+C limpiamente
        def graceful_exit(signum, frame):
            self.stdout.write(self.style.SUCCESS('\n\n🛑 Importador continuo detenido manualmente'))
            self.stdout.write(f'   Total cápsulas en BD: {Capsule.objects.count()}')
            sys.exit(0)
        import threading
        if threading.current_thread() is threading.main_thread():
            try:
                signal.signal(signal.SIGINT, graceful_exit)
                signal.signal(signal.SIGTERM, graceful_exit)
            except (ValueError, OSError):
                pass

        cycle = 0
        total_imported = 0

        while True:
            cycle += 1
            if max_cycles and cycle > max_cycles:
                break

            region = ROTATION[(cycle - 1) % len(ROTATION)]
            start_count = Capsule.objects.count()

            self.stdout.write(self.style.WARNING(
                f'\n━━━━━ CICLO {cycle} · región {region} · {timezone.now():%H:%M:%S} ━━━━━'
            ))

            try:
                call_command('import_wikipedia',
                             region=region, max=per_cycle, per_region=10, lang='es',
                             stdout=self.stdout)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error en ciclo: {e}'))

            end_count = Capsule.objects.count()
            new_in_cycle = end_count - start_count
            total_imported += new_in_cycle

            self.stdout.write(self.style.SUCCESS(
                f'  ✓ Ciclo {cycle}: +{new_in_cycle} cápsulas | '
                f'Total acumulado en sesión: +{total_imported} | '
                f'Total en BD: {end_count}'
            ))

            if max_cycles and cycle >= max_cycles:
                break

            self.stdout.write(f'  💤 Pausa {sleep_sec}s antes del próximo ciclo...')
            time.sleep(sleep_sec)

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Importador continuo finalizado · Total importado: {total_imported}'
        ))
