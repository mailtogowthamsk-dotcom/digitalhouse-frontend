import { NavLink, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../../context/AuthContext";

const navItems: Array<{ to: string; label: string; icon: string; module: string }> = [
  { to: "/dashboard", label: "Dashboard", icon: "📊", module: "dashboard" },
  { to: "/users", label: "User Management", icon: "👥", module: "users" },
  { to: "/matrimony", label: "Matrimony Requests", icon: "💍", module: "matrimony" },
  { to: "/matrimony-reports", label: "Matrimony Reports", icon: "🚩", module: "matrimony_reports" },
  {
    to: "/matrimony-subscriptions",
    label: "Subscriptions & Revenue",
    icon: "💳",
    module: "matrimony_subscriptions"
  },
  { to: "/business", label: "Business Approval", icon: "🏢", module: "business" },
  { to: "/posts", label: "Posts Moderation", icon: "📝", module: "posts" },
  { to: "/job-portal", label: "Job Portal", icon: "💼", module: "jobs" },
  { to: "/marketplace", label: "Marketplace", icon: "🛒", module: "marketplace" },
  { to: "/helping-hand", label: "Helping Hand", icon: "🤝", module: "helping_hands" },
  { to: "/master-data", label: "Master Data", icon: "🗂️", module: "master_data" },
  { to: "/community-content", label: "Community Content", icon: "📜", module: "community_content" },
  { to: "/reports", label: "Reports & Complaints", icon: "⚠️", module: "reports" },
  { to: "/notifications", label: "Notifications", icon: "🔔", module: "notifications" },
  { to: "/platform", label: "Platform Management", icon: "🎛️", module: "platform" },
  { to: "/settings", label: "Settings & Roles", icon: "⚙️", module: "settings" }
];

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MODERATOR: "Moderator"
};

export function Sidebar() {
  const { logout, adminRole, allowedModules, adminEmail } = useAuth();
  const navigate = useNavigate();

  const visibleItems = useMemo(() => {
    if (!allowedModules.length) return navItems;
    const set = new Set(allowedModules);
    return navItems.filter((item) => set.has(item.module));
  }, [allowedModules]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-slate-900 text-white">
      <div className="flex h-full flex-col">
        <div className="flex h-16 flex-col justify-center border-b border-slate-700 px-6">
          <div className="flex items-center">
            <span className="text-lg font-bold">Digital House</span>
            <span className="ml-2 text-xs text-slate-400">Admin</span>
          </div>
          {adminRole ? (
            <div className="mt-0.5 truncate text-[11px] text-slate-400">
              {ROLE_BADGE[adminRole] ?? adminRole}
              {adminEmail ? ` · ${adminEmail}` : ""}
            </div>
          ) : null}
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-700 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
