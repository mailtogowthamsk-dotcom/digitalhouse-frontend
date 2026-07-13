import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeAdminJob,
  deleteAdminJob,
  listAdminJobs,
  reopenAdminJob,
  type AdminJobItem
} from "../api/jobsAdmin";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";

type ConfirmState =
  | { type: "close" | "reopen" | "delete"; job: AdminJobItem }
  | null;

export function JobPortalPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"open" | "closed" | "all">("open");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [viewing, setViewing] = useState<AdminJobItem | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-jobs", page, statusFilter, searchQ],
    queryFn: () => listAdminJobs(page, 20, statusFilter, searchQ || undefined)
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const closeMutation = useMutation({
    mutationFn: (id: number) => closeAdminJob(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Job closed.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to close", "error")
  });

  const reopenMutation = useMutation({
    mutationFn: (id: number) => reopenAdminJob(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Job reopened.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to reopen", "error")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminJob(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      setViewing(null);
      addToast("Job deleted.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to delete", "error")
  });

  const mutationPending =
    closeMutation.isPending || reopenMutation.isPending || deleteMutation.isPending;

  const counts = data?.counts;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)));

  const columns = useMemo(
    () => [
      { key: "id", label: "ID" },
      {
        key: "title",
        label: "Title",
        render: (r: AdminJobItem) => (
          <div>
            <div className="font-medium text-slate-900">{r.title}</div>
            {r.jobCompany ? <div className="text-xs text-slate-500">{r.jobCompany}</div> : null}
          </div>
        )
      },
      {
        key: "location",
        label: "Location",
        render: (r: AdminJobItem) => r.jobLocation ?? "—"
      },
      {
        key: "type",
        label: "Type",
        render: (r: AdminJobItem) => r.jobEmploymentType?.replace(/_/g, " ") ?? "—"
      },
      {
        key: "author",
        label: "Posted by",
        render: (r: AdminJobItem) => (
          <div>
            <div>{r.author.fullName}</div>
            <div className="text-xs text-slate-500">{r.author.email}</div>
          </div>
        )
      },
      {
        key: "interests",
        label: "Interests",
        render: (r: AdminJobItem) => r.interestCount
      },
      {
        key: "status",
        label: "Status",
        render: (r: AdminJobItem) => <StatusBadge status={r.jobStatus} />
      },
      {
        key: "createdAt",
        label: "Posted",
        render: (r: AdminJobItem) => new Date(r.createdAt).toLocaleDateString()
      },
      {
        key: "actions",
        label: "Actions",
        render: (r: AdminJobItem) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewing(r)}
              className="text-sm font-medium text-primary hover:underline"
            >
              View
            </button>
            {r.jobStatus !== "CLOSED" ? (
              <button
                type="button"
                onClick={() => setConfirm({ type: "close", job: r })}
                className="text-sm font-medium text-amber-700 hover:underline"
              >
                Close
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm({ type: "reopen", job: r })}
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Reopen
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirm({ type: "delete", job: r })}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              Delete
            </button>
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
          <h2 className="text-xl font-semibold text-slate-900">Job Portal Moderation</h2>
          <p className="mt-1 text-sm text-slate-600">
            Review community job listings, close spam, or remove abusive posts.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800">
            Open: {counts?.open ?? 0}
          </span>
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
            Closed: {counts?.closed ?? 0}
          </span>
          <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-800">
            All: {counts?.all ?? 0}
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as "open" | "closed" | "all");
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
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
          placeholder="Search title, company, location…"
          className="min-w-[240px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setSearchQ(searchDraft.trim());
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Search
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading jobs…
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load jobs."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns as any}
          data={(data?.jobs ?? []) as any}
          keyExtractor={(r) => (r as AdminJobItem).id}
          emptyMessage="No job listings found."
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

      {viewing ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{viewing.title}</h3>
                <p className="text-sm text-slate-500">{viewing.jobCompany ?? "No company"}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-slate-700">Status</dt>
                <dd>
                  <StatusBadge status={viewing.jobStatus} />
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Location</dt>
                <dd className="text-slate-600">{viewing.jobLocation ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Employment</dt>
                <dd className="text-slate-600">
                  {viewing.jobEmploymentType?.replace(/_/g, " ") ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Salary</dt>
                <dd className="text-slate-600">
                  {viewing.jobSalaryMin != null || viewing.jobSalaryMax != null
                    ? `₹${viewing.jobSalaryMin?.toLocaleString("en-IN") ?? "—"} – ₹${
                        viewing.jobSalaryMax?.toLocaleString("en-IN") ?? "—"
                      }`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Poster</dt>
                <dd className="text-slate-600">
                  {viewing.author.fullName} · {viewing.author.email}
                  {viewing.author.mobile ? ` · ${viewing.author.mobile}` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Interests</dt>
                <dd className="text-slate-600">{viewing.interestCount}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Description</dt>
                <dd className="whitespace-pre-wrap text-slate-600">
                  {viewing.description || "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(confirm)}
        title={
          confirm?.type === "delete"
            ? "Delete job listing?"
            : confirm?.type === "close"
              ? "Close job listing?"
              : "Reopen job listing?"
        }
        message={
          confirm?.type === "delete"
            ? `Permanently delete “${confirm.job.title}”? This cannot be undone.`
            : confirm?.type === "close"
              ? `Close “${confirm?.job.title}”? The poster will be notified.`
              : `Reopen “${confirm?.job.title}”?`
        }
        confirmLabel={
          confirm?.type === "delete" ? "Delete" : confirm?.type === "close" ? "Close job" : "Reopen"
        }
        variant={confirm?.type === "delete" || confirm?.type === "close" ? "danger" : "default"}
        confirmDisabled={mutationPending}
        onCancel={() => {
          if (!mutationPending) setConfirm(null);
        }}
        onConfirm={() => {
          if (!confirm || mutationPending) return;
          if (confirm.type === "close") closeMutation.mutate(confirm.job.id);
          else if (confirm.type === "reopen") reopenMutation.mutate(confirm.job.id);
          else deleteMutation.mutate(confirm.job.id);
        }}
      />
    </div>
  );
}
