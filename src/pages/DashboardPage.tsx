import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDashboardStats } from "../api/admin";

const cards = [
  { key: "totalUsers", label: "Total Users", link: "/users", color: "bg-slate-50 border-slate-200 text-slate-800" },
  { key: "pendingUserApprovals", label: "Pending User Approvals", link: "/users?status=PENDING", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { key: "pendingMatrimonyApprovals", label: "Pending Matrimony", link: "/matrimony", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { key: "pendingBusinessApprovals", label: "Pending Business", link: "/business", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { key: "reportedPosts", label: "Reported Posts", link: "/reports", color: "bg-red-50 border-red-200 text-red-800" }
] as const;

export function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getDashboardStats
  });

  if (isLoading) return <div className="text-slate-600">Loading dashboard…</div>;
  if (error) return <div className="text-red-600">Failed to load stats.</div>;

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map(({ key, label, link, color }) => (
          <Link
            key={key}
            to={link}
            className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${color}`}
          >
            <p className="text-sm font-medium opacity-90">{label}</p>
            <p className="mt-2 text-2xl font-bold">
              {stats ? (stats as any)[key] : 0}
            </p>
          </Link>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 font-semibold text-slate-900">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/users?status=PENDING"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            View Pending Approvals
          </Link>
          <Link
            to="/matrimony"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Matrimony Approval
          </Link>
          <Link
            to="/business"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Business Approval
          </Link>
          <Link
            to="/notifications"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Send Announcement
          </Link>
          <Link
            to="/reports"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Review Reports
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 font-semibold text-slate-900">User growth (optional)</h3>
          <div className="flex h-40 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">
            Chart placeholder — connect analytics API
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 font-semibold text-slate-900">Content activity (optional)</h3>
          <div className="flex h-40 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">
            Chart placeholder — connect activity API
          </div>
        </div>
      </div>
    </div>
  );
}
