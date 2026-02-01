import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, approveUser, rejectUser, type UserListItem } from "../api/admin";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [viewingUser, setViewingUser] = useState<UserListItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject";
    user: UserListItem;
    remarks?: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, statusFilter],
    queryFn: () => getUsers(page, 20, statusFilter || undefined)
  });

  const approveMutation = useMutation({
    mutationFn: ({ userId, remarks }: { userId: number; remarks?: string }) =>
      approveUser(userId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setConfirmAction(null);
      addToast("User approved successfully.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to approve", "error")
  });

  const rejectMutation = useMutation({
    mutationFn: ({ userId, remarks }: { userId: number; remarks: string }) =>
      rejectUser(userId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setConfirmAction(null);
      addToast("User rejected.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to reject", "error")
  });

  const columns = [
    { key: "id", label: "ID" },
    { key: "fullName", label: "Full Name" },
    { key: "email", label: "Email" },
    { key: "mobile", label: "Mobile", render: (r: UserListItem) => r.mobile ?? "—" },
    {
      key: "createdAt",
      label: "Registration Date",
      render: (r: UserListItem) => new Date(r.createdAt).toLocaleDateString()
    },
    {
      key: "status",
      label: "Status",
      render: (r: UserListItem) => <StatusBadge status={r.status} />
    },
    {
      key: "actions",
      label: "Actions",
      render: (r: UserListItem) => (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewingUser(r)}
            className="text-sm font-medium text-primary hover:underline"
          >
            View Profile
          </button>
          {r.status === "PENDING" && (
            <>
              <button
                type="button"
                onClick={() => setConfirmAction({ type: "approve", user: r })}
                className="text-sm font-medium text-emerald-600 hover:underline"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction({ type: "reject", user: r })}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Reject
              </button>
            </>
          )}
          {(r.status === "APPROVED" || r.status === "Active") && (
            <>
              <button
                type="button"
                onClick={() => addToast("Suspend / Reactivate will be available when backend supports it.", "info")}
                className="text-sm font-medium text-amber-600 hover:underline"
              >
                Suspend
              </button>
              <button
                type="button"
                onClick={() => addToast("Reactivate will be available when backend supports it.", "info")}
                className="text-sm font-medium text-slate-600 hover:underline"
              >
                Reactivate
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">User Management</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Active</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      {isLoading ? (
        <p className="text-slate-600">Loading…</p>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.users ?? []}
            keyExtractor={(r) => r.id}
            emptyMessage="No users found"
          />
          {totalPages > 1 && (
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {confirmAction?.type === "approve" && (
        <ConfirmModal
          open
          title="Approve User"
          message={`Approve ${confirmAction.user.fullName}? They will be able to log in.`}
          confirmLabel="Approve"
          onConfirm={() =>
            approveMutation.mutate({ userId: confirmAction.user.id })
          }
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction?.type === "reject" && (
        <ConfirmModal
          open
          title="Reject User"
          message="Reject this user? You must provide a reason (shown in the next step)."
          confirmLabel="Continue"
          variant="danger"
          onConfirm={() => {
            const reason = window.prompt("Reason for rejection (required):");
            if (reason?.trim()) {
              rejectMutation.mutate({
                userId: confirmAction.user.id,
                remarks: reason.trim()
              });
            }
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">User Profile</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-slate-500">User ID</dt>
                <dd className="text-slate-900">{viewingUser.id}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Full Name</dt>
                <dd className="text-slate-900">{viewingUser.fullName}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Email</dt>
                <dd className="text-slate-900">{viewingUser.email}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Mobile</dt>
                <dd className="text-slate-900">{viewingUser.mobile ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Registration Date</dt>
                <dd className="text-slate-900">{new Date(viewingUser.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Status</dt>
                <dd>
                  <StatusBadge status={viewingUser.status} />
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
