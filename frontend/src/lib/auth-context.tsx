// src/lib/auth-context.tsx
import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { AuthUser } from "./types";
import { api } from "./api";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Check for token on load

  // On app load, check localStorage for existing token/user
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("authToken");
      const storedUser = localStorage.getItem("authUser");
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Could not load auth from localStorage", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api.login(username, password);
    const authUser: AuthUser = {
      user_id: data.user_id,
      username: data.username,
      role: data.role,
    };

    setToken(data.token);
    setUser(authUser);
    localStorage.setItem("authToken", data.token);
    localStorage.setItem("authUser", JSON.stringify(authUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}