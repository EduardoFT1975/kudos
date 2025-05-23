```python
# kudos_app/views/marketplace.py

"""
Vista para el Mercado Global de Kudos.
Permite a los usuarios listar, comprar, y vender cápsulas.
"""

import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib.gis.geos import Point
from kudos_app.models import Capsule, User, Transaction, Notification, SettingsConfig
from kudos_app.utils.blockchain_utils import preserve_capsule
from kudos_app.views.capsule_museum import prepare_map_data

# Configurar logging
logging.basicConfig(filename='/app/marketplace.log', level=logging.INFO)

@login_required
def marketplace_view(request):
    """
    Vista para el Mercado Global, donde los usuarios pueden listar, comprar, y vender cápsulas.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    commerce_config = SettingsConfig.objects.get_or_create(key="commerce_apis_settings")[0]
    commission_rate = commerce_config.variables.get("commission_rate", 5.0)
    default_themes = commerce_config.parameters.get("default_themes", ["Cultura", "Historia", "Filosofía", "Ciencia", "Arte", "Social"])

    # Obtener cápsulas en venta (excluyendo las del usuario actual)
    capsules_for_sale = Capsule.objects.filter(
        privacy='publico',
        parameters__sold=False,
        parameters__market_entry=True
    ).exclude(usuario=user).order_by('-parameters__merits')[:50]

    # Manejar acciones del mercado
    if request.method == 'POST':
        action = request.POST.get('action')
        capsule_uid = request.POST.get('capsule_uid')
        price = float(request.POST.get('price', 0))

        try:
            capsule = Capsule.objects.get(uid=capsule_uid)

            if action == 'list':
                # Listar una cápsula en el mercado
                if capsule.usuario == user and not capsule.parameters.get('market_entry', False):
                    capsule.parameters['market_entry'] = True
                    capsule.parameters['price'] = price
                    capsule.parameters['sold'] = False
                    capsule.save()
                    Notification.objects.create(
                        user=user,
                        type='market_listed',
                        message=f"Cápsula '{capsule.contenido[:50]}...' listada en el mercado por {price} KMT.",
                        priority='media'
                    )
                else:
                    logging.warning(f"Intento inválido de listar cápsula {capsule_uid} por usuario {user.alias}.")
                    return render(request, 'error.html', {'message': 'No puedes listar esta cápsula'})

            elif action == 'buy':
                # Comprar una cápsula
                if capsule.parameters.get('market_entry', False) and not capsule.parameters.get('sold', False):
                    # Simular transacción (en un sistema real, integraría con Solana)
                    transaction = Transaction(
                        uid=f"trans_{user.id}_{capsule_uid}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                        user=user,
                        content_type='capsule',
                        content_id=capsule_uid,
                        amount=capsule.parameters.get('price', 0),
                        commission=capsule.parameters.get('price', 0) * (commission_rate / 100),
                        timestamp=timezone.now()
                    )
                    transaction.save()

                    # Actualizar cápsula
                    capsule.parameters['sold'] = True
                    capsule.parameters['buyer_id'] = user.id
                    capsule.save()

                    # Preservar transacción en blockchain (simulado)
                    try:
                        tx_hash = preserve_capsule(capsule)
                        capsule.parameters['blockchain_tx_hash'] = tx_hash
                        capsule.save()
                        logging.info(f"Transacción de compra {transaction.uid} preservada en blockchain: {tx_hash}")
                    except Exception as e:
                        logging.warning(f"Error al preservar transacción en blockchain: {e}")

                    Notification.objects.create(
                        user=user,
                        type='market_purchase',
                        message=f"Has comprado la cápsula '{capsule.contenido[:50]}...' por {capsule.parameters.get('price', 0)} KMT.",
                        priority='alta'
                    )
                    Notification.objects.create(
                        user=capsule.usuario,
                        type='market_sale',
                        message=f"Tu cápsula '{capsule.contenido[:50]}...' fue vendida por {capsule.parameters.get('price', 0)} KMT.",
                        priority='alta'
                    )

                    return render(
                        request,
                        'purchase_confirmation.html',
                        {'capsule': capsule, 'transaction': transaction}
                    )
                else:
                    logging.warning(f"Intento inválido de comprar cápsula {capsule_uid} por usuario {user.alias}.")
                    return render(request, 'error.html', {'message': 'Esta cápsula no está en venta'})

        except Capsule.DoesNotExist:
            logging.error(f"Cápsula {capsule_uid} no encontrada.")
            return render(request, 'error.html', {'message': 'Cápsula no encontrada'})
        except Exception as e:
            logging.error(f"Error al procesar acción de mercado: {e}")
            return render(request, 'error.html', {'message': 'Error al procesar la acción'})

    # Preparar datos para el mapa interactivo
    map_data = prepare_map_data(capsules_for_sale)

    return render(
        request,
        'marketplace.html',
        {
            'capsules': capsules_for_sale,
            'themes': default_themes,
            'map_data': map_data
        }
    )
```