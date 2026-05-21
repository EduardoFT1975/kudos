# kudos_app/wisdom_search.py
from kudos_app.models import Capsule
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point

def search_wisdom_capsules(themes=None, location=None, date=None, privacy='publico'):
    """
    Busca cápsulas multidimensionalmente basadas en temas, ubicación y fecha.
    """
    capsules = Capsule.objects.filter(privacy=privacy)
    if themes:
        capsules = capsules.filter(themes__overlap=themes)
    if location:
        point = Point(location[1], location[0])  # (longitud, latitud)
        capsules = capsules.annotate(distance=Distance('ubicacion', point)).filter(distance__lte=100000)  # 100 km
    if date:
        capsules = capsules.filter(fecha=date)
    return capsules[:10]  # Limitar a 10 resultados