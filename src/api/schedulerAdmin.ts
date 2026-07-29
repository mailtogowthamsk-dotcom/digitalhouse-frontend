/**
 * System Scheduler — ops monitoring & control admin API
 */
import { fetchApi } from "./client";

export type SchedulerJobStatus = "RUNNING" | "DISABLED" | "FAILED" | "IDLE";

export type SchedulerJobSummary = {
  jobKey: string;
  name: string;
  module: string;
  description: string;
  fileLocation: string;
  schedule: string;
  intervalMs: number;
  cronExpression: string | null;
  enabled: boolean;
  enabledOverride: boolean | null;
  envEnabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastDurationMs: number | null;
  lastDurationLabel: string | null;
  averageDurationMs: number | null;
  averageDurationLabel: string | null;
  successCount: number;
  failureCount: number;
  status: SchedulerJobStatus | string;
  timerActive: boolean;
  running: boolean;
  lastError: string | null;
  lastHeartbeatAt: string | null;
};

export type SchedulerRun = {
  id: number;
  jobKey: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  durationLabel: string | null;
  status: string;
  error: string | null;
  recordsProcessed: number;
  triggerType: string;
  executedBy: string | null;
};

export type SchedulerJobDetail = SchedulerJobSummary & {
  file: string;
  lastExecution: string | null;
  nextExecution: string | null;
  runtime: string | null;
  averageRuntime: string | null;
  successHistory: SchedulerRun[];
  failureHistory: SchedulerRun[];
  recentLogs: SchedulerRun[];
};

export type SchedulerHealth = {
  schedulerStatus: "healthy" | "degraded" | "stopped";
  lastHeartbeat: string | null;
  workerStatus: "in_process";
  workerDetail: string;
  queueStatus: "n_a";
  queueDetail: string;
  timersActive: number;
  timersExpected: number;
  tablesReady: boolean;
};

export type SchedulerDashboard = {
  ok: boolean;
  cards: {
    totalJobs: number;
    enabledJobs: number;
    disabledJobs: number;
    failedJobs: number;
    runningJobs: number;
  };
  health: SchedulerHealth;
};

export async function getSchedulerDashboard(): Promise<SchedulerDashboard> {
  return fetchApi("/api/admin/scheduler/dashboard");
}

export async function listSchedulerJobs(): Promise<{ ok: boolean; jobs: SchedulerJobSummary[] }> {
  return fetchApi("/api/admin/scheduler/jobs");
}

export async function getSchedulerJob(
  jobKey: string
): Promise<{ ok: boolean; job: SchedulerJobDetail }> {
  return fetchApi(`/api/admin/scheduler/jobs/${encodeURIComponent(jobKey)}`);
}

export async function listSchedulerRuns(params?: {
  jobKey?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ ok: boolean; items: SchedulerRun[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.jobKey) q.set("jobKey", params.jobKey);
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return fetchApi(`/api/admin/scheduler/runs${qs ? `?${qs}` : ""}`);
}

export async function getSchedulerHealth(): Promise<{ ok: boolean; health: SchedulerHealth }> {
  return fetchApi("/api/admin/scheduler/health");
}

export async function enableSchedulerJob(
  jobKey: string
): Promise<{ ok: boolean; job: SchedulerJobDetail; message?: string }> {
  return fetchApi(`/api/admin/scheduler/jobs/${encodeURIComponent(jobKey)}/enable`, {
    method: "POST"
  });
}

export async function disableSchedulerJob(
  jobKey: string
): Promise<{ ok: boolean; job: SchedulerJobDetail; message?: string }> {
  return fetchApi(`/api/admin/scheduler/jobs/${encodeURIComponent(jobKey)}/disable`, {
    method: "POST"
  });
}

export async function runSchedulerJobNow(
  jobKey: string
): Promise<{ ok: boolean; job: SchedulerJobDetail; message?: string }> {
  return fetchApi(`/api/admin/scheduler/jobs/${encodeURIComponent(jobKey)}/run`, {
    method: "POST"
  });
}

export async function retrySchedulerJob(
  jobKey: string
): Promise<{ ok: boolean; job: SchedulerJobDetail; message?: string }> {
  return fetchApi(`/api/admin/scheduler/jobs/${encodeURIComponent(jobKey)}/retry`, {
    method: "POST"
  });
}
