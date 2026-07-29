import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeAdminJob,
  deleteAdminJob,
  getJobsOverview,
  hideAdminJob,
  listAdminJobs,
  reopenAdminJob,
  restoreAdminJob,
  softDeleteAdminJob,
  type AdminJobItem
} from "../api/jobsAdmin";
import { ConfirmModal } from "../components/ConfirmModal";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { AdminListError, AdminPagination, AdminTableSkeleton } from "../components/admin/AdminListControls";
import { useToast } from "../context/ToastContext";

type ActionType = "close" | "reopen" | "hide" | "restore" | "soft-delete" | "hard-delete";

const actionLabels: Record<ActionType, string> = {
  close: "Close job?",
  reopen: "Reopen job?",
  hide: "Hide job?",
  restore: "Restore job?",
  "soft-delete": "Soft delete job?",
  "hard-delete": "Permanently delete job?"
};

export function JobPortalPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [status, setStatus] = useState<"active" | "closed" | "hidden" | "deleted" | "expired" | "all">("active");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [category, setCategory] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [confirm, setConfirm] = useState<{ type: ActionType; job: AdminJobItem } | null>(null);

  const overview = useQuery({
    queryKey: ["jobs-overview"],
    queryFn: getJobsOverview
  });

  const jobsQuery = useQuery({
    queryKey: ["admin-jobs-v2", page, limit, status, searchQ, category, company, location, sortBy, sortDir],
    queryFn: () =>
      listAdminJobs(page, limit, status, searchQ || undefined, {
        category: category || undefined,
        company: company || undefined,
        location: location || undefined,
        sortBy,
        sortDir
      })
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-jobs-v2"] });
    queryClient.invalidateQueries({ queryKey: ["jobs-overview"] });
  };

  const actionMutation = useMutation({
    mutationFn: async ({ type, id }: { type: ActionType; id: number }) => {
      if (type === "close") return closeAdminJob(id);
      if (type === "reopen") return reopenAdminJob(id);
      if (type === "hide") return hideAdminJob(id);
      if (type === "restore") return restoreAdminJob(id);
      if (type === "soft-delete") return softDeleteAdminJob(id);
      return deleteAdminJob(id);
    },
    onSuccess: (_, variables) => {
      invalidate();
      setConfirm(null);
      addToast(`${variables.type.replace("-", " ")} completed.`, "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Action failed", "error")
  });

  const columns = useMemo(
    () => [
      { key: "id", label: "Job ID", sortable: true },
      {
        key: "title",
        label: "Job",
        sortable: true,
        render: (row: AdminJobItem) => (
          <div className="min-w-[220px]">
            <div className="font-medium text-slate-900">{row.title}</div>
            <div className="text-xs text-slate-500">{row.jobCompany ?? "No company"}</div>
          </div>
        )
      },
      { key: "jobCategory", label: "Category", render: (row: AdminJobItem) => row.jobCategory ?? "—" },
      {
        key: "author",
        label: "Employer",
        render: (row: AdminJobItem) => (
          <div className="min-w-[180px]">
            <div>{row.author.fullName}</div>
            <div className="text-xs text-slate-500">{row.author.mobile ?? row.author.email}</div>
          </div>
        )
      },
      { key: "jobEmploymentType", label: "Employment", render: (row: AdminJobItem) => row.jobEmploymentType?.replace(/_/g, " ") ?? "—" },
      { key: "jobLocation", label: "Location", render: (row: AdminJobItem) => row.jobLocation ?? "—" },
      { key: "applicationCount", label: "Applications", sortable: true, render: (row: AdminJobItem) => row.applicationCount },
      { key: "viewCount", label: "Views", sortable: true, render: (row: AdminJobItem) => row.viewCount },
      {
        key: "currentStatus",
        label: "Status",
        render: (row: AdminJobItem) => <StatusBadge status={row.currentStatus} />
      },
      { key: "createdAt", label: "Created", sortable: true, render: (row: AdminJobItem) => new Date(row.createdAt).toLocaleDateString() },
      { key: "jobApplicationDeadline", label: "Expiry", render: (row: AdminJobItem) => row.jobApplicationDeadline ? new Date(row.jobApplicationDeadline).toLocaleDateString() : "—" },
      {
        key: "actions",
        label: "Actions",
        render: (row: AdminJobItem) => (
          <div className="flex min-w-[220px] flex-wrap gap-2">
            <Link to={`/job-portal/${row.id}`} className="text-sm font-medium text-primary hover:underline">
              View
            </Link>
            <Link to={`/job-portal/${row.id}?edit=1`} className="text-sm font-medium text-slate-700 hover:underline">
              Edit
            </Link>
            <Link to={`/job-portal/applications?jobId=${row.id}`} className="text-sm font-medium text-slate-700 hover:underline">
              Applications
            </Link>
            {row.jobStatus === "CLOSED" ? (
              <button type="button" onClick={() => setConfirm({ type: "reopen", job: row })} className="text-sm font-medium text-emerald-700 hover:underline">
                Reopen
              </button>
            ) : (
              <button type="button" onClick={() => setConfirm({ type: "close", job: row })} className="text-sm font-medium text-amber-700 hover:underline">
                Close
              </button>
            )}
            {row.currentStatus === "HIDDEN" || row.currentStatus === "SOFT_DELETED" ? (
              <button type="button" onClick={() => setConfirm({ type: "restore", job: row })} className="text-sm font-medium text-emerald-700 hover:underline">
                Restore
              </button>
            ) : (
              <button type="button" onClick={() => setConfirm({ type: "hide", job: row })} className="text-sm font-medium text-slate-700 hover:underline">
                Hide
              </button>
            )}
            <button type="button" onClick={() => setConfirm({ type: "soft-delete", job: row })} className="text-sm font-medium text-red-600 hover:underline">
              Soft Delete
            </button>
            <button type="button" onClick={() => setConfirm({ type: "hard-delete", job: row })} className="text-sm font-medium text-red-700 hover:underline">
              Permanent Delete
            </button>
          </div>
        )
      }
    ],
    []
  );

  const cards = overview.data?.cards;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Jobs Dashboard</h2>
            <p className="mt-1 text-sm text-slate-600">
              Recruitment operations built on top of the existing jobs publishing flow.
            </p>
          </div>
          <Link to="/job-portal/applications" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
            Open Applications
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Total Jobs", cards?.totalJobs ?? 0],
            ["Active Jobs", cards?.activeJobs ?? 0],
            ["Closed Jobs", cards?.closedJobs ?? 0],
            ["Hidden Jobs", cards?.hiddenJobs ?? 0],
            ["Deleted Jobs", cards?.deletedJobs ?? 0],
            ["Expired Jobs", cards?.expiredJobs ?? 0],
            ["Today's Jobs", cards?.todaysJobs ?? 0],
            ["Applications", cards?.applications ?? 0],
            ["Open Positions", cards?.openPositions ?? 0]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{label}</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <SummaryList
            title="Recent Jobs"
            items={(overview.data?.recentJobs ?? []).map((item) => ({
              primary: item.title,
              secondary: `${item.company ?? "No company"} • ${item.status}`
            }))}
          />
          <SummaryList
            title="Top Companies"
            items={(overview.data?.topCompanies ?? []).map((item) => ({
              primary: item.name,
              secondary: `${item.count} jobs`
            }))}
          />
          <SummaryList
            title="Top Categories"
            items={(overview.data?.topCategories ?? []).map((item) => ({
              primary: item.name,
              secondary: `${item.count} jobs`
            }))}
          />
        </div>
      </div>

      <div className="sticky top-16 z-20 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-6">
          <input value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder="Search by ID, title, employer, applicant..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm lg:col-span-2" />
          <select value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="hidden">Hidden</option>
            <option value="deleted">Deleted</option>
            <option value="expired">Expired</option>
            <option value="all">All</option>
          </select>
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="createdAt">Newest</option>
            <option value="updatedAt">Recently Updated</option>
            <option value="applications">Applications</option>
            <option value="views">Views</option>
            <option value="company">Company</option>
            <option value="title">Title</option>
            <option value="deadline">Deadline</option>
          </select>
          <select value={sortDir} onChange={(e) => setSortDir(e.target.value as any)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          <button type="button" onClick={() => { setPage(1); setSearchQ(searchDraft.trim()); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
            Apply Filters
          </button>
          <button type="button" onClick={() => { setSearchDraft(""); setSearchQ(""); setCategory(""); setCompany(""); setLocation(""); setStatus("active"); setSortBy("createdAt"); setSortDir("desc"); setPage(1); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
            Reset
          </button>
        </div>
      </div>

      {jobsQuery.isLoading && !jobsQuery.data ? (
        <AdminTableSkeleton rows={10} cols={10} />
      ) : jobsQuery.isError ? (
        <AdminListError message={jobsQuery.error instanceof Error ? jobsQuery.error.message : "Failed to load jobs."} onRetry={() => void jobsQuery.refetch()} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <DataTable
            columns={columns as any}
            data={(jobsQuery.data?.jobs ?? []) as any}
            keyExtractor={(row) => (row as AdminJobItem).id}
            emptyMessage="No jobs found for the current filters."
          />
          <AdminPagination page={page} limit={limit} total={jobsQuery.data?.total ?? 0} onPageChange={setPage} onLimitChange={setLimit} />
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm ? actionLabels[confirm.type] : "Confirm action"}
        message={confirm ? `${confirm.type.replace("-", " ")} “${confirm.job.title}”?` : ""}
        confirmLabel={confirm?.type === "hard-delete" ? "Delete permanently" : "Confirm"}
        variant={confirm?.type === "reopen" || confirm?.type === "restore" ? "default" : "danger"}
        confirmDisabled={actionMutation.isPending}
        onCancel={() => !actionMutation.isPending && setConfirm(null)}
        onConfirm={() => {
          if (!confirm || actionMutation.isPending) return;
          actionMutation.mutate({ type: confirm.type, id: confirm.job.id });
        }}
      />
    </div>
  );
}

function SummaryList({
  title,
  items
}: {
  title: string;
  items: Array<{ primary: string; secondary: string }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No data yet.</p>
        ) : (
          items.map((item, index) => (
            <div key={`${item.primary}-${index}`} className="rounded-lg bg-white px-3 py-2">
              <div className="text-sm font-medium text-slate-900">{item.primary}</div>
              <div className="text-xs text-slate-500">{item.secondary}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
