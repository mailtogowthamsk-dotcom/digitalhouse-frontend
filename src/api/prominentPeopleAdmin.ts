/**
 * Admin Prominent People API – CRUD, publish/feature, media upload URLs.
 */
import { fetchApi } from "./client";

export type ProminentCategory = {
  id: number;
  code: string;
  label: string;
  color: string | null;
  sortOrder: number;
};

export type ProminentTimelineEntry = {
  id?: number;
  year: string;
  title: string;
  description?: string | null;
  sortOrder?: number;
};

export type ProminentGalleryItem = {
  id?: number;
  imageKey: string;
  caption?: string | null;
  sortOrder?: number;
  imageUrl?: string | null;
};

export type ProminentPersonCard = {
  id: number;
  fullName: string;
  occupation: string | null;
  currentDesignation: string | null;
  shortDescription: string | null;
  category: ProminentCategory | null;
  profileImageUrl: string | null;
  heroImageUrl: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  verified?: boolean;
};

export type ProminentPersonDetail = ProminentPersonCard & {
  biography: string | null;
  education: string | null;
  achievements: string | null;
  awards: string | null;
  communityContribution: string | null;
  profileImageKey: string | null;
  heroImageKey: string | null;
  featuredSortOrder: number;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  gallery: ProminentGalleryItem[];
  timeline: ProminentTimelineEntry[];
};

export type ProminentPersonWriteBody = {
  fullName: string;
  categoryId: number;
  occupation?: string | null;
  currentDesignation?: string | null;
  shortDescription?: string | null;
  biography?: string | null;
  education?: string | null;
  achievements?: string | null;
  awards?: string | null;
  communityContribution?: string | null;
  profileImageKey?: string | null;
  heroImageKey?: string | null;
  isFeatured?: boolean;
  isPublished?: boolean;
  featuredSortOrder?: number;
  sortOrder?: number;
  timeline?: ProminentTimelineEntry[];
  gallery?: Array<{ imageKey: string; caption?: string | null; sortOrder?: number }>;
};

export type ProminentListParams = {
  q?: string;
  categoryId?: number;
  published?: boolean;
  featured?: boolean;
  page?: number;
  limit?: number;
  sort?: "latest" | "alphabetical";
};

export type ProminentListResponse = {
  ok?: boolean;
  items: ProminentPersonCard[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type ProminentUploadKind = "profile" | "hero" | "gallery";

export type ProminentUploadUrlResponse = {
  ok?: boolean;
  uploadUrl: string;
  publicUrl: string;
  key: string;
  fileName?: string;
};

export async function listProminentCategories(): Promise<ProminentCategory[]> {
  const data = await fetchApi<{ ok?: boolean; categories: ProminentCategory[] }>(
    "/api/admin/prominent-people/categories"
  );
  return data.categories ?? [];
}

export async function listProminentPeople(
  params: ProminentListParams = {}
): Promise<ProminentListResponse> {
  const qs = new URLSearchParams();
  if (params.q?.trim()) qs.set("q", params.q.trim());
  if (params.categoryId != null) qs.set("categoryId", String(params.categoryId));
  if (params.published === true) qs.set("published", "true");
  if (params.published === false) qs.set("published", "false");
  if (params.featured === true) qs.set("featured", "true");
  if (params.featured === false) qs.set("featured", "false");
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.sort) qs.set("sort", params.sort);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return fetchApi<ProminentListResponse>(`/api/admin/prominent-people${suffix}`);
}

export async function getProminentPerson(
  id: number
): Promise<{ ok?: boolean; person: ProminentPersonDetail }> {
  return fetchApi(`/api/admin/prominent-people/${id}`);
}

export async function createProminentPerson(
  body: ProminentPersonWriteBody
): Promise<{ ok?: boolean; person: ProminentPersonDetail }> {
  return fetchApi("/api/admin/prominent-people", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function updateProminentPerson(
  id: number,
  body: Partial<ProminentPersonWriteBody>
): Promise<{ ok?: boolean; person: ProminentPersonDetail }> {
  return fetchApi(`/api/admin/prominent-people/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteProminentPerson(id: number): Promise<{ ok?: boolean }> {
  return fetchApi(`/api/admin/prominent-people/${id}`, { method: "DELETE" });
}

export async function setProminentPublished(
  id: number,
  value: boolean
): Promise<{ ok?: boolean; person: ProminentPersonDetail }> {
  return fetchApi(`/api/admin/prominent-people/${id}/publish`, {
    method: "POST",
    body: JSON.stringify({ value })
  });
}

export async function setProminentFeatured(
  id: number,
  value: boolean
): Promise<{ ok?: boolean; person: ProminentPersonDetail }> {
  return fetchApi(`/api/admin/prominent-people/${id}/feature`, {
    method: "POST",
    body: JSON.stringify({ value })
  });
}

export async function getProminentUploadUrl(input: {
  fileName: string;
  fileType: string;
  kind: ProminentUploadKind;
}): Promise<ProminentUploadUrlResponse> {
  return fetchApi("/api/admin/prominent-people/upload-url", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] || "" : result;
      if (!base64) reject(new Error("Could not read image file."));
      else resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload via backend proxy (avoids browser→R2 CORS on private buckets).
 * Returns object key + signed preview URL for the admin form.
 */
export async function uploadProminentImage(
  file: File,
  kind: ProminentUploadKind
): Promise<{ key: string; publicUrl: string }> {
  if (file.size > 2.5 * 1024 * 1024) {
    throw new Error("Image must be 2.5 MB or smaller.");
  }
  const dataBase64 = await fileToBase64(file);
  const data = await fetchApi<{
    ok?: boolean;
    key: string;
    publicUrl?: string;
    previewUrl?: string;
  }>("/api/admin/prominent-people/upload", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name || `image.${(file.type || "image/jpeg").split("/")[1] || "jpg"}`,
      fileType: file.type || "image/jpeg",
      kind,
      dataBase64
    })
  });
  if (!data?.key) throw new Error("Upload failed — no object key returned.");
  return {
    key: data.key,
    publicUrl: data.previewUrl || data.publicUrl || ""
  };
}
