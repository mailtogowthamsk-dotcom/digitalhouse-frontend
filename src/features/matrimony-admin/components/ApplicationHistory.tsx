import { Link } from "react-router-dom";
import type { MatrimonyApplicationVersion, MatrimonyTimelineEvent } from "../types";
import { WorkflowBadge } from "./WorkflowBadge";
import { WORKFLOW_LABELS } from "../constants";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function CurrentApplicationCard({
  version,
  status,
  submittedAt,
  pendingSinceDays,
  completion,
  verificationComplete,
  assignedReviewer,
  adminRemarks,
  changeRequestComment,
  canAct,
  onApprove,
  onReject,
  onRequestChanges,
  onScrollHistory
}: {
  version: number;
  status: string;
  submittedAt: string;
  pendingSinceDays?: number | null;
  completion: number;
  verificationComplete: boolean;
  assignedReviewer: string | null;
  adminRemarks: string | null;
  changeRequestComment?: string | null;
  canAct: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRequestChanges: () => void;
  onScrollHistory: () => void;
}) {
  return (
    <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-white to-sky-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Current application</h2>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-sky-800">
              Current version
            </span>
            <WorkflowBadge status={status as any} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Version {version} · Submitted {formatDate(submittedAt)}
            {pendingSinceDays != null ? ` · Pending ${pendingSinceDays} day(s)` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAct ? (
            <>
              <button
                type="button"
                onClick={onApprove}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={onRequestChanges}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
              >
                Request changes
              </button>
              <button
                type="button"
                onClick={onReject}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Reject
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={onScrollHistory}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View history
          </button>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-medium text-slate-500">Completion</dt>
          <dd className="text-sm font-semibold text-slate-900">{completion}%</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Verification</dt>
          <dd className="text-sm font-semibold text-slate-900">
            {verificationComplete ? "Complete" : "Incomplete"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Assigned admin</dt>
          <dd className="text-sm font-semibold text-slate-900">{assignedReviewer || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Admin notes</dt>
          <dd className="text-sm text-slate-800">
            {adminRemarks || changeRequestComment || "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function ApplicationHistoryPanel({
  history
}: {
  history: MatrimonyApplicationVersion[];
}) {
  if (!history.length) {
    return (
      <section id="application-history" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Application history
        </h3>
        <p className="mt-3 text-sm text-slate-400">No application history yet.</p>
      </section>
    );
  }

  return (
    <section id="application-history" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Application history
      </h3>
      <ol className="space-y-4">
        {[...history].reverse().map((h) => (
          <li
            key={h.id}
            className={`rounded-lg border p-4 ${
              h.isCurrent ? "border-sky-300 bg-sky-50/60" : "border-slate-200 bg-slate-50/50"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Version {h.applicationVersion}
              </span>
              <WorkflowBadge status={h.workflowStatus} />
              {h.isCurrent ? (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-800">
                  Current
                </span>
              ) : null}
              <Link
                to={`/matrimony/${h.id}`}
                className="ml-auto text-xs font-medium text-primary hover:underline"
              >
                Open this version
              </Link>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Submitted {formatDate(h.submittedAt)}
              {h.reviewedAt ? ` · Reviewed ${formatDate(h.reviewedAt)}` : ""}
            </p>
            <p className="mt-2 text-sm text-slate-700">{h.adminDecision}</p>
            {h.changeRequest?.comment ? (
              <p className="mt-1 text-sm text-amber-800">
                Change request: {h.changeRequest.comment}
              </p>
            ) : null}
            {h.rejectionComment ? (
              <p className="mt-1 text-sm text-red-700">Reason: {h.rejectionComment}</p>
            ) : null}
            {h.adminRemarks ? (
              <p className="mt-1 text-sm text-slate-600">Remarks: {h.adminRemarks}</p>
            ) : null}
            {h.notes.length > 0 ? (
              <ul className="mt-3 space-y-1 border-t border-slate-200 pt-2">
                {h.notes.map((n) => (
                  <li key={n.id} className="text-xs text-slate-600">
                    <span className="font-medium">{n.noteType}</span> · {n.createdBy}: {n.content}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-400">No admin notes on this version</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function MatrimonyEventTimeline({ events }: { events: MatrimonyTimelineEvent[] }) {
  if (!events.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Timeline</h3>
        <p className="mt-3 text-sm text-slate-400">No timeline events yet.</p>
      </section>
    );
  }
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Activity timeline
      </h3>
      <ol className="relative space-y-4 border-l border-slate-200 pl-6">
        {[...events].reverse().map((e, idx) => (
          <li key={`${e.at}-${e.type}-${idx}`} className="relative">
            <span className="absolute -left-[1.625rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-white" />
            <div className="text-sm font-medium text-slate-900">
              {e.label}
              {e.applicationVersion != null ? (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  (v{e.applicationVersion})
                </span>
              ) : null}
            </div>
            <div className="text-xs text-slate-500">
              {formatDate(e.at)}
              {e.actor ? ` · ${e.actor}` : ""}
            </div>
            {e.meta ? <div className="mt-0.5 text-xs text-slate-600 break-words">{e.meta}</div> : null}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[10px] text-slate-400">
        Status labels: {Object.values(WORKFLOW_LABELS).join(" · ")}
      </p>
    </section>
  );
}
