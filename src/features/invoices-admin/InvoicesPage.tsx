import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminPagination } from "../../components/admin/AdminListControls";
import { useToast } from "../../context/ToastContext";
import { downloadAdminInvoicePdf, listAdminInvoices } from "./api";

const inr = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function InvoicesPage() {
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");
  const [module, setModule] = useState("any");
  const [emailStatus, setEmailStatus] = useState("any");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qDraft.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qDraft]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-invoices", page, q, module, emailStatus, dateFrom, dateTo],
    queryFn: () =>
      listAdminInvoices({
        page,
        limit: 25,
        q: q || undefined,
        module,
        emailStatus,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      })
  });

  const onDownload = async (id: number, invoiceNumber: string) => {
    try {
      await downloadAdminInvoicePdf(id, `DigitalHouse-Invoice-${invoiceNumber}.pdf`);
      addToast("Invoice PDF downloaded.", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Download failed", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">
            Tax invoices for successful DigitalHouse payments (KVG - DigitalHouse · GSTIN
            33AZZPK2591E1Z0).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5">
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-slate-500">Search</span>
          <input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Invoice no, customer, email…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Module</span>
          <select
            value={module}
            onChange={(e) => {
              setModule(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="any">All</option>
            <option value="advertisement">Advertisement</option>
            <option value="matrimony">Matrimony</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Email status</span>
          <select
            value={emailStatus}
            onChange={(e) => {
              setEmailStatus(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="any">All</option>
            <option value="sent">Sent</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label>
            <span className="mb-1 block text-slate-500">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-2 py-2"
            />
          </label>
          <label>
            <span className="mb-1 block text-slate-500">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-2 py-2"
            />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading invoices…</p>
        ) : isError ? (
          <p className="p-6 text-sm text-red-600">
            {error instanceof Error ? error.message : "Failed to load invoices"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice No</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Product / Service</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Payment Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.invoices ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.invoiceNumber}</td>
                    <td className="px-4 py-3">{row.buyerName || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.buyerEmail || "—"}</td>
                    <td className="px-4 py-3">
                      <div>{row.description}</div>
                      <div className="text-xs uppercase text-slate-400">{row.module}</div>
                    </td>
                    <td className="px-4 py-3">{inr(row.amountPaise)}</td>
                    <td className="px-4 py-3">{formatDate(row.paymentDate || row.issuedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800">{row.paymentStatus}</div>
                      <div className="text-xs text-slate-400">email: {row.emailStatus}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link className="text-primary" to={`/invoices/${row.id}`}>
                          View
                        </Link>
                        <button
                          type="button"
                          className="text-primary"
                          onClick={() => void onDownload(row.id, row.invoiceNumber)}
                        >
                          Download PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.invoices?.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No invoices found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-100 px-4 py-3">
          <AdminPagination
            page={data?.page ?? page}
            limit={data?.limit ?? 25}
            total={data?.total ?? 0}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
