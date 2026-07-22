/**
 * Admin API – login, dashboard stats, users, pending updates, approve/reject.
 */

import { apiUrl } from "./apiBase";
import { fetchApi, setToken } from "./client";

export type AdminLoginResponse = {
  token: string;
  admin: { email: string; role?: string; roleLabel?: string };
};

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const res = await fetch(apiUrl("/api/admin/login"), {
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
  username?: string | null;
  email: string;
  mobile: string | null;
  community?: string | null;
  gender?: string | null;
  status: string;
  loginSource?: "Google" | "Existing Login" | "Both";
  createdAt: string;
  updatedAt?: string;
};

export type UsersListResponse = { users: UserListItem[]; total: number; page: number; limit: number };

export async function getUsers(
  page = 1,
  limit = 20,
  status?: string,
  q?: string,
  loginSource?: string,
  extras?: {
    community?: string;
    gender?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  }
): Promise<UsersListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  if (q?.trim()) params.set("q", q.trim());
  if (loginSource) params.set("loginSource", loginSource);
  if (extras?.community?.trim()) params.set("community", extras.community.trim());
  if (extras?.gender?.trim()) params.set("gender", extras.gender.trim());
  if (extras?.sortBy) params.set("sortBy", extras.sortBy);
  if (extras?.sortDir) params.set("sortDir", extras.sortDir);
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

export async function getPendingUpdates(opts?: {
  section?: "MATRIMONY" | "BUSINESS";
  page?: number;
  limit?: number;
  q?: string;
}): Promise<{
  updates: PendingProfileUpdate[];
  total: number;
  page: number;
  limit: number;
}> {
  const params = new URLSearchParams();
  if (opts?.section) params.set("section", opts.section);
  if (opts?.page != null) params.set("page", String(opts.page));
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  const qs = params.toString();
  const data = await fetchApi<{
    updates: PendingProfileUpdate[];
    total?: number;
    page?: number;
    limit?: number;
  }>(`/api/admin/pending-updates${qs ? `?${qs}` : ""}`);
  const updates = data.updates ?? [];
  return {
    updates,
    total: data.total ?? updates.length,
    page: data.page ?? 1,
    limit: data.limit ?? (updates.length || 20)
  };
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
