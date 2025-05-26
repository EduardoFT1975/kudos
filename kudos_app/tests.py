from django.test import TestCase
from kudos_app.models import Capsule, User

class CapsuleTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(uid='testuser', alias='Test', password='testpass')
        Capsule.objects.create(uid='capsule1', usuario=self.user, contenido='Test capsule')

    def test_capsule_creation(self):
        capsule = Capsule.objects.get(uid='capsule1')
        self.assertEqual(capsule.contenido, 'Test capsule')