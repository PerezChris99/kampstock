import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AboutPage from './pages/AboutPage';
import HowItWorksPage from './pages/HowItWorksPage';
import FAQPage from './pages/FAQPage';
import SecurityPage from './pages/SecurityPage';
import ContactPage from './pages/ContactPage';
import LandingPage from './pages/LandingPage';
import LegalPage from './pages/LegalPage';
import DashboardPage from './pages/DashboardPage';
import POSPage from './pages/POSPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import CustomersPage from './pages/CustomersPage';
import ExpensesPage from './pages/ExpensesPage';
import SalesPage from './pages/SalesPage';
import UsersPage from './pages/UsersPage';
import BillingPage from './pages/BillingPage';
import BillingCallbackPage from './pages/BillingCallbackPage';
import SuperAdminPage from './pages/SuperAdminPage';
import LockedPage from './pages/LockedPage';
import SettingsPage from './pages/SettingsPage';
import SuperAdminRoute from './components/SuperAdminRoute';

// Heavy pages lazy-loaded to reduce initial bundle (react-big-calendar + recharts)
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ManagerCalendarPage = lazy(() => import('./pages/ManagerCalendarPage'));
const AdminCalendarPage = lazy(() => import('./pages/AdminCalendarPage'));

const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      color: '#64748b',
      fontSize: '0.9rem',
    }}
  >
    Loading...
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<LegalPage />} />
            <Route path="/terms" element={<LegalPage />} />
            <Route path="/acceptable-use" element={<LegalPage />} />
            <Route path="/billing/callback" element={<BillingCallbackPage />} />
            <Route path="/locked" element={<LockedPage />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="pos" element={<POSPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route
                path="reports"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ReportsPage />
                  </Suspense>
                }
              />
              <Route path="users" element={<UsersPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route
                path="calendar"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ManagerCalendarPage />
                  </Suspense>
                }
              />
              <Route path="settings" element={<SettingsPage />} />
              <Route
                path="super-admin"
                element={
                  <SuperAdminRoute>
                    <SuperAdminPage />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="super-admin/calendar"
                element={
                  <SuperAdminRoute>
                    <Suspense fallback={<PageLoader />}>
                      <AdminCalendarPage />
                    </Suspense>
                  </SuperAdminRoute>
                }
              />
            </Route>
            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
