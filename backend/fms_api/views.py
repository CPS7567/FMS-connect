from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework import generics, views, status, permissions
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from django.db.models import Q

from .models import Request, Staff, TaskStatus, StaffStatus
from .serializers import (
    UserSerializer, StaffSerializer, RequestSerializer, 
    RequestCreateSerializer, StaffLocationUpdateSerializer,
    AdminRequestEditSerializer, StaffCreateSerializer
)
from scheduler.logic import (
    find_and_assign_next_task_for_worker, 
    trigger_assignment_for_new_task
)
import logging

logger = logging.getLogger(__name__)

# --- Authentication Views ---

class CustomObtainAuthTokenView(ObtainAuthToken):
    """
    Custom login view to return user role (student/staff/admin) along with token.
    """
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        # Determine user role
        is_staff_member = hasattr(user, 'staff')
        role = 'student' # Default
        if user.is_staff:
            role = 'admin'
        elif is_staff_member:
            role = 'staff'

        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'role': role
        })

class RegisterUserView(generics.CreateAPIView):
    """
    API endpoint for registering a new user (default: student).
    """
    permission_classes = [permissions.AllowAny] # Anyone can register
    serializer_class = UserSerializer

# --- Request Management Views ---

class CreateRequestView(generics.CreateAPIView):
    """
    API endpoint for a student to create a new service request.
    The scheduler is triggered upon successful creation.
    """
    serializer_class = RequestCreateSerializer
    permission_classes = [permissions.IsAuthenticated] # Must be logged in

    def perform_create(self, serializer):
        # 1. Save the request, linking it to the logged-in user
        new_request = serializer.save(
            submitted_by=self.request.user,
            status=TaskStatus.PENDING
        )
        
        logger.info(f"New request {new_request.id} created by {self.request.user.username}")
        
        # 2. --- TRIGGER SCHEDULER ---
        # Try to find a free worker for this new task immediately
        try:
            trigger_assignment_for_new_task(new_request)
        except Exception as e:
            # Log the error, but don't fail the request.
            # The task is still queued and will be picked up later.
            logger.error(f"Scheduler trigger failed for new task {new_request.id}: {e}")

class StudentRequestListView(generics.ListAPIView):
    """
    API endpoint for a student to see *their own* submitted requests.
    """
    serializer_class = RequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return requests submitted by the currently logged-in user
        return Request.objects.filter(submitted_by=self.request.user).order_by('-registration_time')

# --- Staff Task Management Views ---

class StaffTaskListView(generics.ListAPIView):
    """
    API endpoint for a staff member to see *their assigned* tasks.
    """
    serializer_class = RequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Find the Staff profile linked to the logged-in User
        try:
            staff_member = self.request.user.staff
            # Return active (in-progress) and pending tasks for their task_type
            return Request.objects.filter(
                Q(assigned_to=staff_member) | Q(status=TaskStatus.PENDING, task_type=staff_member.task_type)
            ).order_by('status', 'registration_time')
        except Staff.DoesNotExist:
            return Request.objects.none() # Not a staff member, return nothing

