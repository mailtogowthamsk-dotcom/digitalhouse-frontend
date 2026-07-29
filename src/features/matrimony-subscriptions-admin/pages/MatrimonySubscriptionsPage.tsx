import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelSubscription,
  extendSubscription,
  exportPaymentsCsv,
  exportRevenueCsv,
  exportSubscriptionsCsv,
  getRevenueReports,
  getSubscriptionOverview,
  listSubscriptionPayments,
  listSubscriptions
} from "../api";
import type { SubscriptionListFilters } from "../types";
import { OverviewCards } from "../components/OverviewCards";
import { AdminPagination } from "../../../components/admin/AdminListControls";
import { useToast } from "../../../context/ToastContext";

const defaultFilters: SubscriptionListFilters = {
  page: 1,
  limit: 25,
  subscriptionStatus: "any",
  paymentStatus: "any",
  plan: "any",
  sortDir: "desc"
};

export function MatrimonySubscriptionsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"subscriptions" | "revenue">("subscriptions");
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
    enabled: tab === "revenue"
  });

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ["matrimony-sub-list", filters],
    queryFn: () => listSubscriptions(filters),
    enabled: tab === "subscriptions"
  });

  const { data: payData, isLoading: payLoading } = useQuery({
    queryKey: ["matrimony-pay-list", filters],
    queryFn: () => listSubscriptionPayments(filters),
    enabled: tab === "revenue"
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

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["matrimony-sub-overview"] });
    void queryClient.invalidateQueries({ queryKey: ["matrimony-sub-list"] });
    void queryClient.invalidateQueries({ queryKey: ["matrimony-pay-list"] });
    void queryClient.invalidateQueries({ queryKey: ["matrimony-sub-reports"] });
  };

  const onExtend = async (subscriptionId: number) => {
    const raw = window.prompt("Extend by how many months?", "1");
    if (!raw) return;
    const months = Number(raw);
    if (!Number.isFinite(months) || months < 1) {
      addToast("Enter a valid month count.", "error");
      return;
    }
    try {
      await extendSubscription(subscriptionId, { durationMonths: months });
      addToast("Subscription extended.", "success");
      refreshAll();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to extend subscription", "error");
    }
  };

  const onCancelSubscription = async (subscriptionId: number) => {
    if (!window.confirm("Cancel this current subscription? History will be preserved.")) return;
    try {
      await cancelSubscription(subscriptionId);
      addToast("Subscription cancelled.", "success");
      refreshAll();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to cancel subscription", "error");
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Subscription Management shows one current row per subscriber. Revenue Management keeps every payment and report intact.
      </p>

      <OverviewCards
        overview={overview}
        loading={overviewLoading}
        activeFilter={
          filters.subscriptionStatus === "ACTIVE" || filters.subscriptionStatus === "EXPIRED"
            ? filters.subscriptionStatus
            : filters.subscriptionStatus === "any" || !filters.subscriptionStatus
              ? "any"
              : undefined
        }
        onSelectFilter={(filter) => {
          setTab("subscriptions");
          setFilters((f) => ({
            ...f,
            page: 1,
            subscriptionStatus: filter
          }));
        }}
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {(["subscriptions", "revenue"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "bg-primary text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t === "subscriptions" ? "Subscription Management" : "Revenue Management"}
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
            onClick={() => onExport(tab === "revenue" ? "revenue" : "subs")}
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
            placeholder="Search user, mobile, subscription ID, transaction ID…"
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
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Community"
                value={filters.community ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, community: e.target.value || undefined, page: 1 }))}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="District"
                value={filters.district ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value || undefined, page: 1 }))}
              />
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

      {tab === "revenue" && reports ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Active subscribers" value={reports.activeSubscribers} />
            <MetricCard label="Payment failure rate" value={`${reports.paymentFailureRate}%`} />
            <MetricCard label="Transactions loaded" value={payData?.total ?? 0} />
            <MetricCard
              label="Export"
              value="CSV"
              action={
                <button
                  type="button"
                  onClick={() => void onExport("payments")}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Payments CSV
                </button>
              }
            />
          </div>
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
                <th className="px-4 py-3">Current status</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Payment</th>
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
                      <div className="text-xs text-slate-500">
                        #{r.userId} · {r.mobile ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{r.matrimonyProfileName}</div>
                      <div className="text-xs text-slate-500">
                        {[r.community, r.district].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">{r.planLabel}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.subscriptionStatus} />
                      <div className="mt-1 text-xs text-slate-500">{r.remainingDays} days left</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatDate(r.endsAt)}</div>
                      <div className="text-xs text-slate-500">Started {formatDate(r.startsAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">₹{r.totalAmountPaidInr.toLocaleString("en-IN")}</div>
                      <div className="text-xs text-slate-500">{r.totalPurchases} purchases</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.paymentStatus} />
                      <div className="mt-1 text-xs text-slate-500">{r.lastPaymentDate ? formatDate(r.lastPaymentDate) : "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-3 text-sm">
                        <Link to={`/matrimony-subscriptions/${r.subscriptionId}`} className="text-primary font-medium hover:underline">
                          View
                        </Link>
                        <button type="button" onClick={() => void onExtend(r.subscriptionId)} className="text-slate-700 hover:underline">
                          Extend
                        </button>
                        {r.subscriptionStatus !== "CANCELLED" ? (
                          <button type="button" onClick={() => void onCancelSubscription(r.subscriptionId)} className="text-red-700 hover:underline">
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <AdminPagination
            page={subData?.page ?? 1}
            total={subData?.total ?? 0}
            limit={filters.limit ?? 25}
            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
            onLimitChange={(nextLimit) =>
              setFilters((f) => ({ ...f, limit: nextLimit, page: 1 }))
            }
            className="px-4 pb-3"
          />
        </div>
      ) : null}

      {tab === "revenue" ? (
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
                      <div className="text-xs text-slate-500">
                        #{r.userId} · {r.matrimonyProfileName}
                      </div>
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
          <AdminPagination
            page={payData?.page ?? 1}
            total={payData?.total ?? 0}
            limit={filters.limit ?? 25}
            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
            onLimitChange={(nextLimit) =>
              setFilters((f) => ({ ...f, limit: nextLimit, page: 1 }))
            }
            className="px-4 pb-3"
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
            refreshAll();
          }}
          onError={(m) => addToast(m, "error")}
        />
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  action
}: {
  label: string;
  value: string | number;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {action ? <div className="mt-3">{action}</div> : null}
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
