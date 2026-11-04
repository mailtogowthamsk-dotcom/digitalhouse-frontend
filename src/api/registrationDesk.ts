import { fetchApi } from "./client";

export type RegistrationDeskStatus =
  | "NEW"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export type RegistrationRequestRow = {
  requestId: number;
  applicantName: string;
  email: string;
  mobile: string | null;
  submittedAt: string;
  updatedAt: string;
  userStatus: string;
  status: RegistrationDeskStatus;
  assignedMemberId: number | null;
  assignedTo: string | null;
  assignedAt: string | null;
};

export type RegistrationSummary = {
  total: number;
  newRequests: number;
  unassigned: number;
  assigned: number;
  inProgress: number;
  approved: number;
  rejected: number;
  badge: number;
};

export type SupportMember = {
  id: number;
  name: string | null;
  email: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getRegistrationSummary(): Promise<RegistrationSummary> {
  const data = await fetchApi<{ stats: RegistrationSummary }>("/api/admin/registration-requests/summary");
  return data.stats;
}

export async function listRegistrationRequests(params: {
  filter?: string;
  q?: string;
  page?: number;
  limit?: number;
  sort?: "submitted" | "updated";
  dir?: "asc" | "desc";
  scope?: "" | "mine";
}): Promise<{ items: RegistrationRequestRow[]; total: number; page: number; limit: number }> {
  const search = new URLSearchParams();
  if (params.filter) search.set("filter", params.filter);
  if (params.q) search.set("q", params.q);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.sort) search.set("sort", params.sort);
  if (params.dir) search.set("dir", params.dir);
  if (params.scope) search.set("scope", params.scope);
  return fetchApi(`/api/admin/registration-requests?${search.toString()}`);
}

export type RegistrationDetail = {
  request: RegistrationRequestRow & {
    username: string | null;
    gender: string | null;
    dob: string | null;
    location: string | null;
    district: string | null;
    kulam: string | null;
    occupation: string | null;
    profilePhoto: string | null;
    pendingProfilePhoto: string | null;
    assignedBy: string | null;
  };
  events: Array<{
    id: number;
    action: string;
    fromMemberEmail: string | null;
    toMemberEmail: string | null;
    actorEmail: string;
    createdAt: string;
  }>;
  notes: Array<{ id: number; authorEmail: string; body: string; createdAt: string }>;
  approvals: Array<{ id: number; verifiedBy: string; verifiedAt: string; remarks: string | null }>;
  permissions: {
    canClaim: boolean;
    canStart: boolean;
    canReassign: boolean;
    canNote: boolean;
    canApprove: boolean;
    canOpenProfile: boolean;
  };
};

export async function getRegistrationRequest(userId: number): Promise<RegistrationDetail> {
  return fetchApi(`/api/admin/registration-requests/${userId}`);
}

export async function claimRegistrationRequest(userId: number): Promise<void> {
  await fetchApi(`/api/admin/registration-requests/${userId}/claim`, { method: "POST", body: "{}" });
}

export async function reassignRegistrationRequest(userId: number, memberId: number): Promise<void> {
  await fetchApi(`/api/admin/registration-requests/${userId}/reassign`, {
    method: "POST",
    body: JSON.stringify({ memberId })
  });
}

export async function startRegistrationReview(userId: number): Promise<void> {
  await fetchApi(`/api/admin/registration-requests/${userId}/start`, { method: "POST", body: "{}" });
}

export async function addRegistrationNote(userId: number, body: string): Promise<void> {
  await fetchApi(`/api/admin/registration-requests/${userId}/notes`, {
    method: "POST",
    body: JSON.stringify({ body })
  });
}

export async function listSupportMembers(): Promise<SupportMember[]> {
  const data = await fetchApi<{ items: SupportMember[] }>("/api/admin/support-team");
  return data.items;
}

export async function addSupportMember(input: { name?: string; email: string }): Promise<SupportMember> {
  const data = await fetchApi<{ item: SupportMember }>("/api/admin/support-team", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return data.item;
}

export async function updateSupportMember(
  id: number,
  input: { name?: string | null; email?: string; isActive?: boolean }
): Promise<SupportMember> {
  const data = await fetchApi<{ item: SupportMember }>(`/api/admin/support-team/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
  return data.item;
}

export async function removeSupportMember(id: number): Promise<void> {
  await fetchApi(`/api/admin/support-team/${id}/remove`, { method: "POST", body: "{}" });
}
