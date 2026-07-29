import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addAdminJobNote, getAdminJobDetail, updateAdminApplication, updateAdminJob } from "../api/jobsAdmin";
import { StatusBadge } from "../components/StatusBadge";
import { AdminListError, AdminTableSkeleton } from "../components/admin/AdminListControls";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export function JobDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const jobId = Number(id);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { hasAction } = useAuth();
  const canManage = hasAction("jobs.manage");
  const editMode = searchParams.get("edit") === "1" && canManage;
  const [note, setNote] = useState("");
  const [noteKind, setNoteKind] = useState<"internal" | "admin">("internal");
  const [applicationUpdates, setApplicationUpdates] = useState<Record<number, { status: string; adminNotes: string }>>({});

  const detail = useQuery({
    queryKey: ["job-detail", jobId],
    queryFn: () => getAdminJobDetail(jobId),
    enabled: Number.isFinite(jobId) && jobId > 0
  });

  const saveJobMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateAdminJob(jobId, payload as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
      queryClient.invalidateQueries({ queryKey: ["admin-jobs-v2"] });
      addToast("Job updated.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to update job", "error")
  });

  const noteMutation = useMutation({
    mutationFn: () => addAdminJobNote(jobId, noteKind, note),
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
      addToast("Note added.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to add note", "error")
  });

  const updateApplicationMutation = useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: number; status: string; adminNotes: string }) =>
      updateAdminApplication(id, { status, adminNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      addToast("Application updated.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to update application", "error")
  });

  const form = useMemo(() => {
    const job = detail.data?.job;
    return {
      title: job?.title ?? "",
      description: job?.description ?? "",
      jobCompany: job?.jobCompany ?? "",
      jobCategory: job?.jobCategory ?? "",
      jobLocation: job?.jobLocation ?? "",
      jobEmploymentType: job?.jobEmploymentType ?? "",
      jobWorkMode: job?.jobWorkMode ?? "",
      jobExperience: job?.jobExperience ?? "",
      jobSkills: (job?.jobSkills ?? []).join(", "),
      jobSalaryMin: job?.jobSalaryMin ?? "",
      jobSalaryMax: job?.jobSalaryMax ?? "",
      jobVacancies: job?.jobVacancies ?? "",
      jobApplicationDeadline: job?.jobApplicationDeadline ? job.jobApplicationDeadline.slice(0, 16) : ""
    };
  }, [detail.data]);
  const [draft, setDraft] = useState(form);
  useEffect(() => {
    setDraft(form);
  }, [form]);

  if (detail.isLoading) return <AdminTableSkeleton rows={8} cols={6} />;
  if (detail.isError || !detail.data) {
    return <AdminListError message={detail.error instanceof Error ? detail.error.message : "Failed to load job detail."} onRetry={() => void detail.refetch()} />;
  }

  const data = detail.data;
  const setDraftField = (key: keyof typeof form, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-slate-900">{data.job.title}</h2>
            <StatusBadge status={data.job.currentStatus} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {data.job.jobCompany ?? "No company"} • {data.employer.fullName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/job-portal" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
            Back to Jobs
          </Link>
          <Link to={`/job-portal/applications?jobId=${data.job.id}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
            View Applications
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {[
          ["Applications", data.stats.applications],
          ["Views", data.stats.views],
          ["Shortlisted", data.stats.shortlisted],
          ["Rejected", data.stats.rejected],
          ["Selected", data.stats.selected]
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Job Information</h3>
              {editMode ? <span className="text-xs font-medium uppercase text-primary">Edit mode</span> : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title" value={draft.title} editable={editMode} onChange={(v) => setDraftField("title", v)} />
              <Field label="Company" value={draft.jobCompany} editable={editMode} onChange={(v) => setDraftField("jobCompany", v)} />
              <Field label="Category" value={draft.jobCategory} editable={editMode} onChange={(v) => setDraftField("jobCategory", v)} />
              <Field label="Employment Type" value={draft.jobEmploymentType} editable={editMode} onChange={(v) => setDraftField("jobEmploymentType", v)} />
              <Field label="Work Mode" value={draft.jobWorkMode} editable={editMode} onChange={(v) => setDraftField("jobWorkMode", v)} />
              <Field label="Experience" value={draft.jobExperience} editable={editMode} onChange={(v) => setDraftField("jobExperience", v)} />
              <Field label="Location" value={draft.jobLocation} editable={editMode} onChange={(v) => setDraftField("jobLocation", v)} />
              <Field label="Vacancies" value={String(draft.jobVacancies)} editable={editMode} onChange={(v) => setDraftField("jobVacancies", v)} />
              <Field label="Salary Min" value={String(draft.jobSalaryMin)} editable={editMode} onChange={(v) => setDraftField("jobSalaryMin", v)} />
              <Field label="Salary Max" value={String(draft.jobSalaryMax)} editable={editMode} onChange={(v) => setDraftField("jobSalaryMax", v)} />
              <Field label="Application Deadline" value={draft.jobApplicationDeadline} editable={editMode} onChange={(v) => setDraftField("jobApplicationDeadline", v)} />
              <Field label="Skills" value={draft.jobSkills} editable={editMode} onChange={(v) => setDraftField("jobSkills", v)} />
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              {editMode ? (
                <textarea value={draft.description} onChange={(e) => setDraftField("description", e.target.value)} className="min-h-[140px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              ) : (
                <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{data.job.description || "—"}</p>
              )}
            </div>
            {editMode ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() =>
                    saveJobMutation.mutate({
                      ...draft,
                      jobSkills: draft.jobSkills.split(",").map((item) => item.trim()).filter(Boolean),
                      jobSalaryMin: draft.jobSalaryMin === "" ? null : Number(draft.jobSalaryMin),
                      jobSalaryMax: draft.jobSalaryMax === "" ? null : Number(draft.jobSalaryMax),
                      jobVacancies: draft.jobVacancies === "" ? null : Number(draft.jobVacancies),
                      jobApplicationDeadline: draft.jobApplicationDeadline || null
                    })
                  }
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
                >
                  Save Job
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">Recent Applications</h3>
            <div className="mt-4 space-y-3">
              {data.applications.length === 0 ? (
                <p className="text-sm text-slate-500">No applications yet.</p>
              ) : (
                data.applications.map((application) => {
                  const state = applicationUpdates[application.id] ?? { status: application.status, adminNotes: application.adminNotes ?? "" };
                  return (
                    <div key={application.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-900">{application.applicantName}</div>
                          <div className="text-xs text-slate-500">{application.applicantEmail}{application.applicantMobile ? ` • ${application.applicantMobile}` : ""}</div>
                        </div>
                        <StatusBadge status={state.status} />
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr_auto]">
                        <select
                          value={state.status}
                          disabled={!canManage}
                          onChange={(e) => setApplicationUpdates((prev) => ({ ...prev, [application.id]: { ...state, status: e.target.value } }))}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                        >
                          {["APPLIED", "REVIEWED", "SHORTLISTED", "REJECTED", "SELECTED", "WITHDRAWN", "INTERVIEW_SCHEDULED"].map((value) => (
                            <option key={value} value={value}>{value.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                        <input
                          value={state.adminNotes}
                          disabled={!canManage}
                          onChange={(e) => setApplicationUpdates((prev) => ({ ...prev, [application.id]: { ...state, adminNotes: e.target.value } }))}
                          placeholder="Application notes"
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                        />
                        {canManage ? (
                          <button type="button" onClick={() => updateApplicationMutation.mutate({ id: application.id, status: state.status, adminNotes: state.adminNotes })} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                            Update
                          </button>
                        ) : null}
                      </div>
                      {application.message ? <p className="mt-3 text-sm text-slate-600">{application.message}</p> : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">Employer Information</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label="Employer" value={data.employer.fullName} />
              <InfoRow label="Email" value={data.employer.email} />
              <InfoRow label="Mobile" value={data.employer.mobile ?? "—"} />
              <InfoRow label="Status" value={data.job.currentStatus} badge />
              <InfoRow label="Created" value={new Date(data.job.createdAt).toLocaleString()} />
              <InfoRow label="Updated" value={new Date(data.job.updatedAt).toLocaleString()} />
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">Internal Notes</h3>
            {canManage ? (
              <div className="mt-4 flex gap-2">
                <select value={noteKind} onChange={(e) => setNoteKind(e.target.value as any)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="internal">Internal</option>
                  <option value="admin">Admin</option>
                </select>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add note..." className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button type="button" onClick={() => noteMutation.mutate()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
                  Add
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">View only — jobs.manage required to add notes.</p>
            )}
            <div className="mt-4 space-y-3">
              {data.notes.map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase text-slate-500">{item.kind}</span>
                    <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{item.note}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.author}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">Timeline</h3>
            <div className="mt-4 space-y-3">
              {data.timeline.map((item) => (
                <div key={item.id} className="border-l-2 border-slate-200 pl-4">
                  <div className="text-sm font-medium text-slate-900">{item.action.replace(/_/g, " ")}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString()}
                    {item.actorEmail ? ` • ${item.actorEmail}` : ""}
                  </div>
                  {item.note ? <div className="mt-1 text-sm text-slate-600">{item.note}</div> : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, editable, onChange }: { label: string; value: string; editable?: boolean; onChange?: (value: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {editable ? (
        <input value={value} onChange={(e) => onChange?.(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      ) : (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{value || "—"}</div>
      )}
    </div>
  );
}

function InfoRow({ label, value, badge = false }: { label: string; value: string; badge?: boolean }) {
  return (
    <div>
      <dt className="font-medium text-slate-600">{label}</dt>
      <dd className="mt-1">{badge ? <StatusBadge status={value} /> : <span className="text-slate-800">{value}</span>}</dd>
    </div>
  );
}
