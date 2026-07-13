/**
 * Admin Jobs Portal API – list / close / reopen / delete JOB posts.
 */
import { fetchApi } from "./client";

export type AdminJobItem = {
  id: number;
  title: string;
  description: string | null;
  jobStatus: string;
  jobCompany: string | null;
  jobLocation: string | null;
  jobEmploymentType: string | null;
  jobSalaryMin: number | null;
  jobSalaryMax: number | null;
  interestCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    fullName: string;
    email: string;
    mobile: string | null;
  };
};

export type AdminJobsListResponse = {
  ok: boolean;
  jobs: AdminJobItem[];
  total: number;
  page: number;
  limit: number;
  counts: { open: number; closed: number; all: number };
};

export async function listAdminJobs(
  page = 1,
  limit = 20,
  status: "open" | "closed" | "all" = "all",
  q?: string
): Promise<AdminJobsListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status
  });
  if (q?.trim()) params.set("q", q.trim());
  return fetchApi<AdminJobsListResponse>(`/api/admin/jobs?${params}`);
}

export async function closeAdminJob(id: number): Promise<{ job: AdminJobItem }> {
  return fetchApi(`/api/admin/jobs/${id}/close`, { method: "POST", body: "{}" });
}

export async function reopenAdminJob(id: number): Promise<{ job: AdminJobItem }> {
  return fetchApi(`/api/admin/jobs/${id}/reopen`, { method: "POST", body: "{}" });
}

export async function deleteAdminJob(id: number): Promise<{ message: string }> {
  return fetchApi(`/api/admin/jobs/${id}`, { method: "DELETE" });
}
