// src/App.tsx
import { useState } from "react";
import { AuthProvider, useAuth } from "./lib/auth-context";

// Page Imports
import { StudentPage } from "./pages/StudentPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { StaffPage } from "./pages/StaffPage"; // New
import { AdminPage } from "./pages/AdminPage"; // New

function AppContent() {
  const { user, isLoading, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(true);

  if (isLoading) {
    return (
      <div className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  // --- 1. No User: Show Login/Register ---
  if (!user) {
    if (showLogin) {
      return <LoginPage onToggle={() => setShowLogin(false)} />;
    } else {
      return <RegisterPage onToggle={() => setShowLogin(true)} />;
    }
  }

  // --- 2. User Exists: Route based on Role ---
  switch (user.role) {
    case "student":
      return <StudentPage />;
    case "staff":
      return <StaffPage />;
    case "admin":
      return <AdminPage />;
    default:
      // This is the fix for your "stuck" page
      return (
        <div className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
          <h2>Unknown Role</h2>
          <p>Your role ({user.role}) is not recognized by this app.</p>
          <button className="button button-primary" onClick={logout}>
            Logout
          </button>
        </div>
      );
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;