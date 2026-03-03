import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './VendorLanding.css';

const INITIAL_LOGIN  = { email: '', password: '', remember: false };
const INITIAL_SIGNUP = { name: '', email: '', password: '', phone: '', city: '' };

// ── inline SVG icons ──
const IcStore = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcMail = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const IcLock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcPhone = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.08 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.1a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>;
const IcCity = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcEye = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcEyeOff = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

const BENEFITS = [
  { icon: '🤖', title: 'AI-Powered Matching', desc: 'Our AI connects you with couples whose budget, style, and dates align perfectly with your services.' },
  { icon: '📅', title: 'Booking Calendar', desc: 'Manage availability, block dates, and accept or decline bookings — all in one dashboard.' },
  { icon: '💬', title: 'Instant Inquiries', desc: 'Receive booking requests directly from couples and respond in real time from any device.' },
  { icon: '📦', title: 'Package Builder', desc: "Create and showcase custom packages with pricing so customers know exactly what they're getting." },
  { icon: '⭐', title: 'Reviews & Ratings', desc: 'Build trust with verified reviews from real couples who have booked your services.' },
  { icon: '📊', title: 'Business Analytics', desc: 'Track profile views, booking conversions, and revenue with our built-in analytics tools.' },
];

const STEPS = [
  { num: 1, icon: '📝', title: 'Create Account', desc: 'Sign up free in under 2 minutes. No credit card required.' },
  { num: 2, icon: '🏪', title: 'Build Your Profile', desc: 'Add photos, packages, and pricing to showcase your best work.' },
  { num: 3, icon: '✅', title: 'Get Verified', desc: 'Our team reviews your profile to give couples confidence in your services.' },
  { num: 4, icon: '💍', title: 'Start Getting Bookings', desc: 'Go live and start receiving inquiries from couples across Pakistan.' },
];

const CATEGORIES = [
  { icon: '🏛️', label: 'Venues' },
  { icon: '📸', label: 'Photographers' },
  { icon: '🍽️', label: 'Caterers' },
  { icon: '🎆', label: 'Decorators' },
  { icon: '💄', label: 'Makeup Artists' },
];

