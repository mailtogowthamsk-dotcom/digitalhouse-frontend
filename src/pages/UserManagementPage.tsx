import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, approveUser, rejectUser, type UserListItem } from "../api/admin";
import { reactivateAdminUser, suspendAdminUser } from "../api/reportsAdmin";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  AdminListError,
  AdminListToolbar,
  AdminPagination,
  AdminTableSkeleton
} from "../components/admin/AdminListControls";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useToast } from "../context/ToastContext";

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchDraft, setSearchDraft] = useState("");
  const searchQ = useDebouncedValue(searchDraft, 350);
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get("status") || "");
  const [loginSourceFilter, setLoginSourceFilter] = useState<string>("");
  const [communityFilter, setCommunityFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewingUser, setViewingUser] = useState<UserListItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject" | "suspend" | "reactivate";
    user: UserListItem;
  } | null>(null);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status != null) {
      setStatusFilter(status);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [searchQ, statusFilter, loginSourceFilter, communityFilter, genderFilter, limit, sortBy, sortDir]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      "admin-users",
      page,
      limit,
      statusFilter,
      loginSourceFilter,
      searchQ,
      communityFilter,
      genderFilter,
      sortBy,
      sortDir
    ],
    queryFn: () =>
      getUsers(page, limit, statusFilter || undefined, searchQ || undefined, loginSourceFilter || undefined, {
        community: communityFilter || undefined,
        gender: genderFilter || undefined,
        sortBy,
        sortDir
      }),
    placeholderData: (prev) => prev
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

  const suspendMutation = useMutation({
    mutationFn: ({ userId }: { userId: number }) => suspendAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setConfirmAction(null);
      addToast("User suspended.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to suspend", "error")
  });

  const reactivateMutation = useMutation({
    mutationFn: ({ userId }: { userId: number }) => reactivateAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setConfirmAction(null);
      addToast("User reactivated.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to reactivate", "error")
  });

  const columns = useMemo(
    () => [
      { key: "id", label: "ID", sortable: true },
      {
        key: "fullName",
        label: "Name",
        sortable: true,
        render: (r: UserListItem) => (
          <div>
            <div className="font-medium text-slate-900">{r.fullName}</div>
            {r.username ? <div className="text-xs text-slate-500">@{r.username}</div> : null}
          </div>
        )
      },
      { key: "email", label: "Email", sortable: true },
      {
        key: "loginSource",
        label: "Login",
        render: (r: UserListItem) => r.loginSource ?? "Existing Login"
      },
      { key: "mobile", label: "Mobile", render: (r: UserListItem) => r.mobile ?? "—" },
      {
        key: "community",
        label: "Community",
        render: (r: UserListItem) => r.community ?? "—"
      },
      {
        key: "gender",
        label: "Gender",
        render: (r: UserListItem) => r.gender ?? "—"
      },
      {
        key: "createdAt",
        label: "Registered",
        sortable: true,
        render: (r: UserListItem) => new Date(r.createdAt).toLocaleDateString()
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
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
              View
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
              <button
                type="button"
                onClick={() => setConfirmAction({ type: "suspend", user: r })}
                className="text-sm font-medium text-amber-600 hover:underline"
              >
                Suspend
              </button>
            )}
            {r.status === "SUSPENDED" && (
              <button
                type="button"
                onClick={() => setConfirmAction({ type: "reactivate", user: r })}
                className="text-sm font-medium text-emerald-600 hover:underline"
              >
                Reactivate
              </button>
            )}
          </div>
        )
      }
    ],
    []
  );

  return (
    <div>
      {isFetching && !isLoading ? (
        <p className="mb-3 text-sm text-slate-400">Refreshing…</p>
      ) : null}

      <AdminListToolbar
        search={searchDraft}
        onSearchChange={setSearchDraft}
        searchPlaceholder="Search name, username, email, mobile…"
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="REJECTED">Rejected</option>
          <option value="PENDING_REVIEW">Pending review</option>
        </select>
        <select
          value={loginSourceFilter}
          onChange={(e) => setLoginSourceFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All login sources</option>
          <option value="google">Google</option>
          <option value="existing">Existing login</option>
          <option value="both">Linked (both)</option>
        </select>
        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <input
          value={communityFilter}
          onChange={(e) => setCommunityFilter(e.target.value)}
          placeholder="Community"
          className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </AdminListToolbar>

      {isLoading && !data ? (
        <AdminTableSkeleton rows={8} cols={6} />
      ) : isError ? (
        <AdminListError
          message={(error as Error)?.message || "Failed to load users."}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns as any}
            data={(data?.users ?? []) as any}
            keyExtractor={(r) => (r as UserListItem).id}
            emptyMessage="No users match your filters."
            sortKey={sortBy}
            sortDir={sortDir}
            onSortChange={(key, dir) => {
              setSortBy(key);
              setSortDir(dir);
            }}
          />
          <AdminPagination
            page={data?.page ?? page}
            limit={data?.limit ?? limit}
            total={data?.total ?? 0}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}

      {confirmAction?.type === "approve" && (
        <ConfirmModal
          open
          title="Approve User"
          message={`Approve ${confirmAction.user.fullName}? They will be able to log in.`}
          confirmLabel="Approve"
          onConfirm={() => approveMutation.mutate({ userId: confirmAction.user.id })}
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
      {confirmAction?.type === "suspend" && (
        <ConfirmModal
          open
          title="Suspend User"
          message={`Suspend ${confirmAction.user.fullName}? They will not be able to sign in until reactivated.`}
          confirmLabel="Suspend"
          variant="danger"
          confirmDisabled={suspendMutation.isPending}
          onConfirm={() => suspendMutation.mutate({ userId: confirmAction.user.id })}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction?.type === "reactivate" && (
        <ConfirmModal
          open
          title="Reactivate User"
          message={`Reactivate ${confirmAction.user.fullName}? They will be able to sign in again.`}
          confirmLabel="Reactivate"
          confirmDisabled={reactivateMutation.isPending}
          onConfirm={() => reactivateMutation.mutate({ userId: confirmAction.user.id })}
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
              {viewingUser.username ? (
                <div>
                  <dt className="font-medium text-slate-500">Username</dt>
                  <dd className="text-slate-900">@{viewingUser.username}</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-medium text-slate-500">Email</dt>
                <dd className="text-slate-900">{viewingUser.email}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Mobile</dt>
                <dd className="text-slate-900">{viewingUser.mobile ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Community</dt>
                <dd className="text-slate-900">{viewingUser.community ?? "—"}</dd>
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
