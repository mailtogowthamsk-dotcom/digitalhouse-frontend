import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSubscriptionDetail, recordPaymentRefund } from "../api";
import { useToast } from "../../../context/ToastContext";

export function MatrimonySubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const subscriptionId = Number(id);
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [refundNote, setRefundNote] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["matrimony-sub-detail", subscriptionId],
    queryFn: () => getSubscriptionDetail(subscriptionId),
    enabled: Number.isFinite(subscriptionId)
  });

  const onRefund = async (orderId: number) => {
    if (!confirm("Record refund for this payment? This marks the order refunded in admin.")) return;
    try {
      await recordPaymentRefund(orderId, { note: refundNote || undefined, cancelSubscription: true });
      addToast("Refund recorded.", "success");
      void queryClient.invalidateQueries({ queryKey: ["matrimony-sub-detail", subscriptionId] });
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  if (!Number.isFinite(subscriptionId)) {
    return <p className="text-red-600">Invalid subscription id</p>;
  }

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (isError || !data) return <p className="text-red-600">Subscription not found</p>;

  const { subscription: sub, user, matrimonyProfileName, paymentTimeline, renewalHistory } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/matrimony-subscriptions" className="text-sm text-primary hover:underline">
          ← Subscriptions
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">
          {sub.planLabel} — {user?.fullName ?? `User #${sub.userId}`}
        </h2>
        <p className="text-sm text-slate-600">{matrimonyProfileName}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">User</h3>
          {user ? (
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Name" value={user.fullName} />
              <Row label="Email" value={user.email} />
              <Row label="Mobile" value={user.mobile ?? "—"} />
              <Row label="District" value={user.district ?? "—"} />
              <Row label="Account" value={user.status} />
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-500">User not found</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Subscription</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Status" value={sub.subscriptionStatus} />
            <Row label="Start" value={fmt(sub.startsAt)} />
            <Row label="Expiry" value={fmt(sub.endsAt)} />
            <Row
              label="Amount"
              value={sub.amountInr != null ? `₹${sub.amountInr.toLocaleString("en-IN")}` : "—"}
            />
            <Row label="Payment ID" value={sub.paymentId ?? "—"} mono />
            <Row label="Razorpay order" value={sub.razorpayOrderId ?? "—"} mono />
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900">Renewal history</h3>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="pb-2">Plan</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Period</th>
              <th className="pb-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {renewalHistory.map((h) => (
              <tr key={h.subscriptionId} className="border-t border-slate-100">
                <td className="py-2">{h.planLabel}</td>
                <td className="py-2">{h.status}</td>
                <td className="py-2">
                  {fmt(h.startsAt)} – {fmt(h.endsAt)}
                </td>
                <td className="py-2">
                  {h.amountInr != null ? `₹${h.amountInr}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900">Payment timeline</h3>
        <input
          className="mt-2 w-full max-w-md rounded border px-3 py-2 text-sm"
          placeholder="Refund note (optional)"
          value={refundNote}
          onChange={(e) => setRefundNote(e.target.value)}
        />
        <div className="mt-4 space-y-3">
          {paymentTimeline.map((p) => (
            <div
              key={p.orderId}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 p-3"
            >
              <div>
                <p className="font-medium text-slate-900">{p.purpose}</p>
                <p className="text-xs text-slate-500">
                  {fmt(p.createdAt)} · ₹{p.amountInr} · {p.status}
                </p>
                <p className="font-mono text-xs text-slate-500">{p.razorpayPaymentId ?? p.razorpayOrderId}</p>
                {p.refundedAt ? (
                  <p className="text-xs text-violet-700">Refunded {fmt(p.refundedAt)} — {p.refundNote}</p>
                ) : null}
              </div>
              {p.status === "PAID" && !p.refundedAt ? (
                <button
                  type="button"
                  onClick={() => void onRefund(p.orderId)}
                  className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Record refund
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium text-slate-900 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
