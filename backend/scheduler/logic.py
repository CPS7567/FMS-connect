from fms_api.models import (
    Request, Staff, TaskStatus, StaffStatus, 
    BuildingChoices, GenderChoices
)
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)

# --- Lists for Gender Rules ---
BOYS_HOSTELS = [
    BuildingChoices.BH_OLD, 
    BuildingChoices.BH_H1, 
    BuildingChoices.BH_H2
]
GIRLS_HOSTELS = [BuildingChoices.GIRLS_HOSTEL]

# --- NEW: Campus Proximity Logic ---
# Defines the physical sequence of buildings.
# Guest House is "parallel" to Old Boys, so it gets the SAME index.
CAMPUS_LAYOUT_SEQUENCE = [
    BuildingChoices.BH_H2,         # 0
    BuildingChoices.BH_H1,         # 1
    BuildingChoices.BH_OLD,        # 2
    BuildingChoices.GIRLS_HOSTEL,  # 3
    BuildingChoices.LHC,           # 4
    BuildingChoices.ACADEMIC,      # 5
    BuildingChoices.LIBRARY,       # 6
    BuildingChoices.RD,            # 7
]

# Create a dictionary for quick lookup: {'boys_hostel_h2': 0, ...}
BUILDING_PROXIMITY_MAP = {building: index for index, building in enumerate(CAMPUS_LAYOUT_SEQUENCE)}

# --- KEY CHANGE ---
# Set Guest House to the same proximity index as Old Boys Hostel
BUILDING_PROXIMITY_MAP[BuildingChoices.GUEST_HOUSE] = BUILDING_PROXIMITY_MAP[BuildingChoices.BH_OLD]
# --- END KEY CHANGE ---


def get_building_distance(bldg1, bldg2):
    """
    Calculates the 'travel distance' between two buildings based on the campus layout.
    """
    # Get the index (position) of each building. Default to a "far" position if not found.
    pos1 = BUILDING_PROXIMITY_MAP.get(bldg1, 99)
    pos2 = BUILDING_PROXIMITY_MAP.get(bldg2, 99)
    
    # The distance is the absolute difference of their positions in the layout
    return abs(pos1 - pos2)
# --- END: Campus Proximity Logic ---


def find_and_assign_next_task_for_worker(staff_member: Staff):
    """
    Finds the highest-priority task for a given staff member and assigns it.
    
    UPDATED with parallel (Guest House) proximity logic.
    """
    
    if staff_member.status == StaffStatus.BUSY:
        logger.warning(f"Attempted to assign new task to busy staff member {staff_member.id}")
        return None

    # 1. Base query for pending tasks of the correct type
    base_task_query = Request.objects.filter(
        status=TaskStatus.PENDING,
        task_type=staff_member.task_type
    )
    
    # 2. --- GENDER-BASED FILTERING ---
    if staff_member.gender == GenderChoices.MALE:
        eligible_tasks_query = base_task_query.exclude(building__in=GIRLS_HOSTELS)
    elif staff_member.gender == GenderChoices.FEMALE:
        eligible_tasks_query = base_task_query.exclude(building__in=BOYS_HOSTELS)
    else:
        logger.error(f"Staff {staff_member.id} has no gender set. Cannot assign tasks.")
        return None
    
    pending_tasks = list(eligible_tasks_query)
    
    if not pending_tasks:
        staff_member.status = StaffStatus.FREE
        staff_member.save()
        logger.info(f"No eligible pending '{staff_member.task_type}' tasks for {staff_member.name}.")
        return None

    logger.info(f"Finding task for {staff_member.name} (at {staff_member.current_building}, "
                f"Wing {staff_member.current_wing}, Floor {staff_member.current_location_floor}).")
    logger.info(f"Found {len(pending_tasks)} eligible tasks.")

    # 3. --- NEW MULTI-LEVEL PRIORITIZATION ---
    # Sorts tasks based on:
    #   1. Building Distance (using campus layout)
    #   2. Wing Priority (0 if same building & wing, 1 otherwise)
    #   3. Floor Distance
    #   4. Registration Time (Oldest first)
    def priority_key(task: Request):
        
        # Prio 1: Building Distance (0, 1, 2, ...)
        # e.g., distance(BH_OLD, GUEST_HOUSE) will be 0.
        building_dist = get_building_distance(
            staff_member.current_building, 
            task.building
        )
        
        # --- KEY CHANGE ---
        # Check if they are in the *exact same building*
        is_same_building = (staff_member.current_building == task.building)
        
        # Prio 2: Wing Priority (0 or 1)
        # Priority 0 is ONLY given if it's the *exact same building* AND *exact same wing*.
        # A task in GUEST_HOUSE (building_dist 0) will get wing_priority 1.
        # A task in BH_OLD Wing B (building_dist 0) will get wing_priority 1.
        # A task in BH_OLD Wing A (building_dist 0) will get wing_priority 0.
        # This correctly prioritizes same-wing tasks above all others.
        wing_priority = 0 if (
            is_same_building and task.wing == staff_member.current_wing
        ) else 1
        # --- END KEY CHANGE ---
        
        # Prio 3: Floor Distance (0, 1, 2, ...)
        floor_dist = abs(task.location_floor - staff_member.current_location_floor)
        
        # Prio 4: Registration Time
        time_priority = task.registration_time
        
        return (building_dist, wing_priority, floor_dist, time_priority)

    pending_tasks.sort(key=priority_key)
    
    # 4. Get the highest priority task
    next_task = pending_tasks[0]
    
    logger.info(f"Prioritized list chose: {next_task}")

    # 5. Assign the task to the worker
    staff_member.status = StaffStatus.BUSY
    staff_member.current_building = next_task.building
    staff_member.current_wing = next_task.wing
    staff_member.current_location_floor = next_task.location_floor
    staff_member.save()
    
    # 6. Assign the worker to the task
    next_task.status = TaskStatus.IN_PROGRESS
    next_task.assigned_to = staff_member
    next_task.save()
    
    print(f"--- Task Assigned ---")
    print(f"  Worker: {staff_member.name} (ID: {staff_member.id})")
    print(f"  Task: {next_task}")
    print(f"  Info: Worker moving to {next_task.building}, Floor {next_task.location_floor}.")
    print(f"---------------------")
    
    return next_task


