from django.db import models
from django.contrib.auth.models import User # Using Django's built-in User
from django.core.exceptions import ValidationError

# --- Location Choices (LHC Added) ---
class BuildingChoices(models.TextChoices):
    GIRLS_HOSTEL = 'girls_hostel', 'Girls Hostel'
    BH_OLD = 'boys_hostel_old', 'Boys Hostel (Old)'
    BH_H1 = 'boys_hostel_h1', 'Boys Hostel (H1)'
    BH_H2 = 'boys_hostel_h2', 'Boys Hostel (H2)'
    LHC = 'lhc', 'LHC (Lecture Hall Complex)'  # --- NEW ---
    RD = 'rnd', 'R&D Building'
    ACADEMIC = 'academic', 'Old Academic Building'
    GUEST_HOUSE = 'guest_house', 'Guest House'
    LIBRARY = 'library', 'Library'

# --- Gender Choices ---
class GenderChoices(models.TextChoices):
    MALE = 'M', 'Male'
    FEMALE = 'F', 'Female'

class TaskStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'

class StaffStatus(models.TextChoices):
    FREE = 'free', 'Free'
    BUSY = 'busy', 'Busy'

class Staff(models.Model):
    """
    Represents a staff member (a 'Worker' in the original script).
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    task_type = models.CharField(max_length=50, db_index=True) 
    
    gender = models.CharField(
        max_length=1, 
        choices=GenderChoices.choices
    )
    current_building = models.CharField(
        max_length=50, 
        choices=BuildingChoices.choices,
        default=BuildingChoices.ACADEMIC # Default starting location
    )
    current_wing = models.CharField(
        max_length=10, 
        blank=True, 
        null=True,
        help_text="e.g., 'A', 'B', 'North', etc."
    )
    current_location_floor = models.IntegerField(default=1)
    
    status = models.CharField(
        max_length=20, 
        choices=StaffStatus.choices, 
        default=StaffStatus.FREE
    )
    
    def __str__(self):
        return f"{self.name} ({self.task_type}) - {self.gender}"

class Request(models.Model):
    """
    Represents a work request (a 'Task' in the original script).
    """
    task_type = models.CharField(max_length=50, db_index=True)
    
    building = models.CharField(
        max_length=50, 
        choices=BuildingChoices.choices,
        db_index=True
    )
    wing = models.CharField(
        max_length=10, 
        blank=True, 
        null=True,
        help_text="e.g., 'A', 'B', 'C' for Old Boys Hostel"
    )
    location_floor = models.IntegerField()

    description = models.TextField(blank=True)
    
    status = models.CharField(
        max_length=20, 
        choices=TaskStatus.choices, 
        default=TaskStatus.PENDING,
        db_index=True
    )
    registration_time = models.DateTimeField(auto_now_add=True)
    
    submitted_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='submitted_requests'
    )
    assigned_to = models.ForeignKey(
        Staff, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_tasks'
    )

    def clean(self):
        """
        Adds validation logic for floors based on building.
        """
        floor_limits = {
            BuildingChoices.GIRLS_HOSTEL: 6,
            BuildingChoices.BH_OLD: 7,
            BuildingChoices.BH_H1: 11,
            BuildingChoices.BH_H2: 11,
            BuildingChoices.LHC: 5,  # --- NEW ---
            BuildingChoices.RD: 8,
            BuildingChoices.ACADEMIC: 6,
            BuildingChoices.GUEST_HOUSE: 1,
            BuildingChoices.LIBRARY: 4,
        }
        if self.building in floor_limits:
            max_floor = floor_limits[self.building]
            if not (1 <= self.location_floor <= max_floor):
                raise ValidationError(
                    f"Floor for {self.get_building_display()} "
                    f"must be between 1 and {max_floor}."
                )

    def __str__(self):
        wing_str = f" (Wing {self.wing})" if self.wing else ""
        return (f"Request #{self.id}: {self.task_type} at "
                f"{self.get_building_display()}{wing_str} - Floor {self.location_floor} "
                f"({self.get_status_display()})")