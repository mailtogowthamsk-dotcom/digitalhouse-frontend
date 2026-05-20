import type { MatrimonyStats } from "../types";

const cards: {
  key: keyof MatrimonyStats;
  label: string;
  accent: string;
}[] = [
  { key: "pendingRequests", label: "Pending Requests", accent: "border-amber-400 bg-amber-50" },
  { key: "approvedProfiles", label: "Approved Profiles", accent: "border-emerald-400 bg-emerald-50" },
  { key: "rejectedProfiles", label: "Rejected Profiles", accent: "border-red-400 bg-red-50" },
  { key: "underReview", label: "Under Review", accent: "border-blue-400 bg-blue-50" },
  { key: "newToday", label: "New Today", accent: "border-primary bg-blue-50" },
  { key: "totalInterests", label: "Total Interests", accent: "border-violet-400 bg-violet-50" },
  { key: "mutualMatches", label: "Mutual Matches", accent: "border-teal-400 bg-teal-50" },
  { key: "pendingReports", label: "Pending Reports", accent: "border-orange-400 bg-orange-50" }
];

export function SummaryCards({ stats, loading }: { stats?: MatrimonyStats; loading?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
      {cards.map((c) => (
        <div
          key={c.key}
          className={`rounded-xl border-l-4 p-4 shadow-sm ${c.accent} bg-white`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? "—" : (stats?.[c.key] ?? 0)}
          </p>
        </div>
      ))}
    </div>
  );
}
