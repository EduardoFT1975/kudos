```python
# kudos_app/scheduler.py

from celery import shared_task
from django.utils import timezone
from datetime import timedelta, datetime
from kudos_app.models import Capsule, User, Notification, SettingsConfig, Transaction, Badge, SocialInteraction, Community, GovernanceProposal, ResearchProject
import logging
import random  # Para simular métricas de APIs

logger = logging.getLogger(__name__)

@shared_task
def process_expired_capsules():
    """
    Tarea para procesar cápsulas expiradas y ocultarlas.
    """
    config = SettingsConfig.objects.first()
    if not config:
        logger.error("No se encontró configuración de automatización.")
        return

    expiration_days = config.parameters.get('expiration_days', 7)
    expired_capsules = Capsule.objects.filter(
        modo__in=['dia', 'semana'],
        fecha__lt=timezone.now() - timedelta(days=expiration_days)
    )
    expired_count = expired_capsules.count()
    expired_capsules.update(privacy='solo_yo')
    logger.info(f"Se ocultaron {expired_count} cápsulas expiradas.")

@shared_task
def send_user_notifications():
    """
    Tarea para enviar notificaciones a usuarios activos sobre sus cápsulas recientes.
    """
    active_users = User.objects.filter(is_active=True)
    notification_count = 0
    for user in active_users:
        recent_capsules = Capsule.objects.filter(
            usuario=user,
            timestamp__gte=timezone.now() - timedelta(days=1)
        ).count()
        if recent_capsules > 0:
            Notification.objects.create(
                user=user,
                type='activity_summary',
                message=f"Tienes {recent_capsules} cápsulas nuevas en el último día.",
                priority='media'
            )
            notification_count += 1
    logger.info(f"Se enviaron {notification_count} notificaciones a usuarios activos.")

@shared_task
def update_global_statistics():
    """
    Tarea para actualizar estadísticas globales del sistema.
    """
    total_capsules = Capsule.objects.count()
    config = SettingsConfig.objects.get_or_create(key="global_statistics")[0]
    config.variables['total_capsules'] = total_capsules
    config.parameters['last_update'] = timezone.now().isoformat()
    config.save()
    logger.info(f"Estadísticas actualizadas: {total_capsules} cápsulas totales.")

@shared_task
def process_expired_auctions():
    """
    Tarea para finalizar subastas expiradas y registrar transacciones.
    """
    expired_auctions = Capsule.objects.filter(
        parameters__auction_active=True,
        parameters__auction_end__lte=timezone.now().strftime('%Y-%m-%d %H:%M:%S')
    )
    for auction in expired_auctions:
        if auction.parameters.get('highest_bidder_id'):
            try:
                buyer = User.objects.get(id=auction.parameters['highest_bidder_id'])
                commission_rate = SettingsConfig.objects.get_or_create(key="commerce_apis_settings")[0].variables.get("commission_rate", 5.0)
                transaction = Transaction(
                    uid=f"trans_{buyer.id}_{auction.uid}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                    user=buyer,
                    content_type='capsule',
                    content_id=auction.uid,
                    amount=auction.parameters.get('current_bid', 0),
                    commission=auction.parameters.get('current_bid', 0) * (commission_rate / 100),
                    timestamp=timezone.now()
                )
                transaction.save()

                auction.parameters['sold'] = True
                auction.parameters['buyer_id'] = buyer.id
                auction.parameters['auction_active'] = False
                auction.save()

                Notification.objects.create(
                    user=buyer,
                    type='auction_won',
                    message=f"Has ganado la subasta por '{auction.contenido[:50]}...' por {auction.parameters.get('current_bid', 0)} KMT.",
                    priority='alta'
                )
                Notification.objects.create(
                    user=auction.usuario,
                    type='auction_sold',
                    message=f"Tu cápsula '{auction.contenido[:50]}...' fue vendida por {auction.parameters.get('current_bid', 0)} KMT.",
                    priority='alta'
                )
                logger.info(f"Subasta {auction.uid} finalizada: Vendida a {buyer.alias} por {auction.parameters.get('current_bid', 0)} KMT.")
            except User.DoesNotExist:
                logger.error(f"Usuario {auction.parameters.get('highest_bidder_id')} no encontrado para subasta {auction.uid}.")
        else:
            auction.parameters['auction_active'] = False
            auction.save()
            logger.info(f"Subasta {auction.uid} finalizada sin pujas.")

@shared_task
def assign_learning_badges():
    """
    Tarea para asignar insignias basadas en el progreso educativo, espacial, de salud mental, artístico, de turismo sostenible, tecnológico, social, de gobernanza, de investigación, de impacto social y de infraestructura.
    """
    users = User.objects.filter(is_active=True)
    for user in users:
        completed_plans = Capsule.objects.filter(
            usuario=user,
            parameters__is_plan=True,
            parameters__completed=True
        ).count()
        completed_capsules = Capsule.objects.filter(
            usuario=user,
            modo__in=['educativo', 'sabiduría'],
            parameters__completed=True
        ).count()
        completed_space_capsules = Capsule.objects.filter(
            usuario=user,
            modo='espacial',
            parameters__completed=True
        ).count()
        completed_mental_capsules = Capsule.objects.filter(
            usuario=user,
            modo='salud_mental',
            parameters__completed=True
        ).count()
        completed_art_capsules = Capsule.objects.filter(
            usuario=user,
            modo='artístico',
            parameters__completed=True
        ).count()
        completed_tourism_capsules = Capsule.objects.filter(
            usuario=user,
            modo='turismo_sostenible',
            parameters__completed=True
        ).count()
        completed_innovation_capsules = Capsule.objects.filter(
            usuario=user,
            modo='innovación',
            parameters__completed=True
        ).count()
        social_interactions = SocialInteraction.objects.filter(
            user=user,
            interaction_type__in=['comment', 'follow', 'message']
        ).count()
        governance_votes = GovernanceProposal.objects.filter(
            votes__user=user
        ).count()
        research_contributions = Capsule.objects.filter(
            usuario=user,
            modo='investigación',
            parameters__completed=True
        ).count()
        social_impact_contributions = Capsule.objects.filter(
            usuario=user,
            modo='impacto_social',
            parameters__completed=True
        ).count()
        infrastructure_contributions = Capsule.objects.filter(
            usuario=user,
            modo='infraestructura',
            parameters__completed=True
        ).count()

        # Insignia: "Aprendiz Novato" (1 plan completado)
        if completed_plans >= 1 and not Badge.objects.filter(user=user, name='Aprendiz Novato').exists():
            Badge.objects.create(
                user=user,
                name='Aprendiz Novato',
                description='Completaste tu primer plan de aprendizaje.',
                timestamp=timezone.now()
            )
            Notification.objects.create(
                user=user,
                type='badge_earned',
                message="¡Has ganado la insignia 'Aprendiz Novato'!",
                priority='alta'
            )
            logger.info(f"Insignia 'Aprendiz Novato' asignada a {user.alias}.")

        # Insignia: "Maestro del Saber" (10 cápsulas educativas completadas)
        if completed_capsules >= 10 and not Badge.objects.filter(user=user, name='Maestro del Saber').exists():
            Badge.objects.create(
                user=user,
                name='Maestro del Saber',
                description='Completaste 10 cápsulas educativas.',
                timestamp=timezone.now()
            )
            Notification.objects.create(
                user=user,
                type='badge_earned',
                message="¡Has ganado la insignia 'Maestro del Saber'!",
                priority='alta'
            )
            logger.info(f"Insignia 'Maestro del Saber' asignada a {user.alias}.")

        # Insignia: "Explorador Estelar" (1 cápsula espacial completada)
        if completed_space_capsules >= 1 and not Badge.objects.filter(user=user, name='Explorador Estelar').exists():
            Badge.objects.create(
                user=user,
                name='Explorador Estelar',
                description='Completaste tu primera cápsula espacial.',
                timestamp=timezone.now()
            )
            Notification.objects.create(
                user=user,
                type='badge_earned',
                message="¡Has ganado la insignia 'Explorador Estelar'!",
                priority='alta'
            )
            logger.info(f"Insignia 'Explorador Estelar' asignada a {user.alias}.")

        # Insignia: "Guardián de la Paz" (5 cápsulas de salud mental completadas)
        if completed_mental_capsules >= 5 and not Badge.objects.filter(user=user, name='Guardián de la Paz').exists():
            Badge.objects.create(
                user=user,
                name='Guardián de la Paz',
                description='Completaste 5 cápsulas de salud mental.',
                timestamp=timezone.now()
            )
            Notification.objects.create(
                user=user,
                type='badge_earned',
                message="¡Has ganado la insignia 'Guardián de la Paz'!",
                priority='alta'
            )
            logger.info(f"Insignia 'Guardián de la Paz' asignada a {user.alias}.")

        # Insignia: "Mecenas Cultural" (3 cápsulas artísticas completadas)
        if completed_art_capsules >= 3 and not Badge.objects.filter(user=user, name='Mecenas Cultural').exists():
            Badge.objects.create(
                user=user,
                name='Mecenas Cultural',
                description='Completaste 3 cápsulas artísticas o culturales.',
                timestamp=timezone.now()
            )
            Notification.objects.create(
                user=user,
                type='badge_earned',
                message="¡Has ganado la insignia 'Mecenas Cultural'!",
                priority='alta'
            )
            logger.info(f"Insignia 'Mecenas Cultural' asignada a {user.alias}.")

        # Insignia: "Viajero Responsable" (2 cápsulas de turismo sostenible completadas)
        if completed_tourism_capsules >= 2 and not Badge.objects.filter(user=user, name='Viajero Responsable').exists():
            Badge.objects.create(
                user=user,
                name='Viajero Responsable',
                description='Completaste 2 cápsulas de turismo sostenible.',
                timestamp=timezone.now()
            )
            Notification.objects.create(
                user=user,
                type='badge_earned',
                message="¡Has ganado la insignia 'Viajero Responsable'!",
                priority='alta'
            )
            logger.info(f"Insignia 'Viajero Responsable' asignada a {user.alias}.")

        # Insignia: "Innovador Tecnológico" (3 cápsulas de innovación completadas)
        if completed_innovation_capsules >= 3 and not Badge.objects.filter(user=user, name='Innovador Tecnológico').exists():
            Badge.objects.create(
                user=user,
                name='Innovador Tecnológico',
                description='Completaste 3 cápsulas de innovación tecnológica.',
                timestamp=timezone.now()
            )
            Notification.objects.create(
                user=user,
                type='badge_earned',
                message="¡Has ganado la insignia 'Innovador Tecnológico'!",
                priority='alta'
            )
            logger.info(f"Insignia 'Innovador Tecnológico' asignada a {user.alias}.")

        # Insignia: "Líder Comunitario" (50 interacciones sociales)
        if social_interactions >= 50 and not Badge.objects.filter(user=user, name='Líder Comunitario').exists():
            Badge.objects.create(
                user=user,
                name='Líder Comunitario',
                description='Realizaste 50 interacciones sociales en la plataforma.',
                timestamp=timezone.now()
            )
            Notification.objects.create(
                user=user,
                type='badge_earned',
                message="¡Has ganado la insignia 'Líder Comunitario'!",
                priority='alta'
            )
            logger.info(f"Insignia 'Líder Comunitario' asignada a {user.alias}.")

        # Insignia: "Ciudadano Activo" (5 votos en propuestas de gobernanza)
        if governance_votes >= 5 and not Badge.objects.filter(user=user, name='Ciudadano Activo').exists():
            Badge.objects.create(
                user=user,
                name='Ciudadano Activo',
                description='Participaste en 5 votaciones de gobernanza.',
                timestamp=timezone.now()
            )
            Notification.objects.create(
                user=user,
                type='badge_earned',
                message="¡Has ganado la insignia 'Ciudadano Activo'!",
                priority='alta'
            )
            logger.info(f"Insignia 'Ciudadano Activo' asignada a {user.alias}.")

        # Insignia: "Pionero Científico" (3 cápsulas de investigación completadas)
        if research_contributions >= 3 and not Badge.objects.filter(user=user, name='Pionero Científico').exists():
            Badge.objects.create(
                user=user,
                name='Pionero Científico',
                description='Contribuiste a 3 cápsulas de investigación científica.',
                timestamp=timezone.now()
            )
            Notification.objects.create(
                user=user,
                type='badge_earned',
                message="¡Has ganado la insignia 'Pionero Científico'!",
                priority='alta'
            )
            logger.info(f"Insignia 'Pionero Científico' asignada a {user.alias}.")

        # Insignia: "Agente de Cambio" (3 cápsulas de impacto social completadas)
        if social_impact_contributions >= 3 and not Badge.objects.filter(user=user, name='Agente de Cambio').exists():
            Badge.objects.create(
                user=user,
                name='Agente de Cambio',
                description='Contribuiste a 3 cápsulas de impacto social.',
                timestamp=timezone.now()
            )
            Notification.objects.create(
                user=user,
                type='badge_earned',
                message="¡Has ganado la insignia 'Agente de Cambio'!",
                priority='alta'
            )
            logger.info(f"Insignia 'Agente de Cambio' asignada a {user.alias}.")

        # Insignia: "Arquitecto Digital" (3 contribuciones a infraestructura)
        if infrastructure_contributions >= 3 and not Badge.objects.filter(user=user, name='Arquitecto Digital').exists():
            Badge.objects.create(
                user=user,
                name='Arquitecto Digital',
                description='Contribuiste a 3 tareas de infraestructura tecnológica.',
                timestamp=timezone.now()
            )
            Notification.objects.create(
                user=user,
                type='badge_earned',
                message="¡Has ganado la insignia 'Arquitecto Digital'!",
                priority='alta'
            )
            logger.info(f"Insignia 'Arquitecto Digital' asignada a {user.alias}.")

@shared_task
def update_adaptive_recommendations():
    """
    Tarea para actualizar recomendaciones adaptativas para usuarios.
    """
    users = User.objects.filter(is_active=True)
    education_config = SettingsConfig.objects.get_or_create(key="education_advanced_settings")[0]
    default_themes = education_config.parameters.get("default_themes", ["Cultura", "Historia", "Ciencia", "Filosofía"])
    
    for user in users:
        completed_capsules = Capsule.objects.filter(
            usuario=user,
            modo__in=['educativo', 'sabiduría'],
            parameters__completed=True
        ).count()
        educational_level = (
            'Primaria' if completed_capsules < 5 else
            'Secundaria' if completed_capsules < 15 else
            'Universitario' if completed_capsules < 30 else
            'Adultos'
        )
        
        recommended_capsules = Capsule.objects.filter(
            privacy='publico',
            modo__in=['educativo', 'sabiduría'],
            temas__overlap=default_themes,
            parameters__educational_level=educational_level
        ).exclude(usuario=user).order_by('-parameters__merits')[:5]
        
        user.parameters['recommended_capsules'] = [capsule.uid for capsule in recommended_capsules]
        user.save()
        logger.info(f"Recomendaciones educativas actualizadas para {user.alias}: {len(recommended_capsules)} cápsulas.")

@shared_task
def expire_market_listings():
    """
    Tarea para expirar listados del mercado que han superado el tiempo límite.
    """
    config = SettingsConfig.objects.get_or_create(key="commerce_apis_settings")[0]
    listing_expiration_days = config.parameters.get('listing_expiration_days', 30)
    
    expired_listings = Capsule.objects.filter(
        parameters__market_entry=True,
        parameters__sold=False,
        timestamp__lt=timezone.now() - timedelta(days=listing_expiration_days)
    )
    
    for listing in expired_listings:
        listing.parameters['market_entry'] = False
        listing.save()
        Notification.objects.create(
            user=listing.usuario,
            type='listing_expired',
            message=f"Tu cápsula '{listing.contenido[:50]}...' ha expirado en el mercado.",
            priority='media'
        )
    logger.info(f"Expiraron {expired_listings.count()} listados del mercado.")

@shared_task
def update_seller_reputation():
    """
    Tarea para recalcular la reputación de los vendedores.
    """
    sellers = User.objects.filter(capsule_set__parameters__sold=True).distinct()
    
    for seller in sellers:
        capsules_sold = Capsule.objects.filter(
            usuario=seller,
            parameters__sold=True,
            parameters__buyer_id__isnull=False
        )
        reviews = Capsule.objects.filter(
            modo='review',
            parameters__seller_id=seller.id
        )
        
        total_merits = sum(capsule.parameters.get('merits', 0) for capsule in capsules_sold)
        ratings = [review.parameters.get('rating', 0) for review in reviews]
        average_rating = sum(ratings) / len(ratings) if ratings else 0
        reputation_score = (total_merits * 0.4) + (average_rating * 20)
        
        seller.parameters['reputation_score'] = round(reputation_score, 1)
        seller.parameters['average_rating'] = round(average_rating, 1)
        seller.parameters['total_sales'] = capsules_sold.count()
        seller.save()
        logger.info(f"Reputación actualizada para {seller.alias}: {reputation_score}.")

@shared_task
def update_space_data():
    """
    Tarea para actualizar datos espaciales simulados (NASA API simulada).
    """
    space_capsules = Capsule.objects.filter(modo='espacial', privacy='publico')
    
    for capsule in space_capsules:
        if 'space_data' in capsule.parameters:
            # Simular datos de NASA API
            capsule.parameters['space_data'].update({
                'last_updated': timezone.now().isoformat(),
                'nasa_data': {'stars_observed': random.randint(100, 1000), 'galaxies': random.randint(1, 10)}  # Simulado
            })
            capsule.save()
            logger.info(f"Datos espaciales actualizados para cápsula {capsule.uid}.")
    
    logger.info(f"Actualizados datos de {space_capsules.count()} cápsulas espaciales.")

@shared_task
def archive_notifications():
    """
    Tarea para archivar notificaciones antiguas.
    """
    config = SettingsConfig.objects.get_or_create(key="automation_settings")[0]
    archive_days = config.parameters.get('notification_archive_days', 90)
    old_notifications = Notification.objects.filter(
        timestamp__lt=timezone.now() - timedelta(days=archive_days),
        status='sent'
    )
    archived_count = old_notifications.count()
    old_notifications.update(status='archived')
    logger.info(f"Archivadas {archived_count} notificaciones antiguas.")

@shared_task
def send_mental_health_reminders():
    """
    Tarea para enviar recordatorios de actividades de salud mental.
    """
    users = User.objects.filter(is_active=True)
    mental_config = SettingsConfig.objects.get_or_create(key="mental_health_settings")[0]
    reminder_frequency_hours = mental_config.parameters.get('reminder_frequency_hours', 24)

    for user in users:
        last_reminder = user.parameters.get('last_mental_health_reminder')
        if not last_reminder or (timezone.now() - datetime.fromisoformat(last_reminder)) > timedelta(hours=reminder_frequency_hours):
            Notification.objects.create(
                user=user,
                type='mental_health_reminder',
                message="Es un buen momento para una actividad de bienestar. ¡Explora tus cápsulas de salud mental!",
                priority='media'
            )
            user.parameters['last_mental_health_reminder'] = timezone.now().isoformat()
            user.save()
            logger.info(f"Recordatorio de salud mental enviado a {user.alias}.")

@shared_task
def update_mental_health_recommendations():
    """
    Tarea para actualizar recomendaciones de salud mental basadas en el estado emocional.
    """
    users = User.objects.filter(is_active=True)
    mental_config = SettingsConfig.objects.get_or_create(key="mental_health_settings")[0]
    default_themes = mental_config.parameters.get("default_themes", ["Mindfulness", "Relajación", "Resiliencia"])

    for user in users:
        emotional_state = user.parameters.get('emotional_state', 'neutral')
        recommended_capsules = Capsule.objects.filter(
            privacy='publico',
            modo='salud_mental',
            temas__overlap=default_themes,
            parameters__emotional_target=emotional_state
        ).exclude(usuario=user).order_by('-parameters__merits')[:5]

        user.parameters['mental_health_recommendations'] = [capsule.uid for capsule in recommended_capsules]
        user.save()
        logger.info(f"Recomendaciones de salud mental actualizadas para {user.alias}: {len(recommended_capsules)} cápsulas.")

@shared_task
def curate_art_capsules():
    """
    Tarea para curar cápsulas artísticas, priorizando las de mayor calidad (Europeana API simulada).
    """
    art_config = SettingsConfig.objects.get_or_create(key="art_culture_settings")[0]
    curation_threshold = art_config.parameters.get('curation_merits_threshold', 10)

    art_capsules = Capsule.objects.filter(
        modo='artístico',
        privacy='publico',
        parameters__merits__gte=curation_threshold
    ).order_by('-parameters__merits')[:50]

    for capsule in art_capsules:
        capsule.parameters['curated'] = True
        capsule.parameters['europeana_data'] = {'artwork_id': f"sim_{random.randint(1000, 9999)}"}  # Simulado
        capsule.save()
        Notification.objects.create(
            user=capsule.usuario,
            type='art_curated',
            message=f"Tu cápsula '{capsule.contenido[:50]}...' ha sido seleccionada para la galería curada.",
            priority='media'
        )
    logger.info(f"Curadas {art_capsules.count()} cápsulas artísticas.")

@shared_task
def update_art_recommendations():
    """
    Tarea para actualizar recomendaciones de cápsulas artísticas.
    """
    users = User.objects.filter(is_active=True)
    art_config = SettingsConfig.objects.get_or_create(key="art_culture_settings")[0]
    default_themes = art_config.parameters.get("default_themes", ["Arte", "Cultura", "Historia"])

    for user in users:
        completed_art_capsules = Capsule.objects.filter(
            usuario=user,
            modo='artístico',
            parameters__completed=True
        ).count()
        
        min_merits = 5 if completed_art_capsules < 5 else 10 if completed_art_capsules < 15 else 15
        recommended_capsules = Capsule.objects.filter(
            privacy='publico',
            modo='artístico',
            temas__overlap=default_themes,
            parameters__merits__gte=min_merits
        ).exclude(usuario=user).order_by('-parameters__merits')[:5]

        user.parameters['art_recommendations'] = [capsule.uid for capsule in recommended_capsules]
        user.save()
        logger.info(f"Recomendaciones artísticas actualizadas para {user.alias}: {len(recommended_capsules)} cápsulas.")

@shared_task
def curate_tourism_capsules():
    """
    Tarea para curar cápsulas de turismo sostenible, priorizando las de mayor impacto.
    """
    tourism_config = SettingsConfig.objects.get_or_create(key="tourism_settings")[0]
    curation_threshold = tourism_config.parameters.get('curation_impact_threshold', 10)

    tourism_capsules = Capsule.objects.filter(
        modo='turismo_sostenible',
        privacy='publico',
        parameters__sustainability_impact__gte=curation_threshold
    ).order_by('-parameters__sustainability_impact')[:50]

    for capsule in tourism_capsules:
        capsule.parameters['curated'] = True
        capsule.save()
        Notification.objects.create(
            user=capsule.usuario,
            type='tourism_curated',
            message=f"Tu cápsula '{capsule.contenido[:50]}...' ha sido seleccionada para la colección de turismo sostenible.",
            priority='media'
        )
    logger.info(f"Curadas {tourism_capsules.count()} cápsulas de turismo sostenible.")

@shared_task
def update_tourism_recommendations():
    """
    Tarea para actualizar recomendaciones de cápsulas de turismo sostenible.
    """
    users = User.objects.filter(is_active=True)
    tourism_config = SettingsConfig.objects.get_or_create(key="tourism_settings")[0]
    default_themes = tourism_config.parameters.get("default_themes", ["Sostenibilidad", "Ecoturismo", "Cultura Local"])

    for user in users:
        completed_tourism_capsules = Capsule.objects.filter(
            usuario=user,
            modo='turismo_sostenible',
            parameters__completed=True
        ).count()
        
        min_impact = 5 if completed_tourism_capsules < 5 else 10 if completed_tourism_capsules < 15 else 15
        recommended_capsules = Capsule.objects.filter(
            privacy='publico',
            modo='turismo_sostenible',
            temas__overlap=default_themes,
            parameters__sustainability_impact__gte=min_impact
        ).exclude(usuario=user).order_by('-parameters__sustainability_impact')[:5]

        user.parameters['tourism_recommendations'] = [capsule.uid for capsule in recommended_capsules]
        user.save()
        logger.info(f"Recomendaciones de turismo sostenible actualizadas para {user.alias}: {len(recommended_capsules)} cápsulas.")

@shared_task
def curate_innovation_capsules():
    """
    Tarea para curar cápsulas de innovación tecnológica, priorizando las de mayor impacto.
    """
    innovation_config = SettingsConfig.objects.get_or_create(key="innovation_settings")[0]
    curation_threshold = innovation_config.parameters.get('curation_impact_threshold', 10)

    innovation_capsules = Capsule.objects.filter(
        modo='innovación',
        privacy='publico',
        parameters__innovation_impact__gte=curation_threshold
    ).order_by('-parameters__innovation_impact')[:50]

    for capsule in innovation_capsules:
        capsule.parameters['curated'] = True
        capsule.save()
        Notification.objects.create(
            user=capsule.usuario,
            type='innovation_curated',
            message=f"Tu cápsula '{capsule.contenido[:50]}...' ha sido seleccionada para la colección de innovación tecnológica.",
            priority='media'
        )
    logger.info(f"Curadas {innovation_capsules.count()} cápsulas de innovación tecnológica.")

@shared_task
def update_innovation_recommendations():
    """
    Tarea para actualizar recomendaciones de cápsulas de innovación tecnológica.
    """
    users = User.objects.filter(is_active=True)
    innovation_config = SettingsConfig.objects.get_or_create(key="innovation_settings")[0]
    default_themes = innovation_config.parameters.get("default_themes", ["Tecnología", "IA", "Biotecnología"])

    for user in users:
        completed_innovation_capsules = Capsule.objects.filter(
            usuario=user,
            modo='innovación',
            parameters__completed=True
        ).count()
        
        min_impact = 5 if completed_innovation_capsules < 5 else 10 if completed_innovation_capsules < 15 else 15
        recommended_capsules = Capsule.objects.filter(
            privacy='publico',
            modo='innovación',
            temas__overlap=default_themes,
            parameters__innovation_impact__gte=min_impact
        ).exclude(usuario=user).order_by('-parameters__innovation_impact')[:5]

        user.parameters['innovation_recommendations'] = [capsule.uid for capsule in recommended_capsules]
        user.save()
        logger.info(f"Recomendaciones de innovación tecnológica actualizadas para {user.alias}: {len(recommended_capsules)} cápsulas.")

@shared_task
def moderate_social_interactions():
    """
    Tarea para moderar interacciones sociales y filtrar contenido inapropiado.
    """
    social_config = SettingsConfig.objects.get_or_create(key="social_settings")[0]
    moderation_threshold = social_config.parameters.get('moderation_threshold', 0.8)

    interactions = SocialInteraction.objects.filter(
        status='pending',
        timestamp__gte=timezone.now() - timedelta(days=7)
    )

    for interaction in interactions:
        try:
            is_appropriate = True  # Reemplazar con llamada a API de moderación real
            if is_appropriate:
                interaction.status = 'approved'
                interaction.save()
                logger.info(f"Interacción {interaction.id} aprobada.")
            else:
                interaction.status = 'rejected'
                interaction.save()
                Notification.objects.create(
                    user=interaction.user,
                    type='interaction_rejected',
                    message="Tu interacción fue rechazada por violar las normas de la comunidad.",
                    priority='alta'
                )
                logger.info(f"Interacción {interaction.id} rechazada.")
        except Exception as e:
            logger.error(f"Error al moderar interacción {interaction.id}: {e}")
            interaction.status = 'pending'
            interaction.save()

    logger.info(f"Moderadas {interactions.count()} interacciones sociales.")

@shared_task
def update_social_recommendations():
    """
    Tarea para actualizar recomendaciones de conexiones sociales y comunidades.
    """
    users = User.objects.filter(is_active=True)
    social_config = SettingsConfig.objects.get_or_create(key="social_settings")[0]
    default_themes = social_config.parameters.get("default_themes", ["Colaboración", "Comunidad", "Intereses Comunes"])

    for user in users:
        user_themes = user.parameters.get('preferred_themes', default_themes)
        social_interactions = SocialInteraction.objects.filter(
            user=user,
            interaction_type__in=['follow', 'comment']
        ).count()

        recommended_users = User.objects.filter(
            is_active=True,
            parameters__preferred_themes__overlap=user_themes
        ).exclude(id=user.id).order_by('-parameters__reputation_score')[:5]

        recommended_communities = Community.objects.filter(
            themes__overlap=user_themes,
            is_active=True
        ).order_by('-member_count')[:5]

        user.parameters['social_recommendations'] = {
            'users': [u.id for u in recommended_users],
            'communities': [c.id for c in recommended_communities]
        }
        user.save()
        logger.info(f"Recomendaciones sociales actualizadas para {user.alias}: {len(recommended_users)} usuarios, {len(recommended_communities)} comunidades.")

@shared_task
def moderate_governance_proposals():
    """
    Tarea para moderar propuestas de gobernanza y filtrar contenido inapropiado.
    """
    governance_config = SettingsConfig.objects.get_or_create(key="governance_settings")[0]
    moderation_threshold = governance_config.parameters.get('moderation_threshold', 0.8)

    proposals = GovernanceProposal.objects.filter(
        status='pending',
        created_at__gte=timezone.now() - timedelta(days=7)
    )

    for proposal in proposals:
        try:
            is_appropriate = True  # Reemplazar con llamada a API de moderación real
            if is_appropriate:
                proposal.status = 'open'
                proposal.save()
                Notification.objects.create(
                    user=proposal.creator,
                    type='proposal_approved',
                    message=f"Tu propuesta '{proposal.title[:50]}...' ha sido aprobada y está abierta para votación.",
                    priority='alta'
                )
                logger.info(f"Propuesta {proposal.id} aprobada.")
            else:
                proposal.status = 'rejected'
                proposal.save()
                Notification.objects.create(
                    user=proposal.creator,
                    type='proposal_rejected',
                    message=f"Tu propuesta '{proposal.title[:50]}...' fue rechazada por violar las normas.",
                    priority='alta'
                )
                logger.info(f"Propuesta {proposal.id} rechazada.")
        except Exception as e:
            logger.error(f"Error al moderar propuesta {proposal.id}: {e}")
            proposal.status = 'pending'
            proposal.save()

    logger.info(f"Moderadas {proposals.count()} propuestas de gobernanza.")

@shared_task(queue='critical')
def process_governance_votes():
    """
    Tarea crítica para procesar votaciones de gobernanza y determinar resultados.
    """
    governance_config = SettingsConfig.objects.get_or_create(key="governance_settings")[0]
    voting_duration_days = governance_config.parameters.get('voting_duration_days', 7)

    open_proposals = GovernanceProposal.objects.filter(
        status='open',
        voting_end__lte=timezone.now()
    )

    for proposal in open_proposals:
        try:
            total_votes = proposal.votes.count()
            yes_votes = proposal.votes.filter(vote_choice='yes').count()
            approval_rate = (yes_votes / total_votes) if total_votes > 0 else 0

            if total_votes >= governance_config.parameters.get('min_votes', 10) and approval_rate >= governance_config.parameters.get('approval_threshold', 0.5):
                proposal.status = 'approved'
                proposal.save()
                Notification.objects.create(
                    user=proposal.creator,
                    type='proposal_approved',
                    message=f"Tu propuesta '{proposal.title[:50]}...' fue aprobada con {yes_votes}/{total_votes} votos a favor.",
                    priority='alta'
                )
                logger.info(f"Propuesta {proposal.id} aprobada: {yes_votes}/{total_votes} votos.")
            else:
                proposal.status = 'rejected'
                proposal.save()
                Notification.objects.create(
                    user=proposal.creator,
                    type='proposal_rejected',
                    message=f"Tu propuesta '{proposal.title[:50]}...' no alcanzó los votos necesarios: {yes_votes}/{total_votes}.",
                    priority='alta'
                )
                logger.info(f"Propuesta {proposal.id} rechazada: {yes_votes}/{total_votes} votos.")

        except Exception as e:
            logger.error(f"Error al procesar votación de propuesta {proposal.id}: {e}")
            proposal.status = 'open'
            proposal.save()

    logger.info(f"Procesadas {open_proposals.count()} votaciones de gobernanza.")

@shared_task
def curate_research_capsules():
    """
    Tarea para curar cápsulas de investigación, priorizando las de mayor impacto científico.
    """
    research_config = SettingsConfig.objects.get_or_create(key="research_settings")[0]
    curation_threshold = research_config.parameters.get('curation_impact_threshold', 10)

    research_capsules = Capsule.objects.filter(
        modo='investigación',
        privacy='publico',
        parameters__scientific_impact__gte=curation_threshold
    ).order_by('-parameters__scientific_impact')[:50]

    for capsule in research_capsules:
        capsule.parameters['curated'] = True
        capsule.save()
        Notification.objects.create(
            user=capsule.usuario,
            type='research_curated',
            message=f"Tu cápsula '{capsule.contenido[:50]}...' ha sido seleccionada para la colección de investigación científica.",
            priority='media'
        )
    logger.info(f"Curadas {research_capsules.count()} cápsulas de investigación.")

@shared_task
def update_research_recommendations():
    """
    Tarea para actualizar recomendaciones de cápsulas y proyectos de investigación.
    """
    users = User.objects.filter(is_active=True)
    research_config = SettingsConfig.objects.get_or_create(key="research_settings")[0]
    default_themes = research_config.parameters.get("default_themes", ["Ciencia", "Investigación", "Datos"])

    for user in users:
        completed_research_capsules = Capsule.objects.filter(
            usuario=user,
            modo='investigación',
            parameters__completed=True
        ).count()
        
        min_impact = 5 if completed_research_capsules < 5 else 10 if completed_research_capsules < 15 else 15
        recommended_capsules = Capsule.objects.filter(
            privacy='publico',
            modo='investigación',
            temas__overlap=default_themes,
            parameters__scientific_impact__gte=min_impact
        ).exclude(usuario=user).order_by('-parameters__scientific_impact')[:5]

        recommended_projects = ResearchProject.objects.filter(
            is_active=True,
            themes__overlap=default_themes
        ).order_by('-member_count')[:5]

        user.parameters['research_recommendations'] = {
            'capsules': [c.uid for c in recommended_capsules],
            'projects': [p.id for p in recommended_projects]
        }
        user.save()
        logger.info(f"Recomendaciones de investigación actualizadas para {user.alias}: {len(recommended_capsules)} cápsulas, {len(recommended_projects)} proyectos.")

@shared_task
def curate_social_impact_capsules():
    """
    Tarea para curar cápsulas de impacto social, priorizando las de mayor impacto comunitario.
    """
    social_impact_config = SettingsConfig.objects.get_or_create(key="social_impact_settings")[0]
    curation_threshold = social_impact_config.parameters.get('curation_impact_threshold', 10)

    social_impact_capsules = Capsule.objects.filter(
        modo='impacto_social',
        privacy='publico',
        parameters__social_impact__gte=curation_threshold
    ).order_by('-parameters__social_impact')[:50]

    for capsule in social_impact_capsules:
        capsule.parameters['curated'] = True
        capsule.save()
        Notification.objects.create(
            user=capsule.usuario,
            type='social_impact_curated',
            message=f"Tu cápsula '{capsule.contenido[:50]}...' ha sido seleccionada para la colección de impacto social.",
            priority='media'
        )
    logger.info(f"Curadas {social_impact_capsules.count()} cápsulas de impacto social.")

@shared_task
def update_social_impact_recommendations():
    """
    Tarea para actualizar recomendaciones de cápsulas y proyectos de impacto social.
    """
    users = User.objects.filter(is_active=True)
    social_impact_config = SettingsConfig.objects.get_or_create(key="social_impact_settings")[0]
    default_themes = social_impact_config.parameters.get("default_themes", ["Sostenibilidad", "Comunidad", "Equidad"])

    for user in users:
        completed_social_impact_capsules = Capsule.objects.filter(
            usuario=user,
            modo='impacto_social',
            parameters__completed=True
        ).count()
        
        min_impact = 5 if completed_social_impact_capsules < 5 else 10 if completed_social_impact_capsules < 15 else 15
        recommended_capsules = Capsule.objects.filter(
            privacy='publico',
            modo='impacto_social',
            temas__overlap=default_themes,
            parameters__social_impact__gte=min_impact
        ).exclude(usuario=user).order_by('-parameters__social_impact')[:5]

        user.parameters['social_impact_recommendations'] = {
            'capsules': [c.uid for c in recommended_capsules]
        }
        user.save()
        logger.info(f"Recomendaciones de impacto social actualizadas para {user.alias}: {len(recommended_capsules)} cápsulas.")

@shared_task(queue='critical')
def monitor_infrastructure_resources():
    """
    Tarea crítica para monitorear recursos de infraestructura (IPFS, Solana, WebGPU) con métricas avanzadas.
    """
    infrastructure_config = SettingsConfig.objects.get_or_create(key="infrastructure_settings")[0]
    ipfs_storage_used = infrastructure_config.parameters.get('ipfs_storage_used', 0)
    solana_transactions = infrastructure_config.parameters.get('solana_transactions', 0)
    webgpu_usage = infrastructure_config.parameters.get('webgpu_usage', 0)

    # Simular métricas avanzadas de IPFS/Solana/WebGPU (reemplazar con APIs reales)
    ipfs_nodes = infrastructure_config.parameters.get('ipfs_nodes', 10) + random.randint(-1, 1)
    solana_tps = random.randint(800, 1200)  # Transacciones por segundo simuladas
    ipfs_storage_used += random.randint(5, 15)  # MB simulados
    solana_transactions += random.randint(50, 150)
    webgpu_usage = min(100, max(0, webgpu_usage + random.randint(-10, 10)))

    infrastructure_config.parameters.update({
        'ipfs_storage_used': ipfs_storage_used,
        'solana_transactions': solana_transactions,
        'webgpu_usage': webgpu_usage,
        'ipfs_nodes': ipfs_nodes,
        'solana_tps': solana_tps,
        'last_monitoring': timezone.now().isoformat()
    })
    infrastructure_config.save()

    # Notificar si se exceden umbrales
    if ipfs_storage_used > infrastructure_config.parameters.get('ipfs_storage_limit', 1000):
        Notification.objects.create(
            user=None,  # Notificación para administradores
            type='infrastructure_alert',
            message="El almacenamiento IPFS ha excedido el límite configurado.",
            priority='alta'
        )
        logger.warning("Almacenamiento IPFS excedido.")

    logger.info(f"Monitoreo de infraestructura: IPFS={ipfs_storage_used}MB, Solana={solana_transactions}, WebGPU={webgpu_usage}%, Nodes={ipfs_nodes}, TPS={solana_tps}.")

@shared_task
def optimize_ipfs_storage():
    """
    Tarea para optimizar el almacenamiento IPFS, eliminando datos obsoletos (IPFS API simulada).
    """
    infrastructure_config = SettingsConfig.objects.get_or_create(key="infrastructure_settings")[0]
    cleanup_days = infrastructure_config.parameters.get('ipfs_cleanup_days', 90)

    obsolete_capsules = Capsule.objects.filter(
        modo='infraestructura',
        privacy='solo_yo',
        timestamp__lt=timezone.now() - timedelta(days=cleanup_days)
    )

    for capsule in obsolete_capsules:
        try:
            # Simular eliminación en IPFS
            capsule.parameters['ipfs_status'] = 'deleted'  # Simulado
            capsule.delete()
            logger.info(f"Cápsula obsoleta {capsule.uid} eliminada de IPFS.")
        except Exception as e:
            logger.error(f"Error al eliminar cápsula {capsule.uid} de IPFS: {e}")

    logger.info(f"Eliminadas {obsolete_capsules.count()} cápsulas obsoletas de IPFS.")
```