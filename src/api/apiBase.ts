/**
 * API base from VITE_API_BASE (.env / .env.development).
 * Examples:
 *   https://www.infosensetechnologies.com/digitalhouse/backend
 *   http://localhost:4000
 * Fallback: same-origin /digitalhouse/backend (Vite/Apache proxy).
 */
function normalizeBase(base: string): string {
  return base.trim().replace(/\/+$/, "");
}

export const API_ROOT = normalizeBase(
  (import.meta.env.VITE_API_BASE as string | undefined) || "/digitalhouse/backend"
);

/** Build path under API_ROOT, e.g. apiUrl("/api/admin/login") */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_ROOT}${p}`;
}
