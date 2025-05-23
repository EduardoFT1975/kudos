```python
# kudos_app/views/market_transactions.py

"""
Vista para gestionar transacciones avanzadas en el Mercado Global de Kudos.
Soporta subastas, ofertas, y negociaciones de cápsulas.
"""

import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib.gis.geos import Point
from datetime import timedelta
from kudos_app.models import Capsule, User, Transaction, Notification, SettingsConfig
from kudos_app.utils.blockchain_utils import preserve_capsule
from kudos_app.views.capsule_museum import prepare_map_data

# Configurar logging
logging.basicConfig(filename='/app/market_transactions.log', level=logging.INFO)

@login_required
def market_transactions_view(request):
    """
    Vista para gestionar subastas, ofertas, y negociaciones en el Mercado Global.
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

    # Obtener subastas activas
    auctions = Capsule.objects.filter(
        parameters__auction_active=True,
        parameters__auction_end__gte=timezone.now()
    ).order_by('parameters__auction_end')[:20]

    # Obtener ofertas recibidas (para cápsulas del usuario)
    offers = Capsule.objects.filter(
        usuario=user,
        parameters__offers__isnull=False
    )

    # Manejar acciones de transacciones
    if request.method == 'POST':
        action = request.POST.get('action')
        capsule_uid = request.POST.get('capsule_uid')

        try:
            capsule = Capsule.objects.get(uid=capsule_uid)

            if action == 'start_auction':
                # Iniciar una subasta
                if capsule.usuario == user and not capsule.parameters.get('market_entry', False):
                    starting_bid = float(request.POST.get('starting_bid', 0))
                    duration_hours = int(request.POST.get('duration_hours', 24))
                    capsule.parameters['market_entry'] = True
                    capsule.parameters['auction_active'] = True
                    capsule.parameters['starting_bid'] = starting_bid
                    capsule.parameters['current_bid'] = starting_bid
                    capsule.parameters['highest_bidder_id'] = None
                    capsule.parameters['auction_end'] = (timezone.now() + timedelta(hours=duration_hours)).strftime('%Y-%m-%d %H:%M:%S')
                    capsule.parameters['sold'] = False
                    capsule.save()
                    Notification.objects.create(
                        user=user,
                        type='auction_started',
                        message=f"Subasta iniciada para '{capsule.contenido[:50]}...' con puja inicial de {starting_bid} KMT.",
                        priority='media'
                    )

            elif action == 'place_bid':
                # Hacer una puja en una subasta
                bid_amount = float(request.POST.get('bid_amount'))
                if capsule.parameters.get('auction_active', False) and timezone.now() < timezone.datetime.strptime(capsule.parameters['auction_end'], '%Y-%m-%d %H:%M:%S'):
                    if bid_amount > capsule.parameters.get('current_bid', 0):
                        capsule.parameters['current_bid'] = bid_amount
                        capsule.parameters['highest_bidder_id'] = user.id
                        capsule.save()
                        Notification.objects.create(
                            user=user,
                            type='bid_placed',
                            message=f"Has pujado {bid_amount} KMT por '{capsule.contenido[:50]}...'.",
                            priority='media'
                        )
                        Notification.objects.create(
                            user=capsule.usuario,
                            type='bid_received',
                            message=f"Nueva puja de {bid_amount} KMT por tu cápsula '{capsule.contenido[:50]}...'.",
                            priority='media'
                        )
                    else:
                        logging.warning(f"Puja inválida de {bid_amount} KMT por usuario {user.alias} en cápsula {capsule_uid}.")
                        return render(request, 'error.html', {'message': 'La puja debe ser mayor a la actual'})
                else:
                    logging.warning(f"Intento de puja en subasta cerrada para cápsula {capsule_uid}.")
                    return render(request, 'error.html', {'message': 'La subasta ha terminado'})

            elif action == 'make_offer':
                # Hacer una oferta directa
                offer_amount = float(request.POST.get('offer_amount'))
                if capsule.parameters.get('market_entry', False) and not capsule.parameters.get('sold', False):
                    if 'offers' not in capsule.parameters:
                        capsule.parameters['offers'] = []
                    capsule.parameters['offers'].append({
                        'user_id': user.id,
                        'amount': offer_amount,
                        'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S')
                    })
                    capsule.save()
                    Notification.objects.create(
                        user=user,
                        type='offer_made',
                        message=f"Has ofrecido {offer_amount} KMT por '{capsule.contenido[:50]}...'.",
                        priority='media'
                    )
                    Notification.objects.create(
                        user=capsule.usuario,
                        type='offer_received',
                        message=f"Nueva oferta de {offer_amount} KMT por tu cápsula '{capsule.contenido[:50]}...'.",
                        priority='media'
                    )

            elif action == 'accept_offer':
                # Aceptar una oferta
                offer_index = int(request.POST.get('offer_index'))
                if capsule.usuario == user and capsule.parameters.get('offers', []):
                    offer = capsule.parameters['offers'][offer_index]
                    transaction = Transaction(
                        uid=f"trans_{user.id}_{capsule_uid}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                        user=User.objects.get(id=offer['user_id']),
                        content_type='capsule',
                        content_id=capsule_uid,
                        amount=offer['amount'],
                        commission=offer['amount'] * (commission_rate / 100),
                        timestamp=timezone.now()
                    )
                    transaction.save()

                    # Actualizar cápsula
                    capsule.parameters['sold'] = True
                    capsule.parameters['buyer_id'] = offer['user_id']
                    capsule.parameters['offers'] = []  # Limpiar ofertas
                    capsule.save()

                    # Preservar transacción en blockchain
                    try:
                        tx_hash = preserve_capsule(capsule)
                        capsule.parameters['blockchain_tx_hash'] = tx_hash
                        capsule.save()
                        logging.info(f"Transacción de oferta {transaction.uid} preservada en blockchain: {tx_hash}")
                    except Exception as e:
                        logging.warning(f"Error al preservar transacción en blockchain: {e}")

                    Notification.objects.create(
                        user=user,
                        type='offer_accepted',
                        message=f"Has aceptado una oferta de {offer['amount']} KMT por '{capsule.contenido[:50]}...'.",
                        priority='alta'
                    )
                    Notification.objects.create(
                        user=User.objects.get(id=offer['user_id']),
                        type='offer_accepted',
                        message=f"Tu oferta de {offer['amount']} KMT por '{capsule.contenido[:50]}...' fue aceptada.",
                        priority='alta'
                    )

                    return render(
                        request,
                        'transaction_confirmation.html',
                        {'capsule': capsule, 'transaction': transaction}
                    )

        except Capsule.DoesNotExist:
            logging.error(f"Cápsula {capsule_uid} no encontrada.")
            return render(request, 'error.html', {'message': 'Cápsula no encontrada'})
        except Exception as e:
            logging.error(f"Error al procesar acción de transacción: {e}")
            return render(request, 'error.html', {'message': 'Error al procesar la acción'})

    # Preparar datos para el mapa interactivo
    map_data = prepare_map_data(auctions)

    return render(
        request,
        'market_transactions.html',
        {
            'auctions': auctions,
            'offers': offers,
            'themes': default_themes,
            'map_data': map_data
        }
    )
```