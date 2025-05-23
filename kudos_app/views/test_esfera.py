# kudos_app/views/test_esfera.py

import unittest
from django.test import TestCase
from .esfera import render_esfera_infinita

class EsferaTests(TestCase):
    def test_render_esfera_infinita_with_capsule(self):
        capsule = {
            "capsule_id": "test123",
            "time_color": "#00008B",
            "merits": 15,
            "content": "Contenido de prueba",
            "images": [],
            "clip_url": "https://example.com/clip.mp4"
        }
        esfera_html = render_esfera_infinita(capsule)
        self.assertIn("renderEsferaInfinita", esfera_html)
        # Verificar que time_color se pasa como argumento a la función
        self.assertIn("renderEsferaInfinita(capsule.capsule_id, capsule.time_color, capsule.merits", esfera_html)
        self.assertIn("0xFFD700", esfera_html)  # Color dorado para méritos > 10
        # Verificar que el script contiene la lógica para insertar el contenido
        self.assertIn("content.substring(0, 100)", esfera_html)  # Verificar que se usa content en el script
        # Verificar que el script contiene la lógica para insertar el enlace al clip
        self.assertIn("clipUrl ? `<a href=\"${clipUrl}\" target=\"_blank\">Ver Clip</a>`", esfera_html)
        self.assertIn("var clipLink", esfera_html)  # Verificar que la variable clipLink está presente

    def test_render_esfera_infinita_without_capsule(self):
        esfera_html = render_esfera_infinita(None)
        self.assertEqual(esfera_html, '<div id="esfera-infinita"></div>')

if __name__ == '__main__':
    unittest.main()