# kudos_project/urls.py
"""
URLs principales del proyecto Kudos.
Incluye admin, autenticación y todas las rutas de la app kudos_app.
"""
from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    # Panel administrativo de Django
    path('admin/', admin.site.urls),

    # Autenticación
    path(
        'accounts/login/',
        auth_views.LoginView.as_view(template_name='registration/login.html'),
        name='login',
    ),
    path('accounts/logout/', auth_views.LogoutView.as_view(next_page='/'), name='logout'),
    path(
        'accounts/password_change/',
        auth_views.PasswordChangeView.as_view(template_name='registration/password_change.html'),
        name='password_change',
    ),
    path(
        'accounts/password_change/done/',
        auth_views.PasswordChangeDoneView.as_view(template_name='registration/password_change_done.html'),
        name='password_change_done',
    ),

    # Todas las rutas de la app
    path('', include('kudos_app.urls')),
]

# Servir archivos media y static en modo DEBUG
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
