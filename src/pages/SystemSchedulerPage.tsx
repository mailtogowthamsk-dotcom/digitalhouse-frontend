import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import {
  disableSchedulerJob,
  enableSchedulerJob,
  getSchedulerDashboard,
  getSchedulerJob,
  listSchedulerJobs,
  retrySchedulerJob,
  runSchedulerJobNow,
  type SchedulerJobDetail,
  type SchedulerJobSummary,
  type SchedulerRun
} from "../api/schedulerAdmin";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    RUNNING: "bg-sky-100 text-sky-800",
    IDLE: "bg-emerald-100 text-emerald-800",
    DISABLED: "bg-slate-100 text-slate-600",
    FAILED: "bg-rose-100 text-rose-800",
    SUCCESS: "bg-emerald-100 text-emerald-800",
    FAILURE: "bg-rose-100 text-rose-800",
    SKIPPED: "bg-amber-100 text-amber-800"
  };
  return map[status] || "bg-slate-100 text-slate-700";
}

function formatTs(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function HealthPill({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tone || "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function JobActions({
  job,
  onDone
}: {
  job: SchedulerJobSummary | SchedulerJobDetail;
  onDone?: () => void;
}) {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const { hasAction } = useAuth();
  const canManage = hasAction("system_scheduler.manage");

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["scheduler"] });
    onDone?.();
  };

  const runMut = useMutation({
    mutationFn: () => runSchedulerJobNow(job.jobKey),
    onSuccess: () => {
      addToast("Job run completed.", "success");
      invalidate();
    },
    onError: (e: Error) => addToast(e.message || "Run failed", "error")
  });
  const enableMut = useMutation({
    mutationFn: () => enableSchedulerJob(job.jobKey),
    onSuccess: () => {
      addToast("Job enabled.", "success");
      invalidate();
    },
    onError: (e: Error) => addToast(e.message || "Enable failed", "error")
  });
  const disableMut = useMutation({
    mutationFn: () => disableSchedulerJob(job.jobKey),
    onSuccess: () => {
      addToast("Job disabled (automatic ticks skipped).", "success");
      invalidate();
    },
    onError: (e: Error) => addToast(e.message || "Disable failed", "error")
  });
  const retryMut = useMutation({
    mutationFn: () => retrySchedulerJob(job.jobKey),
    onSuccess: () => {
      addToast("Retry completed.", "success");
      invalidate();
    },
    onError: (e: Error) => addToast(e.message || "Retry failed", "error")
  });

  const busy =
    runMut.isPending || enableMut.isPending || disableMut.isPending || retryMut.isPending;

  if (!canManage) {
    return <span className="text-xs text-slate-400">View only</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={busy || job.running}
        onClick={() => runMut.mutate()}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        Run Now
      </button>
      {job.enabled ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => disableMut.mutate()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Disable
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => enableMut.mutate()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Enable
        </button>
      )}
      {(job.status === "FAILED" || job.failureCount > 0) && (
        <button
          type="button"
          disabled={busy || job.running}
          onClick={() => retryMut.mutate()}
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50"
        >
          Retry Failed
        </button>
      )}
    </div>
  );
}

