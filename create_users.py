# create_users.py
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
from kudos_app.models import User

# Crear usuario 'user1'
try:
    user1 = User.objects.create_user(
        uid='user1',
        alias='User1',
        email='user1@example.com',
        password='password123',
        role='user'
    )
    print("Usuario 'user1' creado correctamente.")
except Exception as e:
    print(f"Error al crear usuario 'user1': {e}")

# Crear usuario 'admin-test-uid-2'
try:
    admin_user = User.objects.create_user(
        uid='admin-test-uid-2',
        alias='AdminTest2',
        email='admin2@example.com',
        password='admin123',
        role='founder',
        is_staff=True,
        is_superuser=True
    )
    print("Usuario 'admin-test-uid-2' creado correctamente.")
except Exception as e:
    print(f"Error al crear usuario 'admin-test-uid-2': {e}")