# kudos_app/views/moderation.py

import random
from kudos_app.models import Capsule

def moderate_capsule(capsule: Capsule) -> bool:
    """Simula la moderación automática de una cápsula con IA."""
    # En una implementación real, usaríamos un modelo de ML para detectar contenido inapropiado
    confidence = random.uniform(0, 1)
    threshold = 0.95  # Umbral de confianza para eliminación automática
    if confidence >= threshold:
        logger.info(f"Cápsula {capsule.uid} eliminada automáticamente (confianza: {confidence})")
        capsule.delete()
        return False
    return True

def moderate_all_capsules():
    """Modera todas las cápsulas existentes."""
    capsules = Capsule.objects.all()
    for capsule in capsules:
        moderate_capsule(capsule)
    logger.info(f"Moderación completada. Total cápsulas revisadas: {capsules.count()}")