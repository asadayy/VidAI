import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';

/**
 * ProtectedRoute — guards routes by authentication and role.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children — protected content
 * @param {string|string[]} [props.roles] — allowed roles (e.g. 'vendor', 'admin', or ['vendor','admin'])
 * @param {string} [props.redirectTo='/'] — where to redirect unauthenticated users
 */
function ProtectedRoute({ children, roles, redirectTo = '/' }) {
  const { isAuthenticated, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (roles && !hasRole(roles)) {
    // User is authenticated but wrong role — send to their appropriate portal
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

export default ProtectedRoute;
