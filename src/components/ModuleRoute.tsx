import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Prevents deep-link access to modules the current admin cannot use.
 * Waits for permissions so we never flash content or allow-all on empty cache.
 */
export function ModuleRoute({
  module,
  children
}: {
  module: string;
  children: React.ReactNode;
}) {
  const { permissionsReady, hasModule } = useAuth();

  if (!permissionsReady) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Checking access…
      </div>
    );
  }

  if (!hasModule(module)) {
    if (module !== "dashboard" && hasModule("dashboard")) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
