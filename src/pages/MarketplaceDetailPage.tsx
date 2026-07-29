import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addAdminMarketplaceNote,
  approveAdminMarketplace,
  deleteAdminMarketplace,
  dismissReportsAdminMarketplace,
  getAdminMarketplaceDetail,
  hideAdminMarketplace,
  rejectAdminMarketplace,
  requestChangesAdminMarketplace,
  setFeaturedAdminMarketplace,
  softDeleteAdminMarketplace,
  restoreSoftDeletedAdminMarketplace,
  unhideAdminMarketplace,
  updateAdminMarketplace
} from "../api/marketplaceAdmin";
import {
  dismissAdminReport,
  reactivateAdminUser,
  resolveAdminReport,
  suspendAdminUser,
  warnAdminUser
} from "../api/reportsAdmin";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import { AdminListError, AdminTableSkeleton } from "../components/admin/AdminListControls";
import { useToast } from "../context/ToastContext";
import { PermissionGate } from "../components/PermissionGate";

function marketplaceBadgeVariant(
  status: string
): "pending" | "approved" | "rejected" | "active" | "suspended" {
  if (status === "LIVE") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "SOLD" || status === "HIDDEN" || status === "ARCHIVED") return "suspended";
  if (status === "CHANGES_REQUESTED") return "pending";
  return "pending";
}

function formatPrice(price: number | null, intent: string | null, negotiable: boolean): string {
  if (intent === "FREE") return "Free";
  if (price == null) return "—";
  const base = `₹${price.toLocaleString("en-IN")}`;
  return negotiable ? `${base} (nego.)` : base;
}

type ConfirmType =
  | "approve"
  | "reject"
  | "requestChanges"
  | "hide"
  | "unhide"
  | "softDelete"
  | "restore"
  | "delete"
  | "dismissReports"
  | "feature"
  | "unfeature"
  | "warnSeller"
  | "suspendSeller"
  | "reactivateSeller"
  | null;

