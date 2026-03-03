import { Navigate, useLocation } from 'react-router-dom';
import { getAdminToken, getAdminUser } from '../pages/AdminLogin';

/**
 * AdminProtectedRoute — guards admin routes using the separate admin auth store.
 * Falls back to /admin (the admin login page) if not authenticated.
 */
function AdminProtectedRoute({ children }) {
  const location = useLocation();
  const token = getAdminToken();
  const user = getAdminUser();

  if (!token || !user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}

export default AdminProtectedRoute;
