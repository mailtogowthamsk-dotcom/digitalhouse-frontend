import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUsers,
  approveUser,
  rejectUser,
  requestRegistrationChanges,
  logoutUser,
  softDeleteUser,
  restoreUser,
  hardDeleteUser,
  type UserListItem
} from "../api/admin";
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
import {
  EMPTY_CHANGE_REQUEST_FORM,
  RequestRegistrationChangesFields,
  selectedChangeFields,
  type RequestRegistrationChangesForm
} from "../components/admin/RequestRegistrationChangesFields";

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const navigate = useNavigate();
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
  const [hardConfirmText, setHardConfirmText] = useState("");
  const [changeForm, setChangeForm] = useState<RequestRegistrationChangesForm>(EMPTY_CHANGE_REQUEST_FORM);
  const [confirmAction, setConfirmAction] = useState<{
    type:
      | "approve"
      | "reject"
      | "suspend"
      | "reactivate"
      | "logout"
      | "requestChanges"
      | "softDelete"
      | "hardDelete"
      | "restore";
    user: UserListItem;
  } | null>(null);

  const isReviewable = (status: string) =>
    status === "PENDING" || status === "PENDING_REVIEW" || status === "CHANGES_REQUESTED";

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

  const { data, isLoading, isError, error, refetch } = useQuery({
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const runConfirm = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    try {
      if (type === "approve") await approveUser(user.id);
      if (type === "reject") {
        const remarks = window.prompt("Rejection reason:")?.trim();
        if (!remarks) return;
        await rejectUser(user.id, remarks);
      }
      if (type === "requestChanges") {
        const remarks = changeForm.remarks.trim();
        const fields = selectedChangeFields(changeForm);
        if (!remarks) {
          addToast("Add a message for the applicant.", "error");
          return;
        }
        if (!fields.length) {
          addToast("Select at least one field.", "error");
          return;
        }
        await requestRegistrationChanges(user.id, remarks, fields);
      }
      if (type === "suspend") await suspendAdminUser(user.id);
      if (type === "reactivate") await reactivateAdminUser(user.id);
      if (type === "logout") await logoutUser(user.id);
      if (type === "softDelete") {
        const reason = window.prompt("Soft-delete reason (optional):")?.trim();
        await softDeleteUser(user.id, reason || undefined);
      }
      if (type === "restore") await restoreUser(user.id);
      if (type === "hardDelete") {
        if (hardConfirmText !== "DELETE") {
          addToast('Type DELETE to confirm.', "error");
          return;
        }
        const reason = window.prompt("Hard-delete reason (optional):")?.trim();
        await hardDeleteUser(user.id, reason || undefined);
      }
      addToast(type === "logout" ? "User signed out of the app." : "Action completed.", "success");
      setConfirmAction(null);
      setHardConfirmText("");
      invalidate();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Action failed", "error");
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "photo",
        label: "Photo",
        render: (r: UserListItem) =>
          r.profilePhoto ? (
            <img src={r.profilePhoto} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
              {(r.fullName || "?").charAt(0)}
            </div>
          )
      },
      { key: "id", label: "User ID", sortable: true },
      {
        key: "fullName",
        label: "Full Name",
        sortable: true,
        render: (r: UserListItem) => (
          <div>
            <div className="font-medium text-slate-900">{r.fullName}</div>
          </div>
        )
      },
      {
        key: "username",
        label: "Username",
        render: (r: UserListItem) => (r.username ? `@${r.username}` : "—")
      },
      { key: "mobile", label: "Mobile", render: (r: UserListItem) => r.mobile ?? "—" },
      { key: "email", label: "Email", sortable: true },
      { key: "gender", label: "Gender", render: (r: UserListItem) => r.gender ?? "—" },
      { key: "district", label: "District", render: (r: UserListItem) => r.district ?? "—" },
      {
        key: "state",
        label: "State",
        render: () => "—"
      },
      {
        key: "country",
        label: "Country",
        render: () => "—"
      },
      {
        key: "community",
        label: "Community",
        render: (r: UserListItem) => r.community ?? "—"
      },
      { key: "kulam", label: "Kulam", render: (r: UserListItem) => r.kulam ?? "—" },
      {
        key: "createdAt",
        label: "Registered",
        sortable: true,
        render: (r: UserListItem) => new Date(r.createdAt).toLocaleDateString()
      },
      {
        key: "lastLogin",
        label: "Last Login",
        render: (r: UserListItem) => r.lastLoginProvider ?? "—"
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (r: UserListItem) => <StatusBadge status={r.status} />
      },
      {
        key: "verification",
        label: "Verification",
        render: (r: UserListItem) => (
          <span className="text-xs text-slate-600">{r.emailVerified ? "Email ✓" : "Email —"}</span>
        )
      },
      {
        key: "subscription",
        label: "Subscription",
        render: (r: UserListItem) =>
          r.subscriptionPlan ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {r.subscriptionPlan}
            </span>
          ) : (
            "—"
          )
      },
      {
        key: "role",
        label: "Role",
        render: (r: UserListItem) => r.communityRole || "USER"
      },
      {
        key: "actions",
        label: "Actions",
        render: (r: UserListItem) => (
          <div className="flex min-w-[12rem] flex-wrap items-center gap-2">
            <Link to={`/users/${r.id}`} className="text-sm font-medium text-primary hover:underline">
              View
            </Link>
            <Link
              to={`/users/${r.id}`}
              className="text-sm font-medium text-slate-600 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                navigate(`/users/${r.id}`);
              }}
            >
              Edit
            </Link>
            {isReviewable(r.status) && (
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
                  onClick={() => {
                    setChangeForm(EMPTY_CHANGE_REQUEST_FORM);
                    setConfirmAction({ type: "requestChanges", user: r });
                  }}
                  className="text-sm font-medium text-amber-600 hover:underline"
                >
                  Request changes
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
            {r.status !== "DELETED" && (
              <button
                type="button"
                onClick={() => setConfirmAction({ type: "logout", user: r })}
                className="text-sm font-medium text-slate-700 hover:underline"
              >
                Log out
              </button>
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
                Activate
              </button>
            )}
            {r.status === "DELETED" ? (
              <button
                type="button"
                onClick={() => setConfirmAction({ type: "restore", user: r })}
                className="text-sm font-medium text-emerald-600 hover:underline"
              >
                Restore
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmAction({ type: "softDelete", user: r })}
                className="text-sm font-medium text-slate-600 hover:underline"
              >
                Soft delete
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setHardConfirmText("");
                setConfirmAction({ type: "hardDelete", user: r });
              }}
              className="text-sm font-medium text-red-700 hover:underline"
            >
              Hard delete
            </button>
          </div>
        )
      }
    ],
    [navigate]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review registrations, manage accounts, and inspect full member profiles.
        </p>
      </div>

      <AdminListToolbar
        search={searchDraft}
        onSearchChange={setSearchDraft}
        searchPlaceholder="Search name, username, email, mobile…"
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PENDING_REVIEW">Pending review</option>
          <option value="CHANGES_REQUESTED">Changes requested</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DELETED">Soft-deleted</option>
        </select>
        <select
          value={loginSourceFilter}
          onChange={(e) => setLoginSourceFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All login sources</option>
          <option value="google">Google</option>
          <option value="existing">Existing login</option>
          <option value="both">Both</option>
        </select>
        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </AdminListToolbar>

      {isError ? (
        <AdminListError message={error instanceof Error ? error.message : "Failed to load"} onRetry={() => void refetch()} />
      ) : isLoading && !data ? (
        <AdminTableSkeleton rows={8} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <DataTable
              columns={columns as any}
              data={(data?.users ?? []) as any}
              keyExtractor={(r) => (r as UserListItem).id}
              emptyMessage="No users found."
              sortKey={sortBy}
              sortDir={sortDir}
              onSortChange={(key, dir) => {
                setSortBy(key);
                setSortDir(dir);
              }}
            />
          </div>
          <AdminPagination
            page={page}
            limit={limit}
            total={data?.total ?? 0}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}

      {confirmAction && (
        <ConfirmModal
          open
          title={
            confirmAction.type === "hardDelete"
              ? "Hard delete user?"
              : confirmAction.type === "softDelete"
                ? "Soft delete user?"
              : confirmAction.type === "logout"
                  ? "Log out of app?"
                  : confirmAction.type === "requestChanges"
                    ? "Request registration changes"
                  : `Confirm ${confirmAction.type}`
          }
          message={
            confirmAction.type === "hardDelete"
              ? `Permanently delete ${confirmAction.user.fullName} including all posts, media, and R2 files? This cannot be undone.`
              : confirmAction.type === "softDelete"
                ? `Soft-delete ${confirmAction.user.fullName}? They cannot sign in; data is retained.`
                : confirmAction.type === "logout"
                  ? `Sign ${confirmAction.user.fullName} out of the app on all devices? They can log in again. The account is not suspended or deleted.`
                  : confirmAction.type === "requestChanges"
                    ? "The applicant stays pending. They will see a form for only the fields you select — including referral code if you tick it."
                  : `Perform ${confirmAction.type} on ${confirmAction.user.fullName}?`
          }
          confirmLabel={
            confirmAction.type === "hardDelete"
              ? "Permanently delete"
              : confirmAction.type === "requestChanges"
                ? "Send request"
                : "Confirm"
          }
          variant={
            confirmAction.type === "hardDelete" ||
            confirmAction.type === "softDelete" ||
            confirmAction.type === "reject"
              ? "danger"
              : "default"
          }
          confirmDisabled={confirmAction.type === "hardDelete" && hardConfirmText !== "DELETE"}
          onCancel={() => {
            setConfirmAction(null);
            setHardConfirmText("");
          }}
          onConfirm={() => void runConfirm()}
        >
          {confirmAction.type === "hardDelete" ? (
            <label className="mt-3 block text-sm">
              <span className="text-slate-600">Type DELETE to confirm</span>
              <input
                className="mt-1 w-full rounded-lg border border-red-300 px-3 py-2"
                value={hardConfirmText}
                onChange={(e) => setHardConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </label>
          ) : confirmAction.type === "requestChanges" ? (
            <RequestRegistrationChangesFields form={changeForm} onChange={setChangeForm} />
          ) : null}
        </ConfirmModal>
      )}
    </div>
  );
}
