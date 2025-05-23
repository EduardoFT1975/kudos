import os
import django
from django.contrib.gis.geos import Point

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kudos_project.settings')
django.setup()

# Prueba de funcionalidad geoespacial
point = Point(-3.7038, 40.4168)
print("Punto creado correctamente:", point)
print("GDAL y GeoDjango están funcionando correctamente.")