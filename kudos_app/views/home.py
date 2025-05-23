# kudos_app/views/home.py

"""
Vista para la página de inicio de Kudos.
Muestra una visión general del sistema y proporciona enlaces a las principales funcionalidades.
"""

from django.shortcuts import render
from kudos_app.models import Capsule

def home(request):
    """
    Vista para la página de inicio.
    Muestra cápsulas recientes y, si el usuario está autenticado, sus propias cápsulas recientes.
    """
    # Obtener las últimas 5 cápsulas creadas
    recent_capsules = Capsule.objects.order_by('-timestamp')[:5]
    
    # Inicializar el contexto
    context = {
        'recent_capsules': recent_capsules
    }
    
    # Si el usuario está autenticado, obtener sus propias cápsulas recientes
    if request.user.is_authenticated:
        user_capsules = Capsule.objects.filter(usuario=request.user).order_by('-timestamp')[:5]
        context['user_capsules'] = user_capsules
        context['username'] = request.user.alias
    
    return render(request, 'home.html', context)