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
  totalReportCount: number;
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    fullName: string;
    email: string;
    mobile: string | null;
  };
};

export type MarketplaceOverviewResponse = {
  ok: boolean;
  cards: {
    pending: number;
    live: number;
    rejected: number;
    changes: number;
    hidden: number;
    sold: number;
    expired: number;
    reported: number;
    todaysListings: number;
    featured: number;
    archived?: number;
    expiringSoon?: number;
  };
  topCategories: Array<{ category: string; count: number }>;
  topDistricts: Array<{ district: string; count: number }>;
  recentListings: Array<{
    id: number;
    title: string;
    category: string | null;
    status: string;
    createdAt: string;
  }>;
  featuredListings?: Array<{
    id: number;
    title: string;
    category: string | null;
    featuredAt: string | null;
  }>;
  analytics?: {
    createdLast7Days: number;
    createdLast30Days: number;
    approvedLast30Days: number;
    soldLast30Days: number;
    reportRatePercent: number;
    sellThroughPercent: number;
    mostViewed: Array<{ id: number; title: string; views: number }>;
    expiringSoon: Array<{ id: number; title: string; expiresAt: string }>;
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

export type AdminMarketplaceDetailResponse = {
  ok: boolean;
  listing: AdminMarketplaceItem & {
    moderationStatus: string;
    moderationReason: string | null;
    moderationNotes: string | null;
    moderatedBy: string | null;
    moderatedAt: string | null;
    deletedAt: string | null;
    marketplaceFeaturedAt: string | null;
  };
  seller: {
    id: number;
    fullName: string;
    email: string;
    mobile: string | null;
    community: string | null;
    district: string | null;
    status: string;
    profilePhoto: string | null;
    liveListingCount: number;
    totalListingCount: number;
  };
  stats: {
    views: number;
    favorites: number;
    pendingReports: number;
    totalReports: number;
  };
  reports: Array<{
    id: number;
    reporterId: number;
    reporterName: string | null;
    reason: string;
    status: string;
    adminRemarks: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
    createdAt: string;
  }>;
  sellerListings: Array<{
    id: number;
    title: string;
    marketplaceStatus: string;
    marketplacePrice: number | null;
    createdAt: string;
  }>;
  timeline: Array<{
    id: string;
    action: string;
    actor: string;
    note: string | null;
    createdAt: string;
  }>;
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
  q?: string,
  filters?: {
    category?: string;
    district?: string;
    intent?: string;
    condition?: string;
    featured?: "all" | "featured" | "not_featured";
    priceMin?: number;
    priceMax?: number;
    createdFrom?: string;
    createdTo?: string;
  }
): Promise<AdminMarketplaceListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status
  });
  if (q?.trim()) params.set("q", q.trim());
  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return fetchApi<AdminMarketplaceListResponse>(`/api/admin/marketplace?${params}`);
}

export async function getMarketplaceOverview(): Promise<MarketplaceOverviewResponse> {
  return fetchApi<MarketplaceOverviewResponse>("/api/admin/marketplace/overview");
}

export async function getAdminMarketplaceDetail(
  id: number
): Promise<AdminMarketplaceDetailResponse> {
  return fetchApi<AdminMarketplaceDetailResponse>(`/api/admin/marketplace/${id}`);
}

export async function updateAdminMarketplace(
  id: number,
  payload: Record<string, unknown>
): Promise<AdminMarketplaceDetailResponse> {
  return fetchApi(`/api/admin/marketplace/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function addAdminMarketplaceNote(
  id: number,
  note: string
): Promise<AdminMarketplaceDetailResponse> {
  return fetchApi(`/api/admin/marketplace/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ note })
  });
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

export async function softDeleteAdminMarketplace(
  id: number,
  reason?: string
): Promise<{ listing: AdminMarketplaceItem }> {
  return fetchApi(`/api/admin/marketplace/${id}/soft-delete`, {
    method: "POST",
    body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {})
  });
}

export async function restoreSoftDeletedAdminMarketplace(
  id: number
): Promise<{ listing: AdminMarketplaceItem }> {
  return fetchApi(`/api/admin/marketplace/${id}/restore`, { method: "POST", body: "{}" });
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
