/**
 * API path prefix — always relative (same origin).
 * Local: Vite proxy → http://localhost:4000
 * Live: Apache proxy → Node
 */
export const API_ROOT = "/digitalhouse/backend";

/** Build path under API_ROOT, e.g. apiUrl("/api/admin/login") */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_ROOT}${p}`;
}