class CompleteTaskView(views.APIView):
    """
    API endpoint for a staff member to mark their current task as 'Completed'.
    This triggers the scheduler to find them their *next* task.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            staff_member = request.user.staff
        except Staff.DoesNotExist:
            return Response(
                {"error": "You are not a registered staff member."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 1. Find the task
        task = get_object_or_404(Request, pk=pk)
        
        # 2. Validate that this staff member is assigned to this task
        if task.assigned_to != staff_member:
            return Response(
                {"error": "This task is not assigned to you."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 3. Mark task as completed
        task.status = TaskStatus.COMPLETED
        task.save()
        
        logger.info(f"Task {task.id} marked complete by {staff_member.name}")

        # 4. --- TRIGGER SCHEDULER ---
        # Worker is now free, find their next closest task
        staff_member.status = StaffStatus.FREE
        staff_member.save() # Save 'free' status
        
        try:
            next_task = find_and_assign_next_task_for_worker(staff_member)
            if next_task:
                return Response(
                    {"message": "Task completed successfully. New task assigned.", 
                     "new_task": RequestSerializer(next_task).data},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {"message": "Task completed. No new tasks in queue. You are free."},
                    status=status.HTTP_200_OK
                )
        except Exception as e:
            logger.error(f"Scheduler failed to find next task for {staff_member.name}: {e}")
            return Response(
                {"message": "Task completed, but scheduler failed to assign next task."},
                status=status.HTTP_200_OK
            )

class UpdateStaffLocationView(generics.UpdateAPIView):
    """
    API endpoint for a *free* staff member to update their own location.
    """
    serializer_class = StaffLocationUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        try:
            return self.request.user.staff
        except Staff.DoesNotExist:
            raise PermissionError("You are not a staff member.")

    def update(self, request, *args, **kwargs):
        staff_member = self.get_object()
        if staff_member.status == StaffStatus.BUSY:
            return Response(
                {"error": "Cannot update location while 'Busy'. Complete your task first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().update(request, *args, **kwargs)

# --- Admin Views (Example) ---

class AdminRequestListView(generics.ListAPIView):
    """
    API endpoint for Admins to see *all* requests.
    """
    serializer_class = RequestSerializer
    permission_classes = [permissions.IsAdminUser] # Only Admin users
    
    def get_queryset(self):
        return Request.objects.all().order_by('-registration_time')

class AdminStaffListView(generics.ListAPIView):
    """
    API endpoint for Admins to see *all* staff.
    """
    serializer_class = StaffSerializer
    permission_classes = [permissions.IsAdminUser] # Only Admin users
    
    def get_queryset(self):
        return Staff.objects.all()
    
# ... (at the end of fms_api/views.py, after AdminStaffListView) ...

class AdminCompleteRequestView(views.APIView):
    """
    API endpoint for an Admin to mark *any* request as 'Completed'.
    This view bypasses the scheduler.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk, *args, **kwargs):
        task = get_object_or_404(Request, pk=pk)
        
        # Check if staff is assigned, and if so, free them
        if task.assigned_to:
            staff_member = task.assigned_to
            staff_member.status = StaffStatus.FREE
            staff_member.save()
            
        task.status = TaskStatus.COMPLETED
        task.save()
        
        logger.info(f"[Admin] Task {task.id} marked complete by {request.user.username}")
        
        return Response(
            {"message": "Request marked as complete."}, 
            status=status.HTTP_200_OK
        )

class AdminEditRequestView(generics.UpdateAPIView):
    """
    API endpoint for an Admin to edit any part of a request.
    """
    permission_classes = [permissions.IsAdminUser]
    queryset = Request.objects.all()
    serializer_class = AdminRequestEditSerializer # Use the new serializer

class AdminDeleteRequestView(generics.DestroyAPIView):
    """
    API endpoint for an Admin to delete a request.
    """
    permission_classes = [permissions.IsAdminUser]
    queryset = Request.objects.all()
    
    def perform_destroy(self, instance):
        logger.info(f"[Admin] Task {instance.id} deleted by {self.request.user.username}")
        super().perform_destroy(instance)
        
class AdminCreateStaffView(generics.CreateAPIView):
    """
    API endpoint for an Admin to create a new Staff member (User + Staff profile).
    """
    permission_classes = [permissions.IsAdminUser]
    serializer_class = StaffCreateSerializer
    
    def create(self, request, *args, **kwargs):
        # 1. Use the StaffCreateSerializer to validate and create the objects
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # serializer.save() calls our .create() method and returns the Staff instance
        staff_instance = serializer.save()
        
        # 2. Use the StaffSerializer (for output) to create the response data
        output_serializer = StaffSerializer(staff_instance)
        
        headers = self.get_success_headers(output_serializer.data)
        return Response(
            output_serializer.data, 
            status=status.HTTP_201_CREATED, 
            headers=headers
        )
        
# ... (at the end of fms_api/views.py) ...

class AdminDeleteStaffView(views.APIView):
    """
    API endpoint for an Admin to delete a Staff member.
    This deletes both the Staff profile and the associated User.
    """
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, pk, *args, **kwargs):
        # Find the Staff profile
        staff_member = get_object_or_404(Staff, pk=pk)
        
        # Find the associated User
        user = staff_member.user
        
        try:
            # Delete the Staff profile first
            staff_member.delete()
            # Then delete the User
            user.delete()
            
            logger.info(f"[Admin] Deleted staff member {staff_member.name} (User: {user.username})")
            
            return Response(
                {"message": f"Staff member '{staff_member.name}' and user '{user.username}' deleted."},
                status=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            logger.error(f"Error deleting staff {staff_member.name}: {e}")
            return Response(
                {"error": "Error deleting staff member."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )