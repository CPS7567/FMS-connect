// src/pages/StaffPage.tsx
import { useState, useEffect } from "react";
import { api } from "../lib/api"; // --- FIX: Removed the typo "_from"
import { FmsRequest } from "../lib/types";
import { useAuth } from "../lib/auth-context";
import { Loader2, Wrench, Sparkles, Droplet, Bug, Droplets, Zap, HelpCircle, LogOut } from "lucide-react";

// (rest of the file is the same, just adding types to .find())
// ...

// Map categories to icons
const categoryIcons = {
  cleaning: Sparkles,
  water: Droplet,
  maintenance: Wrench,
  pest: Bug,
  plumbing: Droplets,
  electrical: Zap,
  other: HelpCircle,
};

export function StaffPage() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<FmsRequest[]>([]);
  const [currentTask, setCurrentTask] = useState<FmsRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allTasks = await api.getStaffTasks();
      setTasks(allTasks);

      // --- FIX: Added (t: FmsRequest) to fix 'any' type error
      let task = allTasks.find((t: FmsRequest) => t.status === "in_progress");
      if (!task) {
        // --- FIX: Added (t: FmsRequest) to fix 'any' type error
        task = allTasks.find((t: FmsRequest) => t.status === "pending");
      }
      setCurrentTask(task || null);

    } catch (err: any) {
      setError(err.message || "Failed to fetch tasks.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []); // Fetch tasks on component load
  
  // (rest of the file is identical to before)
  // ...

  const handleCompleteTask = async () => {
    if (!currentTask) return;

    setIsCompleting(true);
    setError(null);
    try {
      await api.completeTask(currentTask.id);
      await fetchTasks();

    } catch (err: any) {
      setError(err.message || "Failed to complete task.");
    } finally {
      setIsCompleting(false);
    }
  };

  const renderCurrentTask = () => {
    if (isLoading) {
      return <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite' }} />;
    }

    if (!currentTask) {
      return (
        <div style={{ textAlign: 'center' }}>
          <h3>All Clear!</h3>
          <p>You have no tasks in your queue.</p>
        </div>
      );
    }

    const Icon = categoryIcons[currentTask.task_type] || HelpCircle;
    const timeAgo = new Date(currentTask.registration_time).toLocaleDateString();

    return (
      <div>
        <div className="request-header">
          <span className="ticket-id" style={{ fontSize: '1.2rem' }}>Current Task: #{currentTask.id}</span>
          <span className={`badge ${currentTask.status === 'in_progress' ? 'badge-progress' : 'badge-pending'}`}>
            {currentTask.status.replace("_", " ")}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
          <div className="request-icon-container">
            <Icon size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{currentTask.building} (Floor {currentTask.location_floor})</h3>
            <p style={{ margin: 0 }}>Submitted by {currentTask.submitted_by_username} on {timeAgo}</p>
          </div>
        </div>
        
        <p className="description" style={{ fontSize: '1.1rem' }}>
          <strong>Description:</strong> {currentTask.description}
        </p>
        
        <button
          onClick={handleCompleteTask}
          disabled={isCompleting}
          className="button button-primary button-full-width"
          style={{ fontSize: '1.1rem', padding: '0.9rem', backgroundColor: '#28a745' }}
        >
          {isCompleting ? (
            <Loader2 className="button-icon" style={{ animation: 'spin 1s linear infinite' }} />
          ) : null}
          {isCompleting ? "Completing..." : "Mark as Completed"}
        </button>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Staff Dashboard</h1>
          <p>Welcome, {user?.username || 'Staff'}</p>
        </div>
        <div className="nav-buttons">
          <button
            onClick={logout}
            className="button button-outline"
            style={{ borderColor: '#DC3545', color: '#DC3545' }}
          >
            <LogOut className="button-icon" size={16} />
            Logout
          </button>
        </div>
      </div>

      <div className="card">
        {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
        {renderCurrentTask()}
      </div>
    </div>
  );
}