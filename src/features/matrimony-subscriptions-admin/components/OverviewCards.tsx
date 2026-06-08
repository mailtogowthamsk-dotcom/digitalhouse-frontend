import type { SubscriptionOverview } from "../types";

const cards: { key: keyof SubscriptionOverview; label: string; accent: string; format?: "inr" | "pct" }[] = [
  { key: "totalSubscribers", label: "Total subscribers", accent: "border-violet-400 bg-violet-50" },
  { key: "activeSubscribers", label: "Active", accent: "border-emerald-400 bg-emerald-50" },
  { key: "expiredSubscribers", label: "Expired", accent: "border-slate-400 bg-slate-50" },
  { key: "todayRevenueInr", label: "Today's revenue", accent: "border-amber-400 bg-amber-50", format: "inr" },
  { key: "monthRevenueInr", label: "This month", accent: "border-blue-400 bg-blue-50", format: "inr" },
  { key: "totalRevenueInr", label: "Total revenue", accent: "border-primary bg-blue-50", format: "inr" },
  { key: "paymentFailureRate", label: "Payment failure %", accent: "border-red-400 bg-red-50", format: "pct" },
  { key: "renewalRate", label: "Renewal rate %", accent: "border-teal-400 bg-teal-50", format: "pct" },
  { key: "subscriptionGrowth30d", label: "New subs (30d)", accent: "border-indigo-400 bg-indigo-50" }
];

export function OverviewCards({
  overview,
  loading
}: {
  overview?: SubscriptionOverview;
  loading?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {cards.map((c) => {
        const raw = overview?.[c.key];
        let display: string | number = loading ? "—" : (raw ?? 0);
        if (!loading && c.format === "inr") display = `₹${Number(raw).toLocaleString("en-IN")}`;
        if (!loading && c.format === "pct") display = `${raw}%`;
        return (
          <div key={c.key} className={`rounded-xl border-l-4 p-4 shadow-sm bg-white ${c.accent}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{display}</p>
          </div>
        );
      })}
    </div>
  );
}
