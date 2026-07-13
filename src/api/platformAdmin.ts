/**
 * Platform Management admin API
 */
import { fetchApi } from "./client";

export type VersionStatus =
  | "DRAFT"
  | "SOFT_UPDATE"
  | "FORCE_UPDATE"
  | "DISABLED"
  | "ROLLED_BACK";

export type AppPlatform = "ANDROID" | "IOS";

export type PlatformDashboard = {
  ok: boolean;
  maintenance: {
    enabled: boolean;
    title: string | null;
    description: string | null;
    expectedEndAt: string | null;
    contactInfo: string | null;
  };
  versions: Array<{
    id: number;
    platform: AppPlatform;
    versionName: string;
    latestVersion: string;
    minSupportedVersion: string;
    status: VersionStatus;
  }>;
  featuresEnabled: number;
  featuresTotal: number;
  features: Array<{ code: string; label: string; enabled: boolean }>;
  pendingAnnouncements: number;
  pendingNotifications: number;
  activeAds: number;
  activeUsers: number;
  activeSubscriptions: number;
};

export type AppVersion = {
  id: number;
  platform: AppPlatform;
  versionName: string;
  versionCode: number;
  minSupportedVersion: string;
  latestVersion: string;
  releaseNotes: string | null;
  releaseDate: string | null;
  storeUrl: string | null;
  status: VersionStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceConfig = {
  id: number;
  enabled: boolean;
  title: string;
  description: string | null;
  expectedEndAt: string | null;
  contactInfo: string | null;
  scheduledStartAt: string | null;
  activatedAt: string | null;
  deactivatedAt: string | null;
  updatedBy: string | null;
};

export type PlatformNotification = {
  id: number;
  kind: "GLOBAL" | "EMERGENCY";
  title: string;
  body: string;
  imageUrl: string | null;
  deepLink: string | null;
  audience: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type AlertPopup = {
  id: number;
  title: string;
  body: string;
  imageUrl: string | null;
  popupType: "ONE_TIME" | "REPEAT" | "MANDATORY";
  acknowledgementRequired: boolean;
  scheduledAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
};

export type Announcement = {
  id: number;
  title: string;
  description: string;
  bannerImage: string | null;
  publishAt: string;
  expiresAt: string | null;
  priority: number;
  isActive: boolean;
  createdBy: string | null;
};

export type PlatformBanner = {
  id: number;
  message: string;
  backgroundColor: string | null;
  icon: string | null;
  clickAction: string | null;
  expiresAt: string | null;
  priority: number;
  isActive: boolean;
};

export type FeatureFlag = {
  id: number;
  code: string;
  label: string;
  enabled: boolean;
  platforms: string[] | null;
  updatedBy: string | null;
  updatedAt: string;
};

export type MenuItem = {
  id: number;
  code: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
  featureFlag: string | null;
  platformScope: string | null;
  roleScope: string | null;
};

export type PlatformAd = {
  id: number;
  kind: "BANNER" | "SPONSORED" | "INTERNAL";
  title: string;
  imageUrl: string | null;
  targetScreen: string | null;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  clickAction: string | null;
  isActive: boolean;
  views: number;
  clicks: number;
  ctr: number;
};

export type AdAnalytics = {
  ok: boolean;
  totalCampaigns: number;
  activeCampaigns: number;
  expiredCampaigns: number;
  totalViews: number;
  totalClicks: number;
  ctr: number;
  campaigns: Array<{
    id: number;
    title: string;
    kind: string;
    views: number;
    clicks: number;
    ctr: number;
    isActive: boolean;
  }>;
};

export type AuditLog = {
  id: number;
  adminEmail: string | null;
  action: string;
  module: string;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export async function getPlatformDashboard(): Promise<PlatformDashboard> {
  return fetchApi("/api/admin/platform/dashboard");
}

export async function listVersions(platform?: string): Promise<{ ok: boolean; versions: AppVersion[] }> {
  const q = platform ? `?platform=${encodeURIComponent(platform)}` : "";
  return fetchApi(`/api/admin/platform/versions${q}`);
}

export async function saveVersion(body: {
  id?: number;
  platform: AppPlatform;
  versionName: string;
  versionCode?: number;
  minSupportedVersion: string;
  latestVersion: string;
  releaseNotes?: string | null;
  releaseDate?: string | null;
  storeUrl?: string | null;
  status: VersionStatus;
}): Promise<{ ok: boolean; versions: AppVersion[] }> {
  return fetchApi("/api/admin/platform/versions", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function getMaintenance(): Promise<{ ok: boolean; maintenance: MaintenanceConfig }> {
  return fetchApi("/api/admin/platform/maintenance");
}

export async function updateMaintenance(
  body: Partial<{
    enabled: boolean;
    title: string;
    description: string | null;
    expectedEndAt: string | null;
    contactInfo: string | null;
    scheduledStartAt: string | null;
  }>
): Promise<{ ok: boolean; maintenance: MaintenanceConfig }> {
  return fetchApi("/api/admin/platform/maintenance", {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

export async function listNotifications(
  kind?: string
): Promise<{ ok: boolean; notifications: PlatformNotification[] }> {
  const q = kind ? `?kind=${encodeURIComponent(kind)}` : "";
  return fetchApi(`/api/admin/platform/notifications${q}`);
}

export async function createNotification(body: {
  kind: "GLOBAL" | "EMERGENCY";
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  audience?: string;
  scheduledAt?: string | null;
  sendNow?: boolean;
}): Promise<{ ok: boolean }> {
  return fetchApi("/api/admin/platform/notifications", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function sendNotification(id: number): Promise<{ ok: boolean }> {
  return fetchApi(`/api/admin/platform/notifications/${id}/send`, { method: "POST" });
}

export async function processScheduledNotifications(): Promise<{ ok: boolean; sent: number }> {
  return fetchApi("/api/admin/platform/notifications/process-scheduled", { method: "POST" });
}

export async function listPopups(): Promise<{ ok: boolean; popups: AlertPopup[] }> {
  return fetchApi("/api/admin/platform/popups");
}

export async function savePopup(
  body: Partial<AlertPopup> & { id?: number }
): Promise<{ ok: boolean; popup: AlertPopup }> {
  return fetchApi("/api/admin/platform/popups", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function listAnnouncements(): Promise<{ ok: boolean; announcements: Announcement[] }> {
  return fetchApi("/api/admin/platform/announcements");
}

export async function saveAnnouncement(
  body: Partial<Announcement> & { id?: number }
): Promise<{ ok: boolean; announcement: Announcement }> {
  return fetchApi("/api/admin/platform/announcements", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function listBanners(): Promise<{ ok: boolean; banners: PlatformBanner[] }> {
  return fetchApi("/api/admin/platform/banners");
}

export async function saveBanner(
  body: Partial<PlatformBanner> & { id?: number }
): Promise<{ ok: boolean; banner: PlatformBanner }> {
  return fetchApi("/api/admin/platform/banners", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function listFeatures(): Promise<{ ok: boolean; features: FeatureFlag[] }> {
  return fetchApi("/api/admin/platform/features");
}

export async function setFeature(
  code: string,
  enabled: boolean
): Promise<{ ok: boolean; features: FeatureFlag[] }> {
  return fetchApi(`/api/admin/platform/features/${encodeURIComponent(code)}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled })
  });
}

export async function listMenu(): Promise<{ ok: boolean; menu: MenuItem[] }> {
  return fetchApi("/api/admin/platform/menu");
}

export async function setMenu(
  code: string,
  patch: { enabled?: boolean; sortOrder?: number; label?: string; platformScope?: string | null }
): Promise<{ ok: boolean; menu: MenuItem[] }> {
  return fetchApi(`/api/admin/platform/menu/${encodeURIComponent(code)}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
}

export async function listAds(): Promise<{ ok: boolean; ads: PlatformAd[] }> {
  return fetchApi("/api/admin/platform/ads");
}

export async function saveAd(
  body: Partial<PlatformAd> & { id?: number }
): Promise<{ ok: boolean; ads: PlatformAd[] }> {
  return fetchApi("/api/admin/platform/ads", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function getAdAnalytics(): Promise<AdAnalytics> {
  return fetchApi("/api/admin/platform/ads/analytics");
}

export async function listAudits(
  page = 1,
  limit = 50,
  module?: string
): Promise<{ ok: boolean; items: AuditLog[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (module) params.set("module", module);
  return fetchApi(`/api/admin/platform/audits?${params}`);
}
