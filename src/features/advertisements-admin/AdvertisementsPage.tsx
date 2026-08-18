import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAdvertisementAnalytics, listAdminAdvertisements } from "./api";
import { StatusBadge } from "../../components/StatusBadge";
import { AdminPagination, AdminTableSkeleton } from "../../components/admin/AdminListControls";
import { PermissionGate } from "../../components/PermissionGate";

const TABS = [
  { id: "all", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "PENDING_REVIEW", label: "Pending Review" },
  { id: "SCHEDULED", label: "Scheduled" },
  { id: "ACTIVE", label: "Active" },
  { id: "PAUSED", label: "Paused" },
  { id: "EXPIRED", label: "Expired" },
  { id: "REJECTED", label: "Rejected" },
  { id: "CANCELLED", label: "Cancelled" }
];

function inr(paise: number | null | undefined) {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function AdvertisementsPage() {
  const [tab, setTab] = useState("PENDING_REVIEW");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchDraft, setSearchDraft] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"campaigns" | "revenue">("campaigns");

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(searchDraft.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ads", tab, page, limit, q],
    queryFn: () =>
      listAdminAdvertisements({
        page,
        limit,
        status: tab === "all" ? undefined : tab,
        q: q || undefined
      }),
    enabled: view === "campaigns"
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin-ads-analytics"],
    queryFn: () => getAdvertisementAnalytics(),
    enabled: view === "revenue"
  });

  const stats = (analytics?.analytics || {}) as {
    campaigns?: Record<string, number>;
    performance?: { impressions: number; uniqueReach: number; clicks: number; averageCtr: number };
    revenue?: { netPaise: number; grossPaise: number; refundedPaise: number };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("campaigns")}
            className={`rounded-lg px-3 py-1.5 text-sm ${view === "campaigns" ? "bg-primary text-white" : "border border-slate-300 bg-white"}`}
          >
            Campaigns
          </button>
          <button
            type="button"
            onClick={() => setView("revenue")}
            className={`rounded-lg px-3 py-1.5 text-sm ${view === "revenue" ? "bg-primary text-white" : "border border-slate-300 bg-white"}`}
          >
            Revenue & analytics
          </button>
        </div>
    <div className="flex flex-wrap gap-2">
        <PermissionGate action="advertisements.manage">
          <Link
            to="/advertisements/new"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white"
          >
            Create advertisement
          </Link>
        </PermissionGate>
        <PermissionGate action="advertisements.pricing">
          <Link
            to="/advertisements/pricing"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            Pricing
          </Link>
        </PermissionGate>
          <Link
            to="/advertisements/reports"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            Reports
          </Link>
        </div>
      </div>

      {view === "revenue" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Net revenue" value={inr(stats.revenue?.netPaise)} />
          <Kpi label="Active" value={String(stats.campaigns?.active ?? 0)} />
          <Kpi label="Pending review" value={String(stats.campaigns?.pendingReview ?? 0)} />
          <Kpi
            label="Avg CTR"
            value={`${Number(stats.performance?.averageCtr ?? 0).toFixed(2)}%`}
          />
          <Kpi label="Impressions" value={String(stats.performance?.impressions ?? 0)} />
          <Kpi label="Unique reach" value={String(stats.performance?.uniqueReach ?? 0)} />
          <Kpi label="Clicks" value={String(stats.performance?.clicks ?? 0)} />
          <Kpi label="Refunded" value={inr(stats.revenue?.refundedPaise)} />
          <p className="sm:col-span-2 lg:col-span-4 text-xs text-slate-500">
            Revenue is calculated from the central payment ledger, not advertisement price fields.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  tab === t.id ? "bg-primary text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search title, advertiser name, or email"
            className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {isLoading ? (
            <AdminTableSkeleton />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Advertiser</th>
                    <th className="px-3 py-2">Business</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Payment</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Impr.</th>
                    <th className="px-3 py-2">Clicks</th>
                    <th className="px-3 py-2">CTR</th>
                    <th className="px-3 py-2">Reports</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items || []).map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <Link className="text-primary" to={`/advertisements/${row.id}`}>
                          {row.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{row.advertiser.name || row.advertiser.email || row.advertiser.id}</td>
                      <td className="px-3 py-2">{row.businessName || "—"}</td>
                      <td className="px-3 py-2">{row.title}</td>
                      <td className="px-3 py-2">{row.typeCode}</td>
                      <td className="px-3 py-2">{inr(row.amountPaise)}</td>
                      <td className="px-3 py-2">{row.paymentStatus || "—"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-2">{row.scheduledStartAt ? new Date(row.scheduledStartAt).toLocaleDateString() : "—"}</td>
                      <td className="px-3 py-2">{row.scheduledEndAt ? new Date(row.scheduledEndAt).toLocaleDateString() : "—"}</td>
                      <td className="px-3 py-2">{row.impressions}</td>
                      <td className="px-3 py-2">{row.clicks}</td>
                      <td className="px-3 py-2">{Number(row.ctr ?? 0).toFixed(2)}%</td>
                      <td className="px-3 py-2">{row.reports ?? 0}</td>
                      <td className="px-3 py-2">{new Date(row.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AdminPagination
            page={page}
            limit={limit}
            total={data?.total ?? 0}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
