# generate_capsules.py
import os
import sys
import django

# Configurar el entorno de Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kudos_project.settings')
django.setup()

from kudos_app.views.create_capsules import create_massive_capsules

if __name__ == "__main__":
    create_massive_capsules(1000)