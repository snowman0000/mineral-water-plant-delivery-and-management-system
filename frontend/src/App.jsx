import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './shared/components/ErrorBoundary';
import ProtectedRoute from './shared/components/ProtectedRoute';
import Layout from './shared/components/Layout';

// Auth
import LoginPage from './modules/auth/pages/LoginPage';
import SignupPage from './modules/auth/pages/SignupPage';

// Dashboard
import DashboardPage from './modules/dashboard/pages/DashboardPage';

// Customers
import CustomersPage from './modules/customers/pages/CustomersPage';
import CustomerFormPage from './modules/customers/pages/CustomerFormPage';
import CustomerDetailPage from './modules/customers/pages/CustomerDetailPage';

// Daily Entry
import DailyEntryPage from './modules/deliveries/pages/DailyEntryPage';

// Billing
import InvoicesPage from './modules/billing/pages/InvoicesPage';
import InvoiceDetailPage from './modules/billing/pages/InvoiceDetailPage';
import GenerateBillPage from './modules/billing/pages/GenerateBillPage';

// Events
import EventsPage from './modules/events/pages/EventsPage';
import EventFormPage from './modules/events/pages/EventFormPage';

// Inventory
import InventoryPage from './modules/inventory/pages/InventoryPage';

// Reports
import ReportsPage from './modules/reports/pages/ReportsPage';

// Employees
import EmployeesPage from './modules/employees/pages/EmployeesPage';
import EmployeeFormPage from './modules/employees/pages/EmployeeFormPage';
import AttendancePage from './modules/employees/pages/AttendancePage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />

                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/new" element={<CustomerFormPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/customers/:id/edit" element={<CustomerFormPage />} />

                <Route path="/daily-entry" element={<DailyEntryPage />} />

                <Route path="/billing" element={<InvoicesPage />} />
                <Route path="/billing/generate" element={<GenerateBillPage />} />
                <Route path="/billing/:id" element={<InvoiceDetailPage />} />

                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/new" element={<EventFormPage />} />
                <Route path="/events/:id/edit" element={<EventFormPage />} />

                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/reports" element={<ReportsPage />} />

                <Route path="/attendance" element={<AttendancePage />} />

                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/employees/new" element={<EmployeeFormPage />} />
                <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '10px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
