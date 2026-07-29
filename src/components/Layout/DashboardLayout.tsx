import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/users": "User Management",
  "/matrimony": "Matrimony Requests",
  "/matrimony-reports": "Matrimony Reports",
  "/matrimony-subscriptions": "Matrimony Subscriptions",
  "/business": "Business Approval",
  "/posts": "Posts Moderation",
  "/job-portal": "Job Portal",
  "/marketplace": "Marketplace",
  "/helping-hand": "Helping Hand",
  "/prominent-people": "Prominent People",
  "/master-data": "Master Data",
  "/community-content": "Community Content",
  "/reports": "Reports & Complaints",
  "/support": "Help & Support",
  "/notifications": "Notifications",
  "/platform": "Platform Management",
  "/system-scheduler": "System Scheduler",
  "/settings": "Settings & Roles",
  "/settings/legal": "Legal Documents"
};

function titleForPath(path: string): string {
  if (TITLES[path]) return TITLES[path];
  if (path.startsWith("/settings/legal/") && path.endsWith("/history")) {
    return "Legal Document History";
  }
  if (path.startsWith("/settings/legal/") && path.endsWith("/compare")) {
    return "Compare Legal Versions";
  }
  if (path.startsWith("/settings/legal/") && path !== "/settings/legal") {
    return "Edit Legal Document";
  }
  if (path.startsWith("/system-scheduler/") && path !== "/system-scheduler") {
    return "Scheduler Job Detail";
  }
  if (path.startsWith("/matrimony-subscriptions/") && path !== "/matrimony-subscriptions") {
    return "Subscription detail";
  }
  if (path.startsWith("/job-portal/applications")) {
    return "Job Applications";
  }
  if (path.startsWith("/job-portal/") && path !== "/job-portal") {
    return "Job Detail";
  }
  if (path.startsWith("/marketplace/") && path !== "/marketplace") {
    return "Marketplace Listing";
  }
  if (path.startsWith("/matrimony/") && !path.startsWith("/matrimony-subscriptions")) {
    return "Matrimony Review";
  }
  return "Admin";
}

export function DashboardLayout() {
  const { pathname } = useLocation();
  const title = titleForPath(pathname);

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="pl-64">
        <Header title={title} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
