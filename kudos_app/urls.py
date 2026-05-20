# kudos_app/urls.py
"""
Rutas de la aplicación Kudos.
Cada ruta apunta a una vista en kudos_app/views.py.
"""
from django.urls import path
from kudos_app import views

app_name = None  # Sin namespace para que {% url 'home' %} funcione

urlpatterns = [
    # Páginas principales
    # AXÓN · home real restaurado tras el debug-home temporal. Si vuelve
    # a aparecer un 500 en `/`, NO ocultar de nuevo · diagnosticar la vista
    # `home` directamente (template, queries, context processor). El
    # healthcheck queda accesible para infra checks en /api/health/.
    path('', views.home, name='home'),
    path('home/', views.home, name='home_full'),   # alias estable
    path('healthcheck/', views.healthcheck, name='healthcheck'),   # infra ping
    path('dashboard/', views.dashboard, name='dashboard'),
    path('control_panel/', views.dashboard, name='control_panel'),
    path('onboarding/', views.onboarding, name='onboarding'),
    path('manifiesto/', views.manifesto, name='manifesto'),
    path('register/', views.register, name='register'),

    # Cápsulas
    path('capsules/', views.capsule_list, name='capsule_list'),
    path('capsules/create/', views.create_capsule, name='create_capsule'),
    path('capsules/<str:uid>/', views.capsule_detail, name='capsule_detail'),
    path('capsules/<str:uid>/like/', views.toggle_like, name='toggle_like'),
    path('capsules/<str:uid>/ar/', views.ar_view, name='ar_view'),
    path('capsules/<str:uid>/delete/', views.delete_capsule, name='delete_capsule'),

    # ─── Cápsulas multidimensionales (5D) ───
    path('capsules/<str:uid>/clip/', views.capsule_video_clip, name='capsule_video_clip'),
    path('capsules/<str:uid>/audio/', views.capsule_audio, name='capsule_audio'),
    path('capsules/<str:uid>/vr/', views.capsule_vr, name='capsule_vr'),
    path('capsules/<str:uid>/enrich/', views.capsule_ai_enrich, name='capsule_ai_enrich'),

    # ─── Versionado + Capa Diálogo / Hecho (MEMENTO V2) ───
    path('capsules/<str:uid>/versions/', views.capsule_versions, name='capsule_versions'),
    path('capsules/<str:uid>/versions/<int:version_id>/revert/', views.capsule_version_revert, name='capsule_version_revert'),
    path('capsules/<str:uid>/aport/', views.capsule_aport_create, name='capsule_aport_create'),
    path('capsules/<str:uid>/aport/<int:aport_id>/validate/', views.capsule_aport_validate, name='capsule_aport_validate'),
    path('capsules/<str:uid>/dialog/', views.capsule_dialog, name='capsule_dialog'),
    path('api/capsules/5d/', views.api_capsules_5d, name='api_capsules_5d'),
    path('api/capsules/<str:uid>/light/', views.api_capsule_light, name='api_capsule_light'),  # AXÓN D5 · lazy popup metadata
    path('api/capsules/nearby/', views.api_capsules_nearby, name='api_capsules_nearby'),
    path('api/capsules/<str:uid>/memento.json', views.api_capsule_memento, name='api_capsule_memento'),
    path('near/', views.near, name='near'),
    path('preferences/', views.user_preferences, name='user_preferences'),

    # Mapa y geolocalización
    path('map/', views.map_view, name='map'),
    path('historical-map/', views.historical_map, name='historical_map'),
    path('geolocation/', views.geolocation, name='geolocation'),

    # Búsqueda global (NUEVA FUNCIONALIDAD)
    path('search/', views.global_search, name='search'),

    # Repositorio de Sabiduría
    path('wisdom/', views.wisdom_repository, name='wisdom_repository'),
    path('wisdom/spaces/', views.wisdom_spaces, name='wisdom_spaces'),

    # Mercado
    path('marketplace/', views.marketplace, name='marketplace'),
    path('marketplace/create/', views.create_operation, name='create_operation'),

    # Congreso de la Conciencia Colectiva Global
    path('congress/', views.global_consciousness, name='global_consciousness'),
    path('congress/propose/', views.create_proposal, name='create_proposal'),
    path('congress/<int:proposal_id>/vote/<str:choice>/', views.vote_proposal, name='vote_proposal'),

    # Espacios sociales
    path('social/', views.social_spaces, name='social'),
    path('social/<int:space_id>/', views.social_space_detail, name='social_space_detail'),
    path('social/<int:space_id>/join/', views.join_social_space, name='join_social_space'),

    # Deportes y Competiciones
    path('sports/', views.sports_competitions, name='sports_competitions'),
    path('sports/<int:competition_id>/', views.competition_detail, name='competition_detail'),
    path('sports/<int:competition_id>/join/', views.join_competition, name='join_competition'),

    # Salud Mental
    path('mental-health/', views.mental_health, name='mental_health'),
    path('mental-health/log/', views.log_mood, name='log_mood'),

    # Espiritualidad
    path('spirituality/', views.spirituality, name='spirituality'),

    # Asistente personal
    path('assistant/', views.personal_assistant, name='personal_assistant'),
    path('assistant/chat/', views.assistant_chat, name='assistant_chat'),

    # Chatbot
    path('chatbot/', views.chatbot, name='chatbot'),

    # Simulador del futuro
    path('simulator/', views.future_simulator, name='future_simulator'),
    path('simulation-engine/', views.simulation_engine, name='simulation_engine'),

    # Exploración espacial
    path('space-exploration/', views.space_exploration, name='space_exploration'),

    # Arte y festivales
    path('art-festival/', views.art_festival, name='art_festival'),

    # Legado
    path('legacy/', views.kudos_legacy, name='kudos_legacy'),

    # Operaciones virtuales
    path('virtual-operations/', views.virtual_operations, name='virtual_operations'),

    # Ciudadanía y participación
    path('citizen/', views.citizen_participation, name='citizen_participation'),

    # Noticias
    path('news/', views.news, name='news'),

    # Tendencias
    path('trending/', views.trending, name='trending'),

    # Línea temporal
    path('timeline/', views.timeline, name='timeline'),

    # Streaming
    path('streaming/', views.streaming, name='streaming'),

    # Salud (monitor)
    path('health-monitor/', views.health_monitor, name='health_monitor'),

    # Conciencia global
    path('connect/', views.connect, name='connect'),

    # Promoción y espacios
    path('promotion/', views.promotion_spaces, name='promotion_spaces'),

    # Notificaciones (NUEVA)
    path('notifications/', views.notifications, name='notifications'),
    path('notifications/<int:notif_id>/read/', views.mark_notification_read, name='mark_notification_read'),

    # Logros / Insignias (NUEVA)
    path('achievements/', views.achievements, name='achievements'),

    # Perfil
    path('profile/', views.profile, name='profile'),
    path('profile/edit/', views.edit_profile, name='edit_profile'),
    path('profile/<str:alias>/', views.public_profile, name='public_profile'),

    # Análisis de datos
    path('data-analysis/', views.data_analysis, name='data_analysis'),

    # Reportes
    path('report/', views.report, name='report'),
    path('feedback/', views.feedback, name='feedback'),
    path('safety/', views.safety, name='safety'),

    # Toggle dark mode (NUEVA)
    path('toggle-dark-mode/', views.toggle_dark_mode, name='toggle_dark_mode'),

    # Exportar datos (NUEVA)
    path('export/capsules/', views.export_capsules, name='export_capsules'),

    # API simple
    path('api/capsules/', views.api_capsules, name='api_capsules'),
    path('api/stats/', views.api_stats, name='api_stats'),

    # AXÓN · Phase 0 fundación contextual
    path('api/health/', views.api_health, name='api_health'),
    path('api/places/<slug:slug>/', views.api_place_detail, name='api_place_detail'),

    # PANEL DEL FUNDADOR (privado)
    path('founder/', views.founder_panel, name='founder_panel'),
    path('founder/moderate/<str:uid>/', views.founder_moderate_capsule, name='founder_moderate_capsule'),
    path('founder/organization/', views.founder_organization, name='founder_organization'),
    path('founder/strategic/', views.founder_strategic, name='founder_strategic'),
    path('founder/tactical/', views.founder_tactical, name='founder_tactical'),
    path('founder/financial/', views.founder_financial, name='founder_financial'),
    path('founder/doc/<str:code>/', views.founder_doc_detail, name='founder_doc_detail'),
    path('founder/kpis/refresh/', views.founder_kpis_refresh, name='founder_kpis_refresh'),

    # ASISTENTE CON PERSONAJES HISTÓRICOS
    path('assistant/characters/', views.assistant_with_character, name='assistant_characters'),
    path('assistant/characters/chat/', views.assistant_chat_with_character, name='assistant_chat_character'),

    # KUDOS MIND · IA INTERNA
    path('mind/', views.ai_panel, name='ai_panel'),
    path('mind/chat/', views.ai_chat, name='ai_chat'),
    path('mind/chat/send/', views.ai_chat_send, name='ai_chat_send'),
    # AXÓN D12 · Mind Lite (3 prompts contextuales, público con login)
    path('mind/ask/', views.ai_lite_ask, name='ai_lite_ask'),
    path('mind/insight/<int:insight_id>/archive/', views.ai_insight_archive, name='ai_insight_archive'),
    path('mind/insight/<int:insight_id>/execute/', views.ai_insight_execute, name='ai_insight_execute'),
    path('mind/insight/<int:insight_id>/accept/', views.ai_insight_accept, name='ai_insight_accept'),
    path('mind/chat/', views.ai_chat, name='ai_chat'),
    path('mind/directive/<int:directive_id>/toggle/', views.ai_directive_toggle, name='ai_directive_toggle'),

    # FEED, RED SOCIAL Y MENSAJERÍA
    path('feed/', views.feed, name='feed'),
    path('follow/<str:alias>/', views.follow_user, name='follow_user'),
    path('messages/', views.messages_inbox, name='messages_inbox'),
    path('messages/send/', views.messages_send, name='messages_send'),
    path('bookmarks/', views.bookmarks_list, name='bookmarks_list'),

    # PAGINAS INSTITUCIONALES
    path('about/', views.about, name='about'),
    path('terms/', views.terms, name='terms'),
    path('privacy/', views.privacy, name='privacy'),
    path('personal/', views.personal_dashboard, name='personal_dashboard'),
    path('personal/journal/', views.personal_journal, name='personal_journal'),
    path('personal/learning/', views.personal_learning, name='personal_learning'),
    path('personal/health/', views.personal_health, name='personal_health'),
    path('personal/crypto/', views.personal_crypto, name='personal_crypto'),
    path('personal/habit/<int:habit_id>/toggle/', views.personal_habit_toggle, name='personal_habit_toggle'),
]
