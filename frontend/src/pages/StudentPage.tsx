// src/pages/StudentPage.tsx
import { useState } from "react";
import { SubmitRequest } from "../components/SubmitRequest";
import { RequestList } from "../components/RequestList";
import { FilePlus, List, LogOut } from "lucide-react";
import { useAuth } from "../lib/auth-context";

export function StudentPage() {
  const [page, setPage] = useState<"submit" | "requests">("submit");
  const { user, logout } = useAuth(); // Get real user and logout

  return (
    <>
      <div className="page-header">
        <div>
          <h1>FMS Portal</h1>
          {/* Use the real username! */}
          <p>Welcome, {user?.username || 'Student'}</p> 
        </div>
        <div className="nav-buttons">
          <button
            onClick={() => setPage("submit")}
            className={`button button-outline ${page === "submit" ? "active" : ""}`}
          >
            <FilePlus className="button-icon" size={16} />
            New Request
          </button>
          <button
            onClick={() => setPage("requests")}
            className={`button button-outline ${page === "requests" ? "active" : ""}`}
          >
            <List className="button-icon" size={16} />
            My Requests
          </button>
          {/* Real Logout Button */}
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

      {/* Main Content Area */}
      {page === "submit" ? (
        <SubmitRequest onNavigate={() => setPage("requests")} />
      ) : (
        <RequestList />
      )}
    </>
  );
}