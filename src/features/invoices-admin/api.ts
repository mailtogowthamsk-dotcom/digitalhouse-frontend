import { apiUrl } from "../../api/apiBase";
import { authHeaders, fetchApi } from "../../api/client";

export type AdminInvoiceListItem = {
  id: number;
  invoiceNumber: string;
  paymentOrderId: number;
  module: string;
  referenceId: number;
  description: string;
  amountPaise: number;
  amountInr: number;
  gstPercent: number;
  gstAmountPaise: number;
  amountBeforeGstPaise: number;
  currency: string;
  sellerName: string;
  sellerGstin: string;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerAddress: string | null;
  buyerGstin: string | null;
  pdfStatus: string;
  emailStatus: string;
  emailedAt: string | null;
  issuedAt: string;
  paymentStatus: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paymentDate: string;
};

export type AdminInvoiceDetail = {
  invoice: AdminInvoiceListItem;
  payment: {
    id: number;
    status: string;
    product: string;
    module: string;
    razorpayOrderId: string;
    razorpayPaymentId: string | null;
    amountPaise: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  business: { name: string; gstin: string };
};

function toQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function listAdminInvoices(filters: {
  page?: number;
  limit?: number;
  q?: string;
  module?: string;
  emailStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return fetchApi<{
    ok: boolean;
    page: number;
    limit: number;
    total: number;
    invoices: AdminInvoiceListItem[];
  }>(`/api/admin/invoices${toQuery(filters)}`);
}

export async function getAdminInvoice(id: number) {
  return fetchApi<{ ok: boolean } & AdminInvoiceDetail>(`/api/admin/invoices/${id}`);
}

export async function resendAdminInvoiceEmail(id: number) {
  return fetchApi<{ ok: boolean; message: string } & AdminInvoiceDetail>(
    `/api/admin/invoices/${id}/resend-email`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function downloadAdminInvoicePdf(id: number, filename: string): Promise<void> {
  const url = apiUrl(`/api/admin/invoices/${id}/pdf`);
  const res = await fetch(url, { credentials: "same-origin", headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
