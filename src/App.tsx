import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ToastContainer } from "./components/Toast";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ModuleRoute } from "./components/ModuleRoute";
import { DashboardLayout } from "./components/Layout/DashboardLayout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { MatrimonyRequestsListPage } from "./features/matrimony-admin/pages/MatrimonyRequestsListPage";
import { MatrimonyRequestDetailPage } from "./features/matrimony-admin/pages/MatrimonyRequestDetailPage";
import { MatrimonyReportsListPage } from "./features/matrimony-admin/pages/MatrimonyReportsListPage";
import { MatrimonySubscriptionsPage } from "./features/matrimony-subscriptions-admin/pages/MatrimonySubscriptionsPage";
import { MatrimonySubscriptionDetailPage } from "./features/matrimony-subscriptions-admin/pages/MatrimonySubscriptionDetailPage";
import { BusinessApprovalPage } from "./pages/BusinessApprovalPage";
import { PostsModerationPage } from "./pages/PostsModerationPage";
import { JobPortalPage } from "./pages/JobPortalPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { JobApplicationsPage } from "./pages/JobApplicationsPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { MarketplaceDetailPage } from "./pages/MarketplaceDetailPage";
import { HelpingHandPage } from "./pages/HelpingHandPage";
import { ProminentPeoplePage } from "./pages/ProminentPeoplePage";
import { MasterDataPage } from "./pages/MasterDataPage";
import { CommunityContentPage } from "./pages/CommunityContentPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SupportPage } from "./pages/SupportPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LegalDocumentsListPage } from "./features/legal-admin/LegalDocumentsListPage";
import { LegalDocumentEditPage } from "./features/legal-admin/LegalDocumentEditPage";
import { LegalDocumentHistoryPage } from "./features/legal-admin/LegalDocumentHistoryPage";
import { LegalDocumentComparePage } from "./features/legal-admin/LegalDocumentComparePage";
import { PlatformManagementPage } from "./pages/PlatformManagementPage";
import { SystemSchedulerPage, SystemSchedulerDetailPage } from "./pages/SystemSchedulerPage";
import { AdvertisementsPage } from "./features/advertisements-admin/AdvertisementsPage";
import { AdvertisementDetailPage } from "./features/advertisements-admin/AdvertisementDetailPage";
import { AdvertisementCreatePage } from "./features/advertisements-admin/AdvertisementCreatePage";
import { AdvertisementEditPage } from "./features/advertisements-admin/AdvertisementEditPage";
import { AdvertisementReportsPage } from "./features/advertisements-admin/AdvertisementReportsPage";
import { AdvertisementPricingPage } from "./features/advertisements-admin/AdvertisementPricingPage";
import { InvoicesPage } from "./features/invoices-admin/InvoicesPage";
import { InvoiceDetailPage } from "./features/invoices-admin/InvoiceDetailPage";
import { AdminErrorBoundary } from "./components/AdminErrorBoundary";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000, retry: 1 }
  }
});

function M({ module, children }: { module: string; children: React.ReactNode }) {
  return <ModuleRoute module={module}>{children}</ModuleRoute>;
}

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
                <Route path="dashboard" element={<M module="dashboard"><DashboardPage /></M>} />
                <Route path="users" element={<M module="users"><UserManagementPage /></M>} />
                <Route path="users/:id" element={<M module="users"><UserDetailPage /></M>} />
                <Route path="matrimony" element={<M module="matrimony"><MatrimonyRequestsListPage /></M>} />
                <Route
                  path="matrimony-reports"
                  element={<M module="matrimony_reports"><MatrimonyReportsListPage /></M>}
                />
                <Route
                  path="matrimony-subscriptions"
                  element={<M module="matrimony_subscriptions"><MatrimonySubscriptionsPage /></M>}
                />
                <Route
                  path="matrimony-subscriptions/:id"
                  element={<M module="matrimony_subscriptions"><MatrimonySubscriptionDetailPage /></M>}
                />
                <Route path="matrimony/:id" element={<M module="matrimony"><MatrimonyRequestDetailPage /></M>} />
                <Route path="business" element={<M module="business"><BusinessApprovalPage /></M>} />
                <Route path="posts" element={<M module="posts"><PostsModerationPage /></M>} />
                <Route
                  path="job-portal/applications"
                  element={<M module="jobs"><JobApplicationsPage /></M>}
                />
                <Route path="job-portal/:id" element={<M module="jobs"><JobDetailPage /></M>} />
                <Route path="job-portal" element={<M module="jobs"><JobPortalPage /></M>} />
                <Route
                  path="marketplace/:id"
                  element={<M module="marketplace"><MarketplaceDetailPage /></M>}
                />
                <Route path="marketplace" element={<M module="marketplace"><MarketplacePage /></M>} />
                <Route path="helping-hand" element={<M module="helping_hands"><HelpingHandPage /></M>} />
                <Route
                  path="prominent-people"
                  element={<M module="prominent_people"><ProminentPeoplePage /></M>}
                />
                <Route path="master-data" element={<M module="master_data"><MasterDataPage /></M>} />
                <Route
                  path="community-content"
                  element={<M module="community_content"><CommunityContentPage /></M>}
                />
                <Route path="reports" element={<M module="reports"><ReportsPage /></M>} />
                <Route path="support" element={<M module="support"><SupportPage /></M>} />
                <Route path="notifications" element={<M module="notifications"><NotificationsPage /></M>} />
                <Route path="platform" element={<M module="platform"><PlatformManagementPage /></M>} />
                <Route
                  path="advertisements/pricing"
                  element={<M module="advertisements"><AdvertisementPricingPage /></M>}
                />
                <Route
                  path="advertisements/reports"
                  element={<M module="advertisements"><AdvertisementReportsPage /></M>}
                />
                <Route
                  path="advertisements/new"
                  element={<M module="advertisements"><AdvertisementCreatePage /></M>}
                />
                <Route
                  path="advertisements/:id/edit"
                  element={<M module="advertisements"><AdvertisementEditPage /></M>}
                />
                <Route
                  path="advertisements/:id"
                  element={<M module="advertisements"><AdvertisementDetailPage /></M>}
                />
                <Route
                  path="advertisements"
                  element={<M module="advertisements"><AdvertisementsPage /></M>}
                />
                <Route
                  path="invoices/:id"
                  element={<M module="invoices"><InvoiceDetailPage /></M>}
                />
                <Route
                  path="invoices"
                  element={<M module="invoices"><InvoicesPage /></M>}
                />
                <Route
                  path="system-scheduler/:jobKey"
                  element={<M module="system_scheduler"><SystemSchedulerDetailPage /></M>}
                />
                <Route
                  path="system-scheduler"
                  element={<M module="system_scheduler"><SystemSchedulerPage /></M>}
                />
                <Route
                  path="settings/legal/:documentKey/compare"
                  element={<M module="settings"><LegalDocumentComparePage /></M>}
                />
                <Route
                  path="settings/legal/:documentKey/history"
                  element={<M module="settings"><LegalDocumentHistoryPage /></M>}
                />
                <Route
                  path="settings/legal/:documentKey"
                  element={<M module="settings"><LegalDocumentEditPage /></M>}
                />
                <Route
                  path="settings/legal"
                  element={<M module="settings"><LegalDocumentsListPage /></M>}
                />
                <Route path="settings" element={<M module="settings"><SettingsPage /></M>} />
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
