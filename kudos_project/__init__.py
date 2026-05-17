# kudos_project/__init__.py
"""
Paquete principal de Kudos.

En modo simple (SQLite) no se inicializa Celery. Cuando quieras activarlo
en producción, descomenta las dos últimas líneas y crea kudos_project/celery.py
con la config de Celery.
"""

__version__ = "1.0.0"
__author__ = "Fundador de Kudos"

# === Activar Celery sólo si lo necesitas en producción ===
# from .celery import app as celery_app
# __all__ = ('celery_app',)
