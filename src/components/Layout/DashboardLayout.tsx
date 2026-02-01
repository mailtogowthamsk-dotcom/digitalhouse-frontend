import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function DashboardLayout() {
  const title =
    typeof window !== "undefined"
      ? (window as any).__PAGE_TITLE__ ?? "Dashboard"
      : "Dashboard";
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
