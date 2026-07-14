/**
 * Admin Help & Support API — tickets, contact config, FAQs overview.
 */
import { fetchApi } from "./client";

export type SupportTicketStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "IN_PROGRESS"
  | "PLANNED"
  | "ACCEPTED"
  | "REJECTED"
  | "RESOLVED"
  | "RELEASED"
  | "CLOSED";

export type SupportTicketType = "BUG" | "FEATURE" | "QUESTION" | "CONTACT" | "GENERAL";

export type AdminSupportTicket = {
  id: number;
  ref: string;
  type: SupportTicketType;
  category: string | null;
  title: string;
  description: string;
  status: SupportTicketStatus;
  priority: string;
  screenshotUrl: string | null;
  recordingUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  user: {
    id: number;
    fullName: string;
    username: string | null;
    email: string;
    community: string | null;
    mobile?: string | null;
  } | null;
  messages?: Array<{
    id: number;
    authorType: "USER" | "ADMIN";
    authorUserId: number | null;
    body: string;
    createdAt: string;
  }>;
};

export type AdminSupportListResponse = {
  ok: boolean;
  items: AdminSupportTicket[];
  page: number;
  limit: number;
  total: number;
};

export type SupportContactConfig = {
  email: string | null;
  whatsappNumber: string | null;
  phoneNumber: string | null;
  chatEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  callEnabled: boolean;
  supportNote: string | null;
};

export async function listAdminSupportTickets(params: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  category?: string;
  priority?: string;
  q?: string;
}): Promise<AdminSupportListResponse> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 20));
  if (params.status) search.set("status", params.status);
  if (params.type) search.set("type", params.type);
  if (params.category) search.set("category", params.category);
  if (params.priority) search.set("priority", params.priority);
  if (params.q?.trim()) search.set("q", params.q.trim());
  return fetchApi(`/api/admin/support/tickets?${search}`);
}

export async function getAdminSupportTicket(
  ticketId: number
): Promise<{ ok: boolean; ticket: AdminSupportTicket }> {
  return fetchApi(`/api/admin/support/tickets/${ticketId}`);
}

export async function updateAdminSupportTicket(
  ticketId: number,
  body: {
    status?: SupportTicketStatus;
    priority?: string;
    assignedAdminId?: number | null;
    reply?: string;
  }
): Promise<{ ok: boolean; ticket: AdminSupportTicket }> {
  return fetchApi(`/api/admin/support/tickets/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function getAdminSupportContact(): Promise<{
  ok: boolean;
  contact: SupportContactConfig;
}> {
  return fetchApi("/api/admin/support/contact");
}

export async function updateAdminSupportContact(
  body: Partial<SupportContactConfig>
): Promise<{ ok: boolean; contact: SupportContactConfig }> {
  return fetchApi("/api/admin/support/contact", {
    method: "PUT",
    body: JSON.stringify(body)
  });
}