export function MarketplaceDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const focusReportId = Number(searchParams.get("reportId") || "");
  const listingId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<ConfirmType>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [reportAction, setReportAction] = useState<{
    type: "resolve" | "dismiss";
    reportId: number;
  } | null>(null);

  const detail = useQuery({
    queryKey: ["admin-marketplace-detail", listingId],
    queryFn: () => getAdminMarketplaceDetail(listingId),
    enabled: Number.isFinite(listingId) && listingId > 0
  });

  const form = useMemo(() => {
    const listing = detail.data?.listing;
    return {
      title: listing?.title ?? "",
      description: listing?.description ?? "",
      marketplaceCategory: listing?.marketplaceCategory ?? "",
      marketplaceCondition: listing?.marketplaceCondition ?? "",
      marketplaceDistrict: listing?.marketplaceDistrict ?? "",
      marketplacePrice: listing?.marketplacePrice ?? "",
      marketplaceNegotiable: Boolean(listing?.marketplaceNegotiable)
    };
  }, [detail.data]);
  const [draft, setDraft] = useState(form);
  useEffect(() => {
    setDraft(form);
  }, [form]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-marketplace-detail", listingId] });
    queryClient.invalidateQueries({ queryKey: ["admin-marketplace"] });
    queryClient.invalidateQueries({ queryKey: ["admin-marketplace-overview"] });
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  useEffect(() => {
    if (!Number.isFinite(focusReportId) || focusReportId <= 0) return;
    const el = document.getElementById(`marketplace-report-${focusReportId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusReportId, detail.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAdminMarketplace(listingId, {
        title: draft.title,
        description: draft.description || null,
        marketplaceCategory: draft.marketplaceCategory || null,
        marketplaceCondition: draft.marketplaceCondition || null,
        marketplaceDistrict: draft.marketplaceDistrict || null,
        marketplacePrice: draft.marketplacePrice === "" ? null : Number(draft.marketplacePrice),
        marketplaceNegotiable: draft.marketplaceNegotiable
      }),
    onSuccess: () => {
      invalidate();
      addToast("Listing updated.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to update", "error")
  });

  const noteMutation = useMutation({
    mutationFn: () => addAdminMarketplaceNote(listingId, note),
    onSuccess: () => {
      setNote("");
      invalidate();
      addToast("Note added.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to add note", "error")
  });

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!confirm) return;
      if (confirm === "approve") return approveAdminMarketplace(listingId);
      if (confirm === "reject") return rejectAdminMarketplace(listingId, reasonDraft);
      if (confirm === "requestChanges") return requestChangesAdminMarketplace(listingId, reasonDraft);
      if (confirm === "hide") return hideAdminMarketplace(listingId, reasonDraft || undefined);
      if (confirm === "unhide") return unhideAdminMarketplace(listingId);
      if (confirm === "softDelete") return softDeleteAdminMarketplace(listingId, reasonDraft || undefined);
      if (confirm === "restore") return restoreSoftDeletedAdminMarketplace(listingId);
      if (confirm === "delete") return deleteAdminMarketplace(listingId);
      if (confirm === "dismissReports") return dismissReportsAdminMarketplace(listingId);
      if (confirm === "feature") return setFeaturedAdminMarketplace(listingId, true);
      if (confirm === "unfeature") return setFeaturedAdminMarketplace(listingId, false);
      if (confirm === "warnSeller") {
        return warnAdminUser(
          detail.data!.seller.id,
          reasonDraft.trim() || undefined,
          listingId
        );
      }
      if (confirm === "suspendSeller") {
        return suspendAdminUser(
          detail.data!.seller.id,
          reasonDraft.trim() || undefined,
          listingId
        );
      }
      if (confirm === "reactivateSeller") {
        return reactivateAdminUser(
          detail.data!.seller.id,
          reasonDraft.trim() || undefined,
          listingId
        );
      }
    },
    onSuccess: () => {
      const wasDelete = confirm === "delete";
      setConfirm(null);
      setReasonDraft("");
      invalidate();
      addToast("Action completed.", "success");
      if (wasDelete) navigate("/marketplace");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Action failed", "error")
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!reportAction) return;
      const note = reasonDraft.trim() || undefined;
      if (reportAction.type === "resolve") {
        return resolveAdminReport("POST", reportAction.reportId, note);
      }
      return dismissAdminReport("POST", reportAction.reportId, note);
    },
    onSuccess: () => {
      setReportAction(null);
      setReasonDraft("");
      invalidate();
      addToast("Report updated.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to update report", "error")
  });

  if (detail.isLoading) return <AdminTableSkeleton rows={8} cols={6} />;
  if (detail.isError || !detail.data) {
    return (
      <AdminListError
        message={detail.error instanceof Error ? detail.error.message : "Failed to load listing."}
        onRetry={() => void detail.refetch()}
      />
    );
  }

  const data = detail.data;
  const listing = data.listing;
  const needsReason =
    confirm === "reject" ||
    confirm === "requestChanges" ||
    confirm === "hide" ||
    confirm === "softDelete" ||
    confirm === "warnSeller" ||
    confirm === "suspendSeller" ||
    Boolean(reportAction);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-slate-900">{listing.title}</h2>
            <StatusBadge
              status={listing.marketplaceStatus.replace(/_/g, " ")}
              variant={marketplaceBadgeVariant(listing.marketplaceStatus)}
            />
            {listing.marketplaceFeatured ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Featured
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            #{listing.id} · {listing.marketplaceCategory?.replace(/_/g, " ") ?? "No category"} ·{" "}
            {data.seller.fullName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/marketplace"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Back to queue
          </Link>
          <Link
            to={`/users/${data.seller.id}`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            View seller
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Views", data.stats.views],
          ["Favorites", data.stats.favorites],
          ["Pending reports", data.stats.pendingReports],
          ["Total reports", data.stats.totalReports]
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <PermissionGate action="marketplace.manage">
          {listing.marketplaceStatus === "PENDING_REVIEW" ? (
            <>
              <ActionButton label="Approve" tone="emerald" onClick={() => setConfirm("approve")} />
              <ActionButton label="Request changes" tone="sky" onClick={() => setConfirm("requestChanges")} />
              <ActionButton label="Reject" tone="amber" onClick={() => setConfirm("reject")} />
            </>
          ) : null}
          {listing.marketplaceStatus === "LIVE" ? (
            <>
              <ActionButton label="Request changes" tone="sky" onClick={() => setConfirm("requestChanges")} />
              <ActionButton
                label={listing.marketplaceFeatured ? "Unfeature" : "Feature"}
                tone="amber"
                onClick={() => setConfirm(listing.marketplaceFeatured ? "unfeature" : "feature")}
              />
              <ActionButton label="Hide" tone="slate" onClick={() => setConfirm("hide")} />
            </>
          ) : null}
          {listing.marketplaceStatus === "HIDDEN" ? (
            <ActionButton label="Unhide" tone="emerald" onClick={() => setConfirm("unhide")} />
          ) : null}
          {data.stats.pendingReports > 0 ? (
            <ActionButton label="Dismiss reports" tone="indigo" onClick={() => setConfirm("dismissReports")} />
          ) : null}
          {listing.moderationStatus === "SOFT_DELETED" || listing.marketplaceStatus === "ARCHIVED" ? (
            <ActionButton label="Restore" tone="emerald" onClick={() => setConfirm("restore")} />
          ) : (
            <ActionButton label="Soft delete" tone="slate" onClick={() => setConfirm("softDelete")} />
          )}
        </PermissionGate>
        <PermissionGate action="marketplace.delete_hard">
          <ActionButton label="Permanent delete" tone="red" onClick={() => setConfirm("delete")} />
        </PermissionGate>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Listing details</h3>
            {(listing.marketplaceGallery?.length ?? 0) > 0 || listing.mediaUrl ? (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {(listing.marketplaceGallery?.length
                  ? listing.marketplaceGallery
                  : listing.mediaUrl
                    ? [listing.mediaUrl]
                    : []
                ).map((url) => (
                  <img key={url} src={url} alt="" className="h-28 w-28 shrink-0 rounded-lg object-cover" />
                ))}
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Title"
                value={draft.title}
                onChange={(v) => setDraft((prev) => ({ ...prev, title: v }))}
              />
              <Field
                label="Category"
                value={draft.marketplaceCategory}
                onChange={(v) => setDraft((prev) => ({ ...prev, marketplaceCategory: v }))}
              />
              <Field
                label="Condition"
                value={draft.marketplaceCondition}
                onChange={(v) => setDraft((prev) => ({ ...prev, marketplaceCondition: v }))}
              />
              <Field
                label="District"
                value={draft.marketplaceDistrict}
                onChange={(v) => setDraft((prev) => ({ ...prev, marketplaceDistrict: v }))}
              />
              <Field
                label="Price"
                value={String(draft.marketplacePrice)}
                onChange={(v) => setDraft((prev) => ({ ...prev, marketplacePrice: v }))}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.marketplaceNegotiable}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, marketplaceNegotiable: e.target.checked }))
                  }
                />
                Negotiable
              </label>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-[120px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
              <span>
                Intent: <strong>{listing.marketplaceIntent ?? "—"}</strong>
              </span>
              <span>
                Price:{" "}
                <strong>
                  {formatPrice(
                    listing.marketplacePrice,
                    listing.marketplaceIntent,
                    listing.marketplaceNegotiable
                  )}
                </strong>
              </span>
              <span>
                Expires:{" "}
                <strong>
                  {listing.marketplaceExpiresAt
                    ? new Date(listing.marketplaceExpiresAt).toLocaleString()
                    : "—"}
                </strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Save listing
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900">Reports</h3>
              <Link to="/reports" className="text-sm font-medium text-primary hover:underline">
                Open Reports inbox
              </Link>
            </div>
            {data.reports.length === 0 ? (
              <p className="text-sm text-slate-500">No reports on this listing.</p>
            ) : (
              <div className="space-y-3">
                {data.reports.map((report) => {
                  const focused = focusReportId === report.id;
                  const open = report.status === "PENDING" || report.status === "ESCALATED";
                  return (
                    <div
                      key={report.id}
                      id={`marketplace-report-${report.id}`}
                      className={`rounded-xl border p-4 ${
                        focused ? "border-rose-400 bg-rose-50/40 ring-2 ring-rose-200" : "border-slate-200"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-900">
                            {report.reporterName ?? `User #${report.reporterId}`}
                          </div>
                          <div className="text-xs text-slate-500">Report #{report.id}</div>
                        </div>
                        <StatusBadge status={report.status} />
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{report.reason}</p>
                      {report.adminRemarks ? (
                        <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                          Admin remarks: {report.adminRemarks}
                        </p>
                      ) : null}
                      <div className="mt-2 text-xs text-slate-500">
                        Filed {new Date(report.createdAt).toLocaleString()}
                        {report.reviewedBy
                          ? ` · reviewed by ${report.reviewedBy}${
                              report.reviewedAt ? ` on ${new Date(report.reviewedAt).toLocaleString()}` : ""
                            }`
                          : ""}
                      </div>
                      {open ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReasonDraft("");
                              setReportAction({ type: "resolve", reportId: report.id });
                            }}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                          >
                            Resolve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReasonDraft("");
                              setReportAction({ type: "dismiss", reportId: report.id });
                            }}
                            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white"
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Seller</h3>
            <dl className="space-y-2 text-sm text-slate-600">
              <div>
                <dt className="font-medium text-slate-700">Name</dt>
                <dd>{data.seller.fullName}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Contact</dt>
                <dd>
                  {data.seller.email}
                  {data.seller.mobile ? ` · ${data.seller.mobile}` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Community / district</dt>
                <dd>
                  {data.seller.community ?? "—"}
                  {data.seller.district ? ` · ${data.seller.district}` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Status</dt>
                <dd>
                  <StatusBadge status={data.seller.status} />
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Listings</dt>
                <dd>
                  {data.seller.liveListingCount} live / {data.seller.totalListingCount} total
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={`/users/${data.seller.id}`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                Seller profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  setReasonDraft("");
                  setConfirm("warnSeller");
                }}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                Warn seller
              </button>
              {data.seller.status === "SUSPENDED" ? (
                <button
                  type="button"
                  onClick={() => {
                    setReasonDraft("");
                    setConfirm("reactivateSeller");
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Reactivate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setReasonDraft("");
                    setConfirm("suspendSeller");
                  }}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Suspend seller
                </button>
              )}
            </div>
            {data.sellerListings.length ? (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <div className="text-sm font-medium text-slate-800">Other listings</div>
                {data.sellerListings.map((item) => (
                  <Link
                    key={item.id}
                    to={`/marketplace/${item.id}`}
                    className="block rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <div className="font-medium text-slate-900">{item.title}</div>
                    <div className="text-xs text-slate-500">
                      #{item.id} · {item.marketplaceStatus.replace(/_/g, " ")}
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Internal notes</h3>
            {listing.marketplaceAdminNote ? (
              <p className="mb-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {listing.marketplaceAdminNote}
              </p>
            ) : (
              <p className="mb-3 text-sm text-slate-500">No admin notes yet.</p>
            )}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add an internal note…"
              className="min-h-[90px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => noteMutation.mutate()}
              disabled={noteMutation.isPending || note.trim().length < 2}
              className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Add note
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Timeline</h3>
            <div className="space-y-3">
              {data.timeline.map((item) => (
                <div key={item.id} className="border-l-2 border-slate-200 pl-3">
                  <div className="text-sm font-medium text-slate-900">
                    {item.action.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.actor} · {new Date(item.createdAt).toLocaleString()}
                  </div>
                  {item.note ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirm) && !needsReason}
        title={
          confirm === "delete"
            ? "Permanently delete listing?"
            : confirm === "approve"
              ? "Approve listing?"
              : confirm === "unhide"
                ? "Unhide listing?"
                : confirm === "restore"
                  ? "Restore listing?"
                  : confirm === "dismissReports"
                    ? "Dismiss reports?"
                    : confirm === "feature"
                      ? "Feature listing?"
                      : confirm === "unfeature"
                        ? "Remove feature?"
                        : confirm === "reactivateSeller"
                          ? "Reactivate seller?"
                          : "Confirm"
        }
        message={
          confirm === "delete"
            ? "This permanently removes the listing and cannot be undone."
            : confirm === "restore"
              ? "Restore this listing to pending review?"
              : confirm === "reactivateSeller"
                ? "Restore this seller's account access?"
                : "Confirm this moderation action."
        }
        confirmLabel="Confirm"
        variant={
          confirm === "approve" ||
          confirm === "unhide" ||
          confirm === "restore" ||
          confirm === "feature" ||
          confirm === "reactivateSeller"
            ? "default"
            : "danger"
        }
        confirmDisabled={actionMutation.isPending}
        onCancel={() => {
          if (!actionMutation.isPending) {
            setConfirm(null);
            setReasonDraft("");
          }
        }}
        onConfirm={() => actionMutation.mutate()}
      />

      {needsReason && (confirm || reportAction) ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold text-slate-900">
              {reportAction
                ? reportAction.type === "resolve"
                  ? "Resolve report"
                  : "Dismiss report"
                : confirm === "warnSeller"
                  ? "Warn seller"
                  : confirm === "suspendSeller"
                    ? "Suspend seller"
                    : "Add reason / notes"}
            </h4>
            <textarea
              value={reasonDraft}
              onChange={(e) => setReasonDraft(e.target.value)}
              className="mt-3 min-h-[110px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder={
                confirm === "reject"
                  ? "Rejection reason (min 3 characters)"
                  : confirm === "requestChanges"
                    ? "Change notes for the seller (min 3 characters)"
                    : confirm === "warnSeller"
                      ? "Warning message for the seller (optional)"
                      : confirm === "suspendSeller"
                        ? "Suspension reason (optional)"
                        : "Optional note"
              }
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirm(null);
                  setReportAction(null);
                  setReasonDraft("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (reportAction) reportMutation.mutate();
                  else actionMutation.mutate();
                }}
                disabled={
                  actionMutation.isPending ||
                  reportMutation.isPending ||
                  ((confirm === "reject" || confirm === "requestChanges") &&
                    reasonDraft.trim().length < 3)
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function ActionButton({
  label,
  tone,
  onClick
}: {
  label: string;
  tone: "emerald" | "sky" | "amber" | "slate" | "indigo" | "red";
  onClick: () => void;
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-600 text-white",
    sky: "bg-sky-600 text-white",
    amber: "bg-amber-600 text-white",
    slate: "bg-slate-700 text-white",
    indigo: "bg-indigo-600 text-white",
    red: "bg-red-600 text-white"
  };
  return (
    <button type="button" onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium ${tones[tone]}`}>
      {label}
    </button>
  );
}
