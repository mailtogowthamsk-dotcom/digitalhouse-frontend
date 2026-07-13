import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSubscriptionOverview,
  getRevenueReports,
  listSubscriptions,
  listSubscriptionPayments,
  exportSubscriptionsCsv,
  exportPaymentsCsv,
  exportRevenueCsv
} from "../api";
import type { SubscriptionListFilters } from "../types";
import { OverviewCards } from "../components/OverviewCards";
import { useToast } from "../../../context/ToastContext";

const defaultFilters: SubscriptionListFilters = {
  page: 1,
  limit: 20,
  subscriptionStatus: "any",
  paymentStatus: "any",
  plan: "any",
  sortDir: "desc"
};

export function MatrimonySubscriptionsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"subscriptions" | "payments" | "reports">("subscriptions");
  const [filters, setFilters] = useState<SubscriptionListFilters>(defaultFilters);
  const [searchDraft, setSearchDraft] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantPlan, setGrantPlan] = useState<"GOLD" | "PLATINUM">("GOLD");

  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilters((f) => {
        const next = searchDraft.trim() || undefined;
        if ((f.q || undefined) === next) return f;
        return { ...f, q: next, page: 1 };
      });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["matrimony-sub-overview"],
    queryFn: getSubscriptionOverview
  });

  const { data: reports } = useQuery({
    queryKey: ["matrimony-sub-reports"],
    queryFn: getRevenueReports,
    enabled: tab === "reports"
  });

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ["matrimony-sub-list", filters],
    queryFn: () => listSubscriptions(filters),
    enabled: tab === "subscriptions"
  });

  const { data: payData, isLoading: payLoading } = useQuery({
    queryKey: ["matrimony-pay-list", filters],
    queryFn: () => listSubscriptionPayments(filters),
    enabled: tab === "payments"
  });

  const onExport = async (kind: "subs" | "payments" | "revenue") => {
    try {
      if (kind === "subs") await exportSubscriptionsCsv(filters);
      else if (kind === "payments") await exportPaymentsCsv(filters);
      else await exportRevenueCsv();
      addToast("Export downloaded.", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Export failed", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Matrimony Subscriptions</h2>
        <p className="mt-1 text-sm text-slate-600">
          Revenue, subscribers, payment history, and manual grants.
        </p>
      </div>

      <OverviewCards overview={overview} loading={overviewLoading} />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {(["subscriptions", "payments", "reports"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "bg-primary text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGrantOpen(true)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Grant plan
          </button>
          <button
            type="button"
            onClick={() => onExport(tab === "payments" ? "payments" : tab === "reports" ? "revenue" : "subs")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6">
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search name, mobile, payment ID…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          {tab === "subscriptions" ? (
            <>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.subscriptionStatus ?? "any"}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    subscriptionStatus: e.target.value as SubscriptionListFilters["subscriptionStatus"],
                    page: 1
                  }))
                }
              >
                <option value="any">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filters.plan ?? "any"}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    plan: e.target.value as SubscriptionListFilters["plan"],
                    page: 1
                  }))
                }
              >
                <option value="any">All plans</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </>
          ) : null}
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filters.paymentStatus ?? "any"}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                paymentStatus: e.target.value as SubscriptionListFilters["paymentStatus"],
                page: 1
              }))
            }
          >
            <option value="any">All payments</option>
            <option value="PAID">Paid</option>
            <option value="CREATED">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filters.dateFrom ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value, page: 1 }))}
          />
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filters.dateTo ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value, page: 1 }))}
          />
        </div>
      </div>

      {tab === "reports" && reports ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-900">Revenue by month</h3>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-2">Month</th>
                  <th className="pb-2">Revenue</th>
                  <th className="pb-2">Orders</th>
                </tr>
              </thead>
              <tbody>
                {reports.byMonth.map((m) => (
                  <tr key={m.month} className="border-t border-slate-100">
                    <td className="py-2">{m.month}</td>
                    <td className="py-2">₹{m.revenueInr.toLocaleString("en-IN")}</td>
                    <td className="py-2">{m.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-900">Revenue by plan</h3>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-2">Plan</th>
                  <th className="pb-2">Revenue</th>
                  <th className="pb-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {reports.byPlan.map((p) => (
                  <tr key={p.plan} className="border-t border-slate-100">
                    <td className="py-2">{p.label}</td>
                    <td className="py-2">₹{p.revenueInr.toLocaleString("en-IN")}</td>
                    <td className="py-2">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "subscriptions" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Sub status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {subLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : (
                (subData?.items ?? []).map((r) => (
                  <tr key={r.subscriptionId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.userName}</div>
                      <div className="text-xs text-slate-500">{r.mobile ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">{r.matrimonyProfileName}</td>
                    <td className="px-4 py-3">{r.planLabel}</td>
                    <td className="px-4 py-3">
                      {r.amountInr != null ? `₹${r.amountInr.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.subscriptionStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.paymentStatus} />
                    </td>
                    <td className="px-4 py-3">{formatDate(r.endsAt)}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/matrimony-subscriptions/${r.subscriptionId}`}
                        className="text-primary font-medium hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination
            page={subData?.page ?? 1}
            total={subData?.total ?? 0}
            limit={filters.limit ?? 20}
            onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3">Payment ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {payLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : (
                (payData?.items ?? []).map((r) => (
                  <tr key={r.orderId} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.userName}</div>
                      <div className="text-xs text-slate-500">{r.matrimonyProfileName}</div>
                    </td>
                    <td className="px-4 py-3">{r.planLabel}</td>
                    <td className="px-4 py-3">₹{r.amountInr.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">{r.paymentGateway}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.razorpayPaymentId ?? "—"}</td>
                    <td className="px-4 py-3">{formatDate(r.paymentDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination
            page={payData?.page ?? 1}
            total={payData?.total ?? 0}
            limit={filters.limit ?? 20}
            onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        </div>
      ) : null}

      {grantOpen ? (
        <GrantModal
          userId={grantUserId}
          plan={grantPlan}
          onUserId={setGrantUserId}
          onPlan={setGrantPlan}
          onClose={() => setGrantOpen(false)}
          onSuccess={() => {
            setGrantOpen(false);
            addToast("Plan granted.", "success");
            void queryClient.invalidateQueries({ queryKey: ["matrimony-sub-overview"] });
            void queryClient.invalidateQueries({ queryKey: ["matrimony-sub-list"] });
            void queryClient.invalidateQueries({ queryKey: ["matrimony-pay-list"] });
            void queryClient.invalidateQueries({ queryKey: ["matrimony-sub-reports"] });
          }}
          onError={(m) => addToast(m, "error")}
        />
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-800",
    PAID: "bg-emerald-100 text-emerald-800",
    EXPIRED: "bg-slate-100 text-slate-700",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-orange-100 text-orange-800",
    CREATED: "bg-amber-100 text-amber-800",
    REFUNDED: "bg-violet-100 text-violet-800"
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${colors[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function Pagination({
  page,
  total,
  limit,
  onPage
}: {
  page: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
      <span className="text-slate-500">
        Page {page} of {pages} ({total} rows)
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded border px-2 py-1 disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="rounded border px-2 py-1 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function GrantModal({
  userId,
  plan,
  onUserId,
  onPlan,
  onClose,
  onSuccess,
  onError
}: {
  userId: string;
  plan: "GOLD" | "PLATINUM";
  onUserId: (v: string) => void;
  onPlan: (v: "GOLD" | "PLATINUM") => void;
  onClose: () => void;
  onSuccess: () => void;
  onError: (m: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    const id = Number(userId);
    if (!Number.isFinite(id) || id < 1) {
      onError("Enter a valid user ID");
      return;
    }
    setLoading(true);
    try {
      const { grantSubscription } = await import("../api");
      await grantSubscription({ userId: id, plan, durationMonths: 6 });
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold">Grant subscription</h3>
        <p className="mt-1 text-sm text-slate-600">Manual override — no Razorpay payment.</p>
        <label className="mt-4 block text-sm font-medium">User ID</label>
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={userId}
          onChange={(e) => onUserId(e.target.value)}
        />
        <label className="mt-3 block text-sm font-medium">Plan</label>
        <select
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={plan}
          onChange={(e) => onPlan(e.target.value as "GOLD" | "PLATINUM")}
        >
          <option value="GOLD">Gold (6 mo)</option>
          <option value="PLATINUM">Platinum (6 mo)</option>
        </select>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void submit()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            {loading ? "Granting…" : "Grant"}
          </button>
        </div>
      </div>
    </div>
  );
}
