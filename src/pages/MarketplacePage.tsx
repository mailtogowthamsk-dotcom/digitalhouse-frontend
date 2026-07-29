import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveAdminMarketplace,
  deleteAdminMarketplace,
  dismissReportsAdminMarketplace,
  getMarketplaceOverview,
  hideAdminMarketplace,
  listAdminMarketplace,
  rejectAdminMarketplace,
  requestChangesAdminMarketplace,
  setFeaturedAdminMarketplace,
  softDeleteAdminMarketplace,
  restoreSoftDeletedAdminMarketplace,
  unhideAdminMarketplace,
  type AdminMarketplaceItem,
  type MarketplaceOverviewResponse,
  type MarketplaceStatusFilter
} from "../api/marketplaceAdmin";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  AdminListError,
  AdminPagination,
  AdminTableSkeleton
} from "../components/admin/AdminListControls";
import { useToast } from "../context/ToastContext";

type ConfirmState =
  | {
      type: "approve" | "delete" | "unhide" | "dismissReports" | "feature" | "unfeature" | "softDelete" | "restore";
      listing: AdminMarketplaceItem;
    }
  | { type: "reject"; listing: AdminMarketplaceItem; reason: string }
  | { type: "requestChanges"; listing: AdminMarketplaceItem; notes: string }
  | { type: "hide"; listing: AdminMarketplaceItem; reason?: string }
  | null;

function marketplaceBadgeVariant(
  status: string
): "pending" | "approved" | "rejected" | "active" | "suspended" {
  if (status === "LIVE") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "SOLD" || status === "HIDDEN") return "suspended";
  if (status === "CHANGES_REQUESTED") return "pending";
  return "pending";
}

function formatPrice(listing: AdminMarketplaceItem): string {
  if (listing.marketplaceIntent === "FREE") return "Free";
  if (listing.marketplacePrice == null) return "—";
  const base = `₹${listing.marketplacePrice.toLocaleString("en-IN")}`;
  return listing.marketplaceNegotiable ? `${base} (nego.)` : base;
}

function promptRequiredNote(label: string, min = 3): string | null {
  const value = window.prompt(`${label} (min ${min} characters):`);
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length < min) return "";
  return trimmed;
}

