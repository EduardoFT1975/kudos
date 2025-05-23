# kudos_project/urls.py

from django.urls import path
from kudos_app.views import (
    capsule_search, capsule_museum, create_capsule, historical_map,
    education_plan, education_recommender, ar_view, vr_view,
    wisdom_repositories, admin_assistant, admin_panel, personal_assistant,
    simulate_activity
)

urlpatterns = [
    path('', capsule_search, name='capsule_search'),
    path('search/', capsule_search, name='capsule_search'),
    path('museum/', capsule_museum, name='capsule_museum'),
    path('create/', create_capsule, name='create_capsule'),
    path('historical_map/', historical_map, name='historical_map'),
    path('education_plan/', education_plan, name='education_plan'),
    path('education_recommender/', education_recommender, name='education_recommender'),
    path('ar/<int:capsule_id>/', ar_view, name='ar_view'),
    path('vr/<int:capsule_id>/', vr_view, name='vr_view'),
    path('wisdom_repositories/', wisdom_repositories, name='wisdom_repositories'),
    path('admin_assistant/', admin_assistant, name='admin_assistant'),
    path('admin_panel/', admin_panel, name='admin_panel'),
    path('personal_assistant/', personal_assistant, name='personal_assistant'),
    path('simulate_activity/', simulate_activity, name='simulate_activity'),
]