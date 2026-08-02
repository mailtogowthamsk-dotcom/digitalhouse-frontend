import { useState } from "react";
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
  NOTE_ADDED: "Note added",
  PHOTO_STATUS_UPDATED: "Candidate photo status updated",
  PROFILE_WITHDRAWN: "Profile withdrawn (legacy)",
  PROFILE_PAUSED: "Profile paused by user",
  PROFILE_RESUMED: "Profile resumed by user",
  PROFILE_CLOSED: "Profile closed by user",
  PROFILE_REACTIVATED: "Profile reactivated by user"
};

export function AuditTimeline({ entries }: { entries: MatrimonyAuditEntry[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Activity & audit log
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {entries.length === 0
              ? "No activity recorded yet"
              : `${entries.length} event${entries.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {open ? "Hide" : "View"}
        </button>
      </div>
      {open ? (
        entries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <ol className="relative mt-4 border-l border-slate-200 pl-4">
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
        )
      ) : null}
    </section>
  );
}
