// src/pages/LoginPage.tsx
import { useState } from "react";
import { useAuth } from "../lib/auth-context";

interface LoginPageProps {
  onToggle: () => void;
}

export function LoginPage({ onToggle }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="auth-container">
      <div className="card">
        <h2 style={{ textAlign: "center", margin: "0 0 1.5rem 0" }}>
          FMS Portal Login
        </h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
          <button type="submit" className="button button-primary button-full-width">
            Login
          </button>
        </form>
        <div className="auth-footer">
          <p>
            Don't have an account?{" "}
            <button onClick={onToggle}>Register here</button>
          </p>
        </div>
      </div>
    </div>
  );
}