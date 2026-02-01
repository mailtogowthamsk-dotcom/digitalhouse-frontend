import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ToastContainer } from "./components/Toast";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/Layout/DashboardLayout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import { MatrimonyApprovalPage } from "./pages/MatrimonyApprovalPage";
import { BusinessApprovalPage } from "./pages/BusinessApprovalPage";
import { PostsModerationPage } from "./pages/PostsModerationPage";
import { JobPortalPage } from "./pages/JobPortalPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { HelpingHandPage } from "./pages/HelpingHandPage";
import { CommunityContentPage } from "./pages/CommunityContentPage";
import { ReportsPage } from "./pages/ReportsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000, retry: 1 }
  }
});

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/users": "User Management",
  "/matrimony": "Matrimony Approval",
  "/business": "Business Approval",
  "/posts": "Posts Moderation",
  "/job-portal": "Job Portal",
  "/marketplace": "Marketplace",
  "/helping-hand": "Helping Hand",
  "/community-content": "Community Content",
  "/reports": "Reports & Complaints",
  "/notifications": "Notifications",
  "/settings": "Settings & Roles"
};

function LayoutWithTitle() {
  const location = useLocation();
  const path = location.pathname;
  const title = titles[path] ?? "Admin";
  useEffect(() => {
    (window as any).__PAGE_TITLE__ = title;
  }, [title]);
  return <DashboardLayout />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <LayoutWithTitle />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="matrimony" element={<MatrimonyApprovalPage />} />
              <Route path="business" element={<BusinessApprovalPage />} />
              <Route path="posts" element={<PostsModerationPage />} />
              <Route path="job-portal" element={<JobPortalPage />} />
              <Route path="marketplace" element={<MarketplacePage />} />
              <Route path="helping-hand" element={<HelpingHandPage />} />
              <Route path="community-content" element={<CommunityContentPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
