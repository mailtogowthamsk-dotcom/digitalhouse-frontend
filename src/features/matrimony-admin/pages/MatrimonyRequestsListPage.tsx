import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMatrimonyStats,
  listMatrimonyRequests,
  bulkMatrimonyAction,
  approveMatrimonyRequest
} from "../api";
import type { MatrimonyListFilters, MatrimonyRequestListItem } from "../types";
import { SummaryCards } from "../components/SummaryCards";
import { WorkflowBadge } from "../components/WorkflowBadge";
import { TableSkeleton } from "../components/TableSkeleton";
import { useToast } from "../../../context/ToastContext";
import { useAuth } from "../../../context/AuthContext";

const defaultFilters: MatrimonyListFilters = {
  page: 1,
  limit: 20,
  sortDir: "desc",
  verificationStatus: "any",
  includeDrafts: false,
  pendingReviewOnly: true
};

export function MatrimonyRequestsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { adminEmail } = useAuth();
  const [filters, setFilters] = useState<MatrimonyListFilters>(defaultFilters);
  const [searchDraft, setSearchDraft] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("OTHER");

  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilters((f) => {
        const next = searchDraft.trim() || undefined;
        if ((f.search || undefined) === next) return f;
        return { ...f, page: 1, search: next };
      });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["matrimony-admin-stats"],
    queryFn: getMatrimonyStats,
    refetchInterval: 45_000
  });

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error: listError
  } = useQuery({
    queryKey: ["matrimony-admin-requests", filters],
    queryFn: () => listMatrimonyRequests(filters),
    refetchInterval: 45_000
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["matrimony-admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["matrimony-admin-requests"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const bulkMutation = useMutation({
    mutationFn: bulkMatrimonyAction,
    onSuccess: (res) => {
      const ok = res.results.filter((r) => r.ok).length;
      addToast(`Bulk action completed for ${ok} request(s).`, "success");
      setSelected(new Set());
      setBulkRejectOpen(false);
      invalidate();
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Bulk action failed", "error")
  });

  const quickApprove = useMutation({
    mutationFn: (id: number) => approveMatrimonyRequest(id),
    onSuccess: () => {
      addToast("Approved.", "success");
      invalidate();
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((r) => selected.has(r.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((r) => r.id)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Matrimony Requests</h2>
          <p className="mt-1 text-sm text-slate-600">
            Review submitted profiles, verify documents, and manage approvals.
          </p>
        </div>
      </div>

      <SummaryCards stats={stats} loading={statsLoading} />

      <div className="sticky top-16 z-30 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-6">
          <input
            type="search"
            placeholder="Name, mobile, profile ID…"
            className="lg:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filters.workflowStatus ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                page: 1,
                workflowStatus: e.target.value || undefined
              }))
            }
          >
            <option value="">All statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CHANGES_REQUESTED">Changes requested</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filters.gender ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, page: 1, gender: e.target.value || undefined }))
            }
          >
            <option value="">All genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <input
            type="text"
            placeholder="District"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filters.district ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, page: 1, district: e.target.value || undefined }))
            }
          />
          <input
            type="text"
            placeholder="Kulam"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filters.kulam ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, page: 1, kulam: e.target.value || undefined }))
            }
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="number"
            placeholder="Age min"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filters.ageMin ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                page: 1,
                ageMin: e.target.value ? Number(e.target.value) : undefined
              }))
            }
          />
          <input
            type="number"
            placeholder="Age max"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filters.ageMax ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                page: 1,
                ageMax: e.target.value ? Number(e.target.value) : undefined
              }))
            }
          />
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filters.submittedFrom ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, page: 1, submittedFrom: e.target.value || undefined }))
            }
          />
          <input
            type="number"
            min={0}
            max={100}
            placeholder="Min completion %"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filters.completionMin ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                page: 1,
                completionMin: e.target.value ? Number(e.target.value) : undefined
              }))
            }
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filters.verificationStatus ?? "any"}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                page: 1,
                verificationStatus: e.target.value as MatrimonyListFilters["verificationStatus"]
              }))
            }
          >
            <option value="any">Any verification</option>
            <option value="complete">Verification complete</option>
            <option value="incomplete">Verification incomplete</option>
          </select>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={filters.includeDrafts ?? true}
            onChange={(e) =>
              setFilters((f) => ({ ...f, page: 1, includeDrafts: e.target.checked }))
            }
          />
          Include drafts (not submitted)
        </label>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-blue-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-800">{selected.size} selected</span>
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            onClick={() =>
              bulkMutation.mutate({ updateIds: [...selected], action: "approve" })
            }
            disabled={bulkMutation.isPending}
          >
            Bulk approve
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700"
            onClick={() => setBulkRejectOpen(true)}
          >
            Bulk reject
          </button>
          <button
            type="button"
            className="text-sm text-slate-600 hover:underline"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-medium text-red-800">Could not load matrimony requests</p>
          <p className="mt-2 text-sm text-red-700">
            {listError instanceof Error ? listError.message : "Request failed"}
          </p>
        </div>
      ) : isLoading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">No matrimony requests match your filters.</p>
          {!filters.includeDrafts && (
            <p className="mt-2 text-sm text-slate-500">
              Enable &quot;Include drafts&quot; to see profiles not yet submitted for review.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Age / Gender</th>
                  <th className="hidden px-4 py-3 md:table-cell">District</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Kulam</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Completion</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Reviewer</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <RequestRow
                    key={row.id}
                    row={row}
                    selected={selected.has(row.id)}
                    onSelect={(on) => {
                      const next = new Set(selected);
                      if (on) next.add(row.id);
                      else next.delete(row.id);
                      setSelected(next);
                    }}
                    onOpen={() => navigate(`/matrimony/${row.id}`)}
                    onApprove={() => quickApprove.mutate(row.id)}
                    adminEmail={adminEmail}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-600">
              {data?.total ?? 0} total · page {data?.page ?? 1} of {data?.totalPages ?? 1}
              {isFetching && " · updating…"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={(filters.page ?? 1) <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={(filters.page ?? 1) >= (data?.totalPages ?? 1)}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-semibold text-slate-900">Bulk reject</h3>
            <select
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            >
              <option value="INCOMPLETE_PROFILE">Incomplete profile</option>
              <option value="OTHER">Other</option>
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border px-4 py-2 text-sm"
                onClick={() => setBulkRejectOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
                onClick={() =>
                  bulkMutation.mutate({
                    updateIds: [...selected],
                    action: "reject",
                    rejectReason,
                    rejectComment: "Bulk rejection"
                  })
                }
              >
                Reject selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestRow({
  row,
  selected,
  onSelect,
  onOpen,
  onApprove,
  adminEmail
}: {
  row: MatrimonyRequestListItem;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onOpen: () => void;
  onApprove: () => void;
  adminEmail: string | null;
}) {
  const canAct = row.rowStatus === "PENDING";
  return (
    <tr
      className="cursor-pointer hover:bg-slate-50"
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      tabIndex={0}
    >
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          disabled={!canAct}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {row.profilePhotoUrl ? (
            <img
              src={row.profilePhotoUrl}
              alt=""
              loading="lazy"
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-500">
              —
            </div>
          )}
          <div>
            <p className="font-medium text-slate-900">{row.fullName}</p>
            <p className="text-xs text-slate-500">ID #{row.userId}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-700">
        {row.age ?? "—"} · {row.gender ?? "—"}
      </td>
      <td className="hidden px-4 py-3 md:table-cell">{row.district || "—"}</td>
      <td className="hidden max-w-[120px] truncate px-4 py-3 lg:table-cell">{row.kulam || "—"}</td>
      <td className="px-4 py-3 text-slate-600">
        {new Date(row.submittedAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-primary"
              style={{ width: `${row.profileCompletion}%` }}
            />
          </div>
          <span className="text-xs">{row.profileCompletion}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <WorkflowBadge status={row.workflowStatus} />
        {row.verificationComplete && (
          <span className="ml-1 text-xs text-emerald-600">✓ verified</span>
        )}
      </td>
      <td className="hidden px-4 py-3 text-xs text-slate-600 xl:table-cell">
        {row.assignedReviewer ?? adminEmail ?? "—"}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap gap-1">
          <Link
            to={`/matrimony/${row.id}`}
            className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-blue-50"
          >
            View
          </Link>
          {canAct && (
            <button
              type="button"
              onClick={onApprove}
              className="rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Approve
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