def trigger_assignment_for_new_task(new_task: Request):
    """
    Finds the best available 'free' worker for a newly created task.
    
    UPDATED with parallel (Guest House) proximity logic.
    """
    
    # 1. Base query for free workers of the correct type
    base_worker_query = Staff.objects.filter(
        status=StaffStatus.FREE,
        task_type=new_task.task_type
    )
    
    # 2. --- GENDER-BASED FILTERING ---
    task_building = new_task.building
    
    if task_building in GIRLS_HOSTELS:
        eligible_workers_query = base_worker_query.filter(gender=GenderChoices.FEMALE)
    elif task_building in BOYS_HOSTELS:
        eligible_workers_query = base_worker_query.filter(gender=GenderChoices.MALE)
    else:
        # Public building, any gender is fine
        eligible_workers_query = base_worker_query
        
    available_workers = list(eligible_workers_query)
    
    if not available_workers:
        logger.info(f"New task {new_task.id} queued. No eligible free workers.")
        return None
    
    logger.info(f"Finding best free worker for new task {new_task.id}...")
    logger.info(f"Found {len(available_workers)} eligible free workers.")

    # 3. --- NEW MULTI-LEVEL PRIORITIZATION (for workers) ---
    # Find the worker who is "closest" to the new task
    def proximity_key(worker: Staff):
        
        # Prio 1: Building Distance
        building_dist = get_building_distance(
            worker.current_building, 
            new_task.building
        )
        
        # --- KEY CHANGE ---
        is_same_building = (worker.current_building == new_task.building)
        
        # Prio 2: Wing Priority
        wing_priority = 0 if (
            is_same_building and worker.current_wing == new_task.wing
        ) else 1
        # --- END KEY CHANGE ---
        
        # Prio 3: Floor Distance
        floor_dist = abs(worker.current_location_floor - new_task.location_floor)
        
        return (building_dist, wing_priority, floor_dist)
    
    available_workers.sort(key=proximity_key)
    
    # 4. Get the closest free worker
    best_worker = available_workers[0]
    
    logger.info(f"Closest free worker is {best_worker.name} at {best_worker.current_building}, Floor {best_worker.current_location_floor}.")

    # 5. Assign the task to the worker
    best_worker.status = StaffStatus.BUSY
    best_worker.current_building = new_task.building
    best_worker.current_wing = new_task.wing
    best_worker.current_location_floor = new_task.location_floor
    best_worker.save()
    
    # 6. Assign the worker to the task
    new_task.status = TaskStatus.IN_PROGRESS
    new_task.assigned_to = best_worker
    new_task.save()
    
    print(f"--- New Task Immediately Assigned ---")
    print(f"  Worker: {best_worker.name} (ID: {best_worker.id})")
    print(f"  Task: {new_task}")
    print(f"  Info: Worker moving to {new_task.building}, Floor {new_task.location_floor}.")
    print(f"-----------------------------------")
    
    return best_worker