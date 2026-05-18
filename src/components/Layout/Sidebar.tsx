import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/users", label: "User Management", icon: "👥" },
  { to: "/matrimony", label: "Matrimony Requests", icon: "💍" },
  { to: "/business", label: "Business Approval", icon: "🏢" },
  { to: "/posts", label: "Posts Moderation", icon: "📝" },
  { to: "/job-portal", label: "Job Portal", icon: "💼" },
  { to: "/marketplace", label: "Marketplace", icon: "🛒" },
  { to: "/helping-hand", label: "Helping Hand", icon: "🤝" },
  { to: "/community-content", label: "Community Content", icon: "📜" },
  { to: "/reports", label: "Reports & Complaints", icon: "⚠️" },
  { to: "/notifications", label: "Notifications", icon: "🔔" },
  { to: "/settings", label: "Settings & Roles", icon: "⚙️" }
];

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-slate-900 text-white">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-slate-700 px-6">
          <span className="text-lg font-bold">Digital House</span>
          <span className="ml-2 text-xs text-slate-400">Admin</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map((item) => (
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
