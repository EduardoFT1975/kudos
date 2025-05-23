# kudos_project/asgi.py

"""
ASGI config for kudos_project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

# Establece el módulo de configuración predeterminado para el proyecto
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kudos_project.settings')

# Obtiene la aplicación ASGI para manejar solicitudes
application = get_asgi_application()