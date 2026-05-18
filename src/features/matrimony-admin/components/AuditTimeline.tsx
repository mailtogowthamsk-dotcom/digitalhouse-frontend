import type { MatrimonyAuditEntry } from "../types";

const ACTION_LABELS: Record<string, string> = {
  APPROVED: "Profile approved",
  REJECTED: "Profile rejected",
  CHANGES_REQUESTED: "Changes requested",
  RESUBMITTED: "User resubmitted corrections",
  PROFILE_SUBMITTED: "Profile submitted",
  SUSPENDED: "Profile suspended",
  ASSIGNED_REVIEWER: "Reviewer assigned",
  VERIFICATION_UPDATED: "Verification updated",
  NOTE_ADDED: "Note added"
};

export function AuditTimeline({ entries }: { entries: MatrimonyAuditEntry[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Activity & audit log
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No activity recorded yet.</p>
      ) : (
        <ol className="relative border-l border-slate-200 pl-4">
          {entries.map((e) => (
            <li key={e.id} className="mb-4 ml-2">
              <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-primary" />
              <p className="text-sm font-medium text-slate-900">
                {ACTION_LABELS[e.action] ?? e.action}
              </p>
              <p className="text-xs text-slate-500">
                {e.createdBy} · {new Date(e.createdAt).toLocaleString()}
              </p>
              {e.payload && Object.keys(e.payload).length > 0 && (
                <pre className="mt-1 max-h-24 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-600">
                  {JSON.stringify(e.payload, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
