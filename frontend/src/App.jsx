import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/LeadsPage";
import LeadDetailPage from "./pages/LeadDetailPage";
import CreateLeadPage from "./pages/sales/CreateLeadPage";
import QueuePage from "./pages/QueuePage";
import UsersPage from "./pages/admin/UsersPage";
import ArchivePage from "./pages/admin/ArchivePage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import CapabilitiesPage from "./pages/product/CapabilitiesPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout><DashboardPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/leads/new" element={
            <ProtectedRoute roles={["sales"]}>
              <Layout><CreateLeadPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/leads/:id" element={
            <ProtectedRoute>
              <Layout><LeadDetailPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/queue" element={
            <ProtectedRoute roles={["sales", "product", "tech"]}>
              <Layout><QueuePage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/capabilities" element={
            <ProtectedRoute roles={["product", "tech", "admin"]}>
              <Layout><CapabilitiesPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/users" element={
            <ProtectedRoute roles={["admin"]}>
              <Layout><UsersPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/archive" element={
            <ProtectedRoute roles={["admin"]}>
              <Layout><ArchivePage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/analytics" element={
            <ProtectedRoute roles={["admin"]}>
              <Layout><AnalyticsPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
