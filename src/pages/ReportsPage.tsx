import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  dismissAdminReport,
  escalateAdminReport,
  getAdminReport,
  listAdminReports,
  resolveAdminReport,
  suspendFromAdminReport,
  warnFromAdminReport,
  type AdminReportItem,
  type ReportKind,
  type ReportStatusFilter
} from "../api/reportsAdmin";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../context/ToastContext";

type ConfirmAction =
  | {
      type: "resolve" | "dismiss" | "escalate" | "warn" | "suspend";
      item: AdminReportItem;
    }
  | null;

export function ReportsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>("PENDING");
  const [kindFilter, setKindFilter] = useState<ReportKind | "all">("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [remarks, setRemarks] = useState("");
  const [viewing, setViewing] = useState<{ kind: ReportKind; id: number } | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-reports", page, statusFilter, kindFilter, searchQ],
    queryFn: () =>
      listAdminReports(page, 20, statusFilter, kindFilter, searchQ || undefined)
  });

  const detailQuery = useQuery({
    queryKey: ["admin-reports-detail", viewing?.kind, viewing?.id],
    queryFn: () => getAdminReport(viewing!.kind, viewing!.id),
    enabled: viewing != null
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    queryClient.invalidateQueries({ queryKey: ["admin-reports-detail"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!confirm) throw new Error("No action");
      const { type, item } = confirm;
      const note = remarks.trim() || undefined;
      if (type === "resolve") return resolveAdminReport(item.kind, item.id, note);
      if (type === "dismiss") return dismissAdminReport(item.kind, item.id, note);
      if (type === "escalate") return escalateAdminReport(item.kind, item.id, note);
      if (type === "warn") return warnFromAdminReport(item.kind, item.id, note, note);
      return suspendFromAdminReport(item.kind, item.id, note);
    },
    onSuccess: (_data, _vars) => {
      const type = confirm?.type;
      invalidate();
      setConfirm(null);
      setRemarks("");
      if (type === "resolve") addToast("Report resolved.", "success");
      else if (type === "dismiss") addToast("Report dismissed.", "success");
      else if (type === "escalate") addToast("Escalated to Super Admin.", "success");
      else if (type === "warn") addToast("Warning sent to user.", "success");
      else addToast("User suspended.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Action failed", "error")
  });

  const counts = data?.counts;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)));
  const detail = detailQuery.data?.report;

  const columns = useMemo(
    () => [
      {
        key: "kind",
        label: "Type",
        render: (r: AdminReportItem) => (
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${
              r.kind === "POST" ? "bg-blue-50 text-blue-800" : "bg-violet-50 text-violet-800"
            }`}
          >
            {r.kind === "POST" ? "Post" : "Profile"}
          </span>
        )
      },
      {
        key: "reason",
        label: "Reason",
        render: (r: AdminReportItem) => (
          <div>
            <div className="font-medium text-slate-900">{r.reason}</div>
            {r.details ? (
              <div className="mt-0.5 max-w-xs truncate text-xs text-slate-500">{r.details}</div>
            ) : null}
            {r.post ? (
              <div className="mt-0.5 text-xs text-slate-500">
                Post #{r.post.id}: {r.post.title}
                {r.post.postType ? ` · ${r.post.postType}` : ""}
              </div>
            ) : null}
          </div>
        )
      },
      {
        key: "reporter",
        label: "Reporter",
        render: (r: AdminReportItem) => (
          <div>
            <div>{r.reporter.name}</div>
            <div className="text-xs text-slate-500">{r.reporter.email ?? "—"}</div>
          </div>
        )
      },
      {
        key: "target",
        label: "Reported user",
        render: (r: AdminReportItem) => (
          <div>
            <div>{r.targetUser.name}</div>
            <div className="text-xs text-slate-500">{r.targetUser.email ?? "—"}</div>
            {r.targetUser.status === "SUSPENDED" ? (
              <span className="text-xs font-medium text-red-600">Suspended</span>
            ) : null}
          </div>
        )
      },
      {
        key: "status",
        label: "Status",
        render: (r: AdminReportItem) => <StatusBadge status={r.status} />
      },
      {
        key: "createdAt",
        label: "Filed",
        render: (r: AdminReportItem) => new Date(r.createdAt).toLocaleString()
      },
      {
        key: "actions",
        label: "Actions",
        render: (r: AdminReportItem) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewing({ kind: r.kind, id: r.id })}
              className="text-sm font-medium text-primary hover:underline"
            >
              Review
            </button>
            {r.status === "PENDING" || r.status === "ESCALATED" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRemarks("");
                    setConfirm({ type: "warn", item: r });
                  }}
                  className="text-sm font-medium text-amber-700 hover:underline"
                >
                  Warn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRemarks("");
                    setConfirm({ type: "suspend", item: r });
                  }}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  Suspend
                </button>
                {r.status !== "ESCALATED" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRemarks("");
                      setConfirm({ type: "escalate", item: r });
                    }}
                    className="text-sm font-medium text-violet-700 hover:underline"
                  >
                    Escalate
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setRemarks("");
                    setConfirm({ type: "resolve", item: r });
                  }}
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  Resolve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRemarks("");
                    setConfirm({ type: "dismiss", item: r });
                  }}
                  className="text-sm font-medium text-slate-600 hover:underline"
                >
                  Dismiss
                </button>
              </>
            ) : null}
          </div>
        )
      }
    ],
    []
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Reports & Complaints</h2>
          <p className="mt-1 text-sm text-slate-600">
            Post reports and profile abuse from the app. Review, warn, suspend, or escalate to Super
            Admin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg bg-amber-50 px-3 py-1.5 font-medium text-amber-800">
            Pending: {counts?.pending ?? 0}
          </span>
          <span className="rounded-lg bg-violet-50 px-3 py-1.5 font-medium text-violet-800">
            Escalated: {counts?.escalated ?? 0}
          </span>
          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800">
            Resolved: {counts?.resolved ?? 0}
          </span>
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
            Posts: {counts?.post ?? 0} · Profiles: {counts?.profile ?? 0}
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as ReportStatusFilter);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="PENDING">Pending</option>
          <option value="ESCALATED">Escalated</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="all">All statuses</option>
        </select>
        <select
          value={kindFilter}
          onChange={(e) => {
            setPage(1);
            setKindFilter(e.target.value as ReportKind | "all");
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="POST">Post reports</option>
          <option value="PROFILE">Profile abuse</option>
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
          placeholder="Search reason, user, post…"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setSearchQ(searchDraft.trim());
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading reports…
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load reports."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns as any}
          data={(data?.reports ?? []) as any}
          keyExtractor={(r) => (r as AdminReportItem).key}
          emptyMessage="No reports found."
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

      {viewing != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                {viewing.kind} report #{viewing.id}
              </h3>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => setViewing(null)}
              >
                Close
              </button>
            </div>
            {detailQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : detailQuery.isError ? (
              <p className="text-sm text-red-600">
                {detailQuery.error instanceof Error
                  ? detailQuery.error.message
                  : "Failed to load details"}
              </p>
            ) : detail ? (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={detail.status} />
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      detail.kind === "POST"
                        ? "bg-blue-50 text-blue-800"
                        : "bg-violet-50 text-violet-800"
                    }`}
                  >
                    {detail.kind}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400">Reason</div>
                  <div className="font-medium text-slate-900">{detail.reason}</div>
                  {detail.details ? (
                    <p className="mt-1 whitespace-pre-wrap text-slate-600">{detail.details}</p>
                  ) : null}
                </div>
                {detail.post ? (
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Post</div>
                    <div className="font-medium">
                      #{detail.post.id} · {detail.post.title}
                    </div>
                    <div className="text-xs text-slate-500">{detail.post.postType ?? "—"}</div>
                    {detail.postDescription ? (
                      <p className="mt-1 whitespace-pre-wrap text-slate-600">
                        {detail.postDescription}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Reporter</div>
                    <div className="font-medium">{detail.reporter.name}</div>
                    <div className="text-slate-500">{detail.reporter.email ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">
                      Reported user
                    </div>
                    <div className="font-medium">{detail.targetUser.name}</div>
                    <div className="text-slate-500">{detail.targetUser.email ?? "—"}</div>
                    <div className="text-xs text-slate-500">Status: {detail.targetUser.status}</div>
                  </div>
                </div>
                {detail.adminRemarks ? (
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Admin notes</div>
                    <p className="text-slate-700">{detail.adminRemarks}</p>
                    {detail.reviewedBy ? (
                      <div className="mt-1 text-xs text-slate-500">
                        by {detail.reviewedBy}
                        {detail.reviewedAt
                          ? ` · ${new Date(detail.reviewedAt).toLocaleString()}`
                          : ""}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase text-slate-400">
                    Recent moderation actions
                  </div>
                  {(detail.recentActions?.length ?? 0) === 0 ? (
                    <p className="text-slate-500">No actions yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                      {detail.recentActions.map((a) => (
                        <li key={a.id} className="px-3 py-2">
                          <div className="font-medium text-slate-800">{a.action}</div>
                          <div className="text-xs text-slate-500">
                            {a.adminEmail} · {new Date(a.createdAt).toLocaleString()}
                          </div>
                          {a.note ? (
                            <div className="mt-1 text-xs text-slate-600">{a.note}</div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {(detail.status === "PENDING" || detail.status === "ESCALATED") && (
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800"
                      onClick={() => {
                        setViewing(null);
                        setRemarks("");
                        setConfirm({ type: "warn", item: detail });
                      }}
                    >
                      Warn user
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"
                      onClick={() => {
                        setViewing(null);
                        setRemarks("");
                        setConfirm({ type: "suspend", item: detail });
                      }}
                    >
                      Suspend user
                    </button>
                    {detail.status !== "ESCALATED" ? (
                      <button
                        type="button"
                        className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-800"
                        onClick={() => {
                          setViewing(null);
                          setRemarks("");
                          setConfirm({ type: "escalate", item: detail });
                        }}
                      >
                        Escalate
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800"
                      onClick={() => {
                        setViewing(null);
                        setRemarks("");
                        setConfirm({ type: "resolve", item: detail });
                      }}
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {confirm != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {confirm.type === "resolve"
                ? "Resolve report?"
                : confirm.type === "dismiss"
                  ? "Dismiss report?"
                  : confirm.type === "escalate"
                    ? "Escalate to Super Admin?"
                    : confirm.type === "warn"
                      ? "Warn user?"
                      : "Suspend user?"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {confirm.type === "suspend"
                ? `Suspend ${confirm.item.targetUser.name}? They will lose access until reactivated. The report will be marked resolved.`
                : confirm.type === "warn"
                  ? `Send a community warning notification to ${confirm.item.targetUser.name}?`
                  : confirm.type === "escalate"
                    ? `Mark this ${confirm.item.kind.toLowerCase()} report as escalated for Super Admin review.`
                    : `Update report #${confirm.item.id} (${confirm.item.reason}).`}
            </p>
            <label className="mt-3 block text-xs font-medium text-slate-600">
              Notes / message (optional)
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                placeholder={
                  confirm.type === "warn"
                    ? "Custom warning message…"
                    : confirm.type === "suspend"
                      ? "Suspension reason…"
                      : "Admin remarks…"
                }
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirm(null);
                  setRemarks("");
                }}
                disabled={actionMutation.isPending}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => actionMutation.mutate()}
                disabled={actionMutation.isPending}
                className={
                  confirm.type === "suspend" || confirm.type === "dismiss"
                    ? "rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    : "rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                }
              >
                {actionMutation.isPending
                  ? "Working…"
                  : confirm.type === "resolve"
                    ? "Resolve"
                    : confirm.type === "dismiss"
                      ? "Dismiss"
                      : confirm.type === "escalate"
                        ? "Escalate"
                        : confirm.type === "warn"
                          ? "Send warning"
                          : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
