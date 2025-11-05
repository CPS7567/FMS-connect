// src/lib/types.ts

// These types are from your Django models.py
export type RequestCategory = "cleaning" | "water" | "maintenance" | "pest" | "plumbing" | "electrical" | "other";
export type Building = "girls_hostel" | "boys_hostel_old" | "boys_hostel_h1" | "boys_hostel_h2" | "lhc" | "rnd" | "academic" | "guest_house" | "library";
export type Gender = "M" | "F";
export type StaffStatus = "free" | "busy";

// This is the data we get from the /api/login/ endpoint
export interface AuthUser {
  user_id: number;
  username: string;
  role: "student" | "staff" | "admin";
}

// This matches your backend's RequestSerializer
export interface FmsRequest {
  id: number;
  task_type: RequestCategory;
  building: Building;
  wing: string;
  location_floor: number;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  registration_time: string; // This will be an ISO date string
  submitted_by_username: string;
  assigned_to_name: string | null;
}

// --- NEW: Matches your backend's StaffSerializer ---
export interface Staff {
  id: number;
  name: string;
  task_type: string;
  gender: Gender;
  current_building: Building;
  current_wing: string;
  current_location_floor: number;
  status: StaffStatus;
  user_email: string;
}