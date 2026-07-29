import { fetchApi } from "./client";

export type AdminJobItem = {
  id: number;
  title: string;
  description: string | null;
  jobStatus: string;
  currentStatus: string;
  jobCompany: string | null;
  jobCategory: string | null;
  jobLocation: string | null;
  jobEmploymentType: string | null;
  jobWorkMode: string | null;
  jobExperience: string | null;
  jobSalaryMin: number | null;
  jobSalaryMax: number | null;
  jobVacancies: number | null;
  jobApplicationDeadline: string | null;
  applicationCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  moderatedAt: string | null;
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
  counts: {
    active: number;
    closed: number;
    hidden: number;
    deleted: number;
    expired: number;
    all: number;
  };
};

export type JobsOverviewResponse = {
  ok: boolean;
  cards: {
    totalJobs: number;
    activeJobs: number;
    closedJobs: number;
    hiddenJobs: number;
    deletedJobs: number;
    expiredJobs: number;
    todaysJobs: number;
    applications: number;
    openPositions: number;
  };
  recentJobs: Array<{ id: number; title: string; company: string | null; status: string; createdAt: string }>;
  topCompanies: Array<{ name: string; count: number }>;
  topCategories: Array<{ name: string; count: number }>;
  mostViewedJobs: Array<{ id: number; title: string; company: string | null; viewCount: number }>;
  recentApplications: Array<{
    id: number;
    jobId: number;
    jobTitle: string;
    company: string | null;
    applicantName: string;
    status: string;
    createdAt: string;
  }>;
};

export type AdminJobDetailResponse = {
  ok: boolean;
  job: AdminJobItem & {
    moderationStatus: string;
    jobSkills: string[];
    jobClosedAt: string | null;
  };
  employer: {
    id: number;
    fullName: string;
    email: string;
    mobile: string | null;
  };
  stats: {
    applications: number;
    views: number;
    shortlisted: number;
    rejected: number;
    selected: number;
  };
  applications: Array<{
    id: number;
    applicantId: number;
    applicantName: string;
    applicantEmail: string;
    applicantMobile: string | null;
    status: string;
    resumeUrl: string | null;
    message: string | null;
    adminNotes: string | null;
    reviewedAt: string | null;
    createdAt: string;
  }>;
  timeline: Array<{
    id: number;
    action: string;
    actorType: string;
    actorEmail: string | null;
    statusFrom: string | null;
    statusTo: string | null;
    note: string | null;
    createdAt: string;
  }>;
  notes: Array<{
    id: number;
    kind: "internal" | "admin";
    author: string;
    note: string;
    createdAt: string;
  }>;
};

export type AdminApplicationItem = {
  id: number;
  status: string;
  message: string | null;
  resumeUrl: string | null;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  applicant: {
    id: number;
    fullName: string;
    email: string;
    mobile: string | null;
  };
  job: {
    id: number;
    title: string;
    company: string | null;
    category: string | null;
    location: string | null;
  };
  employer: {
    id: number;
    fullName: string;
    email: string | null;
  };
};

export type AdminApplicationsListResponse = {
  ok: boolean;
  items: AdminApplicationItem[];
  total: number;
  page: number;
  limit: number;
};

export async function listAdminJobs(
  page = 1,
  limit = 20,
  status: "active" | "closed" | "hidden" | "deleted" | "expired" | "all" = "all",
  q?: string,
  extra?: Record<string, string | number | undefined>
): Promise<AdminJobsListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status
  });
  if (q?.trim()) params.set("q", q.trim());
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return fetchApi<AdminJobsListResponse>(`/api/admin/jobs?${params}`);
}

export async function getJobsOverview() {
  return fetchApi<JobsOverviewResponse>("/api/admin/jobs/overview");
}

export async function getAdminJobDetail(id: number) {
  return fetchApi<AdminJobDetailResponse>(`/api/admin/jobs/${id}`);
}

export async function updateAdminJob(
  id: number,
  payload: {
    title?: string;
    description?: string | null;
    jobCompany?: string | null;
    jobCategory?: string | null;
    jobLocation?: string | null;
    jobEmploymentType?: string | null;
    jobWorkMode?: string | null;
    jobExperience?: string | null;
    jobSkills?: string[];
    jobSalaryMin?: number | null;
    jobSalaryMax?: number | null;
    jobVacancies?: number | null;
    jobApplicationDeadline?: string | null;
    remarks?: string;
  }
) {
  return fetchApi(`/api/admin/jobs/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function closeAdminJob(id: number, note?: string): Promise<{ job: AdminJobItem }> {
  return fetchApi(`/api/admin/jobs/${id}/close`, { method: "POST", body: JSON.stringify({ note }) });
}

export async function reopenAdminJob(id: number, note?: string): Promise<{ job: AdminJobItem }> {
  return fetchApi(`/api/admin/jobs/${id}/reopen`, { method: "POST", body: JSON.stringify({ note }) });
}

export async function hideAdminJob(id: number, note?: string) {
  return fetchApi(`/api/admin/jobs/${id}/hide`, { method: "POST", body: JSON.stringify({ note }) });
}

export async function restoreAdminJob(id: number, note?: string) {
  return fetchApi(`/api/admin/jobs/${id}/restore`, { method: "POST", body: JSON.stringify({ note }) });
}

export async function softDeleteAdminJob(id: number, note?: string) {
  return fetchApi(`/api/admin/jobs/${id}/soft-delete`, { method: "POST", body: JSON.stringify({ note }) });
}

export async function deleteAdminJob(id: number, note?: string): Promise<{ message: string }> {
  return fetchApi(`/api/admin/jobs/${id}`, { method: "DELETE", body: JSON.stringify({ note }) });
}

export async function addAdminJobNote(id: number, kind: "internal" | "admin", note: string) {
  return fetchApi(`/api/admin/jobs/${id}/notes`, { method: "POST", body: JSON.stringify({ kind, note }) });
}

export async function listAdminApplications(
  page = 1,
  limit = 25,
  status = "all",
  q?: string
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), status });
  if (q?.trim()) params.set("q", q.trim());
  return fetchApi<AdminApplicationsListResponse>(`/api/admin/job-applications?${params}`);
}

export async function updateAdminApplication(
  id: number,
  payload: {
    status?: string;
    adminNotes?: string | null;
    employerNotes?: string | null;
    resumeUrl?: string | null;
    note?: string | null;
  }
) {
  return fetchApi(`/api/admin/job-applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}
