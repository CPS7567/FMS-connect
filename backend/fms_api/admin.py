from django.contrib import admin
from .models import Staff, Request

@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    """
    Configuration for the Staff model in the Django admin panel.
    """
    list_display = (
        'name', 'task_type', 'gender', 'status', 
        'current_building', 'current_location_floor', 'user'
    )
    list_filter = ('status', 'task_type', 'gender', 'current_building')
    search_fields = ('name', 'user__username')
    ordering = ('name',)

@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    """
    Configuration for the Request model in the Django admin panel.
    """
    list_display = (
        'id', 'task_type', 'status', 'building', 'location_floor', 
        'assigned_to', 'submitted_by', 'registration_time'
    )
    list_filter = ('status', 'task_type', 'building', 'registration_time')
    search_fields = ('id', 'description', 'submitted_by__username', 'assigned_to__name')
    ordering = ('-registration_time',)
    
    # Make some fields read-only in the admin detail view
    readonly_fields = ('registration_time', 'submitted_by')