# kudos_app/apps.py

"""
App configuration for kudos_app.
Defines metadata and initialization for the Kudos application.
"""

from django.apps import AppConfig


class KudosAppConfig(AppConfig):
    # Nombre de la aplicación (usado internamente por Django)
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'kudos_app'
    verbose_name = "Kudos Multidimensional App"

    # Metadatos adicionales específicos de Kudos
    version = "1.0.0"
    description = "Aplicación principal para el sistema multidimensional 1D~5D de Kudos, que empodera a los usuarios para documentar, compartir y vivir experiencias multidimensionales."
    author = "Fundador de Kudos"

    def ready(self):
        """
        Método ejecutado cuando la aplicación está lista.
        Puede usarse para inicializaciones específicas de Kudos.
        """
        from django.conf import settings
        import os

        # Verificar configuraciones críticas en modo no DEBUG
        if not settings.DEBUG:
            required_settings = [
                ('OPENAI_API_KEY', "Required for AI features like stoic mode."),
                ('BLOCKCHAIN_NETWORK', "Required for decentralized features."),
            ]
            for setting, message in required_settings:
                if not getattr(settings, setting, None):
                    raise ValueError(f"{setting} is not set in settings.py. {message}")

        # Crear directorio de logs si no existe
        log_dir = os.path.join(settings.BASE_DIR, 'logs')
        if not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)