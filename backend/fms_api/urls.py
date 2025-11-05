from django.urls import path
from . import views

urlpatterns = [
    # --- Authentication ---
    path('login/', views.CustomObtainAuthTokenView.as_view(), name='api-login'),
    path('register/', views.RegisterUserView.as_view(), name='api-register'),

    # --- Student URLs ---
    path('requests/create/', views.CreateRequestView.as_view(), name='request-create'),
    path('requests/my-requests/', views.StudentRequestListView.as_view(), name='request-list-student'),

    # --- Staff URLs ---
    path('staff/my-tasks/', views.StaffTaskListView.as_view(), name='task-list-staff'),
    path('staff/task/complete/<int:pk>/', views.CompleteTaskView.as_view(), name='task-complete'),
    path('staff/update-location/', views.UpdateStaffLocationView.as_view(), name='staff-update-location'),

    # --- Admin URLs ---
    path('admin/all-requests/', views.AdminRequestListView.as_view(), name='admin-request-list'),
    path('admin/all-staff/', views.AdminStaffListView.as_view(), name='admin-staff-list'),
    path('admin/request/complete/<int:pk>/', views.AdminCompleteRequestView.as_view(), name='admin-request-complete'),
    path('admin/request/edit/<int:pk>/', views.AdminEditRequestView.as_view(), name='admin-request-edit'),
    path('admin/request/delete/<int:pk>/', views.AdminDeleteRequestView.as_view(), name='admin-request-delete'),
    path('admin/staff/create/', views.AdminCreateStaffView.as_view(), name='admin-staff-create'),
    path('admin/staff/delete/<int:pk>/', views.AdminDeleteStaffView.as_view(), name='admin-staff-delete'),
]