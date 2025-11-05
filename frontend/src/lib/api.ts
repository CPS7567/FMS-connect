// src/lib/api.ts
import { FmsRequest, RequestCategory, Building, Staff, Gender } from "./types";

const BASE_URL = "http://127.0.0.1:8000/api";

// --- Helper for API calls ---
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}/${endpoint}/`; // Django URLs often end with a slash
  
  // Explicitly define headers as a type that TypeScript understands
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Spread existing headers if they exist
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const token = localStorage.getItem("authToken");
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Token ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json(); // This will be our { "username": ["..."] }
    } catch (e) {
      errorData = { detail: `Request failed: ${response.statusText}` };
    }
    // Throw the entire object, not just .detail
    throw errorData;
  }
  
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return null;
  }

  return response.json();
}

// --- API Functions ---
export const api = {
  // --- Auth ---
  login: async (username: string, password: string): Promise<any> => {
    return apiFetch("login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  register: async (username: string, email: string, password: string): Promise<any> => {
    return apiFetch("register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  },

  // --- Student ---
  getStudentRequests: async (): Promise<FmsRequest[]> => {
    return apiFetch("requests/my-requests", { method: "GET" });
  },

  submitRequest: async (
    data: {
      task_type: RequestCategory | "";
      building: Building | "";
      wing: string;
      location_floor: number;
      description: string;
    }
  ): Promise<any> => {
    return apiFetch("requests/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // --- Staff (Worker) ---
  getStaffTasks: async (): Promise<FmsRequest[]> => {
    return apiFetch("staff/my-tasks", { method: "GET" });
  },

  completeTask: async (taskId: number): Promise<any> => {
    return apiFetch(`staff/task/complete/${taskId}`, { method: "POST" });
  },

  // --- Admin ---
  getAdminAllRequests: async (): Promise<FmsRequest[]> => {
    return apiFetch("admin/all-requests", { method: "GET" });
  },
  
  adminCompleteRequest: async (taskId: number): Promise<any> => {
    return apiFetch(`admin/request/complete/${taskId}`, { method: "POST" });
  },

  adminDeleteRequest: async (taskId: number): Promise<any> => {
    return apiFetch(`admin/request/delete/${taskId}`, { method: "DELETE" });
  },

  getAdminAllStaff: async (): Promise<Staff[]> => {
    return apiFetch("admin/all-staff", { method: "GET" });
  },

  adminCreateStaff: async (data: {
    username: string;
    password: string;
    email?: string;
    name: string;
    task_type: string;
    gender: Gender;
  }): Promise<any> => {
    return apiFetch("admin/staff/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  adminDeleteStaff: async (staffId: number): Promise<any> => {
    return apiFetch(`admin/staff/delete/${staffId}`, { method: "DELETE" });
  },
};