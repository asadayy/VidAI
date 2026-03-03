import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../api/admin';
import toast from 'react-hot-toast';
import './AdminLogin.css';

const ADMIN_TOKEN_KEY = 'vidai_admin_token';
const ADMIN_USER_KEY = 'vidai_admin_user';

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || null;
}

export function getAdminUser() {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAdminAuth() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      adminAPI.getMe()
        .then(() => navigate('/admin/dashboard', { replace: true }))
        .catch(() => clearAdminAuth());
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await adminAPI.login({ email, password });
      const { accessToken, user } = data.data;
      localStorage.setItem(ADMIN_TOKEN_KEY, accessToken);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
      toast.success(`Welcome back, ${user.name || user.email}!`);
      navigate('/admin/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="al-root">
      {/* background blobs */}
      <div className="al-blob al-blob-1" />
      <div className="al-blob al-blob-2" />

      <div className="al-card">
        {/* logo */}
        <div className="al-brand">
          <div className="al-logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="al-title">VidAI <span>Admin</span></h1>
            <p className="al-subtitle">Platform control centre</p>
          </div>
        </div>

        {/* divider */}
        <div className="al-divider" />

        <form className="al-form" onSubmit={handleSubmit} noValidate>
          {/* email */}
          <div className="al-field">
            <label htmlFor="alEmail">Email address</label>
            <div className="al-input-wrap">
              <span className="al-input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="alEmail"
                type="email"
                placeholder="admin@vidai.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* password */}
          <div className="al-field">
            <label htmlFor="alPassword">Password</label>
            <div className="al-input-wrap">
              <span className="al-input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="alPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="al-eye"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {/* submit */}
          <button type="submit" className="al-btn" disabled={submitting}>
            {submitting ? (
              <><span className="al-spinner" /> Authenticating…</>
            ) : (
              'Sign in to Dashboard'
            )}
          </button>
        </form>

        {/* footer note */}
        <div className="al-footer">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Restricted access — authorised administrators only
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
