import { fetchApi } from "../../api/client";
import type {
  MatrimonyStats,
  MatrimonyListResponse,
  MatrimonyListFilters,
  MatrimonyRequestDetail
} from "./types";

function toQuery(params: MatrimonyListFilters): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function getMatrimonyStats(): Promise<MatrimonyStats> {
  return fetchApi<MatrimonyStats>("/api/admin/matrimony/stats");
}

export async function listMatrimonyRequests(
  filters: MatrimonyListFilters
): Promise<MatrimonyListResponse> {
  return fetchApi<MatrimonyListResponse>(`/api/admin/matrimony/requests${toQuery(filters)}`);
}

export async function getMatrimonyRequestDetail(id: number): Promise<MatrimonyRequestDetail> {
  return fetchApi<MatrimonyRequestDetail>(`/api/admin/matrimony/requests/${id}`);
}

export async function assignMatrimonyReviewer(id: number, reviewerEmail: string): Promise<void> {
  await fetchApi(`/api/admin/matrimony/requests/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ reviewerEmail })
  });
}

export async function approveMatrimonyRequest(id: number, remarks?: string): Promise<void> {
  await fetchApi(`/api/admin/matrimony/requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ remarks: remarks ?? null })
  });
}

export async function rejectMatrimonyRequest(
  id: number,
  reasonCode: string,
  comment: string
): Promise<void> {
  await fetchApi(`/api/admin/matrimony/requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reasonCode, comment })
  });
}

export async function requestMatrimonyChanges(
  id: number,
  comment: string,
  sections: string[] = []
): Promise<void> {
  await fetchApi(`/api/admin/matrimony/requests/${id}/request-changes`, {
    method: "POST",
    body: JSON.stringify({ comment, sections })
  });
}

export async function suspendMatrimonyProfile(id: number, reason: string): Promise<void> {
  await fetchApi(`/api/admin/matrimony/requests/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function updateMatrimonyVerification(
  id: number,
  key: string,
  checked: boolean
): Promise<void> {
  await fetchApi(`/api/admin/matrimony/requests/${id}/verification`, {
    method: "POST",
    body: JSON.stringify({ key, checked })
  });
}

export async function addMatrimonyNote(
  id: number,
  content: string,
  noteType: "REVIEW" | "WARNING" | "MODERATION" | "INTERNAL"
): Promise<void> {
  await fetchApi(`/api/admin/matrimony/requests/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ content, noteType })
  });
}

export async function bulkMatrimonyAction(payload: {
  updateIds: number[];
  action: "approve" | "reject";
  rejectReason?: string;
  rejectComment?: string;
}): Promise<{ results: { id: number; ok: boolean; error?: string }[] }> {
  return fetchApi("/api/admin/matrimony/bulk", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getMatrimonyConfig(): Promise<{
  changeRequestTemplates: string[];
  changeSections: { key: string; label: string; fields: string[] }[];
}> {
  return fetchApi("/api/admin/matrimony/config");
}
