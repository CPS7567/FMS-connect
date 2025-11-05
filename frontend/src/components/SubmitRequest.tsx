// src/components/SubmitRequest.tsx
import { useState } from "react";
import { Mic, CheckCircle2, Droplet, Wrench, Bug, Droplets, Zap, HelpCircle, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { RequestCategory, Building } from "../lib/types";
import { api } from "../lib/api";

// ... (categories and buildings arrays are the same) ...
// ...

const categories = [
  { value: "cleaning" as RequestCategory, label: "Cleaning", icon: Sparkles, description: "Room, common area, trash" },
  { value: "water" as RequestCategory, label: "Water", icon: Droplet, description: "Water cooler, no water in tap" },
  { value: "maintenance" as RequestCategory, label: "Maintenance", icon: Wrench, description: "AC, furniture, lights" },
  { value: "pest" as RequestCategory, label: "Pest Control", icon: Bug, description: "Mice, bugs, mosquitoes" },
  { value: "plumbing" as RequestCategory, label: "Plumbing", icon: Droplets, description: "Leakage, clogged drain, toilet" },
  { value: "electrical" as RequestCategory, label: "Electrical", icon: Zap, description: "No power, fan not working" },
  { value: "other" as RequestCategory, label: "Other", icon: HelpCircle, description: "Any other issue" },
];

const buildings = [
  { value: "girls_hostel", label: "Girls Hostel" },
  { value: "boys_hostel_old", label: "Boys Hostel (Old)" },
  { value: "boys_hostel_h1", label: "Boys Hostel (H1)" },
  { value: "boys_hostel_h2", label: "Boys Hostel (H2)" },
  { value: "lhc", label: "LHC" },
  { value: "rnd", label: "R&D Building" },
  { value: "academic", label: "Old Academic Building" },
  { value: "guest_house", label: "Guest House" },
  { value: "library", label: "Library" },
];


type FormErrors = {
  category?: string;
  building?: string;
  location_floor?: string;
  description?: string;
};

interface SubmitRequestProps {
  onNavigate: () => void;
}

export function SubmitRequest({ onNavigate }: SubmitRequestProps) {
  const { token } = useAuth(); // We still need the token to check if user is logged in
  
  const [category, setCategory] = useState<RequestCategory | "">("");
  const [building, setBuilding] = useState<Building | "">("");
  const [wing, setWing] = useState(""); 
  const [location_floor, setLocationFloor] = useState(1);
  const [description, setDescription] = useState("");
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");

  const validateForm = (): boolean => {
    // ... (validation logic is the same) ...
    // ...
    const newErrors: FormErrors = {};
    if (!category) newErrors.category = "Please select a category.";
    if (!building) newErrors.building = "Please select a building.";
    if (location_floor < 1) newErrors.location_floor = "Floor must be 1 or higher.";
    if (!description.trim()) newErrors.description = "Please enter a description.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !token) return; // Check for token here

    setIsLoading(true);
    setErrors({});
    
    const payload = {
      task_type: category,
      building: building,
      wing: wing,
      location_floor: location_floor,
      description: description,
    };
    
    try {
      // --- FIX: Removed (token) from this call ---
      const response = await api.submitRequest(payload);
      setTicketId(response.id); 
      setSubmitted(true);
      
      setTimeout(() => {
        setSubmitted(false);
        onNavigate();
      }, 3000);
      
    } catch (err: any) {
      setErrors({ description: `Submission failed: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // ... (rest of the file is identical) ...
  // ...

  if (submitted) {
    return (
      <div className="card success-card">
        <CheckCircle2 className="success-icon" />
        <h2>Success!</h2>
        <p>Your request has been submitted.</p>
        <div className="ticket-box">
          <p className="ticket-label">Your Ticket ID</p>
          <p className="ticket-id">#{ticketId}</p>
        </div>
        <p>You will be redirected shortly...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" id="category-label">Select Category *</label>
          <div className="radio-grid" role="radiogroup" aria-labelledby="category-label">
            {categories.map(cat => (
              <div
                key={cat.value}
                role="radio"
                aria-checked={category === cat.value}
                onClick={() => setCategory(cat.value)}
                className={`radio-button ${category === cat.value ? "selected" : ""}`}
              >
                <cat.icon size={20} />
                <div className="radio-button-info">
                  <span className="label">{cat.label}</span>
                  <span className="description">{cat.description}</span>
                </div>
              </div>
            ))}
          </div>
          {errors.category && <p style={{ color: 'red', fontSize: '0.9rem', marginTop: '4px' }}>{errors.category}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Location *</label>
          <div className="input-grid">
            <div>
              <label htmlFor="building" className="form-label" style={{ fontSize: '0.9rem' }}>Building</label>
              <select id="building" className="select" value={building} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBuilding(e.target.value as Building)}>
                <option value="" disabled>Select Building</option>
                {buildings.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
              {errors.building && <p style={{ color: 'red', fontSize: '0.9rem', marginTop: '4px' }}>{errors.building}</p>}
            </div>
            
            <div>
              <label htmlFor="wing" className="form-label" style={{ fontSize: '0.9rem' }}>Wing (Optional)</label>
              <input
                id="wing"
                type="text"
                className="input"
                placeholder="e.g. A"
                value={wing}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWing(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="floor" className="form-label" style={{ fontSize: '0.9rem' }}>Floor</label>
              <input
                id="floor"
                type="number"
                className="input"
                value={location_floor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocationFloor(Number(e.target.value))}
              />
              {errors.location_floor && <p style={{ color: 'red', fontSize: '0.9rem', marginTop: '4px' }}>{errors.location_floor}</p>}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">Description *</label>
          <textarea
            id="description"
            className="textarea"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail. What's wrong? Where is it?"
            rows={4}
          />
          {errors.description && <p style={{ color: 'red', fontSize: '0.9rem', marginTop: '4px' }}>{errors.description}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="button button-primary button-full-width"
          style={{ fontSize: '1.1rem', padding: '0.9rem' }}
        >
          {isLoading ? <Loader2 className="button-icon" style={{ animation: 'spin 1s linear infinite' }} /> : null}
          {isLoading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}