export function MarketplacePage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [statusFilter, setStatusFilter] = useState<MarketplaceStatusFilter>("pending");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [category, setCategory] = useState("");
  const [district, setDistrict] = useState("");
  const [intent, setIntent] = useState("");
  const [condition, setCondition] = useState("");
  const [featured, setFeatured] = useState<"all" | "featured" | "not_featured">("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  useEffect(() => {
    setPage(1);
  }, [limit]);

  const activeFilters = useMemo(
    () => ({
      category: category.trim() || undefined,
      district: district.trim() || undefined,
      intent: intent || undefined,
      condition: condition || undefined,
      featured: featured === "all" ? undefined : featured,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined
    }),
    [category, createdFrom, createdTo, condition, district, featured, intent, priceMax, priceMin]
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-marketplace", page, limit, statusFilter, searchQ, activeFilters],
    queryFn: () => listAdminMarketplace(page, limit, statusFilter, searchQ || undefined, activeFilters)
  });
  const overviewQuery = useQuery({
    queryKey: ["admin-marketplace-overview"],
    queryFn: getMarketplaceOverview
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-marketplace"] });
    queryClient.invalidateQueries({ queryKey: ["admin-marketplace-overview"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveAdminMarketplace(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Listing approved.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to approve", "error")
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      rejectAdminMarketplace(id, reason),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Listing rejected.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to reject", "error")
  });

  const requestChangesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      requestChangesAdminMarketplace(id, notes),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Changes requested.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to request changes", "error")
  });

  const hideMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      hideAdminMarketplace(id, reason),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Listing hidden.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to hide listing", "error")
  });

  const unhideMutation = useMutation({
    mutationFn: (id: number) => unhideAdminMarketplace(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Listing restored.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to unhide listing", "error")
  });

  const dismissReportsMutation = useMutation({
    mutationFn: (id: number) => dismissReportsAdminMarketplace(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Reports dismissed.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to dismiss reports", "error")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminMarketplace(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Listing deleted.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to delete", "error")
  });

  const featureMutation = useMutation({
    mutationFn: ({ id, featured }: { id: number; featured: boolean }) =>
      setFeaturedAdminMarketplace(id, featured),
    onSuccess: (_data, vars) => {
      invalidate();
      setConfirm(null);
      addToast(vars.featured ? "Listing featured." : "Feature removed.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to update feature", "error")
  });

  const softDeleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      softDeleteAdminMarketplace(id, reason),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Listing soft deleted.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to soft delete", "error")
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreSoftDeletedAdminMarketplace(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Listing restored to pending review.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to restore listing", "error")
  });

  const mutationPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    requestChangesMutation.isPending ||
    hideMutation.isPending ||
    unhideMutation.isPending ||
    dismissReportsMutation.isPending ||
    deleteMutation.isPending ||
    featureMutation.isPending ||
    softDeleteMutation.isPending ||
    restoreMutation.isPending;

  const counts = data?.counts;
  const overview = overviewQuery.data as MarketplaceOverviewResponse | undefined;

  const requestReject = (listing: AdminMarketplaceItem) => {
    const reason = promptRequiredNote("Rejection reason");
    if (reason == null) return;
    if (!reason) {
      addToast("Reason must be at least 3 characters.", "error");
      return;
    }
    setConfirm({ type: "reject", listing, reason });
  };

  const requestChanges = (listing: AdminMarketplaceItem) => {
    const notes = promptRequiredNote("Change notes for the seller");
    if (notes == null) return;
    if (!notes) {
      addToast("Notes must be at least 3 characters.", "error");
      return;
    }
    setConfirm({ type: "requestChanges", listing, notes });
  };

  const requestHide = (listing: AdminMarketplaceItem) => {
    const reason = window.prompt("Hide reason (optional, min 3 characters if provided):");
    if (reason == null) return;
    const trimmed = reason.trim();
    if (trimmed && trimmed.length < 3) {
      addToast("Reason must be at least 3 characters, or leave blank.", "error");
      return;
    }
    setConfirm({
      type: "hide",
      listing,
      reason: trimmed || undefined
    });
  };

  const renderRowActions = (r: AdminMarketplaceItem) => {
    const isPending = r.marketplaceStatus === "PENDING_REVIEW";
    const isLive = r.marketplaceStatus === "LIVE";
    const isHidden = r.marketplaceStatus === "HIDDEN";
    const isArchived = r.marketplaceStatus === "ARCHIVED";
    const showReportedActions = statusFilter === "reported" || r.pendingReportCount > 0;

    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/marketplace/${r.id}`} className="text-sm font-medium text-primary hover:underline">
          View
        </Link>
        {isPending ? (
          <>
            <button
              type="button"
              onClick={() => setConfirm({ type: "approve", listing: r })}
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => requestChanges(r)}
              className="text-sm font-medium text-sky-700 hover:underline"
            >
              Request changes
            </button>
            <button
              type="button"
              onClick={() => requestReject(r)}
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              Reject
            </button>
          </>
        ) : null}
        {isLive ? (
          <>
            <button
              type="button"
              onClick={() => requestChanges(r)}
              className="text-sm font-medium text-sky-700 hover:underline"
            >
              Request changes
            </button>
            <button
              type="button"
              onClick={() =>
                setConfirm({
                  type: r.marketplaceFeatured ? "unfeature" : "feature",
                  listing: r
                })
              }
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              {r.marketplaceFeatured ? "Unfeature" : "Feature"}
            </button>
            <button
              type="button"
              onClick={() => requestHide(r)}
              className="text-sm font-medium text-slate-700 hover:underline"
            >
              Hide
            </button>
          </>
        ) : null}
        {isHidden ? (
          <button
            type="button"
            onClick={() => setConfirm({ type: "unhide", listing: r })}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            Unhide
          </button>
        ) : null}
        {isArchived ? (
          <button
            type="button"
            onClick={() => setConfirm({ type: "restore", listing: r })}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            Restore
          </button>
        ) : null}
        {showReportedActions ? (
          <button
            type="button"
            onClick={() => setConfirm({ type: "dismissReports", listing: r })}
            className="text-sm font-medium text-indigo-700 hover:underline"
          >
            Dismiss reports
          </button>
        ) : null}
        {!isArchived ? (
          <button
            type="button"
            onClick={() => setConfirm({ type: "softDelete", listing: r })}
            className="text-sm font-medium text-slate-700 hover:underline"
          >
            Soft delete
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setConfirm({ type: "delete", listing: r })}
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
    );
  };

  const columns = useMemo(
    () => [
      { key: "id", label: "ID" },
      {
        key: "title",
        label: "Title",
        render: (r: AdminMarketplaceItem) => (
          <div>
            <Link to={`/marketplace/${r.id}`} className="font-medium text-slate-900 hover:text-primary hover:underline">
              {r.title}
            </Link>
            {r.marketplaceCategory ? (
              <div className="text-xs text-slate-500">
                {r.marketplaceCategory.replace(/_/g, " ")}
              </div>
            ) : null}
          </div>
        )
      },
      {
        key: "price",
        label: "Price",
        render: (r: AdminMarketplaceItem) => formatPrice(r)
      },
      {
        key: "district",
        label: "District",
        render: (r: AdminMarketplaceItem) => r.marketplaceDistrict ?? "—"
      },
      {
        key: "author",
        label: "Seller",
        render: (r: AdminMarketplaceItem) => (
          <div>
            <div>{r.author.fullName}</div>
            <div className="text-xs text-slate-500">
              {r.author.email}
              {r.author.mobile ? ` · ${r.author.mobile}` : ""}
            </div>
          </div>
        )
      },
      {
        key: "reach",
        label: "Reach",
        render: (r: AdminMarketplaceItem) => (
          <div className="text-sm text-slate-600">
            <div>{r.viewCount} views</div>
            <div className="text-xs text-slate-500">{r.favoriteCount} saves</div>
          </div>
        )
      },
      {
        key: "status",
        label: "Status",
        render: (r: AdminMarketplaceItem) => (
          <div className="flex flex-col gap-1">
            <StatusBadge
              status={r.marketplaceStatus.replace(/_/g, " ")}
              variant={marketplaceBadgeVariant(r.marketplaceStatus)}
            />
            {r.pendingReportCount > 0 ? (
              <span className="inline-flex w-fit rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                {r.pendingReportCount} report{r.pendingReportCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {r.marketplaceFeatured ? (
              <span className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Featured
              </span>
            ) : null}
          </div>
        )
      },
      {
        key: "createdAt",
        label: "Posted",
        render: (r: AdminMarketplaceItem) => new Date(r.createdAt).toLocaleDateString()
      },
      {
        key: "actions",
        label: "Actions",
        render: (r: AdminMarketplaceItem) => renderRowActions(r)
      }
    ],
    [statusFilter]
  );

  const confirmTitle =
    confirm?.type === "delete"
      ? "Delete listing?"
      : confirm?.type === "softDelete"
        ? "Soft delete listing?"
        : confirm?.type === "restore"
          ? "Restore listing?"
          : confirm?.type === "approve"
            ? "Approve listing?"
            : confirm?.type === "reject"
              ? "Reject listing?"
              : confirm?.type === "requestChanges"
                ? "Request changes?"
                : confirm?.type === "hide"
                  ? "Hide listing?"
                  : confirm?.type === "unhide"
                    ? "Unhide listing?"
                    : confirm?.type === "dismissReports"
                      ? "Dismiss reports?"
                      : confirm?.type === "feature"
                        ? "Feature listing?"
                        : confirm?.type === "unfeature"
                          ? "Remove feature?"
                          : "Confirm";

  const confirmMessage =
    confirm?.type === "delete"
      ? `Permanently delete “${confirm.listing.title}”? This cannot be undone.`
      : confirm?.type === "softDelete"
        ? `Archive “${confirm.listing.title}” (soft delete)? History is preserved.`
        : confirm?.type === "restore"
          ? `Restore “${confirm.listing.title}” to pending review?`
          : confirm?.type === "approve"
            ? `Approve “${confirm.listing.title}” and make it live? The seller will be notified.`
            : confirm?.type === "reject"
              ? `Reject “${confirm.listing.title}”? Reason: ${confirm.reason}`
              : confirm?.type === "requestChanges"
                ? `Ask the seller to revise “${confirm.listing.title}”? Notes: ${confirm.notes}`
                : confirm?.type === "hide"
                  ? `Hide “${confirm.listing.title}” from the marketplace?${
                      confirm.reason ? ` Reason: ${confirm.reason}` : ""
                    }`
                  : confirm?.type === "unhide"
                    ? `Restore “${confirm.listing.title}” to live?`
                    : confirm?.type === "dismissReports"
                      ? `Dismiss pending reports on “${confirm.listing.title}”?`
                      : confirm?.type === "feature"
                        ? `Pin “${confirm.listing.title}” to the top of browse results?`
                        : confirm?.type === "unfeature"
                          ? `Remove featured placement for “${confirm.listing.title}”?`
                          : "";

  const confirmLabel =
    confirm?.type === "delete"
      ? "Delete"
      : confirm?.type === "softDelete"
        ? "Soft delete"
        : confirm?.type === "restore"
          ? "Restore"
          : confirm?.type === "approve"
            ? "Approve"
            : confirm?.type === "reject"
              ? "Reject"
              : confirm?.type === "requestChanges"
                ? "Request changes"
                : confirm?.type === "hide"
                  ? "Hide"
                  : confirm?.type === "unhide"
                    ? "Unhide"
                    : confirm?.type === "dismissReports"
                      ? "Dismiss reports"
                      : confirm?.type === "feature"
                        ? "Feature"
                        : confirm?.type === "unfeature"
                          ? "Unfeature"
                          : "Confirm";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-slate-600">
          Review pending listings, request changes, hide reported posts, and remove abusive
          content.
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          {(
            [
              ["pending", "Pending", counts?.pending ?? 0],
              ["changes", "Changes", counts?.changes ?? 0],
              ["live", "Live", counts?.live ?? 0],
              ["reported", "Reported", counts?.reported ?? 0],
              ["rejected", "Rejected", counts?.rejected ?? 0],
              ["hidden", "Hidden", counts?.hidden ?? 0],
              ["sold", "Sold", counts?.sold ?? 0],
              ["expired", "Expired", counts?.expired ?? 0],
              ["archived", "Archived", counts?.archived ?? 0],
              ["all", "All", counts?.all ?? 0]
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setPage(1);
                setStatusFilter(value);
              }}
              className={`rounded-lg px-3 py-1.5 font-medium ${
                statusFilter === value
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}: {count}
            </button>
          ))}
        </div>
      </div>

      {overview ? (
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Pending review", overview.cards.pending, "bg-amber-50 text-amber-900", () => { setPage(1); setStatusFilter("pending"); setFeatured("all"); }],
            ["Live listings", overview.cards.live, "bg-emerald-50 text-emerald-900", () => { setPage(1); setStatusFilter("live"); setFeatured("all"); }],
            ["Reported", overview.cards.reported, "bg-rose-50 text-rose-900", () => { setPage(1); setStatusFilter("reported"); setFeatured("all"); }],
            ["Featured", overview.cards.featured, "bg-violet-50 text-violet-900", () => { setPage(1); setStatusFilter("all"); setFeatured("featured"); }],
            ["Created today", overview.cards.todaysListings, "bg-sky-50 text-sky-900", () => { setPage(1); setStatusFilter("all"); setFeatured("all"); }]
          ].map(([label, value, tone, onClick]) => (
            <button
              key={label as string}
              type="button"
              onClick={onClick as () => void}
              className={`rounded-2xl border border-slate-200 p-4 text-left ${tone}`}
            >
              <div className="text-sm font-medium">{label as string}</div>
              <div className="mt-2 text-3xl font-semibold">{value as number}</div>
            </button>
          ))}
        </div>
      ) : null}

      {overview ? (
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Top categories</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {overview.topCategories.length ? overview.topCategories.map((item) => (
                <div key={item.category} className="flex items-center justify-between gap-3">
                  <span>{item.category.replace(/_/g, " ")}</span>
                  <span className="font-medium text-slate-900">{item.count}</span>
                </div>
              )) : <div>No category data yet.</div>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Featured listings</h3>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              {(overview.featuredListings?.length ?? 0)
                ? overview.featuredListings!.map((item) => (
                    <Link
                      key={item.id}
                      to={`/marketplace/${item.id}`}
                      className="block border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 hover:text-primary"
                    >
                      <div className="font-medium text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-500">
                        #{item.id} · {item.category?.replace(/_/g, " ") ?? "No category"}
                      </div>
                    </Link>
                  ))
                : <div>No featured listings.</div>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent listings</h3>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              {overview.recentListings.length ? overview.recentListings.map((item) => (
                <Link
                  key={item.id}
                  to={`/marketplace/${item.id}`}
                  className="block border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 hover:text-primary"
                >
                  <div className="font-medium text-slate-900">{item.title}</div>
                  <div className="text-xs text-slate-500">
                    #{item.id} · {item.category?.replace(/_/g, " ") ?? "No category"} ·{" "}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </Link>
              )) : <div>No recent listings yet.</div>}
            </div>
          </div>
        </div>
      ) : null}

      {overview?.analytics ? (
        <div className="mb-6 grid gap-4 lg:grid-cols-4">
          {[
            ["Created (7d)", overview.analytics.createdLast7Days],
            ["Created (30d)", overview.analytics.createdLast30Days],
            ["Approved (30d)", overview.analytics.approvedLast30Days],
            ["Sold (30d)", overview.analytics.soldLast30Days],
            ["Report rate", `${overview.analytics.reportRatePercent}%`],
            ["Sell-through", `${overview.analytics.sellThroughPercent}%`],
            ["Expiring soon", overview.cards.expiringSoon ?? overview.analytics.expiringSoon.length],
            ["Archived", overview.cards.archived ?? 0]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">{label}</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
            </div>
          ))}
          <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">Most viewed</h3>
            <div className="mt-3 space-y-2 text-sm">
              {overview.analytics.mostViewed.length
                ? overview.analytics.mostViewed.map((item) => (
                    <Link key={item.id} to={`/marketplace/${item.id}`} className="flex items-center justify-between gap-3 hover:text-primary">
                      <span className="truncate">{item.title}</span>
                      <span className="font-medium text-slate-900">{item.views}</span>
                    </Link>
                  ))
                : <div className="text-slate-500">No view data yet.</div>}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">Expiring within 7 days</h3>
            <div className="mt-3 space-y-2 text-sm">
              {overview.analytics.expiringSoon.length
                ? overview.analytics.expiringSoon.map((item) => (
                    <Link key={item.id} to={`/marketplace/${item.id}`} className="flex items-center justify-between gap-3 hover:text-primary">
                      <span className="truncate">{item.title}</span>
                      <span className="text-xs text-slate-500">{new Date(item.expiresAt).toLocaleDateString()}</span>
                    </Link>
                  ))
                : <div className="text-slate-500">Nothing expiring soon.</div>}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-4">
        <input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              setSearchQ(searchDraft.trim());
            }
          }}
          placeholder="Search ID, title, district, seller, phone…"
          className="min-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="District"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <select
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All intents</option>
          <option value="SELL">Sell</option>
          <option value="BUY">Buy</option>
          <option value="FREE">Free</option>
        </select>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All conditions</option>
          <option value="NEW">New</option>
          <option value="LIKE_NEW">Like new</option>
          <option value="GOOD">Good</option>
          <option value="FAIR">Fair</option>
        </select>
        <select
          value={featured}
          onChange={(e) => setFeatured(e.target.value as "all" | "featured" | "not_featured")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All featured states</option>
          <option value="featured">Featured only</option>
          <option value="not_featured">Not featured</option>
        </select>
        <input
          value={priceMin}
          onChange={(e) => setPriceMin(e.target.value)}
          placeholder="Min price"
          inputMode="numeric"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <input
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
          placeholder="Max price"
          inputMode="numeric"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={createdFrom}
          onChange={(e) => setCreatedFrom(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={createdTo}
          onChange={(e) => setCreatedTo(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setSearchQ(searchDraft.trim());
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setSearchDraft("");
            setSearchQ("");
            setCategory("");
            setDistrict("");
            setIntent("");
            setCondition("");
            setFeatured("all");
            setPriceMin("");
            setPriceMax("");
            setCreatedFrom("");
            setCreatedTo("");
          }}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
        >
          Reset
        </button>
      </div>

      {isLoading && !data ? (
        <AdminTableSkeleton rows={8} cols={7} />
      ) : isError ? (
        <AdminListError
          message={error instanceof Error ? error.message : "Failed to load listings."}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns as any}
            data={(data?.listings ?? []) as any}
            keyExtractor={(r) => (r as AdminMarketplaceItem).id}
            emptyMessage="No marketplace listings found."
          />
          <AdminPagination
            page={page}
            limit={limit}
            total={data?.total ?? 0}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}



      <ConfirmModal
        open={Boolean(confirm)}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        variant={
          confirm?.type === "approve" ||
          confirm?.type === "unhide" ||
          confirm?.type === "restore" ||
          confirm?.type === "dismissReports" ||
          confirm?.type === "feature" ||
          confirm?.type === "unfeature"
            ? "default"
            : "danger"
        }
        confirmDisabled={mutationPending}
        onCancel={() => {
          if (!mutationPending) setConfirm(null);
        }}
        onConfirm={() => {
          if (!confirm || mutationPending) return;
          if (confirm.type === "approve") approveMutation.mutate(confirm.listing.id);
          else if (confirm.type === "reject")
            rejectMutation.mutate({ id: confirm.listing.id, reason: confirm.reason });
          else if (confirm.type === "requestChanges")
            requestChangesMutation.mutate({
              id: confirm.listing.id,
              notes: confirm.notes
            });
          else if (confirm.type === "hide")
            hideMutation.mutate({ id: confirm.listing.id, reason: confirm.reason });
          else if (confirm.type === "unhide") unhideMutation.mutate(confirm.listing.id);
          else if (confirm.type === "dismissReports")
            dismissReportsMutation.mutate(confirm.listing.id);
          else if (confirm.type === "feature")
            featureMutation.mutate({ id: confirm.listing.id, featured: true });
          else if (confirm.type === "unfeature")
            featureMutation.mutate({ id: confirm.listing.id, featured: false });
          else if (confirm.type === "softDelete")
            softDeleteMutation.mutate({ id: confirm.listing.id });
          else if (confirm.type === "restore")
            restoreMutation.mutate(confirm.listing.id);
          else deleteMutation.mutate(confirm.listing.id);
        }}
      />
    </div>
  );
}
