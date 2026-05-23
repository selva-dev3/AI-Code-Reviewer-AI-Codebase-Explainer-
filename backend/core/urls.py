from django.contrib import admin
from django.urls import path, include
from explainer import views as explainer_views
from reviewer import views as reviewer_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/review', include('reviewer.urls')),
    path('api/dashboard', reviewer_views.dashboard_stats, name='dashboard'),
    path('api/explain', explainer_views.execute_explain, name='explain'),
    path('api/embed', explainer_views.index_project_embeddings, name='embed'),
]
