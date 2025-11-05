// src/pages/AdminPage.tsx
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { FmsRequest, Staff, Gender, RequestCategory } from "../lib/types";
import { useAuth } from "../lib/auth-context";
import { Loader2, Wrench, Sparkles, Droplet, Bug, Droplets, Zap, HelpCircle, LogOut, Check, Trash, User, Shield } from "lucide-react";

// --- Category Icons Definition ---
const categoryIcons: Record<RequestCategory, React.ElementType> = {
  cleaning: Sparkles,
  water: Droplet,
  maintenance: Wrench,
  pest: Bug,
  plumbing: Droplets,
  electrical: Zap,
  other: HelpCircle,
};

// --- Status Badge Map ---
const statusClassMap: { [key: string]: string } = {
  "pending": "badge-pending",
  "in_progress": "badge-progress",
  "completed": "badge-done",
};

// --- PRIORITY SORTING LOGIC ---
const BUILDING_PROXIMITY_MAP: Record<string, number> = {
  'boys_hostel_h2': 0, 'boys_hostel_h1': 1, 'boys_hostel_old': 2, 
  'girls_hostel': 3, 'lhc': 4, 'academic': 5, 'library': 6, 'rnd': 7,
  'guest_house': 2,
};

function getBuildingDistance(bldg1: string, bldg2: string): number {
  const pos1 = BUILDING_PROXIMITY_MAP[bldg1] ?? 99;
  const pos2 = BUILDING_PROXIMITY_MAP[bldg2] ?? 99;
  return Math.abs(pos1 - pos2);
}

function getPriority(req: FmsRequest, worker: Staff) {
  const building_dist = getBuildingDistance(worker.current_building, req.building);
  const is_same_building = (worker.current_building === req.building);
  const wing_priority = (is_same_building && worker.current_wing === req.wing) ? 0 : 1;
  const floor_dist = Math.abs(worker.current_location_floor - req.location_floor);
  return { building_dist, wing_priority, floor_dist };
}

function findClosestFreeWorker(req: FmsRequest, staffList: Staff[]): Staff | null {
  const freeWorkers = staffList.filter(s => 
    s.status === 'free' && s.task_type === req.task_type
  );
  if (!freeWorkers.length) return null;
  
  freeWorkers.sort((a, b) => {
    const prioA = getPriority(req, a);
    const prioB = getPriority(req, b);
    if (prioA.building_dist !== prioB.building_dist) return prioA.building_dist - prioB.building_dist;
    if (prioA.wing_priority !== prioB.wing_priority) return prioA.wing_priority - prioB.wing_priority;
    return prioA.floor_dist - prioB.floor_dist;
  });
  
  return freeWorkers[0];
}

function sortRequestsByPriority(requests: FmsRequest[], staffList: Staff[]): FmsRequest[] {
  const pending = requests.filter(r => r.status === 'pending');
  const others = requests.filter(r => r.status !== 'pending');
  
  pending.sort((a, b) => {
    const closestWorkerA = findClosestFreeWorker(a, staffList);
    const closestWorkerB = findClosestFreeWorker(b, staffList);

    if (!closestWorkerA || !closestWorkerB) {
      return new Date(a.registration_time).getTime() - new Date(b.registration_time).getTime();
    }
    
    const prioA = getPriority(a, closestWorkerA);
    const prioB = getPriority(b, closestWorkerB);

    if (prioA.building_dist !== prioB.building_dist) return prioA.building_dist - prioB.building_dist;
    if (prioA.wing_priority !== prioB.wing_priority) return prioA.wing_priority - prioB.wing_priority;
    if (prioA.floor_dist !== prioB.floor_dist) return prioA.floor_dist - prioB.floor_dist;
    return new Date(a.registration_time).getTime() - new Date(b.registration_time).getTime();
  });

  return [...pending, ...others];
}
// --- END OF PRIORITY SORTING ---


