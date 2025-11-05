from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Staff, Request, BuildingChoices, GenderChoices, StaffStatus

# --- User & Staff Serializers ---

class StaffSerializer(serializers.ModelSerializer):
    """
    Serializer for the Staff model.
    """
    # Make user details read-only, nested
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Staff
        fields = [
            'id', 'name', 'task_type', 'gender', 
            'current_building', 'current_wing', 'current_location_floor', 
            'status', 'user', 'user_email'
        ]
        # 'user' is write-only (set during creation), not shown on retrievals
        extra_kwargs = {
            'user': {'write_only': True}
        }

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new user.
    """
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

# --- Request Serializers ---

class RequestSerializer(serializers.ModelSerializer):
    """
    Full request serializer for staff and admin.
    """
    # Make related fields human-readable
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Request
        fields = [
            'id', 'task_type', 'building', 'wing', 'location_floor', 
            'description', 'status', 'registration_time', 
            'submitted_by', 'submitted_by_username', 
            'assigned_to', 'assigned_to_name'
        ]
        # submitted_by is set automatically from the logged-in user
        read_only_fields = ['status', 'registration_time', 'submitted_by', 'assigned_to']

class RequestCreateSerializer(serializers.ModelSerializer):
    """
    A simplified serializer for students creating a new request.
    """
    class Meta:
        model = Request
        fields = [
            'task_type', 'building', 'wing', 'location_floor', 'description'
        ]
    
    # Serializer-level validation
    def validate(self, data):
        # Use the model's clean method to validate floor limits
        # We must create a temporary instance to call its clean() method
        instance = Request(**data)
        try:
            instance.clean()
        except serializers.ValidationError as e:
            raise serializers.ValidationError(e.args[0])
        return data

class StaffLocationUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for staff to update their *own* location when free.
    """
    class Meta:
        model = Staff
        fields = ['current_building', 'current_wing', 'current_location_floor']
        
# ... (at the end of fms_api/serializers.py) ...

class AdminRequestEditSerializer(serializers.ModelSerializer):
    """
    A serializer for admins to edit any field on a request.
    """
    class Meta:
        model = Request
        fields = [
            'task_type', 
            'building', 
            'wing', 
            'location_floor', 
            'description', 
            'status'
        ]
        
class StaffCreateSerializer(serializers.Serializer):
    """
    Serializer for an Admin to create a new worker.
    This creates both a User and a Staff profile.
    """
    # User fields
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    
    # Staff fields
    name = serializers.CharField(max_length=100)
    task_type = serializers.CharField(max_length=50)
    gender = serializers.ChoiceField(choices=GenderChoices.choices)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def create(self, validated_data):
        # Create the User
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', '')
        )
        
        # Create the Staff profile
        staff = Staff.objects.create(
            user=user,
            name=validated_data['name'],
            task_type=validated_data['task_type'],
            gender=validated_data['gender'],
            status=StaffStatus.FREE  # Default to 'free'
        )
        
        return staff