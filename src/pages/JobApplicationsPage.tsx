import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdminApplications, updateAdminApplication, type AdminApplicationItem } from "../api/jobsAdmin";
import { ConfirmModal } from "../components/ConfirmModal";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { AdminListError, AdminPagination, AdminTableSkeleton } from "../components/admin/AdminListControls";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

type StatusConfirm = {
  id: number;
  status: "REJECTED" | "SELECTED";
  label: string;
};

function parseJobIdFromParams(params: URLSearchParams): number | undefined {
  const raw = params.get("jobId");
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n > 0 ? n : undefined;
}

export function JobApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const jobIdFilter = parseJobIdFromParams(params);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { hasAction } = useAuth();
  const canManage = hasAction("jobs.manage");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [status, setStatus] = useState("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [statusConfirm, setStatusConfirm] = useState<StatusConfirm | null>(null);
  const [statusNote, setStatusNote] = useState("");

  const applications = useQuery({
    queryKey: ["job-applications", page, limit, status, searchQ, jobIdFilter],
    queryFn: () => listAdminApplications(page, limit, status, searchQ || undefined, jobIdFilter)
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      note
    }: {
      id: number;
      status: string;
      note?: string;
    }) => updateAdminApplication(id, { status, note: note?.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["job-detail"] });
      setStatusConfirm(null);
      setStatusNote("");
      addToast("Application status updated.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to update application", "error")
  });

  const clearJobFilter = () => {
    const next = new URLSearchParams(params);
    next.delete("jobId");
    setParams(next, { replace: true });
    setPage(1);
  };

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
      {
        key: "resume",
        label: "Resume",
        render: (row: AdminApplicationItem) =>
          row.resumeUrl ? (
            <a href={row.resumeUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Open
            </a>
          ) : (
            "—"
          )
      },
      { key: "notes", label: "Notes", render: (row: AdminApplicationItem) => row.adminNotes ?? row.message ?? "—" },
      {
        key: "actions",
        label: "Actions",
        render: (row: AdminApplicationItem) => (
          <div className="flex min-w-[220px] flex-wrap items-center gap-2">
            <Link to={`/job-portal/${row.job.id}`} className="text-sm font-medium text-primary hover:underline">
              View Job
            </Link>
            {canManage ? (
              <>
                <button
                  type="button"
                  onClick={() => updateMutation.mutate({ id: row.id, status: "SHORTLISTED" })}
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  Shortlist
                </button>
                <button
                  type="button"
                  onClick={() => setStatusConfirm({ id: row.id, status: "REJECTED", label: "Reject" })}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => setStatusConfirm({ id: row.id, status: "SELECTED", label: "Select" })}
                  className="text-sm font-medium text-slate-700 hover:underline"
                >
                  Select
                </button>
              </>
            ) : null}
          </div>
        )
      }
    ],
    [canManage, updateMutation]
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

      {jobIdFilter != null ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm text-slate-800">
            Filtered to job #{jobIdFilter}
            <button type="button" onClick={clearJobFilter} className="font-medium text-primary hover:underline">
              Clear
            </button>
          </span>
          <Link to={`/job-portal/${jobIdFilter}`} className="text-sm font-medium text-primary hover:underline">
            Open job detail
          </Link>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search by job, employer, applicant, mobile..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {["APPLIED", "REVIEWED", "SHORTLISTED", "REJECTED", "SELECTED", "WITHDRAWN", "INTERVIEW_SCHEDULED"].map((item) => (
              <option key={item} value={item}>
                {item.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setSearchQ(searchDraft.trim());
              setPage(1);
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Search
          </button>
        </div>
      </div>

      {applications.isLoading && !applications.data ? (
        <AdminTableSkeleton rows={10} cols={8} />
      ) : applications.isError ? (
        <AdminListError
          message={applications.error instanceof Error ? applications.error.message : "Failed to load applications."}
          onRetry={() => void applications.refetch()}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <DataTable
            columns={columns as any}
            data={(applications.data?.items ?? []) as any}
            keyExtractor={(row) => (row as AdminApplicationItem).id}
            emptyMessage="No applications found."
          />
          <AdminPagination
            page={page}
            limit={limit}
            total={applications.data?.total ?? 0}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </div>
      )}

      <ConfirmModal
        open={Boolean(statusConfirm)}
        title={statusConfirm ? `${statusConfirm.label} application?` : "Confirm"}
        message={statusConfirm ? `This will mark the application as ${statusConfirm.status.replace(/_/g, " ").toLowerCase()}.` : ""}
        confirmLabel={statusConfirm?.label ?? "Confirm"}
        variant={statusConfirm?.status === "REJECTED" ? "danger" : "default"}
        confirmDisabled={updateMutation.isPending}
        onCancel={() => {
          if (updateMutation.isPending) return;
          setStatusConfirm(null);
          setStatusNote("");
        }}
        onConfirm={() => {
          if (!statusConfirm || updateMutation.isPending) return;
          updateMutation.mutate({
            id: statusConfirm.id,
            status: statusConfirm.status,
            note: statusNote.trim() || undefined
          });
        }}
      >
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Note (optional)
          <input
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="Reason or internal note for audit log"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </ConfirmModal>
    </div>
  );
}
