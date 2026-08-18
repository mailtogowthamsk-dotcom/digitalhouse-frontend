import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  publishAdminAdvertisement,
  deleteAdminAdvertisement,
  approveAdvertisement,
  cancelAdvertisement,
  extendAdvertisement,
  getAdminAdvertisement,
  pauseAdvertisement,
  refundAdvertisement,
  rejectAdvertisement,
  resumeAdvertisement
} from "./api";
import { AdvertisementMediaPreview } from "./AdvertisementMediaPreview";
import { StatusBadge } from "../../components/StatusBadge";
import { ConfirmModal } from "../../components/ConfirmModal";
import { PermissionGate } from "../../components/PermissionGate";
import { useToast } from "../../context/ToastContext";

function inr(paise: number | null | undefined) {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function AdvertisementDetailPage() {
  const { id } = useParams();
  const adId = Number(id);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ad", adId],
    queryFn: () => getAdminAdvertisement(adId),
    enabled: Number.isFinite(adId)
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-ad", adId] });
    void qc.invalidateQueries({ queryKey: ["admin-ads"] });
  };

  const run = useMutation({
    mutationFn: async (kind: string) => {
      if (kind === "approve") return approveAdvertisement(adId);
      if (kind === "pause") return pauseAdvertisement(adId);
      if (kind === "resume") return resumeAdvertisement(adId);
      if (kind === "cancel") return cancelAdvertisement(adId, "Admin cancel");
      if (kind === "extend") return extendAdvertisement(adId, 5, "Admin extension");
      throw new Error("Unknown action");
    },
    onSuccess: (res) => {
      addToast(res.message, "success");
      invalidate();
    },
    onError: (e: Error) => addToast(e.message, "error")
  });

  if (isLoading || !data) return <p className="text-sm text-slate-500">Loading…</p>;
  const ad = data.advertisement as Record<string, any>;
  const advertiser = data.advertiser as Record<string, any>;
  const payment = data.payment as Record<string, any> | null;
  const invoice = data.invoice as Record<string, any> | null;
  const moderation = (data.moderation as any[]) || [];

  return (
    <div className="space-y-6">
      <Link to="/advertisements" className="text-sm text-primary">
        ← Back to advertisements
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{ad.title}</h2>
          <div className="mt-1 flex gap-2">
            <StatusBadge status={ad.status} />
            <span className="text-sm text-slate-500">{ad.typeCode}</span>
          </div>
          {ad.status === "PENDING_REVIEW" && ad.approvedAt ? (
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Advertiser edited a live campaign. Approving returns it to Active without restarting paid dates.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGate action="advertisements.manage">
            {ad.status !== "EXPIRED" && ad.status !== "CANCELLED" && ad.status !== "REJECTED" ? (
              <Link to={`/advertisements/${adId}/edit`} className="rounded-lg border px-3 py-1.5 text-sm">
                Edit
              </Link>
            ) : null}
            {ad.status === "PENDING_REVIEW" ? (
              <>
                <button
                  type="button"
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white"
                  onClick={() => run.mutate("approve")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white"
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </button>
              </>
            ) : null}
            {ad.status === "ACTIVE" ? (
              <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => run.mutate("pause")}>
                Pause
              </button>
            ) : null}
            {ad.status === "PAUSED" ? (
              <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => run.mutate("resume")}>
                Resume
              </button>
            ) : null}
            {ad.status !== "CANCELLED" && ad.status !== "EXPIRED" && ad.status !== "REJECTED" && ad.status !== "DRAFT" ? (
              <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => run.mutate("cancel")}>
                Cancel campaign
              </button>
            ) : null}
            {ad.billingMode === "complimentary" && (ad.status === "DRAFT" || ad.status === "PAYMENT_PENDING") ? (
              <>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white"
                  onClick={() => {
                    publishAdminAdvertisement(adId)
                      .then((res) => {
                        addToast(res.message, "success");
                        invalidate();
                      })
                      .catch((e: Error) => addToast(e.message, "error"));
                  }}
                >
                  Publish
                </button>
                {ad.status === "DRAFT" ? (
                  <button
                    type="button"
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700"
                    onClick={() => {
                      deleteAdminAdvertisement(adId)
                        .then(() => {
                          addToast("Draft deleted", "success");
                          navigate("/advertisements");
                        })
                        .catch((e: Error) => addToast(e.message, "error"));
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </>
            ) : null}
          </PermissionGate>
          <PermissionGate action="advertisements.refund">
            {payment?.status === "PAID" ? (
              <button
                type="button"
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700"
                onClick={() => setRefundOpen(true)}
              >
                Refund payment
              </button>
            ) : null}
          </PermissionGate>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-4">
          <h3 className="font-medium">Campaign</h3>
          <p className="mt-3 text-sm font-medium">{ad.businessName || ad.business?.name}</p>
          {ad.businessCategory || ad.business?.category ? (
            <p className="text-xs uppercase text-slate-500">{ad.businessCategory || ad.business?.category}</p>
          ) : null}
          {ad.mediaUrl ? (
            <AdvertisementMediaPreview mediaUrl={ad.mediaUrl} thumbnailUrl={ad.thumbnailUrl} mediaKind={ad.mediaKind} />
          ) : null}
          {ad.shortDescription ? <p className="mt-3 text-sm text-slate-600">{ad.shortDescription}</p> : null}
          <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{ad.description}</p>
          <p className="mt-2 text-sm">CTA: {ad.cta?.label || ad.ctaLabel} ({ad.cta?.type || ad.ctaType || "—"})</p>
          <p className="mt-1 text-sm">Phone: {ad.contact?.phone || ad.contactPhone || "—"}</p>
          <p className="mt-1 text-sm">WhatsApp: {ad.contact?.whatsapp || ad.whatsappNumber || "—"}</p>
          <p className="mt-1 text-sm">Email: {ad.contact?.email || ad.contactEmail || "—"}</p>
          <p className="mt-1 break-all text-sm text-slate-500">{ad.contact?.website || ad.websiteUrl || ad.destinationUrl || "No website"}</p>
          {ad.location ? (
            <p className="mt-1 text-sm text-slate-600">
              {[ad.location.address, ad.location.city, ad.location.district, ad.location.state, ad.location.pincode]
                .filter(Boolean)
                .join(", ")}
            </p>
          ) : null}
        </section>
        <section className="rounded-xl border bg-white p-4 space-y-2 text-sm">
          <h3 className="font-medium">Advertiser & payment</h3>
          <p>{advertiser.name} · {advertiser.email}</p>
          <p>Billing: {ad.billingMode || "paid"}</p>
          <p>Duration: {ad.durationDays} days</p>
          <p>Paid (snapshot): {inr(ad.pricingSnapshot?.pricePaise)}</p>
          <p>Payment status: {payment?.status || "—"}</p>
          <p>Razorpay payment: {payment?.razorpayPaymentId || "—"}</p>
          <p>Invoice: {invoice?.invoiceNumber || "—"}</p>
          {invoice ? (
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              onClick={() => {
                const esc = (v: unknown) =>
                  String(v ?? "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;");
                const issued = invoice.issuedAt ? new Date(invoice.issuedAt).toISOString().slice(0, 10) : "";
                const inrAmt = (p: number) => `₹${(Number(p) / 100).toLocaleString("en-IN")}`;
                const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(invoice.invoiceNumber)}</title></head><body><h1>Digital House invoice</h1><p>${esc(invoice.invoiceNumber)}</p><p>Issued ${esc(issued)}</p><p>${esc(invoice.description)}</p><p>Before GST: ${esc(inrAmt(invoice.amountBeforeGstPaise))}</p><p>GST (${esc(invoice.gstPercent)}%): ${esc(inrAmt(invoice.gstAmountPaise))}</p><p>Total: ${esc(inrAmt(invoice.amountPaise))} ${esc(invoice.currency || "INR")}</p><p>Payment order ${esc(invoice.paymentOrderId)}</p></body></html>`;
                const blob = new Blob([html], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${invoice.invoiceNumber || "invoice"}.html`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download invoice
            </button>
          ) : null}
          <p>Start: {ad.scheduledStartAt ? new Date(ad.scheduledStartAt).toLocaleString() : "—"}</p>
          <p>End: {ad.scheduledEndAt ? new Date(ad.scheduledEndAt).toLocaleString() : "—"}</p>
          <p>Impressions {ad.impressions} · Reach {ad.uniqueReach} · Clicks {ad.clicks} · CTR {ad.ctr}% · Reports {ad.reports ?? 0}</p>
          {data.clickActions ? (
            <p>
              Actions: Call {(data.clickActions as Record<string, number>).call || 0} · WhatsApp{" "}
              {(data.clickActions as Record<string, number>).whatsapp || 0} · Website{" "}
              {(data.clickActions as Record<string, number>).website || 0} · Directions{" "}
              {(data.clickActions as Record<string, number>).directions || 0} · Open{" "}
              {(data.clickActions as Record<string, number>).open || 0}
            </p>
          ) : null}
          {ad.rejectionReason ? <p className="text-red-700">Rejection: {ad.rejectionReason}</p> : null}
        </section>
      </div>

      <section className="rounded-xl border bg-white p-4">
        <h3 className="font-medium">User reports</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {((data.reports as any[]) || []).length === 0 ? (
            <li className="text-slate-500">No user reports.</li>
          ) : (
            ((data.reports as any[]) || []).map((r) => (
              <li key={r.id} className="border-b border-slate-100 pb-2">
                <span className="font-medium">{r.reasonLabel || r.reason}</span> · {r.status}
                {r.details ? <div className="text-slate-500">{r.details}</div> : null}
                <div className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()}</div>
              </li>
            ))
          )}
        </ul>
        <Link to="/advertisements/reports" className="mt-3 inline-block text-sm text-primary">
          Open reports queue
        </Link>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h3 className="font-medium">Moderation history</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {moderation.map((m, i) => (
            <li key={i} className="border-b border-slate-100 pb-2">
              <span className="font-medium">{m.action}</span> {m.fromStatus} → {m.toStatus} · {m.actor}
              {m.reason ? <div className="text-slate-500">{m.reason}</div> : null}
              <div className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmModal
        open={rejectOpen}
        title="Reject advertisement"
        message="Payment records are kept. Refund is a separate financial action."
        variant="danger"
        confirmLabel="Reject"
        onCancel={() => setRejectOpen(false)}
        onConfirm={async () => {
          try {
            await rejectAdvertisement(adId, rejectReason);
            addToast("Rejected.", "success");
            setRejectOpen(false);
            invalidate();
          } catch (e) {
            addToast(e instanceof Error ? e.message : "Failed", "error");
          }
        }}
      >
        <textarea
          className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason (required)"
        />
      </ConfirmModal>

      <ConfirmModal
        open={refundOpen}
        title="Refund advertisement payment"
        message="This uses the central refund service and Razorpay. It is separate from moderation."
        variant="danger"
        confirmLabel="Refund"
        onCancel={() => setRefundOpen(false)}
        onConfirm={async () => {
          try {
            await refundAdvertisement(adId, refundReason);
            addToast("Refund processed.", "success");
            setRefundOpen(false);
            invalidate();
          } catch (e) {
            addToast(e instanceof Error ? e.message : "Failed", "error");
          }
        }}
      >
        <textarea
          className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
          rows={3}
          value={refundReason}
          onChange={(e) => setRefundReason(e.target.value)}
          placeholder="Refund reason (required)"
        />
      </ConfirmModal>
    </div>
  );
}
