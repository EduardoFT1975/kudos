# kudos_project/__init__.py

"""
Inicialización del paquete kudos_project.
Este archivo marca kudos_project como un módulo Python y define configuraciones globales
para el sistema multidimensional 1D~5D de Kudos.
"""

# Versión del proyecto
__version__ = "1.0.0"

# Autor y propósito
__author__ = "Fundador de Kudos"
__purpose__ = "Convertir Kudos en el mayor hito de la historia de la humanidad mediante una plataforma multidimensional."

# Constantes globales para las dimensiones 1D~5D
DIMENSIONS = {
    "1D": "Contenido",        # Texto, audio, video, etc.
    "2D": "Geolocalización",  # Latitud y longitud
    "3D": "Tiempo",          # Fecha y hora
    "4D": "Temas",           # Categorías o tópicos
    "5D": "Climatología"     # Datos climáticos
}

# Roles de usuario permitidos
USER_ROLES = [
    "user",         # Usuario estándar
    "seller",       # Vendedor en el mercado descentralizado
    "teacher",      # Educador en el sistema educativo
    "prosumidor",   # Productor-consumidor
    "founder"       # Fundador/CEO/Gobernador (tú)
]

# Configuraciones iniciales para blockchain
BLOCKCHAIN_NETWORKS = {
    "Solana": "https://api.mainnet.solana.io",
    "Ethereum": "https://mainnet.infura.io/v3/",
    "IPFS": "http://localhost:5001"
}

# Inicialización opcional (puede expandirse según necesidades)
def initialize_project():
    """
    Función para inicializar configuraciones globales al importar el paquete.
    Actualmente es un placeholder; puede usarse para verificaciones iniciales.
    """
    import os
    from django.conf import settings
    if not settings.configured:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kudos_project.settings')

# Ejecutar inicialización al importar el paquete (opcional)
initialize_project()

# Importar la instancia de Celery desde celery.py
from .celery import app as celery_app

# Hacer que celery_app sea accesible al importar el módulo
__all__ = ('celery_app',)