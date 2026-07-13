/**
 * Admin Marketplace API – list / moderate MARKETPLACE posts.
 */
import { fetchApi } from "./client";

export type AdminMarketplaceItem = {
  id: number;
  title: string;
  description: string | null;
  marketplaceStatus: string;
  marketplaceIntent: string | null;
  marketplaceCategory: string | null;
  marketplaceCondition: string | null;
  marketplacePrice: number | null;
  marketplaceNegotiable: boolean;
  marketplaceDistrict: string | null;
  marketplaceAdminNote: string | null;
  marketplaceExpiresAt: string | null;
  marketplaceGallery?: string[];
  marketplaceFeatured?: boolean;
  mediaUrl: string | null;
  pendingReportCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    fullName: string;
    email: string;
    mobile: string | null;
  };
};

export type AdminMarketplaceListResponse = {
  ok: boolean;
  listings: AdminMarketplaceItem[];
  total: number;
  page: number;
  limit: number;
  counts: {
    pending: number;
    changes: number;
    live: number;
    rejected: number;
    sold: number;
    hidden: number;
    expired: number;
    archived: number;
    reported: number;
    all: number;
  };
};

export type MarketplaceStatusFilter =
  | "pending"
  | "changes"
  | "live"
  | "rejected"
  | "sold"
  | "hidden"
  | "expired"
  | "archived"
  | "reported"
  | "all";

export async function listAdminMarketplace(
  page = 1,
  limit = 20,
  status: MarketplaceStatusFilter = "pending",
  q?: string
): Promise<AdminMarketplaceListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status
  });
  if (q?.trim()) params.set("q", q.trim());
  return fetchApi<AdminMarketplaceListResponse>(`/api/admin/marketplace?${params}`);
}

export async function approveAdminMarketplace(
  id: number
): Promise<{ listing: AdminMarketplaceItem }> {
  return fetchApi(`/api/admin/marketplace/${id}/approve`, { method: "POST", body: "{}" });
}

export async function rejectAdminMarketplace(
  id: number,
  reason: string
): Promise<{ listing: AdminMarketplaceItem }> {
  return fetchApi(`/api/admin/marketplace/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function requestChangesAdminMarketplace(
  id: number,
  notes: string
): Promise<{ listing: AdminMarketplaceItem }> {
  return fetchApi(`/api/admin/marketplace/${id}/request-changes`, {
    method: "POST",
    body: JSON.stringify({ notes })
  });
}

export async function hideAdminMarketplace(
  id: number,
  reason?: string
): Promise<{ listing: AdminMarketplaceItem }> {
  return fetchApi(`/api/admin/marketplace/${id}/hide`, {
    method: "POST",
    body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {})
  });
}

export async function unhideAdminMarketplace(
  id: number
): Promise<{ listing: AdminMarketplaceItem }> {
  return fetchApi(`/api/admin/marketplace/${id}/unhide`, { method: "POST", body: "{}" });
}

export async function dismissReportsAdminMarketplace(
  id: number
): Promise<{ listing: AdminMarketplaceItem }> {
  return fetchApi(`/api/admin/marketplace/${id}/dismiss-reports`, {
    method: "POST",
    body: "{}"
  });
}

export async function deleteAdminMarketplace(id: number): Promise<{ message: string }> {
  return fetchApi(`/api/admin/marketplace/${id}`, { method: "DELETE" });
}

export async function setFeaturedAdminMarketplace(
  id: number,
  featured: boolean
): Promise<{ listing: AdminMarketplaceItem }> {
  return fetchApi(`/api/admin/marketplace/${id}/feature`, {
    method: "POST",
    body: JSON.stringify({ featured })
  });
}
