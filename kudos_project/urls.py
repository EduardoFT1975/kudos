# kudos_project/urls.py
from django.contrib import admin
from django.urls import path, include
from kudos_app.views import control_panel, capsule_museum, create_capsule, personal_assistant
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('map/', include('kudos_app.urls'), name='map_view'),
    path('control_panel/', control_panel.control_panel_view, name='control_panel'),
    path('assistant/', control_panel.assistant_interaction, name='assistant_interaction'),
    path('capsule_museum/', capsule_museum.capsule_museum_view, name='capsule_museum'),
    path('create_capsule/', create_capsule.create_capsule_view, name='create_capsule'),
    path('personal_assistant/', personal_assistant.personal_assistant, name='personal_assistant'),
    path('accounts/login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='login'),
]