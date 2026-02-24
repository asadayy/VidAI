import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import VendorLayout from './components/vendor/VendorLayout';
import AdminLayout from './components/admin/AdminLayout';
import VendorLanding from './pages/VendorLanding';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorServices from './pages/vendor/VendorServices';
import VendorBookings from './pages/vendor/VendorBookings';
import VendorProfile from './pages/vendor/VendorProfile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVendors from './pages/admin/AdminVendors';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLogs from './pages/admin/AdminLogs';
import AdminSystemHealth from './pages/admin/AdminSystemHealth';
import UserLayout from './components/user/UserLayout';
import VendorSearch from './pages/user/VendorSearch';
import VendorDetails from './pages/user/VendorDetails';
import BudgetPlanner from './pages/user/BudgetPlanner';
import AIChat from './pages/user/AIChat';
import UserDashboard from './pages/user/UserDashboard';
import UserBookings from './pages/user/UserBookings';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
          <Route path="/admin" element={<AdminLogin />} />

          {/* ── User portal (role: user) ── */}
          <Route
            path="/user"
            element={
              <ProtectedRoute roles="user" redirectTo="/">
                <UserLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<UserDashboard />} />
            <Route path="bookings" element={<UserBookings />} />
            <Route path="budget" element={<BudgetPlanner />} />
            <Route path="chat" element={<AIChat />} />
            <Route path="vendors" element={<VendorSearch />} />
            <Route path="vendors/:slug" element={<VendorDetails />} />
          </Route>

          {/* ── Vendor portal (role: vendor) ── */}
          <Route
            path="/vendor"
            element={
              <ProtectedRoute roles="vendor" redirectTo="/">
                <VendorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<VendorDashboard />} />
            <Route path="services" element={<VendorServices />} />
            <Route path="bookings" element={<VendorBookings />} />
            <Route path="profile" element={<VendorProfile />} />
          </Route>

          {/* ── Admin portal (role: admin) ── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles="admin" redirectTo="/">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="system" element={<AdminSystemHealth />} />
          </Route>

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
