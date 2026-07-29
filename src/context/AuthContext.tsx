import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { getToken, clearToken } from "../api/client";
import { getAdminMe, type AdminRole } from "../api/settingsAdmin";

type AuthContextType = {
  isAuthenticated: boolean;
  adminEmail: string | null;
  adminRole: AdminRole | null;
  allowedModules: string[];
  allowedActions: string[];
  /** True after permissions have been loaded from API or valid local cache. */
  permissionsReady: boolean;
  hasModule: (module: string) => boolean;
  hasAction: (action: string) => boolean;
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

function readStoredStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [adminEmail, setAdminEmailState] = useState<string | null>(() =>
    localStorage.getItem("admin_email")
  );
  const [adminRole, setAdminRoleState] = useState<AdminRole | null>(() => readStoredRole());
  const [allowedModules, setAllowedModules] = useState<string[]>(() =>
    readStoredStringArray("admin_modules")
  );
  const [allowedActions, setAllowedActions] = useState<string[]>(() =>
    readStoredStringArray("admin_actions")
  );
  const [permissionsReady, setPermissionsReady] = useState(
    () => readStoredStringArray("admin_modules").length > 0
  );
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());

  const moduleSet = useMemo(() => new Set(allowedModules), [allowedModules]);
  const actionSet = useMemo(() => new Set(allowedActions), [allowedActions]);

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
      const actions = data.admin?.actions ?? [];
      setAllowedModules(modules);
      setAllowedActions(actions);
      localStorage.setItem("admin_modules", JSON.stringify(modules));
      localStorage.setItem("admin_actions", JSON.stringify(actions));
      if (data.admin?.email) {
        setAdminEmailState(data.admin.email);
        localStorage.setItem("admin_email", data.admin.email);
      }
      setPermissionsReady(true);
    } catch {
      /* keep cached permissions; still mark ready so guards can evaluate cache */
      setPermissionsReady(true);
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
      setPermissionsReady(false);
      void refreshPermissions();
    },
    [refreshPermissions, setAdminRoleLocal]
  );

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem("admin_email");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_modules");
    localStorage.removeItem("admin_actions");
    setAdminEmailState(null);
    setAdminRoleState(null);
    setAllowedModules([]);
    setAllowedActions([]);
    setPermissionsReady(false);
    setIsAuthenticated(false);
  }, []);

  const setAdminEmail = useCallback((email: string | null) => {
    setAdminEmailState(email);
    if (email) localStorage.setItem("admin_email", email);
    else localStorage.removeItem("admin_email");
  }, []);

  const hasModule = useCallback((module: string) => moduleSet.has(module), [moduleSet]);

  const hasAction = useCallback((action: string) => actionSet.has(action), [actionSet]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      adminEmail,
      adminRole,
      allowedModules,
      allowedActions,
      permissionsReady,
      hasModule,
      hasAction,
      login,
      logout,
      setAdminEmail,
      setAdminRoleLocal,
      refreshPermissions
    }),
    [
      isAuthenticated,
      adminEmail,
      adminRole,
      allowedModules,
      allowedActions,
      permissionsReady,
      hasModule,
      hasAction,
      login,
      logout,
      setAdminEmail,
      setAdminRoleLocal,
      refreshPermissions
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Convenience alias for permission checks in pages. */
export function usePermissions() {
  const { hasModule, hasAction, allowedModules, allowedActions, permissionsReady } = useAuth();
  return { hasModule, hasAction, allowedModules, allowedActions, permissionsReady };
}
