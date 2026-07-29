import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdminApplications, updateAdminApplication, type AdminApplicationItem } from "../api/jobsAdmin";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { AdminListError, AdminPagination, AdminTableSkeleton } from "../components/admin/AdminListControls";
import { useToast } from "../context/ToastContext";

export function JobApplicationsPage() {
  const [params] = useSearchParams();
  const initialJobId = params.get("jobId") ?? "";
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [status, setStatus] = useState("all");
  const [searchDraft, setSearchDraft] = useState(initialJobId);
  const [searchQ, setSearchQ] = useState(initialJobId);

  const applications = useQuery({
    queryKey: ["job-applications", page, limit, status, searchQ],
    queryFn: () => listAdminApplications(page, limit, status, searchQ || undefined)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateAdminApplication(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["job-detail"] });
      addToast("Application status updated.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to update application", "error")
  });

  const columns = useMemo(
    () => [
      { key: "id", label: "Application ID" },
      {
        key: "applicant",
        label: "Applicant",
        render: (row: AdminApplicationItem) => (
          <div className="min-w-[180px]">
            <div className="font-medium text-slate-900">{row.applicant.fullName}</div>
            <div className="text-xs text-slate-500">{row.applicant.mobile ?? row.applicant.email}</div>
          </div>
        )
      },
      {
        key: "job",
        label: "Job",
        render: (row: AdminApplicationItem) => (
          <div className="min-w-[220px]">
            <div className="font-medium text-slate-900">{row.job.title}</div>
            <div className="text-xs text-slate-500">{row.job.company ?? "No company"}</div>
          </div>
        )
      },
      { key: "employer", label: "Employer", render: (row: AdminApplicationItem) => row.employer.fullName },
      { key: "createdAt", label: "Applied Date", render: (row: AdminApplicationItem) => new Date(row.createdAt).toLocaleString() },
      { key: "status", label: "Status", render: (row: AdminApplicationItem) => <StatusBadge status={row.status} /> },
      { key: "resume", label: "Resume", render: (row: AdminApplicationItem) => row.resumeUrl ? <a href={row.resumeUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a> : "—" },
      { key: "notes", label: "Notes", render: (row: AdminApplicationItem) => row.adminNotes ?? row.message ?? "—" },
      {
        key: "actions",
        label: "Actions",
        render: (row: AdminApplicationItem) => (
          <div className="flex min-w-[220px] flex-wrap gap-2">
            <Link to={`/job-portal/${row.job.id}`} className="text-sm font-medium text-primary hover:underline">
              View Job
            </Link>
            <button type="button" onClick={() => updateMutation.mutate({ id: row.id, status: "SHORTLISTED" })} className="text-sm font-medium text-emerald-700 hover:underline">
              Shortlist
            </button>
            <button type="button" onClick={() => updateMutation.mutate({ id: row.id, status: "REJECTED" })} className="text-sm font-medium text-red-600 hover:underline">
              Reject
            </button>
            <button type="button" onClick={() => updateMutation.mutate({ id: row.id, status: "SELECTED" })} className="text-sm font-medium text-slate-700 hover:underline">
              Select
            </button>
          </div>
        )
      }
    ],
    [updateMutation]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Job Applications</h2>
          <p className="mt-1 text-sm text-slate-600">
            One row per application, powered by the existing `job_interests` workflow.
          </p>
        </div>
        <Link to="/job-portal" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
          Back to Jobs
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <input value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder="Search by job, employer, applicant, mobile..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            {["APPLIED", "REVIEWED", "SHORTLISTED", "REJECTED", "SELECTED", "WITHDRAWN", "INTERVIEW_SCHEDULED"].map((item) => (
              <option key={item} value={item}>{item.replace(/_/g, " ")}</option>
            ))}
          </select>
          <button type="button" onClick={() => { setSearchQ(searchDraft.trim()); setPage(1); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
            Search
          </button>
        </div>
      </div>

      {applications.isLoading && !applications.data ? (
        <AdminTableSkeleton rows={10} cols={8} />
      ) : applications.isError ? (
        <AdminListError message={applications.error instanceof Error ? applications.error.message : "Failed to load applications."} onRetry={() => void applications.refetch()} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <DataTable
            columns={columns as any}
            data={(applications.data?.items ?? []) as any}
            keyExtractor={(row) => (row as AdminApplicationItem).id}
            emptyMessage="No applications found."
          />
          <AdminPagination page={page} limit={limit} total={applications.data?.total ?? 0} onPageChange={setPage} onLimitChange={setLimit} />
        </div>
      )}
    </div>
  );
}
