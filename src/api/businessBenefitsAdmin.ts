import { fetchApi } from "./client";

export type PendingBusinessBenefit = {
  id: number;
  title: string;
  description: string;
  benefitType: string;
  value: string;
  validFrom: string | null;
  validUntil: string | null;
  terms: string | null;
  usageLimit: number | null;
  claimCount: number;
  status: string;
  createdAt: string;
  businessName: string;
  businessOwner: {
    id: number;
    fullName: string;
    email: string;
    username: string | null;
  } | null;
};

export async function getPendingBusinessBenefits(params?: {
  page?: number;
  limit?: number;
  q?: string;
}): Promise<{ items: PendingBusinessBenefit[]; total: number; page: number; limit: number }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.q) sp.set("q", params.q);
  const qs = sp.toString();
  return fetchApi(`/api/admin/business-benefits/pending${qs ? `?${qs}` : ""}`);
}

export async function approveBusinessBenefit(id: number): Promise<{ benefit: { id: number } }> {
  return fetchApi(`/api/admin/business-benefits/${id}/approve`, { method: "POST" });
}

export async function rejectBusinessBenefit(
  id: number,
  remarks: string
): Promise<{ benefit: { id: number } }> {
  return fetchApi(`/api/admin/business-benefits/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ remarks })
  });
}
