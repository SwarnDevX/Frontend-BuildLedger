import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Login from '../pages/Login';
import VendorOnboarding from '../pages/VendorOnboarding';
import VendorReuploadDocuments from '../pages/VendorReuploadDocuments';
import Unauthorized from '../pages/Unauthorized';
import Dashboard from '../pages/Dashboard';
import ComplianceDashboard from '../pages/ComplianceDashboard';
import VendorManagement from '../pages/VendorManagement';
import ContractManagement from '../pages/ContractManagement';
import DeliveryTracking from '../pages/DeliveryTracking';
import InvoicePayment from '../pages/InvoicePayment';
import ComplianceAudit from '../pages/ComplianceAudit';
import AdminPanel from '../pages/AdminPanel';
import Notifications from '../pages/Notifications';
import VendorDashboard from '../pages/VendorDashboard';
import VendorContracts from '../pages/VendorContracts';
import VendorDeliveries from '../pages/VendorDeliveries';
import VendorInvoices from '../pages/VendorInvoices';
import ProjectManagement from '../pages/ProjectManagement';
import { useAuth } from '../context/AuthContext';

function DashboardRouter() {
  const { user } = useAuth();
  if (user?.role === 'COMPLIANCE_OFFICER') return <ComplianceDashboard />;
  return <Dashboard />;
}

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <Login /> },
  { path: '/vendor/register', element: <VendorOnboarding /> },
  { path: '/vendor/reupload-documents', element: <VendorReuploadDocuments /> },
  { path: '/unauthorized', element: <Unauthorized /> },

  // Protected app shell
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      // Internal staff dashboard
      {
        index: true,
        element: (
          <ProtectedRoute roles={['ADMIN', 'PROJECT_MANAGER', 'FINANCE_OFFICER', 'COMPLIANCE_OFFICER']}>
            <DashboardRouter />
          </ProtectedRoute>
        ),
      },
      // Vendor portal
      {
        path: 'vendor/dashboard',
        element: (
          <ProtectedRoute roles={['VENDOR']}>
            <VendorDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'vendor/contracts',
        element: (
          <ProtectedRoute roles={['VENDOR']}>
            <VendorContracts />
          </ProtectedRoute>
        ),
      },
      {
        path: 'vendor/deliveries',
        element: (
          <ProtectedRoute roles={['VENDOR']}>
            <VendorDeliveries />
          </ProtectedRoute>
        ),
      },
      {
        path: 'vendor/invoices',
        element: (
          <ProtectedRoute roles={['VENDOR']}>
            <VendorInvoices />
          </ProtectedRoute>
        ),
      },
      // Vendor management
      {
        path: 'vendors',
        element: (
          <ProtectedRoute roles={['ADMIN', 'PROJECT_MANAGER']}>
            <VendorManagement />
          </ProtectedRoute>
        ),
      },
      // Projects
      {
        path: 'projects',
        element: (
          <ProtectedRoute roles={['ADMIN', 'PROJECT_MANAGER']}>
            <ProjectManagement />
          </ProtectedRoute>
        ),
      },
      // Contracts
      {
        path: 'contracts',
        element: (
          <ProtectedRoute roles={['ADMIN', 'PROJECT_MANAGER']}>
            <ContractManagement />
          </ProtectedRoute>
        ),
      },
      // Deliveries
      {
        path: 'deliveries',
        element: (
          <ProtectedRoute roles={['ADMIN', 'PROJECT_MANAGER']}>
            <DeliveryTracking />
          </ProtectedRoute>
        ),
      },
      // Invoices
      {
        path: 'invoices',
        element: (
          <ProtectedRoute roles={['ADMIN', 'FINANCE_OFFICER']}>
            <InvoicePayment />
          </ProtectedRoute>
        ),
      },
      // Compliance
      {
        path: 'compliance',
        element: (
          <ProtectedRoute roles={['ADMIN', 'COMPLIANCE_OFFICER', 'PROJECT_MANAGER']}>
            <ComplianceAudit />
          </ProtectedRoute>
        ),
      },
      // Admin
      {
        path: 'admin',
        element: (
          <ProtectedRoute roles={['ADMIN']}>
            <AdminPanel />
          </ProtectedRoute>
        ),
      },
      // Notifications (all authenticated roles)
      { path: 'notifications', element: <Notifications /> },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
]);