function RunsTable({ runs }: { runs: SchedulerRun[] }) {
  if (!runs.length) {
    return <p className="text-sm text-slate-500">No runs recorded yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Started</th>
            <th className="px-3 py-2">Finished</th>
            <th className="px-3 py-2">Duration</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Trigger</th>
            <th className="px-3 py-2">Records</th>
            <th className="px-3 py-2">By / Error</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className="px-3 py-2 whitespace-nowrap">{formatTs(r.startedAt)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{formatTs(r.finishedAt)}</td>
              <td className="px-3 py-2">{r.durationLabel || "—"}</td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(r.status)}`}>
                  {r.status}
                </span>
              </td>
              <td className="px-3 py-2 capitalize">{r.triggerType}</td>
              <td className="px-3 py-2">{r.recordsProcessed}</td>
              <td className="px-3 py-2 max-w-xs truncate text-slate-600" title={r.error || r.executedBy || ""}>
                {r.error || r.executedBy || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SystemSchedulerDetailPage() {
  const { jobKey = "" } = useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["scheduler", "job", jobKey],
    queryFn: () => getSchedulerJob(jobKey),
    enabled: !!jobKey,
    refetchInterval: 15_000
  });

  if (isLoading) return <div className="text-slate-600">Loading job…</div>;
  if (error || !data?.job) {
    return (
      <div>
        <p className="text-red-600">Failed to load job.</p>
        <Link to="/system-scheduler" className="mt-2 inline-block text-sm text-primary">
          ← Back to System Scheduler
        </Link>
      </div>
    );
  }

  const job = data.job;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/system-scheduler" className="text-sm text-slate-500 hover:text-primary">
            ← System Scheduler
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{job.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{job.description}</p>
        </div>
        <JobActions job={job} onDone={() => void refetch()} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Module", job.module],
          ["Schedule", job.schedule],
          ["Cron Expression", job.cronExpression || "Interval-based (not cron)"],
          ["File", job.file],
          ["Last Execution", formatTs(job.lastExecution)],
          ["Next Execution", formatTs(job.nextExecution)],
          ["Runtime", job.runtime || "—"],
          ["Average Runtime", job.averageRuntime || "—"],
          ["Status", job.status],
          ["Success / Failure", `${job.successCount} / ${job.failureCount}`],
          ["Last Error", job.lastError || "—"]
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 break-all text-sm font-medium text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Success History</h3>
        <RunsTable runs={job.successHistory} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Failure History</h3>
        <RunsTable runs={job.failureHistory} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Recent Logs</h3>
        <RunsTable runs={job.recentLogs} />
      </div>
    </div>
  );
}

export function SystemSchedulerPage() {
  const dash = useQuery({
    queryKey: ["scheduler", "dashboard"],
    queryFn: getSchedulerDashboard,
    refetchInterval: 20_000
  });
  const jobsQ = useQuery({
    queryKey: ["scheduler", "jobs"],
    queryFn: listSchedulerJobs,
    refetchInterval: 15_000
  });

  if (dash.isLoading || jobsQ.isLoading) {
    return <div className="text-slate-600">Loading System Scheduler…</div>;
  }
  if (dash.error || jobsQ.error) {
    return (
      <div className="text-red-600">
        Failed to load scheduler. Ensure migration ran:{" "}
        <code className="text-sm">npm run db:run-system-scheduler-sql</code>
      </div>
    );
  }

  const cards = dash.data?.cards;
  const health = dash.data?.health;
  const jobs = jobsQ.data?.jobs ?? [];

  const healthTone =
    health?.schedulerStatus === "healthy"
      ? "text-emerald-700"
      : health?.schedulerStatus === "degraded"
        ? "text-amber-700"
        : "text-rose-700";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">System Scheduler</h2>
        <p className="mt-1 text-sm text-slate-600">
          Operations monitoring and safe control for in-process scheduled jobs. Does not replace
          existing timers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Total Jobs", cards?.totalJobs ?? 0, "bg-slate-50 border-slate-200 text-slate-800"],
          ["Enabled", cards?.enabledJobs ?? 0, "bg-emerald-50 border-emerald-200 text-emerald-900"],
          ["Disabled", cards?.disabledJobs ?? 0, "bg-slate-50 border-slate-200 text-slate-600"],
          ["Failed", cards?.failedJobs ?? 0, "bg-rose-50 border-rose-200 text-rose-900"],
          ["Running", cards?.runningJobs ?? 0, "bg-sky-50 border-sky-200 text-sky-900"]
        ].map(([label, value, color]) => (
          <div key={String(label)} className={`rounded-xl border p-4 ${color}`}>
            <p className="text-sm font-medium opacity-90">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Health</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HealthPill
            label="Scheduler Status"
            value={health?.schedulerStatus ?? "—"}
            tone={healthTone}
          />
          <HealthPill label="Last Heartbeat" value={formatTs(health?.lastHeartbeat)} />
          <HealthPill
            label="Worker Status"
            value={health?.workerStatus === "in_process" ? "In-process" : String(health?.workerStatus)}
          />
          <HealthPill
            label="Queue Status"
            value={health?.queueStatus === "n_a" ? "N/A (no queue)" : String(health?.queueStatus)}
          />
        </div>
        {health && !health.tablesReady && (
          <p className="mt-3 text-sm text-amber-700">
            Scheduler tables missing. Run{" "}
            <code>npm run db:run-system-scheduler-sql</code> in the backend.
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <h3 className="font-semibold text-slate-900">Jobs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Job Name</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Enabled</th>
                <th className="px-4 py-3">Last Run</th>
                <th className="px-4 py-3">Next Run</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Success</th>
                <th className="px-4 py-3">Failure</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.jobKey} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link
                      to={`/system-scheduler/${encodeURIComponent(job.jobKey)}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {job.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{job.module}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{job.schedule}</td>
                  <td className="px-4 py-3">{job.enabled ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {formatTs(job.lastRunAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {formatTs(job.nextRunAt)}
                  </td>
                  <td className="px-4 py-3">{job.lastDurationLabel || "—"}</td>
                  <td className="px-4 py-3">{job.successCount}</td>
                  <td className="px-4 py-3">{job.failureCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(job.status)}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <JobActions job={job} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
