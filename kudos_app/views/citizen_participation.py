# kudos_app/views/citizen_participation.py

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views import View
from django.http import JsonResponse
from kudos_app.models import Capsule, SettingsConfig
from django.utils import timezone
from django.contrib.gis.db.models.functions import Distance

@login_required
def citizen_participation(request):
    """Vista principal para la participación ciudadana."""
    config = SettingsConfig.objects.get_or_create(key="citizen_participation_settings")[0]
    themes = config.parameters.get("themes", ["Educación", "Sostenibilidad", "Cultura", "Salud"])

    if request.method == "POST":
        action = request.POST.get("action")
        
        if action == "propose_initiative":
            content = request.POST.get("content")
            theme = request.POST.get("theme")
            if not content or not theme:
                messages.error(request, "El contenido y el tema son obligatorios.")
            else:
                capsule = Capsule(
                    uid=f"citizen_{request.user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                    usuario=request.user,
                    contenido=content,
                    ubicacion=request.user.ubicacion,
                    modo="ciudadano",
                    fecha=timezone.now().date(),
                    privacy="publico",
                    time_scale="dia",
                    price=0.0,
                    temas=[theme],
                    parameters={'initiative': True, 'votes': 0},
                    variables={'visibility_range': request.user.notification_distance}
                )
                capsule.save()
                messages.success(request, "Iniciativa propuesta exitosamente.")
            return redirect('citizen_participation')

    # Obtener iniciativas cercanas si hay ubicación
    initiatives = Capsule.objects.filter(modo="ciudadano", privacy="publico")
    if request.user.ubicacion:
        initiatives = initiatives.filter(
            ubicacion__distance_lte=(request.user.ubicacion, request.user.notification_distance)
        ).annotate(
            distance=Distance('ubicacion', request.user.ubicacion)
        ).order_by('distance')
    else:
        initiatives = initiatives.order_by('-timestamp')
    
    initiatives = initiatives[:20]

    return render(request, 'citizen_participation.html', {
        'initiatives': initiatives,
        'themes': themes,
        'user': request.user
    })

class VoteView(View):
    """Vista para procesar votos en iniciativas vía API."""
    def post(self, request, capsule_id):
        if not request.user.is_authenticated:
            return JsonResponse({'success': False, 'message': 'Autenticación requerida'}, status=401)
        
        try:
            capsule = Capsule.objects.get(uid=capsule_id, modo="ciudadano")
            vote = request.POST.get('vote')
            votes = capsule.parameters.get('votes', 0)
            
            if vote == 'up':
                capsule.parameters['votes'] = votes + 1
                message = "Voto a favor registrado."
            elif vote == 'down':
                capsule.parameters['votes'] = votes - 1
                message = "Voto en contra registrado."
            else:
                return JsonResponse({'success': False, 'message': 'Voto inválido'}, status=400)
            
            capsule.save()
            return JsonResponse({'success': True, 'votes': capsule.parameters['votes'], 'message': message})
        except Capsule.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Iniciativa no encontrada'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)