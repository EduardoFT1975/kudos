# kudos_app/views/test_map.py

import unittest
from django.test import TestCase
from django.contrib.gis.geos import Point
from kudos_app.models import User, Capsule
from datetime import datetime
from .map import render_map, prepare_map_data

class MapTests(TestCase):
    def setUp(self):
        # Crear un usuario simulado
        self.user = User.objects.create(
            alias="test_user",
            ubicacion=Point(-3.7038, 40.4168)
        )
        # Crear una cápsula de prueba
        self.capsule = Capsule.objects.create(
            usuario=self.user,
            contenido="Cápsula de prueba",
            fecha=datetime(2020, 1, 1),
            modo="publico",
            privacy="publico",
            ubicacion=Point(-3.7038, 40.4168),
            parameters={
                "type": "video",
                "merits": 5,
                "weather": {"weather": "Soleado"},
                "themes": ["Historia Local"]
            }
        )

    def test_prepare_map_data(self):
        capsules = Capsule.objects.all()
        time_period = "Todas"
        capsules_data, streets, historical_markers = prepare_map_data(
            capsules, self.user, clip_generation_enabled=True, time_period=time_period
        )
        self.assertEqual(len(capsules_data), 1)
        self.assertEqual(capsules_data[0]["type_icon"], "triangle")  # Video
        self.assertEqual(capsules_data[0]["time_color"], "#00008B")  # Pasado
        self.assertEqual(capsules_data[0]["size"], 20)  # 5 méritos

    def test_render_map(self):
        capsules_data = [{
            "lat": 40.4168,
            "lon": -3.7038,
            "popup": "<b>Test</b>",
            "type_icon": "triangle",
            "time_color": "#00008B",
            "size": 20,
            "merits": 5,
            "capsule_id": "test",
            "price": 0,
            "content": "Test content",
            "images": [],
            "clip_url": "",
            "eco_url": "https://kudos-clips.example.com/eco_test.mp4",
            "share_urls": {
                "whatsapp": "https://api.whatsapp.com/send?text=¡Mira esta cápsula en Kudos!",
                "facebook": "https://www.facebook.com/sharer/sharer.php?u=",
                "instagram": "https://www.instagram.com/?url=",
                "tiktok": "https://www.tiktok.com/share?url=",
                "youtube": "https://www.youtube.com/share?url="
            },
            "classification": {"1D": "video", "2D": "Madrid", "3D": "2020-01-01", "4D": "5 M"},
            "interests": ["Historia Local"]
        }]
        streets = []
        historical_markers = []
        
        map_html = render_map(capsules_data, streets, historical_markers)
        self.assertIn("L.map('map')", map_html)
        self.assertIn("navigator.geolocation", map_html)  # Verificar que se usa la API de geolocalización
        self.assertIn("user-location", map_html)  # Verificar el marcador del usuario
        self.assertIn("https://kudos-clips.example.com/eco_test.mp4", map_html)  # Verificar eco_url

if __name__ == '__main__':
    unittest.main()