import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAdminReports,
  getAdminReport,
  resolveAdminReport,
  dismissAdminReport,
  escalateAdminReport,
  warnFromAdminReport,
  suspendFromAdminReport,
  type AdminReportItem,
  type AdminReportDetail,
  type ReportStatusFilter
} from "../../../api/reportsAdmin";
import { StatusBadge } from "../../../components/StatusBadge";
import { ConfirmModal } from "../../../components/ConfirmModal";
import {
  AdminListError,
  AdminPagination,
  AdminTableSkeleton
} from "../../../components/admin/AdminListControls";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useToast } from "../../../context/ToastContext";

type ConfirmType = "resolve" | "dismiss" | "escalate" | "warn" | "suspend";

function statusClass(status: string) {
  if (status === "PENDING") return "bg-amber-100 text-amber-800";
  if (status === "RESOLVED") return "bg-emerald-100 text-emerald-800";
  if (status === "ESCALATED") return "bg-purple-100 text-purple-800";
  return "bg-slate-100 text-slate-700";
}

export function MatrimonyReportsListPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatusFilter>("PENDING");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchDraft, setSearchDraft] = useState("");
  const searchQ = useDebouncedValue(searchDraft, 350);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ type: ConfirmType; item: AdminReportItem } | null>(
    null
  );
  const [note, setNote] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["matrimony-admin-reports", status, page, limit, searchQ],
    queryFn: () => listAdminReports(page, limit, status, "PROFILE", searchQ || undefined)
  });

  const detailQuery = useQuery({
    queryKey: ["matrimony-admin-report-detail", detailId],
    queryFn: async () => {
      const res = await getAdminReport("PROFILE", detailId!);
      return res.report;
    },
    enabled: detailId != null
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["matrimony-admin-reports"] });
    queryClient.invalidateQueries({ queryKey: ["matrimony-admin-report-detail"] });
    queryClient.invalidateQueries({ queryKey: ["matrimony-admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  const actionMut = useMutation({
    mutationFn: async () => {
      if (!confirm) return;
      const { type, item } = confirm;
      const remarks = note.trim() || undefined;
      if (type === "resolve") return resolveAdminReport("PROFILE", item.id, remarks);
      if (type === "dismiss") return dismissAdminReport("PROFILE", item.id, remarks);
      if (type === "escalate") return escalateAdminReport("PROFILE", item.id, remarks);
      if (type === "warn") return warnFromAdminReport("PROFILE", item.id, remarks, remarks);
      return suspendFromAdminReport("PROFILE", item.id, remarks);
    },
    onSuccess: () => {
      const labels: Record<ConfirmType, string> = {
        resolve: "Report resolved. Reporter notified.",
        dismiss: "Report dismissed. Reporter notified.",
        escalate: "Report escalated.",
        warn: "Warning sent to reported user.",
        suspend: "User suspended and report resolved."
      };
      addToast(confirm ? labels[confirm.type] : "Done.", "success");
      setConfirm(null);
      setNote("");
      invalidate();
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Action failed", "error")
  });

  const items = data?.reports ?? [];
  const counts = data?.counts;
  const detail = detailQuery.data as AdminReportDetail | undefined;

  const summary = useMemo(
    () => [
      { label: "Pending", value: counts?.pending ?? 0, filter: "PENDING" as const },
      { label: "Escalated", value: counts?.escalated ?? 0, filter: "ESCALATED" as const },
      { label: "Resolved", value: counts?.resolved ?? 0, filter: "RESOLVED" as const },
      { label: "Dismissed", value: counts?.dismissed ?? 0, filter: "DISMISSED" as const },
      { label: "All profile", value: counts?.profile ?? counts?.all ?? 0, filter: "all" as const }
    ],
    [counts]
  );

  const openConfirm = (type: ConfirmType, item: AdminReportItem) => {
    setNote("");
    setConfirm({ type, item });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Matrimony Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Profile abuse reports from the matrimony app. Resolve, dismiss, warn, suspend, or escalate.
          Closing a report notifies the reporter.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {summary.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => {
              setStatus(c.filter);
              setPage(1);
            }}
            className={`rounded-xl border p-4 text-left shadow-sm transition ${
              status === c.filter
                ? "border-primary bg-sky-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <p className="text-xs font-medium uppercase text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{c.value}</p>
          </button>
        ))}
      </div>

      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <input
          type="search"
          placeholder="Search name, email, reason…"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={searchDraft}
          onChange={(e) => {
            setSearchDraft(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ReportStatusFilter);
            setPage(1);
          }}
        >
          <option value="PENDING">Pending</option>
          <option value="ESCALATED">Escalated</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="all">All</option>
        </select>
        {isFetching && !isLoading ? (
          <span className="text-xs text-slate-500">Refreshing…</span>
        ) : null}
      </div>

      {isError ? (
        <AdminListError
          message={error instanceof Error ? error.message : "Failed to load"}
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <AdminTableSkeleton rows={8} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          No matrimony profile reports for this filter.
          {status === "PENDING" ? (
            <button
              type="button"
              className="ml-2 text-primary underline"
              onClick={() => setStatus("all")}
            >
              Show all
            </button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Reporter</th>
                  <th className="px-4 py-3">Reported user</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{row.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.reason}</div>
                      {row.details ? (
                        <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                          {row.details}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/users/${row.reporter.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.reporter.name}
                      </Link>
                      <div className="text-xs text-slate-500">{row.reporter.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/users/${row.targetUser.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.targetUser.name}
                      </Link>
                      <div className="text-xs text-slate-500">{row.targetUser.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.targetUser.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-blue-50"
                          onClick={() => setDetailId(row.id)}
                        >
                          View
                        </button>
                        {(row.status === "PENDING" || row.status === "ESCALATED") && (
                          <>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                              onClick={() => openConfirm("resolve", row)}
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                              onClick={() => openConfirm("dismiss", row)}
                            >
                              Dismiss
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                              onClick={() => openConfirm("warn", row)}
                            >
                              Warn
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                              onClick={() => openConfirm("suspend", row)}
                            >
                              Suspend
                            </button>
                            {row.status === "PENDING" && (
                              <button
                                type="button"
                                className="rounded px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50"
                                onClick={() => openConfirm("escalate", row)}
                              >
                                Escalate
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-4 py-3">
            <AdminPagination
              page={data?.page ?? page}
              limit={limit}
              total={data?.total ?? 0}
              onPageChange={setPage}
              onLimitChange={(n) => {
                setLimit(n);
                setPage(1);
              }}
              className="mt-0"
            />
          </div>
        </div>
      )}

      {detailId != null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Report #{detailId}</h2>
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-sm"
                onClick={() => setDetailId(null)}
              >
                Close
              </button>
            </div>
            {detailQuery.isLoading || !detail ? (
              <div className="p-6 text-sm text-slate-500">Loading detail…</div>
            ) : (
              <div className="space-y-5 p-5">
                <section>
                  <h3 className="text-xs font-semibold uppercase text-slate-500">Report</h3>
                  <p className="mt-1 font-medium text-slate-900">{detail.reason}</p>
                  {detail.details ? (
                    <p className="mt-1 text-sm text-slate-600">{detail.details}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    Submitted {new Date(detail.createdAt).toLocaleString()}
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(detail.status)}`}
                  >
                    {detail.status}
                  </span>
                </section>

                <section className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-500">Reporter</h3>
                    <Link
                      to={`/users/${detail.reporter.id}`}
                      className="mt-1 block font-medium text-primary hover:underline"
                    >
                      {detail.reporter.name}
                    </Link>
                    <p className="text-xs text-slate-500">{detail.reporter.email}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-500">Reported user</h3>
                    <Link
                      to={`/users/${detail.targetUser.id}`}
                      className="mt-1 block font-medium text-primary hover:underline"
                    >
                      {detail.targetUser.name}
                    </Link>
                    <p className="text-xs text-slate-500">{detail.targetUser.email}</p>
                    <div className="mt-1">
                      <StatusBadge status={detail.targetUser.status} />
                    </div>
                  </div>
                </section>

                {detail.matrimonyStatus ? (
                  <section>
                    <h3 className="text-xs font-semibold uppercase text-slate-500">
                      Matrimony status
                    </h3>
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      <li>
                        Profile active: {detail.matrimonyStatus.profileActive ? "Yes" : "No"}
                      </li>
                      <li>
                        Matrimony suspended: {detail.matrimonyStatus.suspended ? "Yes" : "No"}
                      </li>
                      <li>Account: {detail.matrimonyStatus.accountStatus}</li>
                    </ul>
                    <Link
                      to="/matrimony"
                      className="mt-2 inline-block text-sm text-primary hover:underline"
                    >
                      Open matrimony requests
                    </Link>
                  </section>
                ) : null}

                {detail.adminRemarks ? (
                  <section>
                    <h3 className="text-xs font-semibold uppercase text-slate-500">Admin remarks</h3>
                    <p className="mt-1 text-sm text-slate-700">{detail.adminRemarks}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {detail.reviewedBy ? `By ${detail.reviewedBy}` : ""}
                      {detail.reviewedAt
                        ? ` · ${new Date(detail.reviewedAt).toLocaleString()}`
                        : ""}
                    </p>
                  </section>
                ) : null}

                <section>
                  <h3 className="text-xs font-semibold uppercase text-slate-500">
                    Other reports against this user
                  </h3>
                  {(detail.relatedReports?.length ?? 0) === 0 ? (
                    <p className="mt-2 text-sm text-slate-400">None</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {detail.relatedReports!.map((r) => (
                        <li
                          key={r.id}
                          className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                        >
                          #{r.id} · {r.reason} · {r.status} ·{" "}
                          {new Date(r.createdAt).toLocaleDateString()}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase text-slate-500">
                    Moderation timeline
                  </h3>
                  {detail.recentActions.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-400">No actions yet</p>
                  ) : (
                    <ol className="relative mt-3 space-y-3 border-l border-slate-200 pl-5">
                      {detail.recentActions.map((a) => (
                        <li key={a.id} className="relative">
                          <span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-white" />
                          <div className="text-sm font-medium text-slate-900">{a.action}</div>
                          <div className="text-xs text-slate-500">
                            {a.adminEmail} · {new Date(a.createdAt).toLocaleString()}
                          </div>
                          {a.note ? (
                            <div className="mt-0.5 text-xs text-slate-600">{a.note}</div>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                {(detail.status === "PENDING" || detail.status === "ESCALATED") && (
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white"
                      onClick={() => openConfirm("resolve", detail)}
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-1.5 text-sm"
                      onClick={() => openConfirm("dismiss", detail)}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-800"
                      onClick={() => openConfirm("warn", detail)}
                    >
                      Warn
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700"
                      onClick={() => openConfirm("suspend", detail)}
                    >
                      Suspend
                    </button>
                    {detail.status === "PENDING" && (
                      <button
                        type="button"
                        className="rounded-lg border border-purple-300 px-3 py-1.5 text-sm text-purple-800"
                        onClick={() => openConfirm("escalate", detail)}
                      >
                        Escalate
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          open
          title={`${confirm.type.charAt(0).toUpperCase()}${confirm.type.slice(1)} report`}
          message={
            confirm.type === "suspend"
              ? `Suspend ${confirm.item.targetUser.name}? The report will be marked resolved and the reporter notified.`
              : confirm.type === "warn"
                ? `Send a warning to ${confirm.item.targetUser.name}?`
                : confirm.type === "escalate"
                  ? "Escalate this report for senior review."
                  : confirm.type === "resolve"
                    ? "Mark as resolved. The reporter will be notified."
                    : "Dismiss this report. The reporter will be notified."
          }
          confirmLabel={confirm.type === "suspend" ? "Suspend user" : "Confirm"}
          variant={
            confirm.type === "suspend" || confirm.type === "dismiss" ? "danger" : "default"
          }
          confirmDisabled={actionMut.isPending}
          onCancel={() => {
            setConfirm(null);
            setNote("");
          }}
          onConfirm={() => actionMut.mutate()}
        >
          <label className="mt-3 block text-sm">
            <span className="text-slate-600">
              {confirm.type === "warn" ? "Warning message" : "Remarks"} (optional)
            </span>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add notes for the audit log…"
            />
          </label>
        </ConfirmModal>
      )}
    </div>
  );
}
