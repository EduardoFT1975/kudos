"""
KUDOS HDG · auto-recompute signals loop.

Para correr en background mientras hay tráfico:
  python -m kudos_engine.scripts.recompute_signals_loop

Recalcula PoiSignals (Discovery/Importance/Memory/Emotion/FutureValue) cada N min
para POIs que tengan al menos un save o resonance.
"""
from __future__ import annotations

import argparse
import sys
import time


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval-min", type=int, default=5,
                        help="Minutos entre recompute (default 5)")
    parser.add_argument("--once", action="store_true",
                        help="Solo una vez · no loop")
    args = parser.parse_args()

    # Import dentro de la función para que parse args funcione sin pydantic
    try:
        from kudos_engine.apps.signals import service
    except Exception as e:
        print(f"ERROR · no se pudo importar apps.signals: {e}", file=sys.stderr)
        return 1

    while True:
        t0 = time.time()
        try:
            n = service.recompute_all_active(limit=10000)
            dt = time.time() - t0
            print(f"[signals] recomputed {n} POIs in {dt:.1f}s")
        except Exception as e:
            print(f"[signals] ERROR: {e}", file=sys.stderr)

        if args.once: break
        time.sleep(args.interval_min * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
