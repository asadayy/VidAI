import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Client-side password rules (must match backend: 8+ chars, upper, lower, number)
  const passwordValid = (pwd) =>
    pwd.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
          role: 'user', // Hardcoded as per requirements
        });
      }
      onClose(); // Close modal on success

      // Dynamic redirect based on role
      if (user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user?.role === 'vendor') {
        navigate('/vendor');
      } else {
        navigate('/user');
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
    setFormData({ name: '', email: '', password: '' }); // Clear form
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>

        <h2 className="modal-title">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="modal-subtitle">
          {isLogin
            ? 'Login to access your wedding planner'
            : 'Start planning your dream wedding today'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              minLength={8}
              title="At least 8 characters, one uppercase, one lowercase, one number"
            />
            {!isLogin && (
              <small className="form-hint" style={{ display: 'block', marginTop: '4px', color: 'var(--text-muted, #666)', fontSize: '0.8rem' }}>
                Min 8 characters, include uppercase, lowercase, and a number
              </small>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading
              ? 'Processing...'
              : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <p className="toggle-auth">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span className="toggle-link" onClick={toggleMode}>
            {isLogin ? 'Sign up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
