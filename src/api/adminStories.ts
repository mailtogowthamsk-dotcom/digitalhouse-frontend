/**
 * Admin Official Stories API — VettuvaGounder global stories.
 */
import { apiUrl } from "./apiBase";
import { fetchApi, getToken } from "./client";

export type AdminStoryStatus = "active" | "expired" | "deleted";

export type AdminStoryItem = {
  id: number;
  media_type: "image" | "video" | "text";
  caption: string | null;
  duration_seconds: number | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  expires_at: string;
  deleted_at: string | null;
  created_by_admin_email: string | null;
  status: AdminStoryStatus;
  view_count: number;
  like_count: number;
};

export type AdminStoriesListResponse = {
  ok: boolean;
  identity: { name: string; owner_user_id: number | null };
  items: AdminStoryItem[];
};

export type AdminStoryUploadResponse = {
  ok: boolean;
  key: string;
  byte_size: number;
  mime_type: string;
  duration_seconds: number | null;
  media_kind: "image" | "video";
};

export type AdminStoryPublishBody = {
  media_url?: string | null;
  media_type: "image" | "video" | "text";
  caption?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  mime_type?: string | null;
  file_size?: number | null;
};

export async function listAdminStories(includeExpired = true): Promise<AdminStoriesListResponse> {
  return fetchApi<AdminStoriesListResponse>(
    `/api/admin/stories?includeExpired=${includeExpired ? "1" : "0"}`
  );
}

export async function uploadAdminStoryMedia(
  file: Blob,
  mimeType: string,
  onProgress?: (pct: number) => void
): Promise<AdminStoryUploadResponse> {
  const token = getToken();
  const url = apiUrl(
    `/api/admin/stories/upload?mime=${encodeURIComponent(mimeType || "application/octet-stream")}`
  );

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", mimeType || "application/octet-stream");
    xhr.upload.onprogress = (ev) => {
      if (!onProgress || !ev.lengthComputable) return;
      onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      let message = `HTTP ${xhr.status}`;
      try {
        const parsed = JSON.parse(xhr.responseText) as {
          ok?: boolean;
          message?: string;
          key?: string;
          byte_size?: number;
          mime_type?: string;
          duration_seconds?: number | null;
          media_kind?: "image" | "video";
        };
        if (!xhr.status || xhr.status >= 400 || parsed.ok === false) {
          reject(new Error(parsed.message || message));
          return;
        }
        resolve(parsed as AdminStoryUploadResponse);
      } catch {
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

export async function publishAdminStory(body: AdminStoryPublishBody) {
  return fetchApi<{ ok: boolean; story: Record<string, unknown> }>("/api/admin/stories", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function deleteAdminStory(id: number) {
  return fetchApi<{ ok: boolean; deleted: boolean }>(`/api/admin/stories/${id}`, {
    method: "DELETE"
  });
}
