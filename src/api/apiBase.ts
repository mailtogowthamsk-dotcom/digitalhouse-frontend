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

if (import.meta.env.DEV) {
  // Confirms which backend the admin UI is using (env is baked at `npm run dev` start).
  console.info("[api] VITE_API_BASE =", import.meta.env.VITE_API_BASE || "(unset)");
  console.info("[api] API_ROOT =", API_ROOT);
}

/** Build path under API_ROOT, e.g. apiUrl("/api/admin/login") */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_ROOT}${p}`;
}
