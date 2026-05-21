# run_streamlit.py

import os
import sys
import django
from django.contrib.gis.geos import Point  # Importar Point

print("Iniciando run_streamlit.py...")

# Configurar Django primero
try:
    print("Configurando Django...")
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "kudos_project.settings")
    django.setup()
    print("Django configurado correctamente.")
except Exception as e:
    print(f"Error al configurar Django: {str(e)}")
    raise

# Ahora que Django está configurado, podemos importar módulos que dependen de Django
try:
    print("Importando map_view...")
    from kudos_app.views import map_view
    print("map_view importado correctamente.")
except Exception as e:
    print(f"Error al importar map_view: {str(e)}")
    raise

# Simulación de un usuario (esto debería ser reemplazado por autenticación real)
class MockUser:
    def __init__(self):
        self.is_authenticated = True
        self.id = 1
        self.alias = "test_user"
        self.ubicacion = Point(-3.7038, 40.4168)  # Coordenadas de Madrid

# Crear un usuario simulado
print("Creando usuario simulado...")
mock_user = MockUser()
print(f"Usuario simulado creado: {mock_user.alias}")

# Mostrar la vista del mapa
try:
    print("Llamando a map_view...")
    map_view(mock_user)
    print("map_view ejecutado con éxito.")
except Exception as e:
    print(f"Error al ejecutar map_view: {str(e)}")
    raise

print("run_streamlit.py finalizado.")