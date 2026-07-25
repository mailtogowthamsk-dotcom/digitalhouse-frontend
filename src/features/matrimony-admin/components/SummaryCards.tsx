import type { MatrimonyStats } from "../types";

export type MatrimonyQueueKey =
  | "pending"
  | "approved"
  | "rejected"
  | "under_review"
  | "new_today"
  | "all"
  | "drafts";

const cards: {
  key: keyof MatrimonyStats;
  queue: MatrimonyQueueKey | null;
  label: string;
  accent: string;
  activeAccent: string;
  openReports?: boolean;
}[] = [
  {
    key: "pendingRequests",
    queue: "pending",
    label: "Pending Requests",
    accent: "border-amber-400 bg-amber-50",
    activeAccent: "ring-2 ring-amber-500 border-amber-500"
  },
  {
    key: "approvedProfiles",
    queue: "approved",
    label: "Approved Profiles",
    accent: "border-emerald-400 bg-emerald-50",
    activeAccent: "ring-2 ring-emerald-500 border-emerald-500"
  },
  {
    key: "rejectedProfiles",
    queue: "rejected",
    label: "Rejected Profiles",
    accent: "border-red-400 bg-red-50",
    activeAccent: "ring-2 ring-red-500 border-red-500"
  },
  {
    key: "underReview",
    queue: "under_review",
    label: "Under Review",
    accent: "border-blue-400 bg-blue-50",
    activeAccent: "ring-2 ring-blue-500 border-blue-500"
  },
  {
    key: "newToday",
    queue: "new_today",
    label: "New Today",
    accent: "border-primary bg-blue-50",
    activeAccent: "ring-2 ring-primary border-primary"
  },
  {
    key: "totalInterests",
    queue: null,
    label: "Total Interests",
    accent: "border-violet-400 bg-violet-50",
    activeAccent: ""
  },
  {
    key: "mutualMatches",
    queue: null,
    label: "Mutual Matches",
    accent: "border-teal-400 bg-teal-50",
    activeAccent: ""
  },
  {
    key: "pendingReports",
    queue: null,
    label: "Pending Reports",
    accent: "border-orange-400 bg-orange-50",
    activeAccent: "ring-2 ring-orange-500 border-orange-500",
    openReports: true
  }
];

export function SummaryCards({
  stats,
  loading,
  activeQueue,
  onSelectQueue,
  onOpenReports
}: {
  stats?: MatrimonyStats;
  loading?: boolean;
  activeQueue?: MatrimonyQueueKey;
  onSelectQueue?: (queue: MatrimonyQueueKey) => void;
  onOpenReports?: () => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
      {cards.map((c) => {
        const openReports = Boolean(c.openReports && onOpenReports);
        const clickable = Boolean((c.queue && onSelectQueue) || openReports);
        const active = Boolean(c.queue && activeQueue === c.queue);
        const className = [
          "rounded-xl border-l-4 p-4 shadow-sm bg-white text-left w-full",
          c.accent,
          active ? c.activeAccent : "",
          clickable
            ? "cursor-pointer transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            : ""
        ]
          .filter(Boolean)
          .join(" ");

        const content = (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {loading ? "—" : (stats?.[c.key] ?? 0)}
            </p>
            {clickable ? (
              <p className="mt-1 text-[11px] text-slate-500">
                {openReports ? "Open reports queue" : "Click to view list"}
              </p>
            ) : null}
          </>
        );

        if (openReports) {
          return (
            <button key={c.key} type="button" className={className} onClick={() => onOpenReports?.()}>
              {content}
            </button>
          );
        }

        if (clickable && c.queue) {
          return (
            <button
              key={c.key}
              type="button"
              className={className}
              onClick={() => onSelectQueue?.(c.queue!)}
              aria-pressed={active}
            >
              {content}
            </button>
          );
        }

        return (
          <div key={c.key} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
