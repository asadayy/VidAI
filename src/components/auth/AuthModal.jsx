import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './AuthModal.css';

// --- SVG Icons (inline, no extra dependency) ---
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const IconRings = () => (
  <svg viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="14" cy="12" r="10" stroke="#e91e63" strokeWidth="2.5" fill="none" />
    <circle cx="34" cy="12" r="10" stroke="#ad1457" strokeWidth="2.5" fill="none" />
  </svg>
);

// Password strength calculator
const getStrength = (pwd) => {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
};
const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const firstInputRef = useRef(null);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 120);
    }
  }, [isOpen, isLogin]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBlur = (e) => {
    setTouched({ ...touched, [e.target.name]: true });
  };

  const passwordValid = (pwd) =>
    pwd.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd);

  const strength = getStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (!isLogin && !passwordValid(formData.password)) {
      toast.error('Password must be at least 8 characters with one uppercase, one lowercase, and one number.');
      return;
    }
    setIsLoading(true);
    try {
      let user;
      if (isLogin) {
        user = await login(formData.email, formData.password);
      } else {
        user = await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'user',
        });
      }
      onClose();
      if (user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user?.role === 'vendor') {
        navigate('/vendor');
      } else {
        navigate(!user?.onboarding?.isComplete ? '/user/onboarding' : '/user');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ name: '', email: '', password: '' });
    setTouched({});
    setShowPassword(false);
  };

  return (
    <div className="am-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="am-card" onClick={(e) => e.stopPropagation()}>

        {/* Decorative header */}
        <div className="am-header">
          <div className="am-rings"><IconRings /></div>
          <h2 className="am-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="am-subtitle">
            {isLogin ? 'Sign in to your wedding planner' : 'Start planning your dream wedding'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="am-tabs">
          <button
            type="button"
            className={`am-tab ${isLogin ? 'am-tab--active' : ''}`}
            onClick={() => !isLogin && toggleMode()}
          >Login</button>
          <button
            type="button"
            className={`am-tab ${!isLogin ? 'am-tab--active' : ''}`}
            onClick={() => isLogin && toggleMode()}
          >Sign Up</button>
          <span className="am-tab-indicator" style={{ transform: isLogin ? 'translateX(0)' : 'translateX(100%)' }} />
        </div>

        <form className="am-form" onSubmit={handleSubmit} noValidate>

          {/* Name field (register only) */}
          {!isLogin && (
            <div className="am-field">
              <label className="am-label" htmlFor="auth-name">Full Name</label>
              <div className={`am-input-wrap ${touched.name && !formData.name ? 'am-input-wrap--error' : formData.name ? 'am-input-wrap--ok' : ''}`}>
                <span className="am-input-icon"><IconUser /></span>
                <input
                  ref={!isLogin ? firstInputRef : undefined}
                  id="auth-name"
                  type="text"
                  name="name"
                  className="am-input"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                />
              </div>
              {touched.name && !formData.name && (
                <span className="am-error-msg">Name is required</span>
              )}
            </div>
          )}

          {/* Email field */}
          <div className="am-field">
            <label className="am-label" htmlFor="auth-email">Email Address</label>
            <div className={`am-input-wrap ${touched.email && !formData.email ? 'am-input-wrap--error' : formData.email ? 'am-input-wrap--ok' : ''}`}>
              <span className="am-input-icon"><IconMail /></span>
              <input
                ref={isLogin ? firstInputRef : undefined}
                id="auth-email"
                type="email"
                name="email"
                className="am-input"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </div>
            {touched.email && !formData.email && (
              <span className="am-error-msg">Email is required</span>
            )}
          </div>

          {/* Password field */}
          <div className="am-field">
            <label className="am-label" htmlFor="auth-password">Password</label>
            <div className={`am-input-wrap ${touched.password && !formData.password ? 'am-input-wrap--error' : formData.password && (!isLogin ? passwordValid(formData.password) : true) ? 'am-input-wrap--ok' : ''}`}>
              <span className="am-input-icon"><IconLock /></span>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="am-input"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={8}
              />
              <button
                type="button"
                className="am-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>

            {/* Strength bar (register only) */}
            {!isLogin && formData.password && (
              <div className="am-strength">
                <div className="am-strength-bars">
                  {[1,2,3,4,5].map(i => (
                    <span
                      key={i}
                      className="am-strength-bar"
                      style={{ backgroundColor: i <= strength ? strengthColor[strength] : '#e5e7eb' }}
                    />
                  ))}
                </div>
                <span className="am-strength-label" style={{ color: strengthColor[strength] }}>
                  {strengthLabel[strength]}
                </span>
              </div>
            )}

            {!isLogin && (
              <p className="am-hint">Min 8 chars &mdash; uppercase, lowercase &amp; number</p>
            )}
          </div>

          <button type="submit" className="am-submit" disabled={isLoading}>
            {isLoading ? (
              <span className="am-spinner" />
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <p className="am-toggle">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button type="button" className="am-toggle-btn" onClick={toggleMode}>
            {isLogin ? 'Sign up free' : 'Log in'}
          </button>
        </p>

        <button className="am-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
