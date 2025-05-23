```python
# kudos_app/views/market_reputation.py

"""
Vista para gestionar la reputación de vendedores en el Mercado Global de Kudos.
Permite calificar, reseñar, y visualizar perfiles de vendedores.
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
logging.basicConfig(filename='/app/market_reputation.log', level=logging.INFO)

@login_required
def market_reputation_view(request, user_id=None):
    """
    Vista para gestionar la reputación de vendedores y visualizar sus perfiles.
    """
    try:
        current_user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    commerce_config = SettingsConfig.objects.get_or_create(key="commerce_apis_settings")[0]
    default_themes = commerce_config.parameters.get("default_themes", ["Cultura", "Historia", "Filosofía", "Ciencia", "Arte", "Social"])

    # Si se especifica un user_id, mostrar el perfil de ese vendedor
    if user_id:
        try:
            seller = User.objects.get(id=user_id)
            profile_data = get_seller_profile(seller)
            transactions = Transaction.objects.filter(content_type='capsule', user=seller).order_by('-timestamp')[:20]
            map_data = prepare_map_data(Capsule.objects.filter(parameters__sold=True, parameters__buyer_id__isnull=False, usuario=seller))

            if request.method == 'POST':
                rating = int(request.POST.get('rating', 0))
                review_text = request.POST.get('review_text', '')
                transaction_uid = request.POST.get('transaction_uid')

                if rating in range(1, 6) and review_text and transaction_uid:
                    try:
                        transaction = Transaction.objects.get(uid=transaction_uid, user=current_user)
                        capsule = Capsule.objects.get(uid=transaction.content_id)
                        if capsule.usuario == seller:
                            review_capsule = create_review_capsule(current_user, seller, rating, review_text, transaction_uid)
                            if review_capsule:
                                Notification.objects.create(
                                    user=seller,
                                    type='review_received',
                                    message=f"Has recibido una reseña de {rating} estrellas por '{capsule.contenido[:50]}...'.",
                                    priority='media'
                                )
                                return render(
                                    request,
                                    'review_confirmation.html',
                                    {'review': review_capsule, 'seller': seller}
                                )
                            else:
                                logging.error(f"Error al crear reseña para transacción {transaction_uid}.")
                                return render(request, 'error.html', {'message': 'Error al enviar la reseña'})
                        else:
                            logging.warning(f"Intento inválido de reseñar por usuario {current_user.alias}.")
                            return render(request, 'error.html', {'message': 'No puedes reseñar esta transacción'})
                    except Transaction.DoesNotExist:
                        logging.error(f"Transacción {transaction_uid} no encontrada.")
                        return render(request, 'error.html', {'message': 'Transacción no encontrada'})
                    except Capsule.DoesNotExist:
                        logging.error(f"Cápsula no encontrada para transacción {transaction_uid}.")
                        return render(request, 'error.html', {'message': 'Cápsula no encontrada'})
                    except Exception as e:
                        logging.error(f"Error al procesar reseña: {e}")
                        return render(request, 'error.html', {'message': 'Error al procesar la reseña'})
                else:
                    logging.warning("Formulario de reseña incompleto.")
                    return render(request, 'error.html', {'message': 'Faltan datos en la reseña'})

            return render(
                request,
                'seller_profile.html',
                {
                    'seller': seller,
                    'profile_data': profile_data,
                    'transactions': transactions,
                    'map_data': map_data
                }
            )
        except User.DoesNotExist:
            logging.error(f"Usuario {user_id} no encontrado.")
            return render(request, 'error.html', {'message': 'Vendedor no encontrado'})

    # Mostrar lista de vendedores con mejor reputación
    top_sellers = User.objects.filter(capsule_set__parameters__sold=True).distinct().order_by('-capsule_set__parameters__merits')[:10]
    sellers_data = [get_seller_profile(seller) for seller in top_sellers]

    return render(
        request,
        'market_reputation.html',
        {
            'sellers': sellers_data,
            'themes': default_themes
        }
    )

def get_seller_profile(seller):
    """
    Obtiene los datos del perfil de un vendedor, incluyendo reputación y reseñas.
    """
    try:
        # Obtener transacciones completadas como vendedor
        transactions = Transaction.objects.filter(content_type='capsule', user__id=seller.id)
        capsules_sold = Capsule.objects.filter(
            usuario=seller,
            parameters__sold=True,
            parameters__buyer_id__isnull=False
        )

        # Obtener reseñas
        reviews = Capsule.objects.filter(
            modo='review',
            parameters__seller_id=seller.id
        )

        # Calcular reputación
        total_merits = sum(capsule.parameters.get('merits', 0) for capsule in capsules_sold)
        ratings = [review.parameters.get('rating', 0) for review in reviews]
        average_rating = sum(ratings) / len(ratings) if ratings else 0
        reputation_score = (total_merits * 0.4) + (average_rating * 20)  # Ponderación: 40% méritos, 60% calificaciones

        return {
            'seller': seller,
            'total_sales': capsules_sold.count(),
            'total_merits': total_merits,
            'average_rating': round(average_rating, 1),
            'reputation_score': round(reputation_score, 1),
            'reviews': reviews
        }
    except Exception as e:
        logging.error(f"Error al obtener perfil de vendedor {seller.id}: {e}")
        return {'seller': seller, 'total_sales': 0, 'total_merits': 0, 'average_rating': 0, 'reputation_score': 0, 'reviews': []}

def create_review_capsule(user, seller, rating, review_text, transaction_uid):
    """
    Crea una cápsula de reseña para una transacción.
    """
    try:
        review_capsule = Capsule(
            uid=f"review_{user.id}_{seller.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
            usuario=user,
            contenido=f"Reseña para vendedor {seller.alias}: {review_text}",
            ubicacion=user.ubicacion if user.ubicacion else Point(0, 0),
            modo='review',
            fecha=timezone.now().date(),
            privacy='publico',
            time_scale='año',
            temas=['Reseña', 'Mercado'],
            parameters={
                'seller_id': seller.id,
                'rating': rating,
                'review_text': review_text,
                'transaction_uid': transaction_uid,
                'merits': 2,
                'is_review': True
            },
            variables={'visibility_range': 0},
            timestamp=timezone.now()
        )
        review_capsule.save()

        # Preservar en blockchain (simulado)
        try:
            tx_hash = preserve_capsule(review_capsule)
            review_capsule.parameters['blockchain_tx_hash'] = tx_hash
            review_capsule.save()
            logging.info(f"Reseña {review_capsule.uid} preservada en blockchain: {tx_hash}")
        except Exception as e:
            logging.warning(f"Error al preservar reseña en blockchain: {e}")

        return review_capsule
    except Exception as e:
        logging.error(f"Error al crear reseña: {e}")
        return None
```