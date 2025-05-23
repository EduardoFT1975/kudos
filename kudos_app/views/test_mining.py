# kudos_app/views/test_mining.py

import unittest
from django.test import TestCase
from .mining import calculate_kmt, mint_kmt, get_kmt_balance

class MiningTests(TestCase):
    def test_calculate_kmt(self):
        capsule = {
            "classification": {
                "1D": "video",
                "2D": "Madrid (40.4168, -3.7038)",
                "3D": "2020-01-01",
                "4D": "5 M"
            },
            "merits": 5
        }
        kmt = calculate_kmt(capsule)
        self.assertEqual(kmt, 170)  # 50 (1D) + 10 (2D) + 10 (3D) + 100 (4D: 5*20)

    def test_mint_kmt(self):
        user_address = "test_address_1"
        amount = 170
        success = mint_kmt(user_address, amount)
        self.assertTrue(success)

    def test_get_kmt_balance(self):
        user_address = "test_address_1"
        balance = get_kmt_balance(user_address)
        self.assertEqual(balance, 1000)  # Saldo simulado

if __name__ == '__main__':
    unittest.main()