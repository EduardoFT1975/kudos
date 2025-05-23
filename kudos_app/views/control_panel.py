```python
# kudos_app/views/control_panel.py

"""
Vista para el Panel de Control centralizado de Kudos.
Gestiona cápsulas, usuarios, transacciones, certificaciones, reputación, automatización y estadísticas de todos los módulos.
Incluye visualizaciones interactivas y soporte para monitoreo avanzado.
Restringido a administradores autorizados.
"""

import logging
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.db.models import Sum, Count
from kudos_app.models import Capsule, User, Transaction, Notification, SettingsConfig, AdminAccess, SocialInteraction, Community, GovernanceProposal, ResearchProject
from kudos_app.views.personal_assistant import personal_assistant
from kudos_app.views.capsule_museum import prepare_map_data
from celery.task.control import inspect
from django_celery_beat.models import PeriodicTask, CrontabSchedule
import json
import uuid

# Configurar logging
logging.basicConfig(filename='/app/control_panel.log', level=logging.INFO)

@login_required
def control_panel_view(request):
    """
    Vista principal del Panel de Control para administradores.
    """
    try:
        user = request.user
        admin_access = AdminAccess.objects.filter(user=user).first()
        if not user.is_staff or not admin_access or admin_access.access_level < 1:
            logging.warning(f"Acceso denegado para usuario {user.alias}.")
            return render(request, '403.html', {'message': 'Acceso denegado'})
    except Exception as e:
        logging.error(f"Error al verificar acceso: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig para todos los módulos
    commerce_config = SettingsConfig.objects.get_or_create(key="commerce_apis_settings")[0]
    automation_config = SettingsConfig.objects.get_or_create(key="automation_settings")[0]
    mental_config = SettingsConfig.objects.get_or_create(key="mental_health_settings")[0]
    art_config = SettingsConfig.objects.get_or_create(key="art_culture_settings")[0]
    tourism_config = SettingsConfig.objects.get_or_create(key="tourism_settings")[0]
    innovation_config = SettingsConfig.objects.get_or_create(key="innovation_settings")[0]
    social_config = SettingsConfig.objects.get_or_create(key="social_settings")[0]
    governance_config = SettingsConfig.objects.get_or_create(key="governance_settings")[0]
    research_config = SettingsConfig.objects.get_or_create(key="research_settings")[0]
    social_impact_config = SettingsConfig.objects.get_or_create(key="social_impact_settings")[0]
    infrastructure_config = SettingsConfig.objects.get_or_create(key="infrastructure_settings")[0]

    # Estadísticas generales para todos los módulos
    stats = {
        'total_capsules': Capsule.objects.count(),
        'active_users': User.objects.filter(is_active=True).count(),
        'total_transactions': Transaction.objects.count(),
        'recent_transactions': Transaction.objects.filter(
            timestamp__gte=timezone.now() - timezone.timedelta(days=7)
        ).aggregate(total_amount=Sum('amount'))['total_amount'] or 0,
        'total_notifications': Notification.objects.count(),
        'total_certificates': Capsule.objects.filter(modo='certificado').count(),
        'total_mental_capsules': Capsule.objects.filter(modo='salud_mental').count(),
        'total_art_capsules': Capsule.objects.filter(modo='artístico').count(),
        'total_tourism_capsules': Capsule.objects.filter(modo='turismo_sostenible').count(),
        'total_innovation_capsules': Capsule.objects.filter(modo='innovación').count(),
        'total_social_interactions': SocialInteraction.objects.count(),
        'total_communities': Community.objects.filter(is_active=True).count(),
        'total_proposals': GovernanceProposal.objects.count(),
        'total_research_capsules': Capsule.objects.filter(modo='investigación').count(),
        'total_research_projects': ResearchProject.objects.filter(is_active=True).count(),
        'total_social_impact_capsules': Capsule.objects.filter(modo='impacto_social').count(),
        'total_infrastructure_capsules': Capsule.objects.filter(modo='infraestructura').count(),
        'infrastructure_stats': {
            'ipfs_storage_used': infrastructure_config.parameters.get('ipfs_storage_used', 0),
            'solana_transactions': infrastructure_config.parameters.get('solana_transactions', 0),
            'webgpu_usage': infrastructure_config.parameters.get('webgpu_usage', 0),
            'last_monitoring': infrastructure_config.parameters.get('last_monitoring', 'N/A'),
            'ipfs_nodes': infrastructure_config.parameters.get('ipfs_nodes', 10),  # Simulado
            'solana_tps': infrastructure_config.parameters.get('solana_tps', 1000)  # Transacciones por segundo simuladas
        },
        # Datos para gráficos
        'chart_data': {
            'capsules_by_mode': json.dumps(list(Capsule.objects.values('modo').annotate(count=Count('id')))),
            'user_activity': json.dumps({
                'labels': [(timezone.now() - timezone.timedelta(days=i)).strftime('%Y-%m-%d') for i in range(6, -1, -1)],
                'data': [Capsule.objects.filter(timestamp__date=(timezone.now() - timezone.timedelta(days=i)).date()).count() for i in range(6, -1, -1)]
            }),
            'infrastructure_metrics': json.dumps({
                'ipfs_storage': infrastructure_config.parameters.get('ipfs_storage_used', 0),
                'solana_transactions': infrastructure_config.parameters.get('solana_transactions', 0),
                'webgpu_usage': infrastructure_config.parameters.get('webgpu_usage', 0)
            })
        }
    }

    # Gestión de tareas Celery
    try:
        inspector = inspect()
        active_tasks = inspector.active() or {}
        scheduled_tasks = PeriodicTask.objects.all()
        tasks_status = {
            'active': len(active_tasks),
            'scheduled': [{'name': task.name, 'schedule': str(task.crontab)} for task in scheduled_tasks]
        }
    except Exception as e:
        logging.error(f"Error al obtener estado de Celery: {e}")
        tasks_status = {'active': 0, 'scheduled': []}

    # Mapa de cápsulas recientes
    recent_capsules = Capsule.objects.filter(
        timestamp__gte=timezone.now() - timezone.timedelta(days=7)
    )[:50]
    map_data = prepare_map_data(recent_capsules)

    # Manejar acciones del panel
    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'create_user':
            try:
                new_uid = request.POST.get('new_uid')
                new_alias = request.POST.get('new_alias')
                new_email = request.POST.get('new_email')
                new_password = request.POST.get('new_password')
                new_role = request.POST.get('new_role')
                new_is_active = 'new_is_active' in request.POST
                User.objects.create_user(
                    uid=new_uid,
                    alias=new_alias,
                    email=new_email,
                    password=new_password,
                    role=new_role,
                    is_active=new_is_active
                )
                messages.success(request, f"Usuario {new_alias} creado correctamente.")
            except Exception as e:
                logging.error(f"Error al crear usuario: {e}")
                messages.error(request, f"Error al crear usuario: {e}")

        elif action == 'simulate_transaction':
            try:
                capsule_uid = request.POST.get('capsule_uid')
                capsule = Capsule.objects.get(uid=capsule_uid, modo='comercio')
                buyer = User.objects.get(uid='test-user-3')
                commission = capsule.price * 0.05
                Transaction.objects.create(
                    uid=f"trans_{uuid.uuid4()}",
                    user=buyer,
                    content_type="capsule",
                    content_id=capsule.uid,
                    amount=capsule.price,
                    commission=commission,
                    timestamp=timezone.now()
                )
                infrastructure_config.parameters['solana_transactions'] = infrastructure_config.parameters.get('solana_transactions', 0) + 1
                infrastructure_config.save()
                messages.success(request, f"Transacción simulada para cápsula {capsule_uid}.")
            except Capsule.DoesNotExist:
                logging.error(f"Cápsula {capsule_uid} no encontrada.")
                messages.error(request, "Cápsula no encontrada.")
            except User.DoesNotExist:
                logging.error("Usuario 'test-user-3' no encontrado.")
                messages.error(request, "Usuario 'test-user-3' no encontrado.")

        elif action == 'update_automation':
            try:
                automation_config.value = int(request.POST.get('automation_level', 0))
                automation_config.parameters = {
                    'auto_approve_commerce': 'auto_approve_commerce' in request.POST,
                    'max_price': float(request.POST.get('max_price', 500.0)),
                    'listing_expiration_days': int(request.POST.get('listing_expiration_days', 30)),
                    'notification_archive_days': int(request.POST.get('notification_archive_days', 90))
                }
                automation_config.save()

                commerce_config.parameters['listing_expiration_days'] = int(request.POST.get('listing_expiration_days', 30))
                commerce_config.save()

                mental_config.parameters['reminder_frequency_hours'] = int(request.POST.get('reminder_frequency_hours', 24))
                mental_config.save()

                art_config.parameters['curation_merits_threshold'] = int(request.POST.get('curation_merits_threshold', 10))
                art_config.save()

                tourism_config.parameters['curation_impact_threshold'] = int(request.POST.get('curation_impact_threshold', 10))
                tourism_config.save()

                innovation_config.parameters['curation_impact_threshold'] = int(request.POST.get('curation_impact_threshold', 10))
                innovation_config.save()

                social_config.parameters['moderation_threshold'] = float(request.POST.get('moderation_threshold', 0.8))
                social_config.save()

                governance_config.parameters['moderation_threshold'] = float(request.POST.get('moderation_threshold_governance', 0.8))
                governance_config.parameters['voting_duration_days'] = int(request.POST.get('voting_duration_days', 7))
                governance_config.parameters['min_votes'] = int(request.POST.get('min_votes', 10))
                governance_config.parameters['approval_threshold'] = float(request.POST.get('approval_threshold', 0.5))
                governance_config.save()

                research_config.parameters['curation_impact_threshold'] = int(request.POST.get('curation_impact_threshold_research', 10))
                research_config.save()

                social_impact_config.parameters['curation_impact_threshold'] = int(request.POST.get('curation_impact_threshold_social_impact', 10))
                social_impact_config.save()

                infrastructure_config.parameters['webgpu_enabled'] = 'webgpu_enabled' in request.POST
                infrastructure_config.parameters['ipfs_storage_limit'] = int(request.POST.get('ipfs_storage_limit', 1000))  # MB
                infrastructure_config.parameters['ipfs_cleanup_days'] = int(request.POST.get('ipfs_cleanup_days', 90))
                infrastructure_config.save()

                messages.success(request, "Configuración de automatización guardada.")
            except ValueError as e:
                logging.error(f"Error de valor en configuración de automatización: {e}")
                messages.error(request, "Error: Valores inválidos en la configuración.")
            except Exception as e:
                logging.error(f"Error al guardar automatización: {e}")
                messages.error(request, f"Error al guardar automatización: {e}")

        return redirect('control_panel')

    # Preparar contexto
    context = {
        'user': user,
        'stats': stats,
        'tasks_status': tasks_status,
        'map_data': map_data,
        'commerce_capsules': Capsule.objects.filter(modo='comercio')[:10],
        'automation_config': automation_config,
        'mental_config': mental_config,
        'art_config': art_config,
        'tourism_config': tourism_config,
        'innovation_config': innovation_config,
        'social_config': social_config,
        'governance_config': governance_config,
        'research_config': research_config,
        'social_impact_config': social_impact_config,
        'infrastructure_config': infrastructure_config,
        'recent_notifications': Notification.objects.filter(
            timestamp__gte=timezone.now() - timezone.timedelta(days=1)
        )[:10],
        'top_sellers': User.objects.filter(
            capsule_set__parameters__sold=True
        ).distinct().order_by('-capsule_set__parameters__merits')[:5]
    }

    return render(request, 'control_panel.html', context)

@login_required
def assistant_interaction(request):
    """
    Vista para interactuar con el asistente personal desde el panel.
    """
    if not request.user.is_staff:
        return render(request, '403.html', {'message': 'Acceso denegado'})

    if request.method == 'POST':
        query = request.POST.get('query')
        task = request.POST.get('task')
        try:
            # Simular request para personal_assistant
            mock_request = type('MockRequest', (), {'user': request.user, 'POST': {'query': query, 'task': task}})
            response = personal_assistant(mock_request)
            messages.success(request, f"Asistente: {response[:100]}...")
        except Exception as e:
            logging.error(f"Error al interactuar con el asistente: {e}")
            messages.error(request, f"Error al interactuar con el asistente: {e}")
        return redirect('control_panel')

    return render(request, 'assistant_interaction.html')
```