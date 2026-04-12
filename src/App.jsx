import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import VendorLayout from './components/vendor/VendorLayout';
import AdminLayout from './components/admin/AdminLayout';
import VendorLanding from './pages/VendorLanding';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorServices from './pages/vendor/VendorServices';
import VendorBookings from './pages/vendor/VendorBookings';
import VendorReviews from './pages/vendor/VendorReviews';
import VendorProfile from './pages/vendor/VendorProfile';
import VendorPortfolio from './pages/vendor/VendorPortfolio';
import VendorOnboarding from './pages/vendor/VendorOnboarding';
import VendorMessages from './pages/vendor/VendorMessages';
import VendorAnalytics from './pages/vendor/VendorAnalytics';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVendors from './pages/admin/AdminVendors';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLogs from './pages/admin/AdminLogs';
import AdminSystemHealth from './pages/admin/AdminSystemHealth';
import AdminBookings from './pages/admin/AdminBookings';
import AdminReports from './pages/admin/AdminReports';
import UserLayout from './components/user/UserLayout';
import VendorSearch from './pages/user/VendorSearch';
import VendorDetails from './pages/user/VendorDetails';
import BudgetPlanner from './pages/user/BudgetPlanner';
import AIChat from './pages/user/AIChat';
import UserDashboard from './pages/user/UserDashboard';
import UserBookings from './pages/user/UserBookings';
import InvitationGenerator from './pages/user/InvitationGenerator';
import Messages from './pages/user/Messages';
import Profile from './pages/user/Profile';
import Onboarding from './pages/user/Onboarding';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,      // 2 min — data considered fresh
      gcTime: 10 * 60 * 1000,         // 10 min — keep inactive cache
      refetchOnWindowFocus: true,      // refresh when user returns to tab
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { fontSize: '0.9rem', borderRadius: '0.7rem' },
          }}
        />

        <Routes>
          {/* ── Public routes ── */}
          <Route path="/" element={<Home />} />
          <Route path="/vendor-landing" element={<VendorLanding />} />
          {/* ── Admin login (public) ── */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* ── Admin portal (separate admin auth) ── */}
          <Route
            path="/admin"
            element={
              <ErrorBoundary>
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              </ErrorBoundary>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="system" element={<AdminSystemHealth />} />
          </Route>

          {/* ── User portal (guest-accessible parts) ── */}
          <Route path="/user" element={<ErrorBoundary><UserLayout /></ErrorBoundary>}>
            <Route path="vendors" element={<VendorSearch />} />
            <Route path="vendors/:slug" element={<VendorDetails />} />
            <Route path="onboarding" element={<Onboarding />} />

            {/* ── Protected user routes ── */}
            <Route
              element={
                <ProtectedRoute roles="user" redirectTo="/">
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserDashboard />} />
              <Route path="bookings" element={<UserBookings />} />
              <Route path="budget" element={<BudgetPlanner />} />
              <Route path="chat" element={<AIChat />} />
              <Route path="messages" element={<Messages />} />
              <Route path="invitations" element={<InvitationGenerator />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          {/* ── Vendor onboarding (role: vendor, no layout chrome) ── */}
          <Route
            path="/vendor/onboarding"
            element={
              <ErrorBoundary>
                <ProtectedRoute roles="vendor" redirectTo="/">
                  <VendorOnboarding />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />

          {/* ── Vendor portal (role: vendor) ── */}
          <Route
            path="/vendor"
            element={
              <ErrorBoundary>
                <ProtectedRoute roles="vendor" redirectTo="/">
                  <VendorLayout />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          >
            <Route index element={<VendorDashboard />} />
            <Route path="services" element={<VendorServices />} />
            <Route path="bookings" element={<VendorBookings />} />
            <Route path="analytics" element={<VendorAnalytics />} />
            <Route path="portfolio" element={<VendorPortfolio />} />
            <Route path="reviews" element={<VendorReviews />} />
            <Route path="messages" element={<VendorMessages />} />
            <Route path="profile" element={<VendorProfile />} />
          </Route>

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
