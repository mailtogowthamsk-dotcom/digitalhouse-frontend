import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPendingBusinessBenefits,
  approveBusinessBenefit,
  rejectBusinessBenefit,
  type PendingBusinessBenefit
} from "../api/businessBenefitsAdmin";
import { StatusBadge } from "../components/StatusBadge";
import {
  AdminListError,
  AdminListToolbar,
  AdminPagination,
  AdminTableSkeleton
} from "../components/admin/AdminListControls";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useToast } from "../context/ToastContext";
import { PermissionGate } from "../components/PermissionGate";

const TYPE_LABELS: Record<string, string> = {
  PERCENTAGE_DISCOUNT: "Percentage Discount",
  FIXED_DISCOUNT: "Fixed Discount",
  SPECIAL_PRICE: "Special Price",
  FREE_SERVICE: "Free Service",
  OTHER: "Other"
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">{value || "—"}</dd>
    </div>
  );
}

export function BusinessBenefitsApprovalPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchDraft, setSearchDraft] = useState("");
  const searchQ = useDebouncedValue(searchDraft, 350);
  const [rejecting, setRejecting] = useState<PendingBusinessBenefit | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");

  useEffect(() => {
    setPage(1);
  }, [searchQ, limit]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-business-benefits-pending", page, limit, searchQ],
    queryFn: () =>
      getPendingBusinessBenefits({
        page,
        limit,
        q: searchQ || undefined
      })
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveBusinessBenefit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business-benefits-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      addToast("Member benefit approved.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to approve", "error")
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      rejectBusinessBenefit(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business-benefits-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setRejecting(null);
      setRejectRemarks("");
      addToast("Member benefit rejected.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to reject", "error")
  });

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        Pending Member Benefits submitted by business owners. Approve to make them public for
        members.
      </p>

      <AdminListToolbar
        search={searchDraft}
        onSearchChange={setSearchDraft}
        searchPlaceholder="Search benefit title or value…"
      />

      {isLoading ? (
        <AdminTableSkeleton rows={4} cols={3} />
      ) : isError ? (
        <AdminListError
          message={(error as Error)?.message || "Failed to load pending benefits."}
          onRetry={() => void refetch()}
        />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">
          No pending Member Benefits.
        </p>
      ) : (
        <>
          <div className="space-y-6">
            {items.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{b.title}</h3>
                    <p className="text-sm text-slate-600">
                      {b.businessName} · Owner: {b.businessOwner?.fullName ?? "—"}
                    </p>
                    <p className="text-sm text-slate-500">{b.businessOwner?.email}</p>
                    <span className="mt-2 inline-block">
                      <StatusBadge status={b.status} />
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      Submitted {new Date(b.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                  <Field label="Type" value={TYPE_LABELS[b.benefitType] ?? b.benefitType} />
                  <Field label="Value" value={b.value} />
                  <Field
                    label="Valid from"
                    value={b.validFrom ? new Date(b.validFrom).toLocaleString() : "—"}
                  />
                  <Field
                    label="Valid until"
                    value={b.validUntil ? new Date(b.validUntil).toLocaleString() : "—"}
                  />
                  <Field
                    label="Usage limit"
                    value={b.usageLimit != null ? String(b.usageLimit) : "Unlimited"}
                  />
                  <Field label="Description" value={b.description} />
                  <Field label="Terms" value={b.terms ?? ""} />
                </dl>

                <div className="mt-4 flex gap-3">
                  <PermissionGate action="business.approve">
                    <button
                      type="button"
                      onClick={() => approveMutation.mutate(b.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejecting(b);
                        setRejectRemarks("");
                      }}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </PermissionGate>
                </div>
              </div>
            ))}
          </div>

          <AdminPagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}

      {rejecting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Reject Member Benefit</h3>
            <p className="mt-1 text-sm text-slate-600">{rejecting.title}</p>
            <textarea
              className="mt-4 w-full rounded-lg border border-slate-300 p-3 text-sm"
              rows={4}
              placeholder="Rejection remarks (required)"
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                onClick={() => setRejecting(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={rejectRemarks.trim().length < 3 || rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({ id: rejecting.id, remarks: rejectRemarks.trim() })
                }
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
