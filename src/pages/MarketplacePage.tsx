import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveAdminMarketplace,
  deleteAdminMarketplace,
  dismissReportsAdminMarketplace,
  hideAdminMarketplace,
  listAdminMarketplace,
  rejectAdminMarketplace,
  requestChangesAdminMarketplace,
  setFeaturedAdminMarketplace,
  unhideAdminMarketplace,
  type AdminMarketplaceItem,
  type MarketplaceStatusFilter
} from "../api/marketplaceAdmin";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";

type ConfirmState =
  | {
      type: "approve" | "delete" | "unhide" | "dismissReports" | "feature" | "unfeature";
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
  const [statusFilter, setStatusFilter] = useState<MarketplaceStatusFilter>("pending");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [viewing, setViewing] = useState<AdminMarketplaceItem | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-marketplace", page, statusFilter, searchQ],
    queryFn: () => listAdminMarketplace(page, 20, statusFilter, searchQ || undefined)
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-marketplace"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveAdminMarketplace(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      setViewing(null);
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
      setViewing(null);
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
      setViewing(null);
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
      setViewing(null);
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
      setViewing(null);
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
      setViewing(null);
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
      setViewing(null);
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
      setViewing((prev) =>
        prev && prev.id === vars.id
          ? { ...prev, marketplaceFeatured: vars.featured }
          : prev
      );
      addToast(vars.featured ? "Listing featured." : "Feature removed.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to update feature", "error")
  });

  const mutationPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    requestChangesMutation.isPending ||
    hideMutation.isPending ||
    unhideMutation.isPending ||
    dismissReportsMutation.isPending ||
    deleteMutation.isPending ||
    featureMutation.isPending;

  const counts = data?.counts;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)));

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
    const showReportedActions = statusFilter === "reported" || r.pendingReportCount > 0;

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setViewing(r)}
          className="text-sm font-medium text-primary hover:underline"
        >
          View
        </button>
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
        {showReportedActions ? (
          <button
            type="button"
            onClick={() => setConfirm({ type: "dismissReports", listing: r })}
            className="text-sm font-medium text-indigo-700 hover:underline"
          >
            Dismiss reports
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
            <div className="font-medium text-slate-900">{r.title}</div>
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
            <div className="text-xs text-slate-500">{r.author.email}</div>
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
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Marketplace Moderation</h2>
          <p className="mt-1 text-sm text-slate-600">
            Review pending listings, request changes, hide reported posts, and remove abusive
            content.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-amber-50 px-3 py-1.5 font-medium text-amber-800">
            Pending: {counts?.pending ?? 0}
          </span>
          <span className="rounded-lg bg-sky-50 px-3 py-1.5 font-medium text-sky-800">
            Changes: {counts?.changes ?? 0}
          </span>
          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800">
            Live: {counts?.live ?? 0}
          </span>
          <span className="rounded-lg bg-red-50 px-3 py-1.5 font-medium text-red-800">
            Rejected: {counts?.rejected ?? 0}
          </span>
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
            Sold: {counts?.sold ?? 0}
          </span>
          <span className="rounded-lg bg-violet-50 px-3 py-1.5 font-medium text-violet-800">
            Hidden: {counts?.hidden ?? 0}
          </span>
          <span className="rounded-lg bg-orange-50 px-3 py-1.5 font-medium text-orange-800">
            Expired: {counts?.expired ?? 0}
          </span>
          <span className="rounded-lg bg-stone-100 px-3 py-1.5 font-medium text-stone-700">
            Archived: {counts?.archived ?? 0}
          </span>
          <span className="rounded-lg bg-rose-50 px-3 py-1.5 font-medium text-rose-800">
            Reported: {counts?.reported ?? 0}
          </span>
          <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-800">
            All: {counts?.all ?? 0}
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as MarketplaceStatusFilter);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="pending">Pending</option>
          <option value="changes">Changes requested</option>
          <option value="live">Live</option>
          <option value="rejected">Rejected</option>
          <option value="sold">Sold</option>
          <option value="hidden">Hidden</option>
          <option value="expired">Expired</option>
          <option value="archived">Archived</option>
          <option value="reported">Reported</option>
          <option value="all">All</option>
        </select>
        <input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              setSearchQ(searchDraft.trim());
            }
          }}
          placeholder="Search title, category, district…"
          className="min-w-[240px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
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
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading listings…
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load listings."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns as any}
          data={(data?.listings ?? []) as any}
          keyExtractor={(r) => (r as AdminMarketplaceItem).id}
          emptyMessage="No marketplace listings found."
        />
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {totalPages} · {data?.total ?? 0} results
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {viewing ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{viewing.title}</h3>
                <p className="text-sm text-slate-500">
                  {viewing.marketplaceCategory?.replace(/_/g, " ") ?? "No category"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            {viewing.marketplaceGallery && viewing.marketplaceGallery.length > 1 ? (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {viewing.marketplaceGallery.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="h-28 w-28 shrink-0 rounded-lg object-cover"
                  />
                ))}
              </div>
            ) : viewing.mediaUrl ? (
              <img
                src={viewing.mediaUrl}
                alt=""
                className="mb-4 max-h-56 w-full rounded-lg object-cover"
              />
            ) : null}
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-slate-700">Status</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={viewing.marketplaceStatus.replace(/_/g, " ")}
                    variant={marketplaceBadgeVariant(viewing.marketplaceStatus)}
                  />
                  {viewing.pendingReportCount > 0 ? (
                    <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                      {viewing.pendingReportCount} report
                      {viewing.pendingReportCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {viewing.marketplaceFeatured ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Featured
                    </span>
                  ) : null}
                </dd>
              </div>
              {viewing.marketplaceExpiresAt ? (
                <div>
                  <dt className="font-medium text-slate-700">Expires</dt>
                  <dd className="text-slate-600">
                    {new Date(viewing.marketplaceExpiresAt).toLocaleString()}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="font-medium text-slate-700">Intent</dt>
                <dd className="text-slate-600">{viewing.marketplaceIntent ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Condition</dt>
                <dd className="text-slate-600">
                  {viewing.marketplaceCondition?.replace(/_/g, " ") ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Price</dt>
                <dd className="text-slate-600">{formatPrice(viewing)}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">District</dt>
                <dd className="text-slate-600">{viewing.marketplaceDistrict ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Seller</dt>
                <dd className="text-slate-600">
                  {viewing.author.fullName} · {viewing.author.email}
                  {viewing.author.mobile ? ` · ${viewing.author.mobile}` : ""}
                </dd>
              </div>
              {viewing.marketplaceAdminNote ? (
                <div>
                  <dt className="font-medium text-slate-700">Admin note</dt>
                  <dd className="whitespace-pre-wrap text-slate-600">
                    {viewing.marketplaceAdminNote}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="font-medium text-slate-700">Description</dt>
                <dd className="whitespace-pre-wrap text-slate-600">
                  {viewing.description || "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {viewing.marketplaceStatus === "PENDING_REVIEW" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirm({ type: "approve", listing: viewing })}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => requestChanges(viewing)}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    onClick={() => requestReject(viewing)}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white"
                  >
                    Reject
                  </button>
                </>
              ) : null}
              {viewing.marketplaceStatus === "LIVE" ? (
                <>
                  <button
                    type="button"
                    onClick={() => requestChanges(viewing)}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirm({
                        type: viewing.marketplaceFeatured ? "unfeature" : "feature",
                        listing: viewing
                      })
                    }
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white"
                  >
                    {viewing.marketplaceFeatured ? "Unfeature" : "Feature"}
                  </button>
                  <button
                    type="button"
                    onClick={() => requestHide(viewing)}
                    className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white"
                  >
                    Hide
                  </button>
                </>
              ) : null}
              {viewing.marketplaceStatus === "HIDDEN" ? (
                <button
                  type="button"
                  onClick={() => setConfirm({ type: "unhide", listing: viewing })}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Unhide
                </button>
              ) : null}
              {statusFilter === "reported" || viewing.pendingReportCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setConfirm({ type: "dismissReports", listing: viewing })}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Dismiss reports
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setConfirm({ type: "delete", listing: viewing })}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        variant={
          confirm?.type === "approve" ||
          confirm?.type === "unhide" ||
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
          else deleteMutation.mutate(confirm.listing.id);
        }}
      />
    </div>
  );
}
