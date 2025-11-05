"""
fms_project URL Configuration
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Point all 'api/' requests to the fms_api app's urls.py
    path('api/', include('fms_api.urls')), 
]