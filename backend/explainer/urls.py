from django.urls import path
from . import views

urlpatterns = [
    path('', views.execute_explain, name='explain'),
    path('embed', views.index_project_embeddings, name='embed'),
]
