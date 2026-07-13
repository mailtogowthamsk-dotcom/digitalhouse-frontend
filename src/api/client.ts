/**
 * Admin API base URL and auth token.
 */

import { apiUrl } from "./apiBase";

export function getApiBase(): string {
  return "/digitalhouse/backend";
}

export function getToken(): string | null {
  return localStorage.getItem("admin_token");
}

export function setToken(token: string): void {
  localStorage.setItem("admin_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("admin_token");
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = apiUrl(path);
  const res = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: { ...authHeaders(), ...(options.headers as Record<string, string>) }
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text || `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed?.message && typeof parsed.message === "string") message = parsed.message;
    } catch {
      /* keep raw text */
    }
    throw new Error(message);
  }
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) return res.json() as Promise<T>;
  return undefined as T;
}
