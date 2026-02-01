import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPendingUpdates,
  approveProfileUpdate,
  rejectProfileUpdate,
  type PendingProfileUpdate
} from "../api/admin";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../context/ToastContext";

function DataCompare({
  current,
  pending
}: {
  current: Record<string, unknown> | null;
  pending: Record<string, unknown>;
}) {
  const keys = [...new Set([...Object.keys(pending), ...Object.keys(current ?? {})])].filter(Boolean);
  if (keys.length === 0) return <p className="text-slate-500 text-sm">No fields</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-2 pr-4 text-left font-semibold text-slate-600">Field</th>
            <th className="py-2 pr-4 text-left font-semibold text-slate-600">Current (approved)</th>
            <th className="py-2 text-left font-semibold text-slate-600">Pending (new)</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const cur = current?.[key];
            const pen = pending[key];
            const changed = JSON.stringify(cur) !== JSON.stringify(pen);
            return (
              <tr key={key} className={`border-b border-slate-100 ${changed ? "bg-amber-50" : ""}`}>
                <td className="py-2 pr-4 font-mono text-slate-500">{key}</td>
                <td className="py-2 pr-4 text-slate-700">{cur != null ? String(cur) : "—"}</td>
                <td className="py-2 text-slate-700">{pen != null ? String(pen) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MatrimonyApprovalPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [rejecting, setRejecting] = useState<PendingProfileUpdate | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");

  const { data: updates, isLoading } = useQuery({
    queryKey: ["admin-pending-updates"],
    queryFn: getPendingUpdates
  });

  const matrimonyUpdates = (updates ?? []).filter((u) => u.section === "MATRIMONY");

  const approveMutation = useMutation({
    mutationFn: (updateId: number) => approveProfileUpdate(updateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-updates"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      addToast("Matrimony update approved.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to approve", "error")
  });

  const rejectMutation = useMutation({
    mutationFn: ({ updateId, remarks }: { updateId: number; remarks: string }) =>
      rejectProfileUpdate(updateId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-updates"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setRejecting(null);
      setRejectRemarks("");
      addToast("Matrimony update rejected.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to reject", "error")
  });

  if (isLoading) return <p className="text-slate-600">Loading…</p>;

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Matrimony Approval</h2>
      {matrimonyUpdates.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">
          No pending Matrimony updates.
        </p>
      ) : (
        <div className="space-y-6">
          {matrimonyUpdates.map((u) => (
            <div
              key={u.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{u.userName}</h3>
                  <p className="text-sm text-slate-600">{u.userEmail}</p>
                  <span className="mt-2 inline-block">
                    <StatusBadge status={u.status} />
                  </span>
                  <p className="mt-1 text-xs text-slate-500">
                    Submitted {new Date(u.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <DataCompare current={u.currentApproved} pending={u.data} />
              {u.data?.horoscopeDocumentUrl != null && (
                <p className="mt-2 text-sm text-slate-600">
                  Horoscope:{" "}
                  <a
                    href={String(u.data.horoscopeDocumentUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View document
                  </a>
                </p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => approveMutation.mutate(u.id)}
                  disabled={approveMutation.isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(u)}
                  disabled={rejectMutation.isPending}
                  className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="font-semibold text-slate-900">Reject Matrimony Update</h3>
            <p className="mt-1 text-sm text-slate-600">Reason (required):</p>
            <textarea
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Reason for rejection"
            />
            <div className="mt-4 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setRejecting(null);
                  setRejectRemarks("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectRemarks.trim()) return;
                  rejectMutation.mutate({ updateId: rejecting.id, remarks: rejectRemarks.trim() });
                }}
                disabled={!rejectRemarks.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Submit Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
