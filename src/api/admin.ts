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
  pendingMarketplaceListings: number;
  reportedMarketplaceListings: number;
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
  kulam?: string | null;
  gender?: string | null;
  district?: string | null;
  city?: string | null;
  status: string;
  emailVerified?: boolean;
  loginSource?: "Google" | "Existing Login" | "Both";
  profilePhoto?: string | null;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  communityRole?: string | null;
  lastLoginProvider?: string | null;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
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

export async function requestRegistrationChanges(
  userId: number,
  remarks: string,
  requestedFields: Array<"mobile" | "profilePhoto" | "referralCode">
): Promise<void> {
  await fetchApi(`/api/admin/users/${userId}/request-changes`, {
    method: "POST",
    body: JSON.stringify({ remarks, requestedFields })
  });
}

export type RegistrationReview = {
  status: string;
  gate: string;
  registrationAdminRemarks: string | null;
  registrationRequestedFields: string[];
  mobile: string | null;
  pendingMobile: string | null;
  profilePhoto: string | null;
  pendingProfilePhoto: string | null;
  registrationResubmittedAt: string | null;
  registrationReviewedAt: string | null;
};

export type AdminUserDetail = {
  user: Record<string, any>;
  profile: {
    community: Record<string, unknown> | null;
    personal: Record<string, unknown> | null;
    matrimony: Record<string, unknown> | null;
    business: Record<string, unknown> | null;
    family: Record<string, unknown> | null;
  };
  registrationReview?: RegistrationReview;
  verificationHistory: Array<{
    id: number;
    verifiedBy: string;
    verifiedAt: string;
    remarks: string | null;
  }>;
  activity: {
    lastLoginProvider: string | null;
    accountCreated: string;
    lastActive: string;
    numberOfLogins: number;
    deviceCount: number;
    onlineStatus: string;
  };
  statistics: Record<string, number | boolean>;
  subscription: {
    currentPlan: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    remainingDays: number | null;
    paymentMethod: string;
    transactionId: string | null;
    totalAmountPaidPaise: number;
    amountPaise?: number | null;
  } | null;
  storage: {
    byModule: Array<{ module: string; fileType: string; bytes: number; files: number }>;
    totalBytes: number;
  };
  notificationPreferences: Record<string, boolean> | null;
  devices: Array<{
    id: number;
    platform: string;
    deviceId: string | null;
    appVersion: string | null;
    lastUsedAt: string;
    createdAt: string;
  }>;
  matrimonyStats: Record<string, unknown>;
  marketplaceStats: Record<string, unknown>;
  reports: {
    reportsAgainstUser: number;
    reportsSubmitted: number;
    moderationActions: Array<{
      id: number;
      action: string;
      note: string | null;
      adminEmail: string;
      createdAt: string;
    }>;
  };
  security: Record<string, unknown>;
  roles: Record<string, unknown>;
  timeline: Array<{ at: string; type: string; label: string; meta?: string | null }>;
  loginSource?: string;
  referral?: {
    registrationStatus: string;
    currentStatus: string;
    current: {
      id: number;
      status: string;
      referrerUserId: number | null;
      referredBy: string | null;
      memberDisplayId: string | null;
      referrerStatus: string | null;
      referralCodeUsed: string | null;
      requestedAt: string | null;
      requestedByAdmin: string | null;
      submittedAt: string | null;
      verifiedAt: string | null;
      verifiedByAdmin: string | null;
      rejectedAt: string | null;
      rejectedByAdmin: string | null;
      adminNotes: string | null;
    } | null;
    history: Array<{
      id: number;
      status: string;
      referrerUserId: number | null;
      referredBy: string | null;
      memberDisplayId: string | null;
      referrerStatus: string | null;
      referralCodeUsed: string | null;
      submittedAt: string | null;
      verifiedAt: string | null;
      verifiedByAdmin: string | null;
      rejectedAt: string | null;
      adminNotes: string | null;
    }>;
    actions: {
      canRequest: boolean;
      canConfirm: boolean;
      canRejectReferral: boolean;
      viewReferrerUserId: number | null;
    };
  } | null;
};

export async function requestReferral(userId: number, note?: string): Promise<void> {
  await fetchApi(`/api/admin/users/${userId}/referral/request`, {
    method: "POST",
    body: JSON.stringify({ note: note ?? null })
  });
}

export async function confirmReferral(userId: number, note?: string): Promise<void> {
  await fetchApi(`/api/admin/users/${userId}/referral/confirm`, {
    method: "POST",
    body: JSON.stringify({ note: note ?? null })
  });
}

export async function rejectReferral(userId: number, note?: string): Promise<void> {
  await fetchApi(`/api/admin/users/${userId}/referral/reject`, {
    method: "POST",
    body: JSON.stringify({ note: note ?? null })
  });
}

export async function getUserById(id: number): Promise<AdminUserDetail> {
  return fetchApi<AdminUserDetail>(`/api/admin/users/${id}`);
}

export type UpdateAdminUserPayload = {
  fullName?: string;
  username?: string | null;
  gender?: string | null;
  dob?: string | null;
  email?: string;
  mobile?: string | null;
  occupation?: string | null;
  location?: string | null;
  community?: string | null;
  kulam?: string | null;
  bloodGroup?: string | null;
  education?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  workLocation?: string | null;
  skills?: string | null;
  city?: string | null;
  district?: string | null;
  communityRole?: string | null;
  profileVisibility?: "PUBLIC" | "PRIVATE";
  allowConnectionRequests?: boolean;
};

export async function updateAdminUser(userId: number, payload: UpdateAdminUserPayload): Promise<void> {
  await fetchApi(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function logoutUser(userId: number): Promise<void> {
  await fetchApi(`/api/admin/users/${userId}/logout`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function softDeleteUser(userId: number, reason?: string): Promise<void> {
  await fetchApi(`/api/admin/users/${userId}/soft-delete`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null })
  });
}

export async function restoreUser(userId: number): Promise<void> {
  await fetchApi(`/api/admin/users/${userId}/restore`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function hardDeleteUser(userId: number, reason?: string): Promise<void> {
  await fetchApi(`/api/admin/users/${userId}/hard-delete`, {
    method: "POST",
    body: JSON.stringify({ confirm: "DELETE", reason: reason ?? null })
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
