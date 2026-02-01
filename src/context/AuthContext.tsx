import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getToken, clearToken } from "../api/client";

type AuthContextType = {
  isAuthenticated: boolean;
  adminEmail: string | null;
  login: (email: string) => void;
  logout: () => void;
  setAdminEmail: (email: string | null) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [adminEmail, setAdminEmailState] = useState<string | null>(() =>
    localStorage.getItem("admin_email")
  );
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
  }, []);

  const login = useCallback((email: string) => {
    setAdminEmailState(email);
    localStorage.setItem("admin_email", email);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem("admin_email");
    setAdminEmailState(null);
    setIsAuthenticated(false);
  }, []);

  const setAdminEmail = useCallback((email: string | null) => {
    setAdminEmailState(email);
    if (email) localStorage.setItem("admin_email", email);
    else localStorage.removeItem("admin_email");
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, adminEmail, login, logout, setAdminEmail }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
