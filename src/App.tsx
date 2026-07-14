import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { MatrimonyRequestsListPage } from "./features/matrimony-admin/pages/MatrimonyRequestsListPage";
import { MatrimonyRequestDetailPage } from "./features/matrimony-admin/pages/MatrimonyRequestDetailPage";
import { MatrimonyReportsListPage } from "./features/matrimony-admin/pages/MatrimonyReportsListPage";
import { MatrimonySubscriptionsPage } from "./features/matrimony-subscriptions-admin/pages/MatrimonySubscriptionsPage";
import { MatrimonySubscriptionDetailPage } from "./features/matrimony-subscriptions-admin/pages/MatrimonySubscriptionDetailPage";
import { BusinessApprovalPage } from "./pages/BusinessApprovalPage";
import { PostsModerationPage } from "./pages/PostsModerationPage";
import { JobPortalPage } from "./pages/JobPortalPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { HelpingHandPage } from "./pages/HelpingHandPage";
import { MasterDataPage } from "./pages/MasterDataPage";
import { CommunityContentPage } from "./pages/CommunityContentPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SupportPage } from "./pages/SupportPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PlatformManagementPage } from "./pages/PlatformManagementPage";
import { AdminErrorBoundary } from "./components/AdminErrorBoundary";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000, retry: 1 }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter basename="/digitalhouse/admin">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AdminErrorBoundary>
                      <DashboardLayout />
                    </AdminErrorBoundary>
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="matrimony" element={<MatrimonyRequestsListPage />} />
                <Route path="matrimony-reports" element={<MatrimonyReportsListPage />} />
                <Route path="matrimony-subscriptions" element={<MatrimonySubscriptionsPage />} />
                <Route
                  path="matrimony-subscriptions/:id"
                  element={<MatrimonySubscriptionDetailPage />}
                />
                <Route path="matrimony/:id" element={<MatrimonyRequestDetailPage />} />
                <Route path="business" element={<BusinessApprovalPage />} />
                <Route path="posts" element={<PostsModerationPage />} />
                <Route path="job-portal" element={<JobPortalPage />} />
                <Route path="marketplace" element={<MarketplacePage />} />
                <Route path="helping-hand" element={<HelpingHandPage />} />
                <Route path="master-data" element={<MasterDataPage />} />
                <Route path="community-content" element={<CommunityContentPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="platform" element={<PlatformManagementPage />} />
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
