from django.test import TestCase, Client
from kudos_app.models import Capsule, Place, User


class CapsuleTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(uid='testuser', alias='Test', password='testpass')
        Capsule.objects.create(uid='capsule1', usuario=self.user, contenido='Test capsule')

    def test_capsule_creation(self):
        capsule = Capsule.objects.get(uid='capsule1')
        self.assertEqual(capsule.contenido, 'Test capsule')


# ============================================================
# AXÓN · Phase 0 · Foundation smoke tests
# ============================================================
class HealthEndpointTestCase(TestCase):
    """GET /api/health/ debe devolver JSON estable con shape mínimo."""

    def test_health_returns_200_and_shape(self):
        resp = self.client.get('/api/health/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'].split(';')[0], 'application/json')
        data = resp.json()
        self.assertEqual(data.get('status'), 'ok')
        self.assertEqual(data.get('service'), 'axon')
        self.assertIn('version', data)
        self.assertIn('uptime', data)


class PlaceDetailEndpointTestCase(TestCase):
    """GET /api/places/<slug>/ devuelve Place real o 404 limpio."""

    def setUp(self):
        self.client = Client()
        Place.objects.create(
            slug='rome',
            name='Roma',
            country='Italia',
            latitud=41.9028,
            longitud=12.4964,
            summary='Capital eterna · 28 siglos de capas.',
            era_range_from=-753,
            era_range_to=2026,
            capsule_count=0,
        )

    def test_existing_place_returns_serialized_data(self):
        resp = self.client.get('/api/places/rome/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['slug'], 'rome')
        self.assertEqual(data['name'], 'Roma')
        self.assertEqual(data['country'], 'Italia')
        self.assertAlmostEqual(data['lat'], 41.9028)
        self.assertAlmostEqual(data['lon'], 12.4964)
        self.assertEqual(data['era_range']['from'], -753)
        self.assertEqual(data['era_range']['to'], 2026)
        self.assertEqual(data['capsule_count'], 0)

    def test_missing_place_returns_404(self):
        resp = self.client.get('/api/places/atlantis/')
        self.assertEqual(resp.status_code, 404)


class CapsuleFoundationFieldsTestCase(TestCase):
    """Phase 0 añade campos a Capsule sin romper la creación básica."""

    def test_capsule_with_new_fields(self):
        user = User.objects.create_user(uid='u1', alias='Una', password='x')
        place = Place.objects.create(slug='roma-test', name='Roma Test',
                                     latitud=41.9, longitud=12.5)
        root = Capsule.objects.create(uid='root1', usuario=user, contenido='Root',
                                       place=place, context_layer='OFFICIAL',
                                       importance_score=0.85, verified=True)
        child = Capsule.objects.create(uid='child1', usuario=user, contenido='Child',
                                        parent_capsule=root, root_capsule=root,
                                        context_layer='COMMUNITY', importance_score=0.4)
        self.assertEqual(root.children.count(), 1)
        self.assertEqual(root.descendants.count(), 1)
        self.assertEqual(child.parent_capsule_id, root.id)
        self.assertTrue(root.verified)
        self.assertFalse(child.verified)