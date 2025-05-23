# kudos_project/urls.py

from django.urls import path
from kudos_app.views import map_view

urlpatterns = [
    path('map/', map_view, name='map_view'),
]