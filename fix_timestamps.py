# fix_timestamps.py
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
from kudos_app.models import Capsule, Transaction
import pytz

# Actualizar timestamps de Capsule
capsules = Capsule.objects.all()
for capsule in capsules:
    if capsule.timestamp and not capsule.timestamp.tzinfo:
        capsule.timestamp = pytz.UTC.localize(capsule.timestamp)
        capsule.save()

# Actualizar timestamps de Transaction
transactions = Transaction.objects.all()
for transaction in transactions:
    if transaction.timestamp and not transaction.timestamp.tzinfo:
        transaction.timestamp = pytz.UTC.localize(transaction.timestamp)
        transaction.save()

print("Timestamps actualizados correctamente.")