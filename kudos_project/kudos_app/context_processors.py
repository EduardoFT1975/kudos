# kudos_app/context_processors.py
"""
Variables disponibles en TODAS las plantillas automáticamente.
"""
from kudos_app.models import Notification


def global_context(request):
    """Variables globales para todas las páginas."""
    ctx = {
        # ═════════════════════════════════════════════════════════
        # KUDOS · Marca única
        # ═════════════════════════════════════════════════════════
        # Decisión: el proyecto se llama KUDOS. Los módulos heredan los
        # conceptos antiguos (Mind, Vault, Connect, Memento, Atlas, Time).
        'PROJECT_NAME': 'Kudos',
        'PROJECT_TAGLINE': 'Preserva tu legado · Conecta con la humanidad · Vive para siempre',
        'BRAND_TOKEN': '$KDS',
        # Submarcas/módulos:
        'MODULE_VAULT':   'Kudos Vault',     # Archivo inmutable 5D
        'MODULE_CONNECT': 'Kudos Connect',   # Red social y desintermediación
        'MODULE_MIND':    'Kudos Mind',      # IA interna multi-agente
        'MODULE_ATLAS':   'Kudos Atlas',     # Mapa multidimensional
        'MODULE_MEMENTO': 'Kudos Memento',   # La cápsula de memoria (concepto)
        'MODULE_TIME':    'Kudos Time',      # Suscripción premium / eternidad
        'PROJECT_PHASES': [
            {'code': 'vault', 'name': 'Kudos Vault', 'icon': '🌱',
             'tagline': 'Memoria inmutable 5D',
             'description': 'Cápsulas sensoriales con lugar, tiempo, clima, sentimiento y mérito. Sin borrado posible.'},
            {'code': 'connect', 'name': 'Kudos Connect', 'icon': '🔗',
             'tagline': 'Red de conciencia',
             'description': 'Comunidad multiformato. Compartir capsulas con amigos. Misioneros que validan la verdad.'},
            {'code': 'mind', 'name': 'Kudos Mind', 'icon': '🤖',
             'tagline': 'IA generativa interna 24/7',
             'description': 'Multi-agente que importa, modera, narra, recomienda. Conversa contigo y ejecuta tareas.'},
        ],
        'PRIMARY_COLOR': '#1E3A8A',
        'GOLD_COLOR': '#D4AF37',     # Dorado Eterno
        'NEON_CYAN': '#00E5FF',      # Azul Eléctrico (Mind)
    }
    if request.user.is_authenticated:
        ctx['unread_notifications'] = Notification.objects.filter(
            user=request.user, read=False
        ).count()
        ctx['user_dark_mode'] = request.user.dark_mode
    else:
        ctx['unread_notifications'] = 0
        ctx['user_dark_mode'] = False
    return ctx
