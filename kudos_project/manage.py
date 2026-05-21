#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # Establece el módulo de configuración predeterminado para el proyecto
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kudos_project.settings')

    try:
        # Importa la utilidad de Django para ejecutar comandos
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        # Maneja el caso en que Django no esté instalado o haya un problema con el entorno
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # Ejecuta el comando proporcionado en la línea de comandos
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()