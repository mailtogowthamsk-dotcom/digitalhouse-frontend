import { fetchApi } from "./client";

export type PostModerationOverview = {
  totalPosts: number;
  activePosts: number;
  reportedPosts: number;
  hiddenPosts: number;
  deletedPosts: number;
  todaysReports: number;
  highPriorityReports: number;
  allReports: number;
  safetyReviewRequired?: number;
  safetyBlocked?: number;
  safetyFailed?: number;
  safetyPending?: number;
};

export type AdminPostListItem = {
  id: number;
  userId: number;
  authorName: string;
  authorEmail: string | null;
  authorMobile: string | null;
  authorCommunity: string | null;
  authorDistrict: string | null;
  authorStatus: string;
  authorProfilePhoto: string | null;
  postType: string;
  visibility: string;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  moderationStatus: string;
  safetyDecision?: string;
  safetyCategory?: string | null;
  moderationReason: string | null;
  reportCount: number;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
  moderatedAt: string | null;
  deletedAt: string | null;
};

export type AdminPostDetail = {
  post: {
    id: number;
    userId: number;
    postType: string;
    visibility: string;
    title: string;
    description: string | null;
    mediaUrl: string | null;
    thumbnailUrl: string | null;
    mediaGallery: Array<string | null>;
    mediaType?: string;
    moderationStatus: string;
    safetyDecision?: string;
    safetyCategory?: string | null;
    safetyConfidence?: number | null;
    safetyModel?: string | null;
    safetyModelVersion?: string | null;
    safetyPolicyVersion?: string | null;
    mediaVersion?: number;
    moderatedMediaVersion?: number | null;
    safetyFailureReason?: string | null;
    moderationReason: string | null;
    moderationNotes: string | null;
    moderatedBy: string | null;
    moderatedAt: string | null;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
    likeCount: number;
    commentCount: number;
    viewCount: number;
    shareCount: number;
    hashtags: string[];
  };
  author: {
    id: number;
    fullName: string;
    email: string;
    mobile: string | null;
    community: string | null;
    district: string | null;
    status: string;
    profilePhoto: string | null;
  } | null;
  reports: Array<{
    id: number;
    reporterId: number;
    reason: string;
    status: string;
    adminRemarks: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
    createdAt: string;
  }>;
  timeline: Array<{
    id: number;
    action: string;
    adminEmail: string;
    note: string | null;
    createdAt: string;
  }>;
  scans?: Array<{
    id: number;
    mediaVersion: number;
    mediaType: string;
    model: string;
    modelVersion: string;
    policyVersion: string;
    status: string;
    category: string;
    confidence: number | null;
    decision: string;
    failureReason: string | null;
    createdAt: string;
  }>;
  hashtags: string[];
};

function toQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function getPostModerationOverview() {
  const res = await fetchApi<{ overview: PostModerationOverview }>("/api/admin/posts/overview");
  return res.overview;
}

export async function listAdminPosts(filters: Record<string, string | number | undefined>) {
  return fetchApi<{ items: AdminPostListItem[]; total: number; page: number; limit: number }>(
    `/api/admin/posts${toQuery(filters)}`
  );
}

export async function getAdminPostDetail(postId: number) {
  return fetchApi<AdminPostDetail>(`/api/admin/posts/${postId}`);
}

export async function updateAdminPost(
  postId: number,
  payload: { title?: string; description?: string | null; visibility?: "PUBLIC" | "CONNECTIONS"; hashtags?: string[]; remarks?: string }
) {
  return fetchApi(`/api/admin/posts/${postId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function hideAdminPost(postId: number, payload?: { reason?: string; remarks?: string; reportId?: number }) {
  return fetchApi(`/api/admin/posts/${postId}/hide`, { method: "POST", body: JSON.stringify(payload ?? {}) });
}

export async function restoreAdminPost(postId: number, payload?: { remarks?: string }) {
  return fetchApi(`/api/admin/posts/${postId}/restore`, { method: "POST", body: JSON.stringify(payload ?? {}) });
}

export async function softDeleteAdminPost(postId: number, payload?: { reason?: string; remarks?: string }) {
  return fetchApi(`/api/admin/posts/${postId}/soft-delete`, { method: "POST", body: JSON.stringify(payload ?? {}) });
}

export async function hardDeleteAdminPost(postId: number, payload?: { reason?: string; remarks?: string }) {
  return fetchApi(`/api/admin/posts/${postId}/hard-delete`, { method: "POST", body: JSON.stringify(payload ?? {}) });
}

export async function allowSafetyPost(
  postId: number,
  payload: { mediaVersion: number; remarks?: string }
) {
  return fetchApi(`/api/admin/posts/${postId}/safety-allow`, { method: "POST", body: JSON.stringify(payload) });
}

export async function rejectSafetyPost(
  postId: number,
  payload: { mediaVersion: number; reason?: string }
) {
  return fetchApi(`/api/admin/posts/${postId}/safety-reject`, { method: "POST", body: JSON.stringify(payload) });
}

export async function bulkModeratePosts(payload: {
  postIds: number[];
  action: "hide" | "restore" | "soft_delete";
  reason?: string;
  remarks?: string;
}) {
  return fetchApi(`/api/admin/posts/bulk`, { method: "POST", body: JSON.stringify(payload) });
}
