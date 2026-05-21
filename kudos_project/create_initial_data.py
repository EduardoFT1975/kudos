# create_initial_data.py
import os
import sys
import django

# Añadir el directorio raíz del proyecto al sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '.'))
sys.path.append(project_root)

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kudos_project.settings')
django.setup()

# Importar modelos y utilidades después de inicializar Django
from django.utils import timezone
from django.contrib.gis.geos import Point
from kudos_app.models import User, Capsule, Transaction
import pytz
from datetime import datetime

# Eliminar cápsulas y transacciones iniciales existentes
Capsule.objects.filter(uid__in=["initial_capsule_1", "initial_capsule_2"]).delete()
Transaction.objects.filter(uid__in=["initial_transaction_1", "initial_transaction_2"]).delete()

# Crear datos iniciales
try:
    user = User.objects.get(uid='user1')
except User.DoesNotExist:
    print("Error: Usuario 'user1' no encontrado. Asegúrate de que el usuario exista.")
    sys.exit(1)

# Crear cápsulas iniciales
Capsule.objects.create(
    uid="initial_capsule_1",
    usuario=user,
    contenido="Cápsula inicial",
    ubicacion=Point(12.4964, 41.9028),
    modo='publico',
    fecha=timezone.now().date(),
    timestamp=pytz.UTC.localize(datetime(2025, 4, 25, 16, 4, 13, 909407)),
    privacy='publico',
    time_scale='dia',
    price=0.0,
    temas=["Inicial"]
)
Capsule.objects.create(
    uid="initial_capsule_2",
    usuario=user,
    contenido="Segunda cápsula inicial",
    ubicacion=Point(12.5064, 41.9128),
    modo='publico',
    fecha=timezone.now().date(),
    timestamp=pytz.UTC.localize(datetime(2025, 4, 25, 16, 6, 23, 962799)),
    privacy='publico',
    time_scale='dia',
    price=0.0,
    temas=["Inicial"]
)

# Crear transacciones iniciales
Transaction.objects.create(
    uid="initial_transaction_1",
    user=user,  # Cambiado de 'usuario' a 'user'
    content_type="capsule",
    content_id="initial_capsule_1",
    amount=0.0,
    commission=0.0,
    timestamp=pytz.UTC.localize(datetime(2025, 4, 25, 16, 4, 13, 955602))
)
Transaction.objects.create(
    uid="initial_transaction_2",
    user=user,  # Cambiado de 'usuario' a 'user'
    content_type="capsule",
    content_id="initial_capsule_2",
    amount=0.0,
    commission=0.0,
    timestamp=pytz.UTC.localize(datetime(2025, 4, 25, 16, 6, 23, 976233))
)

print("Datos iniciales creados correctamente.")