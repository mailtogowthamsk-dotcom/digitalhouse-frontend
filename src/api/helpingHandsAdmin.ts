/**
 * Admin Helping Hands API – list / moderate HELP_REQUEST posts.
 */
import { fetchApi } from "./client";

export type AdminHelpItem = {
  id: number;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  helpStatus: string;
  helpCategory: string | null;
  helpCategoryLabel: string | null;
  helpUrgency: string | null;
  helpLocation: string | null;
  helpContactPhone: string | null;
  helperCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    fullName: string;
    email: string;
    mobile: string | null;
    community: string | null;
  };
};

export type AdminHelpDetail = AdminHelpItem & {
  helpers: Array<{
    id: number;
    fromUserId: number;
    name: string;
    email: string | null;
    message: string | null;
    createdAt: string;
  }>;
};

export type HelpStatusFilter =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired"
  | "all";

export type AdminHelpListResponse = {
  ok: boolean;
  requests: AdminHelpItem[];
  total: number;
  page: number;
  limit: number;
  counts: {
    open: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    expired?: number;
    all: number;
  };
};

export async function listAdminHelpRequests(
  page = 1,
  limit = 20,
  status: HelpStatusFilter = "all",
  q?: string,
  category?: string
): Promise<AdminHelpListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status
  });
  if (q?.trim()) params.set("q", q.trim());
  if (category) params.set("category", category);
  return fetchApi<AdminHelpListResponse>(`/api/admin/helping-hands?${params}`);
}

export async function getAdminHelpRequest(
  id: number
): Promise<{ ok: boolean; request: AdminHelpDetail }> {
  return fetchApi(`/api/admin/helping-hands/${id}`);
}

export async function cancelAdminHelpRequest(
  id: number
): Promise<{ request: AdminHelpItem }> {
  return fetchApi(`/api/admin/helping-hands/${id}/cancel`, { method: "POST", body: "{}" });
}

export async function reopenAdminHelpRequest(
  id: number
): Promise<{ request: AdminHelpItem }> {
  return fetchApi(`/api/admin/helping-hands/${id}/reopen`, { method: "POST", body: "{}" });
}

export async function completeAdminHelpRequest(
  id: number
): Promise<{ request: AdminHelpItem }> {
  return fetchApi(`/api/admin/helping-hands/${id}/complete`, { method: "POST", body: "{}" });
}

export async function expireAdminHelpRequest(
  id: number
): Promise<{ request: AdminHelpItem }> {
  return fetchApi(`/api/admin/helping-hands/${id}/expire`, { method: "POST", body: "{}" });
}

export async function extendAdminHelpRequest(
  id: number
): Promise<{ request: AdminHelpItem }> {
  return fetchApi(`/api/admin/helping-hands/${id}/extend`, { method: "POST", body: "{}" });
}

export async function deleteAdminHelpRequest(id: number): Promise<{ message: string }> {
  return fetchApi(`/api/admin/helping-hands/${id}`, { method: "DELETE" });
}
