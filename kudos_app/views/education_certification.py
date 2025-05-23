```python
# kudos_app/views/education_certification.py

"""
Vista para gestionar certificaciones de planes de aprendizaje en Kudos.
Registra el progreso del usuario y emite certificados al completar un plan.
"""

import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib.gis.geos import Point
from kudos_app.models import Capsule, User, Notification, SettingsConfig
from kudos_app.utils.blockchain_utils import preserve_capsule

# Configurar logging
logging.basicConfig(filename='/app/education_certification.log', level=logging.INFO)

@login_required
def education_certification_view(request):
    """
    Vista para gestionar certificaciones de planes de aprendizaje.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Obtener planes de aprendizaje del usuario
    plans = Capsule.objects.filter(
        usuario=user,
        parameters__is_plan=True
    )

    # Obtener certificados emitidos
    certificates = Capsule.objects.filter(
        usuario=user,
        modo='certificado'
    )

    if request.method == 'POST':
        plan_uid = request.POST.get('plan_uid')
        try:
            plan = Capsule.objects.get(uid=plan_uid, parameters__is_plan=True)
            # Simular finalización del plan (en un sistema real, esto se basaría en el progreso)
            certificate = issue_certificate(user, plan)
            if certificate:
                Notification.objects.create(
                    user=user,
                    type='certificate_issued',
                    message=f"Certificado emitido para el plan '{plan.parameters.plan_name}'.",
                    priority='alta'
                )
                return render(
                    request,
                    'certificate_issued.html',
                    {'certificate': certificate, 'plan': plan}
                )
            else:
                logging.error(f"Error al emitir certificado para el plan {plan_uid}.")
                return render(request, 'error.html', {'message': 'Error al emitir el certificado'})
        except Capsule.DoesNotExist:
            logging.error(f"Plan {plan_uid} no encontrado.")
            return render(request, 'error.html', {'message': 'Plan no encontrado'})
        except Exception as e:
            logging.error(f"Error al procesar certificación: {e}")
            return render(request, 'error.html', {'message': 'Error al procesar la certificación'})

    return render(
        request,
        'education_certification.html',
        {
            'plans': plans,
            'certificates': certificates
        }
    )

def issue_certificate(user, plan):
    """
    Emite un certificado al completar un plan de aprendizaje.
    Almacena el certificado como una cápsula y, opcionalmente, en blockchain.
    """
    try:
        # Configuración desde SettingsConfig
        wisdom_config = SettingsConfig.objects.get_or_create(key="wisdom_spaces_settings")[0]
        default_themes = wisdom_config.parameters.get("default_themes", ["Cultura", "Historia", "Filosofía", "Ciencia"])

        # Crear cápsula de certificado
        certificate = Capsule(
            uid=f"certificate_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
            usuario=user,
            contenido=f"Certificado: Finalización del plan '{plan.parameters.plan_name}'",
            ubicacion=user.ubicacion if user.ubicacion else Point(0, 0),
            modo='certificado',
            fecha=timezone.now().date(),
            privacy='solo_yo',
            time_scale='año',
            temas=plan.temas,
            parameters={
                'plan_uid': plan.uid,
                'plan_name': plan.parameters.plan_name,
                'completion_date': timezone.now().strftime('%Y-%m-%d'),
                'merits': 10,
                'certificate_id': f"cert_{user.id}_{plan.uid}",
                'is_certificate': True
            },
            variables={'visibility_range': 0},
            timestamp=timezone.now()
        )
        certificate.save()

        # Preservar en blockchain (simulado)
        try:
            tx_hash = preserve_capsule(certificate)
            certificate.parameters['blockchain_tx_hash'] = tx_hash
            certificate.save()
            logging.info(f"Certificado {certificate.uid} preservado en blockchain: {tx_hash}")
        except Exception as e:
            logging.warning(f"Error al preservar certificado en blockchain: {e}")

        return certificate
    except Exception as e:
        logging.error(f"Error al emitir certificado: {e}")
        return None
```