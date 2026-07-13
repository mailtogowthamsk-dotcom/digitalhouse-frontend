/**
 * Admin Reports & Complaints API
 */
import { fetchApi } from "./client";

export type ReportKind = "POST" | "PROFILE";
export type ReportStatusFilter = "PENDING" | "RESOLVED" | "DISMISSED" | "ESCALATED" | "all";

export type AdminReportItem = {
  key: string;
  kind: ReportKind;
  id: number;
  reason: string;
  details: string | null;
  status: string;
  adminRemarks: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  reporter: { id: number; name: string; email: string | null };
  targetUser: { id: number; name: string; email: string | null; status: string };
  post: {
    id: number;
    title: string;
    postType: string | null;
    mediaUrl: string | null;
  } | null;
};

export type AdminReportDetail = AdminReportItem & {
  postDescription: string | null;
  recentActions: Array<{
    id: number;
    action: string;
    adminEmail: string;
    note: string | null;
    createdAt: string;
  }>;
};

export type AdminReportsListResponse = {
  ok: boolean;
  reports: AdminReportItem[];
  total: number;
  page: number;
  limit: number;
  counts: {
    pending: number;
    escalated: number;
    resolved: number;
    dismissed: number;
    all: number;
    post: number;
    profile: number;
  };
};

export async function listAdminReports(
  page = 1,
  limit = 20,
  status: ReportStatusFilter = "PENDING",
  kind: ReportKind | "all" = "all",
  q?: string
): Promise<AdminReportsListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status,
    kind
  });
  if (q?.trim()) params.set("q", q.trim());
  return fetchApi(`/api/admin/reports?${params}`);
}

export async function getAdminReport(
  kind: ReportKind,
  id: number
): Promise<{ ok: boolean; report: AdminReportDetail }> {
  return fetchApi(`/api/admin/reports/${kind}/${id}`);
}

export async function resolveAdminReport(
  kind: ReportKind,
  id: number,
  remarks?: string
): Promise<{ report: AdminReportItem }> {
  return fetchApi(`/api/admin/reports/${kind}/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ remarks })
  });
}

export async function dismissAdminReport(
  kind: ReportKind,
  id: number,
  remarks?: string
): Promise<{ report: AdminReportItem }> {
  return fetchApi(`/api/admin/reports/${kind}/${id}/dismiss`, {
    method: "POST",
    body: JSON.stringify({ remarks })
  });
}

export async function escalateAdminReport(
  kind: ReportKind,
  id: number,
  remarks?: string
): Promise<{ report: AdminReportItem }> {
  return fetchApi(`/api/admin/reports/${kind}/${id}/escalate`, {
    method: "POST",
    body: JSON.stringify({ remarks })
  });
}

export async function warnFromAdminReport(
  kind: ReportKind,
  id: number,
  message?: string,
  remarks?: string
): Promise<{ warnedUserId: number }> {
  return fetchApi(`/api/admin/reports/${kind}/${id}/warn`, {
    method: "POST",
    body: JSON.stringify({ message, remarks })
  });
}

export async function suspendFromAdminReport(
  kind: ReportKind,
  id: number,
  reason?: string
): Promise<{ suspendedUserId: number }> {
  return fetchApi(`/api/admin/reports/${kind}/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function warnAdminUser(userId: number, message?: string): Promise<{ message: string }> {
  return fetchApi(`/api/admin/users/${userId}/warn`, {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

export async function suspendAdminUser(userId: number, reason?: string): Promise<{ message: string }> {
  return fetchApi(`/api/admin/users/${userId}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function reactivateAdminUser(userId: number): Promise<{ message: string }> {
  return fetchApi(`/api/admin/users/${userId}/reactivate`, {
    method: "POST",
    body: "{}"
  });
}
