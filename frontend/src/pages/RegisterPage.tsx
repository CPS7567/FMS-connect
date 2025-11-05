// src/pages/RegisterPage.tsx
import { useState } from "react";
import { api } from "../lib/api";

interface RegisterPageProps {
  onToggle: () => void;
}

export function RegisterPage({ onToggle }: RegisterPageProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.register(username, email, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="card" style={{ textAlign: "center" }}>
          <h2 style={{ color: '#28a745' }}>Registration Successful!</h2>
          <p>You can now log in with your new account.</p>
          <button onClick={onToggle} className="button button-primary">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="card">
        <h2 style={{ textAlign: "center", margin: "0 0 1.5rem 0" }}>
          Create Account
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
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            Register
          </button>
        </form>
        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <button onClick={onToggle}>Login here</button>
          </p>
        </div>
      </div>
    </div>
  );
}