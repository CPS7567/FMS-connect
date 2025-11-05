// src/components/RequestList.tsx
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { FmsRequest } from "../lib/types";
import { Loader2, Wrench, Sparkles, Droplet, Bug, Droplets, Zap, HelpCircle } from "lucide-react";
import { useAuth } from "../lib/auth-context"; 

// ... (icons and status maps are the same) ...
// ...

const categoryIcons = {
  cleaning: Sparkles,
  water: Droplet,
  maintenance: Wrench,
  pest: Bug,
  plumbing: Droplets,
  electrical: Zap,
  other: HelpCircle,
};

const statusClassMap: { [key: string]: string } = {
  "pending": "badge-pending",
  "in_progress": "badge-progress",
  "completed": "badge-done",
};

export function RequestList() {
  const { token } = useAuth(); 
  const [requests, setRequests] = useState<FmsRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return; 
    }

    const fetchRequests = async () => {
      setIsLoading(true);
      try {
        // --- FIX: Removed (token) from this call ---
        const data = await api.getStudentRequests();
        setRequests(data);
      } catch (error) {
        console.error("Failed to fetch requests", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequests();
  }, [token]); 

  // ... (rest of the file is identical) ...
  // ...

  if (isLoading) {
    return (
      <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h3>No requests found</h3>
        <p>You haven't submitted any requests yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      {requests.map((req: FmsRequest) => {
        const Icon = categoryIcons[req.task_type] || HelpCircle;
        const timeAgo = new Date(req.registration_time).toLocaleDateString();
        
        return (
          <div key={req.id} className="request-list-item">
            <div className="request-icon-container">
              <Icon size={24} />
            </div>
            <div className="request-info">
              <div className="request-header">
                <span className="ticket-id">#{req.id} - {req.building}</span>
                <span className={`badge ${statusClassMap[req.status] || 'badge-pending'}`}>
                  {req.status.replace("_", " ")}
                </span>
              </div>
              <p className="description">{req.description}</p>
              <p className="date">Submitted by {req.submitted_by_username} on {timeAgo}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}