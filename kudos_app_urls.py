# kudos_app/urls.py

from django.urls import path
from kudos_app.views import control, wisdom_repository, marketplace, simulation_engine

urlpatterns = [
    path('control/', control, name='control'),
    path('wisdom/', wisdom_repository, name='wisdom_repository'),
    path('marketplace/', marketplace, name='marketplace'),
    path('simulation/', simulation_engine, name='simulation_engine'),
]