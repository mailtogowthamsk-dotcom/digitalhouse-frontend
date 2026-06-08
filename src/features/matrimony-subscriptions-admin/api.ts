import { apiUrl } from "../../api/apiBase";
import { fetchApi, authHeaders } from "../../api/client";
import type {
  SubscriptionOverview,
  SubscriptionListFilters,
  SubscriptionListItem,
  PaymentListItem,
  RevenueReports,
  SubscriptionDetail
} from "./types";

function toQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function getSubscriptionOverview(): Promise<SubscriptionOverview> {
  const res = await fetchApi<{ overview: SubscriptionOverview }>(
    "/api/admin/matrimony/subscriptions/overview"
  );
  return res.overview;
}

export async function getRevenueReports(): Promise<RevenueReports> {
  const res = await fetchApi<{ reports: RevenueReports }>(
    "/api/admin/matrimony/subscriptions/reports"
  );
  return res.reports;
}

export async function listSubscriptions(filters: SubscriptionListFilters): Promise<{
  items: SubscriptionListItem[];
  total: number;
  page: number;
  limit: number;
}> {
  return fetchApi(`/api/admin/matrimony/subscriptions${toQuery(filters as Record<string, string | number | undefined>)}`);
}

export async function listSubscriptionPayments(
  filters: SubscriptionListFilters
): Promise<{ items: PaymentListItem[]; total: number; page: number; limit: number }> {
  return fetchApi(
    `/api/admin/matrimony/subscriptions/payments${toQuery(filters as Record<string, string | number | undefined>)}`
  );
}

export async function getSubscriptionDetail(id: number): Promise<SubscriptionDetail> {
  return fetchApi(`/api/admin/matrimony/subscriptions/${id}`);
}

export async function grantSubscription(body: {
  userId: number;
  plan: "GOLD" | "PLATINUM";
  durationMonths?: number;
  adminNote?: string;
}): Promise<void> {
  await fetchApi("/api/admin/matrimony/subscriptions/grant", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function recordPaymentRefund(
  orderId: number,
  body: { note?: string; cancelSubscription?: boolean }
): Promise<void> {
  await fetchApi(`/api/admin/matrimony/subscriptions/payments/${orderId}/refund`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function downloadAdminCsv(path: string, filename: string): Promise<void> {
  const url = apiUrl(path);
  const res = await fetch(url, { credentials: "same-origin", headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportSubscriptionsCsv(filters: SubscriptionListFilters): Promise<void> {
  return downloadAdminCsv(
    `/api/admin/matrimony/subscriptions/export${toQuery(filters as Record<string, string | number | undefined>)}`,
    "matrimony-subscriptions.csv"
  );
}

export function exportPaymentsCsv(filters: SubscriptionListFilters): Promise<void> {
  return downloadAdminCsv(
    `/api/admin/matrimony/subscriptions/payments/export${toQuery(filters as Record<string, string | number | undefined>)}`,
    "matrimony-payments.csv"
  );
}

export function exportRevenueCsv(): Promise<void> {
  return downloadAdminCsv(
    "/api/admin/matrimony/subscriptions/revenue-export",
    "matrimony-revenue-report.csv"
  );
}
