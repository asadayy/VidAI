import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './AdminLogin.css';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();

  // If already authenticated as admin, redirect to dashboard
  if (isAuthenticated && hasRole('admin')) {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email, password);

      if (user.role !== 'admin') {
        toast.error('Access denied. This page is for administrators only.');
        return;
      }

      navigate('/admin/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-root">
      <div className="admin-card">
        <div className="admin-header">
          <h1>VIDAI Admin Panel</h1>
          <p>Restricted access. Admins only.</p>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="adminEmail">Admin email</label>
            <input
              id="adminEmail"
              type="email"
              placeholder="admin@vidai.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="adminPassword">Password</label>
            <input
              id="adminPassword"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-secondary full-width"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Login to admin dashboard'}
          </button>

          <p className="admin-note">
            Vendors should use the main website to log in or sign up. This page is
            for platform administrators only.
          </p>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
