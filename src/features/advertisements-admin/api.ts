import { fetchApi } from "../../api/client";

export type AdminAdListItem = {
  id: number;
  advertiser: { id: number; name?: string; email?: string };
  title: string;
  businessName?: string | null;
  typeCode: string;
  amountPaise: number | null;
  paymentOrderId: number | null;
  paymentStatus: string | null;
  status: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  impressions: number;
  clicks: number;
  reports?: number;
  ctr?: number;
  createdAt: string;
};

export async function listAdminAdvertisements(params: {
  page: number;
  limit: number;
  status?: string;
  q?: string;
}) {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.q) sp.set("q", params.q);
  return fetchApi<{ items: AdminAdListItem[]; page: number; limit: number; total: number }>(
    `/api/admin/advertisements?${sp.toString()}`
  );
}

export async function getAdminAdvertisement(id: number) {
  return fetchApi<Record<string, unknown>>(`/api/admin/advertisements/${id}`);
}

export async function createAdminAdvertisement(body: Record<string, unknown>) {
  return fetchApi<Record<string, unknown>>("/api/admin/advertisements", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function updateAdminAdvertisement(id: number, body: Record<string, unknown>) {
  return fetchApi<{ advertisement: Record<string, unknown> }>(`/api/admin/advertisements/${id}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

export async function publishAdminAdvertisement(
  id: number,
  body?: { scheduledStartAt?: string | null; scheduledEndAt?: string | null }
) {
  return fetchApi<{ message: string }>(`/api/admin/advertisements/${id}/publish`, {
    method: "POST",
    body: JSON.stringify(body || {})
  });
}

export async function deleteAdminAdvertisement(id: number) {
  return fetchApi<{ deleted: boolean }>(`/api/admin/advertisements/${id}`, { method: "DELETE" });
}

export async function approveAdvertisement(id: number) {
  return fetchApi<{ message: string }>(`/api/admin/advertisements/${id}/approve`, { method: "POST" });
}

export async function rejectAdvertisement(id: number, reason: string) {
  return fetchApi<{ message: string }>(`/api/admin/advertisements/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function pauseAdvertisement(id: number) {
  return fetchApi<{ message: string }>(`/api/admin/advertisements/${id}/pause`, { method: "POST" });
}

export async function resumeAdvertisement(id: number) {
  return fetchApi<{ message: string }>(`/api/admin/advertisements/${id}/resume`, { method: "POST" });
}

export async function cancelAdvertisement(id: number, reason?: string) {
  return fetchApi<{ message: string }>(`/api/admin/advertisements/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function extendAdvertisement(id: number, extensionDays: number, reason: string) {
  return fetchApi<{ message: string }>(`/api/admin/advertisements/${id}/extend`, {
    method: "POST",
    body: JSON.stringify({ extensionDays, reason })
  });
}

export async function refundAdvertisement(id: number, reason: string) {
  return fetchApi<{ message: string }>(`/api/admin/advertisements/${id}/refund`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function listAdvertisementPricing() {
  return fetchApi<{
    types: Array<{ code: string; label: string; mediaKind: string; isActive: boolean }>;
    pricing: Array<{
      id: number;
      typeCode: string;
      durationDays: number;
      pricePaise: number;
      priceInr: number;
      currency: string;
      isActive: boolean;
      refundOnReject: boolean;
      version: number;
      effectiveFrom: string;
      effectiveTo: string | null;
      createdBy: string | null;
      updatedBy: string | null;
      updatedAt: string;
    }>;
  }>("/api/admin/advertisement-pricing");
}

export async function createAdvertisementPricing(body: {
  typeCode: string;
  durationDays: number;
  pricePaise: number;
  isActive?: boolean;
  refundOnReject?: boolean;
}) {
  return fetchApi("/api/admin/advertisement-pricing", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function updateAdvertisementPricing(
  id: number,
  body: { pricePaise?: number; isActive?: boolean; refundOnReject?: boolean; reason?: string }
) {
  return fetchApi(`/api/admin/advertisement-pricing/${id}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

export async function getAdvertisementAnalytics(from?: string, to?: string) {
  const sp = new URLSearchParams();
  if (from) sp.set("from", from);
  if (to) sp.set("to", to);
  const q = sp.toString();
  return fetchApi<{ analytics: Record<string, unknown> }>(
    `/api/admin/advertisements/analytics${q ? `?${q}` : ""}`
  );
}

export async function listAdvertisementReports(params: {
  page: number;
  limit: number;
  status?: string;
  advertisementId?: number;
}) {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.advertisementId) sp.set("advertisementId", String(params.advertisementId));
  return fetchApi<{
    items: Array<Record<string, unknown>>;
    page: number;
    limit: number;
    total: number;
  }>(`/api/admin/advertisement-reports?${sp.toString()}`);
}

export async function reviewAdvertisementReport(
  id: number,
  body: {
    status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
    notes?: string;
    advertisementAction?: "keep" | "pause" | "reject" | "cancel";
    rejectReason?: string;
  }
) {
  return fetchApi<{ message: string }>(`/api/admin/advertisement-reports/${id}/review`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}