// --- COMPONENT FOR ADD STAFF FORM ---
function AddStaffForm({ onWorkerCreated }: { onWorkerCreated: () => void }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [taskType, setTaskType] = useState("");
  const [gender, setGender] = useState<Gender>("M");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    setFormSuccess(false);

    if (!name || !username || !password || !taskType || !gender) {
      setFormError("All fields are required.");
      setFormLoading(false);
      return;
    }

    try {
      await api.adminCreateStaff({
        name, username, password, task_type: taskType, gender
      });
      setFormSuccess(true);
      setName(""); setUsername(""); setPassword(""); setTaskType(""); setGender("M");
      onWorkerCreated(); // Tell AdminPage to refresh its data
    } catch (err: any) {
        console.error("Failed to create worker:", err);
        let errorMessage = "An unknown error occurred.";
        
        if (err && typeof err === 'object') {
          if (err.detail) {
            errorMessage = err.detail; // General error
          } else {
            const firstErrorField = Object.keys(err)[0];
            if (firstErrorField && Array.isArray(err[firstErrorField])) {
              errorMessage = `${firstErrorField}: ${err[firstErrorField][0]}`;
            }
          }
        }
        setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto 2rem auto' }}>
      <h3 style={{ marginTop: 0 }}>Add New Worker</h3>
      <form onSubmit={handleSubmit} className="auth-form">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input id="name" type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="taskType">Task Type</label>
            <input id="taskType" type="text" className="input" placeholder="e.g. cleaning" value={taskType} onChange={(e) => setTaskType(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username (Login)</label>
            <input id="username" type="text" className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="gender">Gender</label>
            <select id="gender" className="select" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
        </div>
        {formError && <p style={{ color: 'red', fontSize: '0.9rem' }}>{formError}</p>}
        {formSuccess && <p style={{ color: 'green', fontSize: '0.9rem' }}>Worker created successfully!</p>}
        <button type="submit" className="button button-primary" disabled={formLoading}>
          {formLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : "Create Worker"}
        </button>
      </form>
    </div>
  );
}


// --- MAIN ADMIN PAGE COMPONENT ---
export function AdminPage() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<'requests' | 'staff'>('requests');
  
  const [allRequests, setAllRequests] = useState<FmsRequest[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [sortedRequests, setSortedRequests] = useState<FmsRequest[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<number | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [requestsData, staffData] = await Promise.all([
        api.getAdminAllRequests(),
        api.getAdminAllStaff()
      ]);
      setAllRequests(requestsData);
      setAllStaff(staffData);
      setSortedRequests(sortRequestsByPriority(requestsData, staffData));
    } catch (err: any) {
      setError(err.message || "Failed to fetch data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleComplete = async (taskId: number) => {
    if (window.confirm("Are you sure you want to mark this task as complete?")) {
      setLoadingAction(taskId); 
      setError(null);
      try {
        await api.adminCompleteRequest(taskId);
        await fetchData();
      } catch (err: any) {
        setError(err.message || "Failed to complete request.");
      } finally {
        setLoadingAction(null); 
      }
    }
  };

  const handleDelete = async (taskId: number) => {
    if (window.confirm("Are you sure you want to delete this task? This cannot be undone.")) {
      setLoadingAction(taskId); 
      setError(null);
      try {
        await api.adminDeleteRequest(taskId);
        setAllRequests(prev => prev.filter(req => req.id !== taskId));
        setSortedRequests(prev => prev.filter(req => req.id !== taskId));
      } catch (err: any) {
        setError(err.message || "Failed to delete request.");
      } finally {
        setLoadingAction(null); 
      }
    }
  };
  
  const handleDeleteStaff = async (staffId: number) => {
    if (window.confirm("Are you sure you want to delete this worker? This will also delete their login account.")) {
      setLoadingAction(staffId);
      setError(null);
      try {
        await api.adminDeleteStaff(staffId);
        setAllStaff(prev => prev.filter(staff => staff.id !== staffId));
        await fetchData(); 
      } catch (err: any) {
        setError(err.message || "Failed to delete worker.");
      } finally {
        setLoadingAction(null);
      }
    }
  };

  // --- RENDER FUNCTIONS ---

  const renderRequestList = () => {
    if (isLoading) return <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite' }} />;
    if (sortedRequests.length === 0) return <p>No requests found.</p>;
    
    return (
      <div>
        {sortedRequests.map((req: FmsRequest) => {
          const Icon = categoryIcons[req.task_type] || HelpCircle;
          const timeAgo = new Date(req.registration_time).toLocaleDateString();
          const isDone = req.status === "completed";
          
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
                <p className="date">
                  Submitted by {req.submitted_by_username} on {timeAgo}
                  {req.assigned_to_name && ` | Assigned to: ${req.assigned_to_name}`}
                </p>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    onClick={() => handleComplete(req.id)}
                    disabled={isDone || loadingAction === req.id}
                    className="button button-outline"
                    style={{ 
                      borderColor: '#28a745', 
                      color: '#28a745', 
                      padding: '0.25rem 0.75rem', 
                      fontSize: '0.9rem' 
                    }}
                  >
                    {loadingAction === req.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
                    <span style={{ marginLeft: '4px' }}>Complete</span>
                  </button>
                  <button
                    onClick={() => handleDelete(req.id)}
                    disabled={loadingAction === req.id}
                    className="button button-outline"
                    style={{ 
                      borderColor: '#DC3545', 
                      color: '#DC3545', 
                      padding: '0.25rem 0.75rem', 
                      fontSize: '0.9rem' 
                    }}
                  >
                    {loadingAction === req.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash size={16} />}
                    <span style={{ marginLeft: '4px' }}>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStaffList = () => {
    if (isLoading) return <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite' }} />;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {allStaff.map(staff => {
          const currentTask = allRequests.find(r => 
            r.assigned_to_name === staff.name && r.status === 'in_progress'
          );
          
          return (
            <div key={staff.id} className="card" style={{ padding: '1rem', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>{staff.name}</h3>
                  <span 
                    className="badge" 
                    style={staff.status === 'free' ? {backgroundColor: '#28a745'} : {backgroundColor: '#ffc107', color: '#212529'}}
                  >
                    {staff.status}
                  </span>
                </div>
                <p style={{ margin: '4px 0', color: '#6c757d' }}>{staff.task_type} ({staff.gender})</p>
                <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>Email: {staff.user_email}</p>
                
                {currentTask ? (
                  <div style={{ borderTop: '1px solid #e9ecef', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>Current Task: #{currentTask.id}</p>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{currentTask.description}</p>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Location: {currentTask.building}, Floor {currentTask.location_floor}</p>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '1rem' }}>
                    {staff.status === 'free' ? `Idle at: ${staff.current_building}` : 'No task assigned'}
                  </p>
                )}
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <button
                  onClick={() => handleDeleteStaff(staff.id)}
                  disabled={loadingAction === staff.id}
                  className="button button-outline button-full-width"
                  style={{ 
                    borderColor: '#DC3545', 
                    color: '#DC3545', 
                    padding: '0.25rem 0.75rem', 
                    fontSize: '0.9rem' 
                  }}
                >
                  {loadingAction === staff.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash size={16} />}
                  <span style={{ marginLeft: '4px' }}>Delete Worker</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- MAIN RETURN ---
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome, {user?.username || 'Admin'}</p>
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

      <div className="nav-buttons" style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setView('requests')}
          className={`button ${view === 'requests' ? 'button-primary' : 'button-outline'}`}
        >
          <Shield className="button-icon" size={16} /> Manage Requests
        </button>
        <button
          onClick={() => setView('staff')}
          className={`button ${view === 'staff' ? 'button-primary' : 'button-outline'}`}
        >
          <User className="button-icon" size={16} /> Manage Staff
        </button>
      </div>

      {view === 'requests' ? (
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Priority Request Queue</h2>
          {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
          {renderRequestList()}
        </div>
      ) : (
        <div>
          <AddStaffForm onWorkerCreated={fetchData} />
          
          <div className="card">
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Current Staff</h2>
            {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
            {renderStaffList()}
          </div>
        </div>
      )}
    </div>
  );
}