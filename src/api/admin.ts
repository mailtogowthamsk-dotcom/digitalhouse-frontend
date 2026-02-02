/**
 * Admin API – login, dashboard stats, users, pending updates, approve/reject.
 */

import { fetchApi, setToken } from "./client";

export type AdminLoginResponse = { token: string; admin: { email: string } };

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const base = (import.meta as any).env?.VITE_API_BASE ?? "";
  const res = await fetch(`${base}api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).message || "Invalid credentials");
  }
  const data: AdminLoginResponse = await res.json();
  setToken(data.token);
  return data;
}

export type DashboardStats = {
  totalUsers: number;
  pendingUserApprovals: number;
  pendingMatrimonyApprovals: number;
  pendingBusinessApprovals: number;
  reportedPosts: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchApi<DashboardStats>("/api/admin/stats");
}

export type UserListItem = {
  id: number;
  fullName: string;
  email: string;
  mobile: string | null;
  status: string;
  createdAt: string;
};

export type UsersListResponse = { users: UserListItem[]; total: number; page: number; limit: number };

export async function getUsers(page = 1, limit = 20, status?: string): Promise<UsersListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  return fetchApi<UsersListResponse>(`/api/admin/users?${params}`);
}

export type PendingUser = {
  id: number;
  fullName: string;
  email: string;
  mobile?: string;
  status: string;
  createdAt: string;
};

export async function getPendingUsers(): Promise<PendingUser[]> {
  const data = await fetchApi<{ users: PendingUser[] }>("/api/admin/pending");
  return data.users ?? [];
}

export async function approveUser(userId: number, remarks?: string): Promise<void> {
  await fetchApi(`/api/admin/users/${userId}/approve`, {
    method: "POST",
    body: JSON.stringify({ remarks: remarks ?? null })
  });
}

export async function rejectUser(userId: number, remarks: string): Promise<void> {
  await fetchApi(`/api/admin/users/${userId}/reject`, {
    method: "POST",
    body: JSON.stringify({ remarks })
  });
}

export type PendingProfileUpdate = {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  section: "MATRIMONY" | "BUSINESS";
  data: Record<string, unknown>;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  adminRemarks: string | null;
  currentApproved: Record<string, unknown> | null;
};

export async function getPendingUpdates(): Promise<PendingProfileUpdate[]> {
  const data = await fetchApi<{ updates: PendingProfileUpdate[] }>("/api/admin/pending-updates");
  return data.updates ?? [];
}

export async function approveProfileUpdate(updateId: number, remarks?: string): Promise<void> {
  await fetchApi("/api/admin/approve-update", {
    method: "POST",
    body: JSON.stringify({ updateId, remarks: remarks ?? null })
  });
}

export async function rejectProfileUpdate(updateId: number, remarks: string): Promise<void> {
  await fetchApi("/api/admin/reject-update", {
    method: "POST",
    body: JSON.stringify({ updateId, remarks })
  });
}

export async function getUserById(id: number): Promise<any> {
  return fetchApi(`/api/admin/users/${id}`);
}
