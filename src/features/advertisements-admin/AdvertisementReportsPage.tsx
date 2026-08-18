import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdvertisementReports, reviewAdvertisementReport } from "./api";
import { StatusBadge } from "../../components/StatusBadge";
import { AdminPagination, AdminTableSkeleton } from "../../components/admin/AdminListControls";
import { PermissionGate } from "../../components/PermissionGate";
import { useToast } from "../../context/ToastContext";

const TABS = [
  { id: "PENDING", label: "Pending" },
  { id: "UNDER_REVIEW", label: "Under review" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "DISMISSED", label: "Dismissed" },
  { id: "all", label: "All" }
];

export function AdvertisementReportsPage() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ad-reports", tab, page, limit],
    queryFn: () =>
      listAdvertisementReports({
        page,
        limit,
        status: tab === "all" ? undefined : tab
      })
  });

  const review = useMutation({
    mutationFn: (input: {
      id: number;
      status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
      advertisementAction?: "keep" | "pause" | "reject" | "cancel";
    }) =>
      reviewAdvertisementReport(input.id, {
        status: input.status,
        advertisementAction: input.advertisementAction
      }),
    onSuccess: (res) => {
      addToast(res.message, "success");
      void qc.invalidateQueries({ queryKey: ["admin-ad-reports"] });
      void qc.invalidateQueries({ queryKey: ["admin-ads"] });
    },
    onError: (e: Error) => addToast(e.message, "error")
  });

  return (
    <div className="space-y-4">
      <Link to="/advertisements" className="text-sm text-primary">
        ← Back to advertisements
      </Link>
      <h2 className="text-xl font-semibold">Advertisement reports</h2>
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
      {isLoading ? (
        <AdminTableSkeleton />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Advertisement</th>
                <th className="px-3 py-2">Advertiser</th>
                <th className="px-3 py-2">Reporter</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items || []).map((row) => {
                const advertiser = row.advertiser as { name?: string; email?: string; id?: number } | null;
                const reporter = row.reporter as { name?: string; email?: string; id?: number };
                return (
                  <tr key={Number(row.id)} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2">{String(row.id)}</td>
                    <td className="px-3 py-2">
                      <Link className="text-primary" to={`/advertisements/${row.advertisementId}`}>
                        {String(row.advertisementTitle || row.advertisementId)}
                      </Link>
                      <div className="text-xs text-slate-500">{String(row.advertisementStatus || "")}</div>
                    </td>
                    <td className="px-3 py-2">{advertiser?.name || advertiser?.email || advertiser?.id || "—"}</td>
                    <td className="px-3 py-2">{reporter?.name || reporter?.email || reporter?.id}</td>
                    <td className="px-3 py-2">
                      {String(row.reasonLabel || row.reason)}
                      {row.details ? <div className="text-xs text-slate-500">{String(row.details)}</div> : null}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={String(row.status)} />
                    </td>
                    <td className="px-3 py-2">{row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : "—"}</td>
                    <td className="px-3 py-2">
                      <PermissionGate action="advertisements.manage">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() =>
                              review.mutate({ id: Number(row.id), status: "UNDER_REVIEW", advertisementAction: "keep" })
                            }
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() =>
                              review.mutate({ id: Number(row.id), status: "DISMISSED", advertisementAction: "keep" })
                            }
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() =>
                              review.mutate({ id: Number(row.id), status: "RESOLVED", advertisementAction: "keep" })
                            }
                          >
                            Keep active
                          </button>
                          <button
                            type="button"
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() =>
                              review.mutate({ id: Number(row.id), status: "RESOLVED", advertisementAction: "pause" })
                            }
                          >
                            Pause
                          </button>
                          <button
                            type="button"
                            className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                            onClick={() =>
                              review.mutate({ id: Number(row.id), status: "RESOLVED", advertisementAction: "reject" })
                            }
                          >
                            Reject
                          </button>
                        </div>
                      </PermissionGate>
                    </td>
                  </tr>
                );
              })}
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
    </div>
  );
}
