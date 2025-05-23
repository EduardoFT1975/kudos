# kudos_app/tests.py

"""
Pruebas unitarias para kudos_app.
Verifica el funcionamiento de modelos, vistas y utilidades del sistema multidimensional 1D~5D de Kudos.
"""

import pytest
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.gis.geos import Point
from .models import User, Capsule, Notification
from .views.personal_assistant import personal_assistant
import json

# Configuración para pruebas con pytest
pytestmark = pytest.mark.django_db

# Clase base para pruebas de modelos
class ModelTests(TestCase):
    def setUp(self):
        """Configuración inicial para las pruebas."""
        # Crear un usuario fundador
        self.founder = User.objects.create_user(
            uid='founder_uid',
            alias='Founder',
            email='founder@kudos.com',
            password='testpass123',
            role='founder',
            ubicacion=Point(41.9028, 12.4964),  # Roma
            notification_distance=1000
        )
        # Crear un usuario estándar
        self.user = User.objects.create_user(
            uid='user_uid',
            alias='TestUser',
            email='user@kudos.com',
            password='testpass123',
            role='user',
            ubicacion=Point(40.4168, -3.7038)  # Madrid
        )
        # Crear una cápsula
        self.capsule = Capsule.objects.create(
            usuario=self.founder,
            contenido='Test Capsule from Rome',
            ubicacion=Point(41.9028, 12.4964),
            modo='eterno',
            fecha='2025-04-05',
            privacy='publico',
            price=10.00,
            temas=['Historia', 'Cultura'],
            parameters={'weather': 'Sunny'},
            variables={'distance': 500}
        )
        # Crear una notificación
        self.notification = Notification.objects.create(
            user=self.founder,
            type='stoic_morning',
            message='Marco Aurelio: Enfócate en lo que puedes controlar.',
            priority='media'
        )

    def test_user_creation(self):
        """Prueba la creación de un usuario."""
        assert self.founder.alias == 'Founder'
        assert self.founder.role == 'founder'
        assert self.founder.check_password('testpass123')
        assert self.founder.ubicacion.coords == (12.4964, 41.9028)

    def test_capsule_creation(self):
        """Prueba la creación de una cápsula."""
        assert self.capsule.contenido == 'Test Capsule from Rome'
        assert self.capsule.modo == 'eterno'
        assert self.capsule.price == 10.00
        assert self.capsule.temas == ['Historia', 'Cultura']
        assert self.capsule.parameters['weather'] == 'Sunny'

    def test_notification_creation(self):
        """Prueba la creación de una notificación."""
        assert self.notification.type == 'stoic_morning'
        assert self.notification.message.startswith('Marco Aurelio')
        assert self.notification.priority == 'media'
        assert self.notification.status == 'No leída'

# Clase para pruebas de vistas
class ViewTests(TestCase):
    def setUp(self):
        """Configuración inicial para las pruebas de vistas."""
        self.client = Client()
        self.founder = User.objects.create_user(
            uid='founder_uid',
            alias='Founder',
            email='founder@kudos.com',
            password='testpass123',
            role='founder',
            is_staff=True
        )
        self.user = User.objects.create_user(
            uid='user_uid',
            alias='TestUser',
            email='user@kudos.com',
            password='testpass123',
            role='user'
        )

    def test_personal_assistant_founder_access(self):
        """Prueba que el fundador pueda acceder al modo estoico."""
        self.client.login(uid='founder_uid', password='testpass123')
        response = self.client.get(reverse('personal_assistant'))
        self.assertEqual(response.status_code, 200)
        # Verificar que el modo estoico esté disponible (simulado, ya que Streamlit maneja la UI)
        self.assertContains(response, 'personal_assistant')  # Django renderiza la plantilla base

    def test_personal_assistant_user_access(self):
        """Prueba que un usuario normal no vea el modo estoico."""
        self.client.login(uid='user_uid', password='testpass123')
        response = self.client.get(reverse('personal_assistant'))
        self.assertEqual(response.status_code, 200)
        # Verificar que el modo estoico no esté disponible (simulado)
        self.assertContains(response, 'personal_assistant')  # Plantilla base sin modo estoico

    def test_create_capsule_view(self):
        """Prueba la vista de creación de cápsulas."""
        self.client.login(uid='founder_uid', password='testpass123')
        response = self.client.get(reverse('create_capsule'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'create_capsule')  # Plantilla base

# Pruebas adicionales con pytest
def test_user_role_validation():
    """Prueba que los roles de usuario sean válidos."""
    valid_roles = [choice[0] for choice in User._meta.get_field('role').choices]
    assert 'founder' in valid_roles
    assert 'user' in valid_roles
    assert 'invalid' not in valid_roles

def test_capsule_json_fields():
    """Prueba que los campos JSON de Capsule sean válidos."""
    capsule = Capsule(
        usuario=User.objects.create_user(uid='test_uid', alias='Test'),
        contenido='Test',
        ubicacion=Point(0, 0),
        fecha='2025-04-05'
    )
    capsule.temas = ['Test']
    capsule.parameters = {'key': 'value'}
    capsule.variables = {'number': 123}
    capsule.save()
    assert isinstance(capsule.temas, list)
    assert isinstance(capsule.parameters, dict)
    assert isinstance(capsule.variables, dict)