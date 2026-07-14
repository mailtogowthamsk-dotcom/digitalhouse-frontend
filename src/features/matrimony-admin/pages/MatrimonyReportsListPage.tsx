import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMatrimonyReports, resolveMatrimonyReport } from "../api";
import { useToast } from "../../../context/ToastContext";

type ReportStatus = "any" | "PENDING" | "RESOLVED" | "DISMISSED";

export function MatrimonyReportsListPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatus>("PENDING");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["matrimony-admin-reports", status, page],
    queryFn: () => listMatrimonyReports({ status, page, limit: 20 })
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      id,
      resolveStatus,
      adminRemarks
    }: {
      id: number;
      resolveStatus: "RESOLVED" | "DISMISSED";
      adminRemarks?: string;
    }) => resolveMatrimonyReport(id, resolveStatus, adminRemarks),
    onSuccess: () => {
      addToast("Report updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["matrimony-admin-reports"] });
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-6">
      <p className="text-sm text-slate-600">
        User-submitted reports from the mobile app (fake profile, harassment, etc.).
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700">
          Status
          <select
            className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ReportStatus);
              setPage(1);
            }}
          >
            <option value="any">All</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </label>
        {isFetching && !isLoading ? (
          <span className="text-xs text-slate-500">Refreshing…</span>
        ) : null}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Reporter</th>
              <th className="px-4 py-3">Reported user</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No reports found.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{row.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.reason}</div>
                    {row.details ? (
                      <div className="mt-1 max-w-xs text-xs text-slate-500">{row.details}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.reporter.name}</div>
                    {row.reporter.email ? (
                      <div className="text-xs text-slate-500">{row.reporter.email}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.reportedUser.name}</div>
                    {row.reportedUser.email ? (
                      <div className="text-xs text-slate-500">{row.reportedUser.email}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                        row.status === "PENDING"
                          ? "bg-amber-100 text-amber-800"
                          : row.status === "RESOLVED"
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "PENDING" ? (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          disabled={resolveMutation.isPending}
                          onClick={() => {
                            const remarks = window.prompt("Admin remarks (optional)") ?? undefined;
                            resolveMutation.mutate({
                              id: row.id,
                              resolveStatus: "RESOLVED",
                              adminRemarks: remarks
                            });
                          }}
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                          disabled={resolveMutation.isPending}
                          onClick={() => {
                            const remarks = window.prompt("Dismiss reason (optional)") ?? undefined;
                            resolveMutation.mutate({
                              id: row.id,
                              resolveStatus: "DISMISSED",
                              adminRemarks: remarks
                            });
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">
                        {row.reviewedBy ? `By ${row.reviewedBy}` : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            className="rounded border px-3 py-1 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <button
            type="button"
            className="rounded border px-3 py-1 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
