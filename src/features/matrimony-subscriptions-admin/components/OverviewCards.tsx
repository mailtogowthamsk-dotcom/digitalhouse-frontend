import type { SubscriptionOverview } from "../types";

export type SubscriptionQuickFilter = "any" | "ACTIVE" | "EXPIRED";

const cards: {
  key: keyof SubscriptionOverview;
  label: string;
  accent: string;
  activeAccent: string;
  format?: "inr" | "pct";
  filter?: SubscriptionQuickFilter;
}[] = [
  {
    key: "totalSubscribers",
    label: "Total subscribers",
    accent: "border-violet-400 bg-violet-50",
    activeAccent: "ring-2 ring-violet-500",
    filter: "any"
  },
  {
    key: "activeSubscribers",
    label: "Active",
    accent: "border-emerald-400 bg-emerald-50",
    activeAccent: "ring-2 ring-emerald-500",
    filter: "ACTIVE"
  },
  {
    key: "expiredSubscribers",
    label: "Expired",
    accent: "border-slate-400 bg-slate-50",
    activeAccent: "ring-2 ring-slate-500",
    filter: "EXPIRED"
  },
  {
    key: "todayRevenueInr",
    label: "Today's revenue",
    accent: "border-amber-400 bg-amber-50",
    activeAccent: "",
    format: "inr"
  },
  {
    key: "monthRevenueInr",
    label: "This month",
    accent: "border-blue-400 bg-blue-50",
    activeAccent: "",
    format: "inr"
  },
  {
    key: "totalRevenueInr",
    label: "Total revenue",
    accent: "border-primary bg-blue-50",
    activeAccent: "",
    format: "inr"
  },
  {
    key: "paymentFailureRate",
    label: "Payment failure %",
    accent: "border-red-400 bg-red-50",
    activeAccent: "",
    format: "pct"
  },
  {
    key: "renewalRate",
    label: "Renewal rate %",
    accent: "border-teal-400 bg-teal-50",
    activeAccent: "",
    format: "pct"
  },
  {
    key: "subscriptionGrowth30d",
    label: "New subs (30d)",
    accent: "border-indigo-400 bg-indigo-50",
    activeAccent: ""
  }
];

export function OverviewCards({
  overview,
  loading,
  activeFilter,
  onSelectFilter
}: {
  overview?: SubscriptionOverview;
  loading?: boolean;
  activeFilter?: SubscriptionQuickFilter;
  onSelectFilter?: (filter: SubscriptionQuickFilter) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {cards.map((c) => {
        const raw = overview?.[c.key];
        let display: string | number = loading ? "—" : (raw ?? 0);
        if (!loading && c.format === "inr") display = `₹${Number(raw).toLocaleString("en-IN")}`;
        if (!loading && c.format === "pct") display = `${raw}%`;

        const clickable = Boolean(c.filter && onSelectFilter);
        const active = Boolean(c.filter && activeFilter === c.filter);
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
            <p className="mt-1 text-2xl font-bold text-slate-900">{display}</p>
            {clickable ? (
              <p className="mt-1 text-[11px] text-slate-500">Click to filter list</p>
            ) : null}
          </>
        );

        if (clickable && c.filter) {
          return (
            <button
              key={c.key}
              type="button"
              className={className}
              onClick={() => onSelectFilter?.(c.filter!)}
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
