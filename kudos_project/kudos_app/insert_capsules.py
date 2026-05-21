from django.contrib.gis.geos import Point
from kudos_app.models import User, Capsule, SettingsConfig
from datetime import datetime

try:
    user = User.objects.get_or_create(id=1, alias='admin_user', notification_distance=1000)[0]
except Exception as e:
    print(f'Error al crear usuario: {e}')

SettingsConfig.objects.get_or_create(key='marketplace_settings', parameters={'market_categories': ['Arte', 'Educación', 'Tecnología', 'Servicios']}, variables={'max_price': 1000.0, 'commission_rate': 5.0})

capsule1 = Capsule(
    uid='market_1_20250508',
    usuario=user,
    contenido='Fotografía artística de Roma',
    ubicacion=Point(12.4964, 41.9028),
    modo='comercio',
    fecha=datetime.now().date(),
    privacy='publico',
    time_scale='dia',
    price=10.0,
    temas=['Arte'],
    parameters={'market_entry': True, 'sold': False, 'weather_data': {'temperature': 15.74}},
    variables={'visibility_range': 1000}
)
capsule1.save()

capsule2 = Capsule(
    uid='market_1_20250509',
    usuario=user,
    contenido='Curso de programación',
    ubicacion=Point(-3.7038, 40.4168),
    modo='comercio',
    fecha=datetime.now().date(),
    privacy='publico',
    time_scale='dia',
    price=50.0,
    temas=['Educación'],
    parameters={'market_entry': True, 'sold': False, 'weather_data': {'temperature': 15.74}},
    variables={'visibility_range': 1000}
)
capsule2.save()

print('Cápsulas insertadas exitosamente')