function VendorLanding() {
  const [showLogin,  setShowLogin]  = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [loginForm,  setLoginForm]  = useState(INITIAL_LOGIN);
  const [signupForm, setSignupForm] = useState(INITIAL_SIGNUP);
  const [submitting, setSubmitting] = useState(false);
  const [showLoginPwd,  setShowLoginPwd]  = useState(false);
  const [showSignupPwd, setShowSignupPwd] = useState(false);

  const { login, register, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (isAuthenticated && hasRole('vendor')) {
    navigate('/vendor', { replace: true });
    return null;
  }

  const closeModals = () => {
    setShowLogin(false);
    setShowSignup(false);
    setLoginForm(INITIAL_LOGIN);
    setSignupForm(INITIAL_SIGNUP);
    setShowLoginPwd(false);
    setShowSignupPwd(false);
  };

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') closeModals(); };
    if (showLogin || showSignup) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showLogin, showSignup]);

  const updateLogin  = f => e => setLoginForm(p  => ({ ...p, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const updateSignup = f => e => setSignupForm(p => ({ ...p, [f]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) { toast.error('Please enter email and password'); return; }
    setSubmitting(true);
    try {
      const user = await login(loginForm.email, loginForm.password);
      closeModals();
      if (user.role === 'vendor')     navigate('/vendor');
      else if (user.role === 'admin') navigate('/admin/dashboard');
      else toast('You are logged in as a customer. This portal is for vendors.', { icon: 'ℹ️' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally { setSubmitting(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!signupForm.name || !signupForm.email || !signupForm.password) { toast.error('Please fill in all required fields'); return; }
    if (signupForm.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      await register({ name: signupForm.name, email: signupForm.email, password: signupForm.password, phone: signupForm.phone || undefined, role: 'vendor' });
      closeModals();
      navigate('/vendor/onboarding');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="vl-root">

      {/* ── HEADER ── */}
      <header className="vl-header">
        <div className="vl-brand">
          <span className="vl-brand-mark">VidAI</span>
          <span className="vl-brand-tag">For Vendors</span>
        </div>
        <nav className="vl-nav">
          <button className="vl-nav-link" type="button">Benefits</button>
          <button className="vl-nav-link" type="button">How it Works</button>
          <button className="vl-nav-link" type="button">Categories</button>
        </nav>
        <div className="vl-header-btns">
          <button className="vl-btn vl-btn-sm vl-btn-ghost" onClick={() => setShowLogin(true)}>Login</button>
          <button className="vl-btn vl-btn-sm vl-btn-rose"  onClick={() => setShowSignup(true)}>Join Free</button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="vl-hero">
        {/* Left — Copy */}
        <div className="vl-hero-left">
          <div className="vl-hero-eyebrow">
            <span className="vl-hero-eyebrow-dot" />
            Pakistan's #1 AI Wedding Platform
          </div>
          <h1 className="vl-hero-title">
            Reach thousands of<br />
            couples with <em>zero&nbsp;effort</em>
          </h1>
          <p className="vl-hero-subtitle">
            VidAI uses artificial intelligence to match your wedding services with the right
            couples — based on their budget, date, and style. List your business today and grow
            your bookings in Islamabad, Rawalpindi, and beyond.
          </p>
          <div className="vl-hero-actions">
            <button className="vl-btn vl-btn-lg vl-btn-rose" onClick={() => setShowSignup(true)}>
              Become a Vendor — It&apos;s Free
            </button>
            <button className="vl-btn vl-btn-lg vl-btn-outline-white" onClick={() => setShowLogin(true)}>
              Sign In
            </button>
          </div>
          <div className="vl-hero-trust">
            <span>✓ No listing fees</span>
            <span className="vl-hero-trust-divider">|</span>
            <span>✓ Setup in 5 minutes</span>
            <span className="vl-hero-trust-divider">|</span>
            <span>✓ Free profile forever</span>
          </div>
        </div>

        {/* Right — Dashboard mockup */}
        <div className="vl-hero-right">
          <div className="vl-mock-card">
            <div className="vl-mock-header">
              <span className="vl-mock-header-title">📊 Vendor Dashboard</span>
              <span className="vl-mock-header-badge">Live</span>
            </div>
            <div className="vl-mock-body">
              <div className="vl-mock-stats">
                <div className="vl-mock-stat"><span className="vl-mock-stat-val">12</span><span className="vl-mock-stat-lbl">Bookings</span></div>
                <div className="vl-mock-stat"><span className="vl-mock-stat-val">4.8 ⭐</span><span className="vl-mock-stat-lbl">Rating</span></div>
                <div className="vl-mock-stat"><span className="vl-mock-stat-val">340</span><span className="vl-mock-stat-lbl">Profile Views</span></div>
              </div>
              <div className="vl-mock-row">
                <span>💍 Fatima &amp; Hamza — Dec 18</span>
                <span className="vl-mock-row-badge vl-mock-row-badge--new">New</span>
              </div>
              <div className="vl-mock-row">
                <span>🎂 Aisha &amp; Bilal — Jan 5</span>
                <span className="vl-mock-row-badge vl-mock-row-badge--confirmed">Confirmed</span>
              </div>
              <div className="vl-mock-row">
                <span>📸 Sara &amp; Umar — Feb 14</span>
                <span className="vl-mock-row-badge vl-mock-row-badge--paid">Paid</span>
              </div>
            </div>
          </div>

          <div className="vl-hero-stats-row">
            <div className="vl-hero-stat"><span className="vl-hero-stat-val">500+</span><span className="vl-hero-stat-lbl">Active Vendors</span></div>
            <div className="vl-hero-stat"><span className="vl-hero-stat-val">20+</span><span className="vl-hero-stat-lbl">Cities</span></div>
            <div className="vl-hero-stat"><span className="vl-hero-stat-val">+34%</span><span className="vl-hero-stat-lbl">Avg. Growth</span></div>
          </div>
        </div>
      </section>

      {/* ── STATS BAND ── */}
      <div className="vl-stats-band">
        <div className="vl-stats-band-item"><span className="vl-stats-band-val">10,000+</span><span className="vl-stats-band-lbl">Couples on Platform</span></div>
        <div className="vl-stats-band-item"><span className="vl-stats-band-val">500+</span><span className="vl-stats-band-lbl">Verified Vendors</span></div>
        <div className="vl-stats-band-item"><span className="vl-stats-band-val">PKR 2B+</span><span className="vl-stats-band-lbl">Bookings Facilitated</span></div>
        <div className="vl-stats-band-item"><span className="vl-stats-band-val">4.8 ★</span><span className="vl-stats-band-lbl">Avg. Vendor Rating</span></div>
      </div>

      {/* ── BENEFITS ── */}
      <section className="vl-section vl-benefits">
        <div className="vl-benefits-inner">
          <div>
            <span className="vl-section-pill">Why VidAI?</span>
            <h2 className="vl-section-title">Everything you need to<br />grow your wedding business</h2>
            <p className="vl-section-sub">
              We built VidAI specifically for Pakistani wedding vendors. From AI-matched leads
              to a full booking management suite — it&apos;s all here, free.
            </p>
            <div style={{ marginTop: '1.8rem' }}>
              <button className="vl-btn vl-btn-md vl-btn-rose" onClick={() => setShowSignup(true)}>
                Get Started Free →
              </button>
            </div>
          </div>
          <div className="vl-benefits-cards">
            {BENEFITS.map(b => (
              <div key={b.title} className="vl-benefit-card">
                <div className="vl-benefit-icon">{b.icon}</div>
                <div className="vl-benefit-title">{b.title}</div>
                <div className="vl-benefit-desc">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="vl-section vl-how">
        <div className="vl-how-inner">
          <div style={{ textAlign: 'center' }}>
            <span className="vl-section-pill">Simple Process</span>
            <h2 className="vl-section-title" style={{ textAlign: 'center' }}>Get listed in 4 easy steps</h2>
          </div>
          <div className="vl-steps">
            {STEPS.map(s => (
              <div key={s.num} className="vl-step">
                <div className="vl-step-num">{s.num}</div>
                <div className="vl-step-icon">{s.icon}</div>
                <div className="vl-step-title">{s.title}</div>
                <div className="vl-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="vl-section vl-categories">
        <div className="vl-categories-inner">
          <span className="vl-section-pill">Who Can Join?</span>
          <h2 className="vl-section-title">We welcome all wedding service providers</h2>
          <div className="vl-cat-grid">
            {CATEGORIES.map(c => (
              <div key={c.label} className="vl-cat-chip">
                <span className="vl-cat-chip-icon">{c.icon}</span>
                {c.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="vl-cta">
        <h2 className="vl-cta-title">Ready to grow your business<br />with <em>AI-powered</em> leads?</h2>
        <p className="vl-cta-sub">
          Join hundreds of vendors who are already booking more weddings through VidAI.
          It&apos;s free to list — always.
        </p>
        <div className="vl-cta-actions">
          <button className="vl-btn vl-btn-lg vl-btn-white" onClick={() => setShowSignup(true)}>
            Create Vendor Account
          </button>
          <button className="vl-btn vl-btn-lg vl-btn-outline-white" onClick={() => setShowLogin(true)}>
            I already have an account
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="vl-footer">
        <span className="vl-footer-brand">VidAI</span>
        <span className="vl-footer-note">© 2026 VidAI · Pakistan&apos;s AI Wedding Platform · Vendor Portal</span>
        <button className="vl-footer-link" onClick={() => navigate('/')}>Customer App ↗</button>
      </footer>

      {/* ── AUTH MODAL ── */}
      {(showLogin || showSignup) && (
        <div className="vl-modal-backdrop" onClick={closeModals} role="dialog" aria-modal="true">
          <div className="vl-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="vl-modal-top">
              <div className="vl-modal-top-icon">
                <IcStore />
              </div>
              <div>
                <h2 className="vl-modal-title">{showSignup ? 'Create Vendor Account' : 'Vendor Login'}</h2>
                <p className="vl-modal-subtitle">{showSignup ? 'Start getting bookings today — free forever.' : 'Welcome back! Sign in to your dashboard.'}</p>
              </div>
              <button className="vl-modal-close" onClick={closeModals} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="vl-modal-tabs">
              <button className={`vl-modal-tab${showLogin ? ' vl-modal-tab--active' : ''}`}
                onClick={() => { setShowLogin(true); setShowSignup(false); setShowLoginPwd(false); }}>Login</button>
              <button className={`vl-modal-tab${showSignup ? ' vl-modal-tab--active' : ''}`}
                onClick={() => { setShowSignup(true); setShowLogin(false); setShowSignupPwd(false); }}>Sign Up</button>
              <span className="vl-modal-tab-bar" style={{ transform: showLogin ? 'translateX(0)' : 'translateX(100%)' }} />
            </div>

            <div className="vl-modal-body">

              {/* SIGNUP */}
              {showSignup && (
                <form onSubmit={handleSignup}>
                  <div className="vl-form-row">
                    <div className="vl-form-group">
                      <label htmlFor="bName">Business Name *</label>
                      <div className="vl-input-wrap">
                        <span className="vl-input-icon"><IcStore /></span>
                        <input id="bName" type="text" placeholder="Royal Events"
                          value={signupForm.name} onChange={updateSignup('name')} required />
                      </div>
                    </div>
                    <div className="vl-form-group">
                      <label htmlFor="city">City</label>
                      <div className="vl-input-wrap">
                        <span className="vl-input-icon"><IcCity /></span>
                        <select id="city" value={signupForm.city} onChange={updateSignup('city')}>
                          <option value="">Select city</option>
                          <option value="Islamabad">Islamabad</option>
                          <option value="Rawalpindi">Rawalpindi</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="vl-form-group">
                    <label htmlFor="sEmail">Email *</label>
                    <div className="vl-input-wrap">
                      <span className="vl-input-icon"><IcMail /></span>
                      <input id="sEmail" type="email" placeholder="you@example.com"
                        value={signupForm.email} onChange={updateSignup('email')} required />
                    </div>
                  </div>
                  <div className="vl-form-group">
                    <label htmlFor="sPass">Password *</label>
                    <div className="vl-input-wrap">
                      <span className="vl-input-icon"><IcLock /></span>
                      <input id="sPass" type={showSignupPwd ? 'text' : 'password'} placeholder="Min. 6 characters"
                        value={signupForm.password} onChange={updateSignup('password')} required minLength={6} />
                      <button type="button" className="vl-eye-btn" onClick={() => setShowSignupPwd(p => !p)} tabIndex={-1}
                        aria-label={showSignupPwd ? 'Hide password' : 'Show password'}>
                        {showSignupPwd ? <IcEyeOff /> : <IcEye />}
                      </button>
                    </div>
                  </div>
                  <div className="vl-form-group">
                    <label htmlFor="phone">WhatsApp Number</label>
                    <div className="vl-input-wrap">
                      <span className="vl-input-icon"><IcPhone /></span>
                      <input id="phone" type="tel" placeholder="03xx-xxxxxxx"
                        value={signupForm.phone} onChange={updateSignup('phone')} />
                    </div>
                  </div>
                  <button type="submit" className="vl-submit-btn" disabled={submitting}>
                    {submitting ? <span className="vl-spinner" /> : 'Create Vendor Account →'}
                  </button>
                  <p className="vl-modal-note">For vendors only. Admins use the dedicated admin login page.</p>
                </form>
              )}

              {/* LOGIN */}
              {showLogin && (
                <form onSubmit={handleLogin}>
                  <div className="vl-form-group">
                    <label htmlFor="lEmail">Email</label>
                    <div className="vl-input-wrap">
                      <span className="vl-input-icon"><IcMail /></span>
                      <input id="lEmail" type="email" placeholder="you@example.com"
                        value={loginForm.email} onChange={updateLogin('email')} required />
                    </div>
                  </div>
                  <div className="vl-form-group">
                    <label htmlFor="lPass">Password</label>
                    <div className="vl-input-wrap">
                      <span className="vl-input-icon"><IcLock /></span>
                      <input id="lPass" type={showLoginPwd ? 'text' : 'password'} placeholder="••••••••"
                        value={loginForm.password} onChange={updateLogin('password')} required />
                      <button type="button" className="vl-eye-btn" onClick={() => setShowLoginPwd(p => !p)} tabIndex={-1}
                        aria-label={showLoginPwd ? 'Hide password' : 'Show password'}>
                        {showLoginPwd ? <IcEyeOff /> : <IcEye />}
                      </button>
                    </div>
                  </div>
                  <div className="vl-form-footer">
                    <label className="vl-form-checkbox">
                      <input type="checkbox" checked={loginForm.remember} onChange={updateLogin('remember')} />
                      <span>Keep me signed in</span>
                    </label>
                    <button type="button" className="vl-link-btn">Forgot password?</button>
                  </div>
                  <button type="submit" className="vl-submit-btn" disabled={submitting}>
                    {submitting ? <span className="vl-spinner" /> : 'Sign In to Dashboard →'}
                  </button>
                  <p className="vl-modal-note">For vendors only. Admins use the dedicated admin login page.</p>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorLanding;
