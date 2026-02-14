import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Landing.css';

const INITIAL_LOGIN = { email: '', password: '', remember: false };
const INITIAL_SIGNUP = { name: '', email: '', password: '', phone: '', city: '' };

function VendorLanding() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN);
  const [signupForm, setSignupForm] = useState(INITIAL_SIGNUP);
  const [submitting, setSubmitting] = useState(false);

  const { login, register, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();

  // If already authenticated as vendor, redirect
  if (isAuthenticated && hasRole('vendor')) {
    navigate('/vendor', { replace: true });
    return null;
  }

  const closeModals = () => {
    setShowLogin(false);
    setShowSignup(false);
    setLoginForm(INITIAL_LOGIN);
    setSignupForm(INITIAL_SIGNUP);
  };

  const switchToLogin = () => {
    setShowLogin(true);
    setShowSignup(false);
  };

  const switchToSignup = () => {
    setShowLogin(false);
    setShowSignup(true);
  };

  const updateLogin = (field) => (e) =>
    setLoginForm((prev) => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const updateSignup = (field) => (e) =>
    setSignupForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!loginForm.email || !loginForm.password) {
      toast.error('Please enter email and password');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(loginForm.email, loginForm.password);
      closeModals();

      if (user.role === 'vendor') {
        navigate('/vendor');
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        toast('You are logged in as a customer. This portal is for vendors.', { icon: 'ℹ️' });
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!signupForm.name || !signupForm.email || !signupForm.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (signupForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: signupForm.name,
        email: signupForm.email,
        password: signupForm.password,
        phone: signupForm.phone || undefined,
        role: 'vendor',
      });
      closeModals();
      navigate('/vendor');
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-root">
      <header className="landing-header">
        <div className="brand">
          <span className="brand-mark">VIDAI</span>
          <span className="brand-sub">AI Wedding Planner for Pakistan</span>
        </div>
        <nav className="nav-links">
          <button className="nav-link" type="button">Features</button>
          <button className="nav-link" type="button">How it works</button>
          <button className="nav-link" type="button">Support</button>
        </nav>
        <div className="nav-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowLogin(true)}
          >
            Vendor Login
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowSignup(true)}
          >
            Become a Vendor
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="hero-copy">
            <h1>
              Grow your wedding business
              <span className="accent"> with AI</span>
            </h1>
            <p className="hero-subtitle">
              VIDAI connects Pakistani couples with verified wedding vendors and uses
              AI to match the right services, dates, and budgets. Manage bookings,
              packages, and your calendar in one dashboard.
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowSignup(true)}
              >
                Join as a Vendor
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowLogin(true)}
              >
                I already have an account
              </button>
            </div>
            <p className="hero-footnote">
              For vendors only. Customers will use the mobile app to discover you.
            </p>
          </div>

          <div className="hero-panel">
            <div className="panel-card">
              <h2>Vendor Dashboard Preview</h2>
              <ul>
                <li>See upcoming weddings and booking requests</li>
                <li>Manage services, packages, and pricing</li>
                <li>Control your availability calendar</li>
              </ul>
            </div>
            <div className="panel-grid">
              <div className="panel-stat">
                <span className="stat-label">Bookings</span>
                <span className="stat-value">+34%</span>
                <span className="stat-sub">Avg. growth on VIDAI</span>
              </div>
              <div className="panel-stat">
                <span className="stat-label">Cities</span>
                <span className="stat-value">20+</span>
                <span className="stat-sub">Across Pakistan</span>
              </div>
              <div className="panel-stat">
                <span className="stat-label">Response time</span>
                <span className="stat-value">Instant</span>
                <span className="stat-sub">AI-powered replies</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Login / Signup Modal ── */}
      {(showLogin || showSignup) && (
        <div className="modal-backdrop" onClick={closeModals}>
          <div
            className="modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{showSignup ? 'Vendor Signup' : 'Vendor Login'}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeModals}
              >
                &times;
              </button>
            </div>

            <div className="modal-toggle">
              <button
                type="button"
                className={showSignup ? 'toggle inactive' : 'toggle active'}
                onClick={switchToLogin}
              >
                Login
              </button>
              <button
                type="button"
                className={showSignup ? 'toggle active' : 'toggle inactive'}
                onClick={switchToSignup}
              >
                Signup
              </button>
            </div>

            {/* ── Signup form ── */}
            {showSignup && (
              <form className="modal-form" onSubmit={handleSignup}>
                <div className="form-row-inline">
                  <div className="form-group">
                    <label htmlFor="businessName">Business name *</label>
                    <input
                      id="businessName"
                      type="text"
                      placeholder="e.g. Lahore Royal Events"
                      value={signupForm.name}
                      onChange={updateSignup('name')}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input
                      id="city"
                      type="text"
                      placeholder="e.g. Lahore"
                      value={signupForm.city}
                      onChange={updateSignup('city')}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="signupEmail">Email *</label>
                  <input
                    id="signupEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={signupForm.email}
                    onChange={updateSignup('email')}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signupPassword">Password *</label>
                  <input
                    id="signupPassword"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={signupForm.password}
                    onChange={updateSignup('password')}
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">WhatsApp number</label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="03xx-xxxxxxx"
                    value={signupForm.phone}
                    onChange={updateSignup('phone')}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary full-width"
                  disabled={submitting}
                >
                  {submitting ? 'Creating account...' : 'Create vendor account'}
                </button>

                <p className="modal-note">
                  This panel is for vendors only. Platform admins sign in from the
                  dedicated admin login page.
                </p>
              </form>
            )}

            {/* ── Login form ── */}
            {showLogin && (
              <form className="modal-form" onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={updateLogin('email')}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="********"
                    value={loginForm.password}
                    onChange={updateLogin('password')}
                    required
                  />
                </div>

                <div className="form-footer">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={loginForm.remember}
                      onChange={updateLogin('remember')}
                    />
                    <span>Keep me signed in</span>
                  </label>
                  <button type="button" className="link-button">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary full-width"
                  disabled={submitting}
                >
                  {submitting ? 'Logging in...' : 'Login as vendor'}
                </button>

                <p className="modal-note">
                  This panel is for vendors only. Platform admins sign in from the
                  dedicated admin login page.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorLanding;
