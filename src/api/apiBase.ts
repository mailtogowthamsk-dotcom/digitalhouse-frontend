/**
 * API base from VITE_API_BASE (.env / .env.development).
 * Production (konguvettuvagounder.com nginx): https://konguvettuvagounder.com
 * Local LAN backend: http://192.168.x.x:4000
 * Fallback: same-origin (relative /api/... via nginx /api/ proxy).
 */
function normalizeBase(base: string): string {
  return base.trim().replace(/\/+$/, "");
}

export const API_ROOT = normalizeBase(
  (import.meta.env.VITE_API_BASE as string | undefined) || ""
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
