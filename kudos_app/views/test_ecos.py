# kudos_app/views/test_ecos.py

import unittest
from django.test import TestCase
from .ecos import generate_eco

class EcosTests(TestCase):
    def test_generate_eco(self):
        capsule = {
            "capsule_id": "test123",
            "classification": {"1D": "video"},
            "eco_url": None
        }
        eco_url = generate_eco(capsule, clip_duration=15)
        self.assertEqual(eco_url, "https://kudos-clips.example.com/eco_test123.mp4")

        # Probar con una cápsula que no es video/audio
        capsule_invalid = {
            "capsule_id": "test456",
            "classification": {"1D": "texto"},
            "eco_url": None
        }
        eco_url = generate_eco(capsule_invalid)
        self.assertEqual(eco_url, "")

if __name__ == '__main__':
    unittest.main()