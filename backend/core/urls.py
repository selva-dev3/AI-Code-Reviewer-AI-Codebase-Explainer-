from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/review/', include('reviewer.urls')),
    path('api/explain/', include('explainer.urls')),
]
