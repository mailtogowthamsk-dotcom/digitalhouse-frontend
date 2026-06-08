/**
 * Admin API – login, dashboard stats, users, pending updates, approve/reject.
 */

import { fetchApi, setToken } from "./client";

/** Relative only — never https://infosensetechnologies.com/... (CORS with www admin site). */
const ADMIN_LOGIN_URL = "/digitalhouse/backend/api/admin/login";

export type AdminLoginResponse = { token: string; admin: { email: string } };

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const res = await fetch(ADMIN_LOGIN_URL, {
    method: "POST",
    credentials: "same-origin",
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

export async function getUsers(
  page = 1,
  limit = 20,
  status?: string,
  q?: string
): Promise<UsersListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  if (q?.trim()) params.set("q", q.trim());
  return fetchApi<UsersListResponse>(`/api/admin/users?${params}`);
}

export type NotificationAudienceStats = {
  approvedUsers: number;
  usersWithPushTokens: number;
  totalPushTokens: number;
  fcmConfigured: boolean;
};

export type AdminBroadcastPayload = {
  title: string;
  body: string;
  category?: "SOCIAL" | "MATRIMONY" | "MESSAGES" | "COMMUNITY" | "SYSTEM";
  userIds?: number[];
  actionType?: string;
  actionTargetId?: string | null;
  persistInApp?: boolean;
};

export type AdminBroadcastResult = {
  sent: number;
  total: number;
  persistInApp: boolean;
  inAppSent: number;
  pushTargets: number;
  pushSent: number | null;
};

export async function getNotificationAudienceStats(): Promise<NotificationAudienceStats> {
  return fetchApi<NotificationAudienceStats>("/api/admin/notifications/stats");
}

export async function adminBroadcastNotification(
  payload: AdminBroadcastPayload
): Promise<AdminBroadcastResult> {
  return fetchApi<AdminBroadcastResult>("/api/admin/notifications/broadcast", {
    method: "POST",
    body: JSON.stringify(payload)
  });
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
  submittedForReview?: boolean;
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
