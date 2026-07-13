import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getToken, clearToken } from "../api/client";
import { getAdminMe, type AdminRole } from "../api/settingsAdmin";

type AuthContextType = {
  isAuthenticated: boolean;
  adminEmail: string | null;
  adminRole: AdminRole | null;
  allowedModules: string[];
  login: (email: string, role?: AdminRole | null) => void;
  logout: () => void;
  setAdminEmail: (email: string | null) => void;
  setAdminRoleLocal: (role: AdminRole | null) => void;
  refreshPermissions: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function readStoredRole(): AdminRole | null {
  const r = localStorage.getItem("admin_role");
  if (r === "SUPER_ADMIN" || r === "ADMIN" || r === "MODERATOR") return r;
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [adminEmail, setAdminEmailState] = useState<string | null>(() =>
    localStorage.getItem("admin_email")
  );
  const [adminRole, setAdminRoleState] = useState<AdminRole | null>(() => readStoredRole());
  const [allowedModules, setAllowedModules] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("admin_modules");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());

  const setAdminRoleLocal = useCallback((role: AdminRole | null) => {
    setAdminRoleState(role);
    if (role) localStorage.setItem("admin_role", role);
    else localStorage.removeItem("admin_role");
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await getAdminMe();
      if (data.admin?.role) setAdminRoleLocal(data.admin.role);
      const modules = data.admin?.modules ?? [];
      setAllowedModules(modules);
      localStorage.setItem("admin_modules", JSON.stringify(modules));
      if (data.admin?.email) {
        setAdminEmailState(data.admin.email);
        localStorage.setItem("admin_email", data.admin.email);
      }
    } catch {
      /* keep cached permissions */
    }
  }, [setAdminRoleLocal]);

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
    if (token) void refreshPermissions();
  }, [refreshPermissions]);

  const login = useCallback(
    (email: string, role?: AdminRole | null) => {
      setAdminEmailState(email);
      localStorage.setItem("admin_email", email);
      if (role) setAdminRoleLocal(role);
      setIsAuthenticated(true);
      void refreshPermissions();
    },
    [refreshPermissions, setAdminRoleLocal]
  );

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem("admin_email");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_modules");
    setAdminEmailState(null);
    setAdminRoleState(null);
    setAllowedModules([]);
    setIsAuthenticated(false);
  }, []);

  const setAdminEmail = useCallback((email: string | null) => {
    setAdminEmailState(email);
    if (email) localStorage.setItem("admin_email", email);
    else localStorage.removeItem("admin_email");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        adminEmail,
        adminRole,
        allowedModules,
        login,
        logout,
        setAdminEmail,
        setAdminRoleLocal,
        refreshPermissions
      }}
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
