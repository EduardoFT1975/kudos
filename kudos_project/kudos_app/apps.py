# kudos_app/apps.py
"""Configuración de la aplicación Kudos."""
from django.apps import AppConfig


class KudosAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'kudos_app'
    verbose_name = "Kudos – Multidimensional"

    def ready(self):
        # Importar señales si las hubiera
        pass
