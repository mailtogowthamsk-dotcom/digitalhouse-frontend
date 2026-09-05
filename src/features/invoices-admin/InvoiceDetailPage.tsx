import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PermissionGate } from "../../components/PermissionGate";
import { useToast } from "../../context/ToastContext";
import {
  downloadAdminInvoicePdf,
  getAdminInvoice,
  resendAdminInvoiceEmail
} from "./api";

const inr = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function InvoiceDetailPage() {
  const { id } = useParams();
  const invoiceId = Number(id);
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-invoice", invoiceId],
    queryFn: () => getAdminInvoice(invoiceId),
    enabled: Number.isFinite(invoiceId) && invoiceId > 0
  });

  const invoice = data?.invoice;
  const payment = data?.payment;
  const business = data?.business;

  const onDownload = async () => {
    if (!invoice) return;
    try {
      await downloadAdminInvoicePdf(invoice.id, `DigitalHouse-Invoice-${invoice.invoiceNumber}.pdf`);
      addToast("Invoice PDF downloaded.", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Download failed", "error");
    }
  };

  const onResend = async () => {
    if (!invoice) return;
    try {
      const res = await resendAdminInvoiceEmail(invoice.id);
      addToast(res.message || "Email attempted.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin-invoice", invoiceId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Resend failed", "error");
    }
  };

  if (!Number.isFinite(invoiceId) || invoiceId < 1) {
    return <p className="text-sm text-red-600">Invalid invoice.</p>;
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading invoice…</p>;
  if (isError || !invoice) {
    return (
      <p className="text-sm text-red-600">
        {error instanceof Error ? error.message : "Invoice not found"}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/invoices" className="text-sm text-primary">
        ← Back to invoices
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-slate-500">
            Issued {formatDate(invoice.issuedAt)} · Payment {formatDate(invoice.paymentDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGate action="invoices.download">
            <button
              type="button"
              onClick={() => void onDownload()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white"
            >
              Download Invoice PDF
            </button>
          </PermissionGate>
          <PermissionGate action="invoices.resend">
            <button
              type="button"
              onClick={() => void onResend()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            >
              Resend email
            </button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Invoice
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Invoice number" value={invoice.invoiceNumber} />
            <Row label="Invoice date" value={formatDate(invoice.issuedAt)} />
            <Row label="Payment date" value={formatDate(invoice.paymentDate)} />
            <Row label="Payment status" value={invoice.paymentStatus} />
            <Row label="PDF status" value={invoice.pdfStatus} />
            <Row label="Email status" value={invoice.emailStatus} />
            <Row label="Emailed at" value={formatDate(invoice.emailedAt)} />
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Business
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Issuer" value={business?.name || "KVG - DigitalHouse"} />
            <Row label="GSTIN" value={business?.gstin || "33AZZPK2591E1Z0"} />
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Customer
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Name" value={invoice.buyerName || "—"} />
            <Row label="Email" value={invoice.buyerEmail || "—"} />
            <Row label="Address" value={invoice.buyerAddress || "—"} />
            <Row label="GSTIN" value={invoice.buyerGstin || "—"} />
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Payment
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Service" value={invoice.description} />
            <Row label="Module" value={invoice.module} />
            <Row label="Taxable value" value={inr(invoice.amountBeforeGstPaise)} />
            <Row
              label={`GST (${invoice.gstPercent}%)`}
              value={inr(invoice.gstAmountPaise)}
            />
            <Row label="Total" value={inr(invoice.amountPaise)} />
            <Row label="Ledger order ID" value={String(payment?.id ?? invoice.paymentOrderId)} />
            <Row label="Razorpay order" value={payment?.razorpayOrderId || invoice.razorpayOrderId || "—"} />
            <Row
              label="Razorpay payment"
              value={payment?.razorpayPaymentId || invoice.razorpayPaymentId || "—"}
            />
          </dl>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
